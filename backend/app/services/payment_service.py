import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from app.models import Payment, PaymentAllocation, Loan, Client, CashbookEntry
from app.schemas import PaymentCreate, PaymentPreviewResponse
from app.audit import log_audit

def quantize_money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def generate_payment_reference(db: Session) -> str:
    year = datetime.date.today().year
    prefix = f"PAY-{year}-"
    last_payment = (
        db.query(Payment)
        .filter(Payment.payment_reference.like(f"{prefix}%"))
        .order_by(Payment.id.desc())
        .first()
    )
    if not last_payment:
        return f"{prefix}0001"
    try:
        last_num = int(last_payment.payment_reference.split("-")[-1])
        next_num = last_num + 1
        return f"{prefix}{next_num:04d}"
    except Exception:
        count = db.query(Payment).count() + 1
        return f"{prefix}{count:04d}"

def calculate_payment_allocation(
    outstanding_interest: Decimal,
    outstanding_principal: Decimal,
    payment_amount: Decimal,
    maturity_date: datetime.date
) -> PaymentPreviewResponse:
    payment_amount = quantize_money(payment_amount)
    out_interest = quantize_money(outstanding_interest)
    out_principal = quantize_money(outstanding_principal)

    # 1. Allocate to interest first
    interest_paid = min(payment_amount, out_interest)
    remaining_after_interest = payment_amount - interest_paid

    # 2. Allocate remainder to principal
    principal_paid = min(remaining_after_interest, out_principal)
    excess_credit = remaining_after_interest - principal_paid

    new_interest = quantize_money(out_interest - interest_paid)
    new_principal = quantize_money(out_principal - principal_paid)

    if new_interest == Decimal("0.00") and new_principal == Decimal("0.00"):
        resulting_status = "FULLY_PAID"
    elif datetime.date.today() > maturity_date:
        resulting_status = "MATURED"
    else:
        resulting_status = "PARTIALLY_PAID"

    return PaymentPreviewResponse(
        loan_id=0,
        amount=payment_amount,
        current_outstanding_interest=out_interest,
        current_outstanding_principal=out_principal,
        interest_allocation=quantize_money(interest_paid),
        principal_allocation=quantize_money(principal_paid),
        remaining_interest=new_interest,
        remaining_principal=new_principal,
        excess_credit=quantize_money(excess_credit),
        resulting_status=resulting_status
    )

def record_payment(db: Session, payment_in: PaymentCreate, user_name: str = "Admin") -> Payment:
    loan = db.query(Loan).filter(Loan.id == payment_in.loan_id).first()
    if not loan:
        raise ValueError("Loan not found")

    if loan.loan_status in ["FULLY_PAID", "CANCELLED", "WRITTEN_OFF"]:
        raise ValueError(f"Cannot record payment for loan in {loan.loan_status} status")

    total_outstanding = quantize_money(loan.outstanding_interest + loan.outstanding_principal)
    payment_amount = quantize_money(payment_in.amount_received)

    if payment_amount <= Decimal("0.00"):
        raise ValueError("Payment amount must be greater than zero")

    if payment_amount > total_outstanding:
        raise ValueError(
            f"Payment of KES {payment_amount:,.2f} exceeds total outstanding balance of KES {total_outstanding:,.2f}. "
            f"Overpayment is not allowed without separate unapplied credit approval."
        )

    # Check external reference uniqueness if provided (e.g. M-Pesa receipt code)
    if payment_in.external_transaction_reference and payment_in.external_transaction_reference.strip():
        ext_ref = payment_in.external_transaction_reference.strip()
        existing_ref = db.query(Payment).filter(
            Payment.external_transaction_reference == ext_ref,
            Payment.reversal_status == "ACTIVE"
        ).first()
        if existing_ref:
            raise ValueError(f"Payment with external reference '{ext_ref}' is already recorded (Payment: {existing_ref.payment_reference})")

    # Allocate: interest first, then principal
    interest_paid = min(payment_amount, loan.outstanding_interest)
    remaining_payment = payment_amount - interest_paid
    principal_paid = min(remaining_payment, loan.outstanding_principal)

    payment_ref = generate_payment_reference(db)

    # 1. Create Payment record
    payment = Payment(
        payment_reference=payment_ref,
        client_id=loan.client_id,
        loan_id=loan.id,
        amount_received=payment_amount,
        payment_date=payment_in.payment_date,
        payment_method=payment_in.payment_method,
        external_transaction_reference=payment_in.external_transaction_reference.strip() if payment_in.external_transaction_reference else None,
        recorded_by=user_name,
        notes=payment_in.notes,
        reversal_status="ACTIVE"
    )
    db.add(payment)
    db.flush()

    # 2. Create Allocations
    if interest_paid > Decimal("0.00"):
        alloc_interest = PaymentAllocation(
            payment_id=payment.id,
            loan_id=loan.id,
            allocation_type="INTEREST",
            amount_allocated=interest_paid
        )
        db.add(alloc_interest)

    if principal_paid > Decimal("0.00"):
        alloc_principal = PaymentAllocation(
            payment_id=payment.id,
            loan_id=loan.id,
            allocation_type="PRINCIPAL",
            amount_allocated=principal_paid
        )
        db.add(alloc_principal)

    # 3. Update Loan Balances
    loan.outstanding_interest = quantize_money(loan.outstanding_interest - interest_paid)
    loan.outstanding_principal = quantize_money(loan.outstanding_principal - principal_paid)

    # Update loan status
    if loan.outstanding_interest == Decimal("0.00") and loan.outstanding_principal == Decimal("0.00"):
        loan.loan_status = "FULLY_PAID"
        loan.rollover_status = "NOT_ELIGIBLE"
    elif datetime.date.today() > loan.maturity_date:
        loan.loan_status = "MATURED"
        loan.rollover_status = "PENDING"
    else:
        loan.loan_status = "PARTIALLY_PAID"

    # 4. Cashbook Entry
    client = db.query(Client).filter(Client.id == loan.client_id).first()
    client_name = client.full_name if client else f"Client #{loan.client_id}"
    cash_entry = CashbookEntry(
        entry_type="LOAN_REPAYMENT",
        category="Collections",
        amount=payment_amount,
        entry_date=payment_in.payment_date,
        reference_id=payment_ref,
        reference_type="PAYMENT",
        description=f"Repayment for {loan.loan_reference} ({client_name}) - Interest: KES {interest_paid:,.2f}, Principal: KES {principal_paid:,.2f} via {payment_in.payment_method}",
        recorded_by=user_name
    )
    db.add(cash_entry)

    db.commit()
    db.refresh(payment)

    log_audit(
        db=db,
        action="PAYMENT_RECORDED",
        entity_type="Payment",
        entity_id=str(payment.id),
        user_name=user_name,
        details={
            "payment_reference": payment.payment_reference,
            "loan_reference": loan.loan_reference,
            "amount_received": str(payment_amount),
            "interest_allocated": str(interest_paid),
            "principal_allocated": str(principal_paid),
            "remaining_interest": str(loan.outstanding_interest),
            "remaining_principal": str(loan.outstanding_principal)
        }
    )
    db.commit()
    return payment

def reverse_payment(
    db: Session,
    payment_id: int,
    reversal_reason: str,
    user_name: str = "Admin"
) -> Payment:
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError("Payment not found")

    if payment.reversal_status == "REVERSED":
        raise ValueError("Payment has already been reversed")

    loan = db.query(Loan).filter(Loan.id == payment.loan_id).first()
    if not loan:
        raise ValueError("Associated loan not found")

    # Sum allocations
    allocations = db.query(PaymentAllocation).filter(PaymentAllocation.payment_id == payment.id).all()
    interest_to_restore = Decimal("0.00")
    principal_to_restore = Decimal("0.00")

    for alloc in allocations:
        if alloc.allocation_type == "INTEREST":
            interest_to_restore += alloc.amount_allocated
        elif alloc.allocation_type == "PRINCIPAL":
            principal_to_restore += alloc.amount_allocated

    # Restore loan balances
    loan.outstanding_interest = quantize_money(loan.outstanding_interest + interest_to_restore)
    loan.outstanding_principal = quantize_money(loan.outstanding_principal + principal_to_restore)

    # Recalculate status
    if datetime.date.today() > loan.maturity_date:
        loan.loan_status = "MATURED"
        loan.rollover_status = "PENDING"
    elif (loan.outstanding_interest + loan.outstanding_principal) == loan.scheduled_total:
        loan.loan_status = "ACTIVE"
    else:
        loan.loan_status = "PARTIALLY_PAID"

    # Mark payment reversed
    payment.reversal_status = "REVERSED"
    payment.reversal_reason = reversal_reason.strip()
    payment.reversed_at = datetime.datetime.utcnow()

    # Create offsetting cashbook entry
    cash_reversal = CashbookEntry(
        entry_type="EXPENSE",
        category="Payment Reversals",
        amount=payment.amount_received,
        entry_date=datetime.date.today(),
        reference_id=payment.payment_reference,
        reference_type="PAYMENT_REVERSAL",
        description=f"REVERSAL of payment {payment.payment_reference} for {loan.loan_reference}: {reversal_reason}",
        recorded_by=user_name
    )
    db.add(cash_reversal)

    db.commit()
    db.refresh(payment)

    log_audit(
        db=db,
        action="PAYMENT_REVERSED",
        entity_type="Payment",
        entity_id=str(payment.id),
        user_name=user_name,
        details={
            "payment_reference": payment.payment_reference,
            "reversal_reason": reversal_reason,
            "restored_interest": str(interest_to_restore),
            "restored_principal": str(principal_to_restore),
            "new_loan_status": loan.loan_status
        }
    )
    db.commit()
    return payment

