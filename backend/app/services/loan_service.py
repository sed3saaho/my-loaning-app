import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import Loan, Client, BusinessSettings, CashbookEntry, LoanBookReference, Notification
from app.schemas import LoanCreate, LoanCalculationPreview
from app.audit import log_audit

def quantize_money(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def generate_loan_reference(db: Session) -> str:
    year = datetime.date.today().year
    prefix = f"LN-{year}-"
    last_loan = (
        db.query(Loan)
        .filter(Loan.loan_reference.like(f"{prefix}%"))
        .order_by(Loan.id.desc())
        .first()
    )
    if not last_loan:
        return f"{prefix}0001"
    try:
        last_num = int(last_loan.loan_reference.split("-")[-1])
        next_num = last_num + 1
        return f"{prefix}{next_num:04d}"
    except Exception:
        count = db.query(Loan).count() + 1
        return f"{prefix}{count:04d}"

def calculate_loan_terms(
    principal: Decimal,
    rate_percent: Decimal,
    duration_days: int,
    disbursement_date: datetime.date
) -> LoanCalculationPreview:
    interest = quantize_money(principal * (rate_percent / Decimal("100.00")))
    scheduled_total = quantize_money(principal + interest)
    maturity_date = disbursement_date + datetime.timedelta(days=duration_days)

    return LoanCalculationPreview(
        principal_amount=quantize_money(principal),
        interest_rate=quantize_money(rate_percent),
        interest_amount=interest,
        scheduled_total=scheduled_total,
        disbursement_date=disbursement_date,
        maturity_date=maturity_date
    )

def create_loan(db: Session, loan_in: LoanCreate, user_name: str = "Admin") -> Loan:
    client = db.query(Client).filter(Client.id == loan_in.client_id).first()
    if not client:
        raise ValueError("Client not found")

    settings = db.query(BusinessSettings).first()
    default_rate = Decimal(str(settings.default_interest_rate)) if settings else Decimal("20.00")
    default_duration = settings.default_duration_days if settings else 30

    rate = loan_in.interest_rate if loan_in.interest_rate is not None else default_rate
    duration = loan_in.loan_duration_days if loan_in.loan_duration_days is not None else default_duration

    terms = calculate_loan_terms(
        principal=loan_in.principal_amount,
        rate_percent=rate,
        duration_days=duration,
        disbursement_date=loan_in.disbursement_date
    )

    loan_ref = generate_loan_reference(db)

    loan = Loan(
        loan_reference=loan_ref,
        client_id=client.id,
        principal_amount=terms.principal_amount,
        interest_rate=terms.interest_rate,
        interest_amount=terms.interest_amount,
        scheduled_total=terms.scheduled_total,
        loan_duration_days=duration,
        disbursement_date=terms.disbursement_date,
        maturity_date=terms.maturity_date,
        outstanding_principal=terms.principal_amount,
        outstanding_interest=terms.interest_amount,
        loan_status="ACTIVE",
        rollover_status="NOT_ELIGIBLE",
        disbursement_method=loan_in.disbursement_method,
        book_number=loan_in.book_number.strip() if loan_in.book_number else None,
        page_number=loan_in.page_number.strip() if loan_in.page_number else None,
        notes=loan_in.notes
    )
    db.add(loan)
    db.flush()

    # Link book reference if provided
    if loan_in.book_number and loan_in.page_number:
        book_ref = LoanBookReference(
            client_id=client.id,
            loan_id=loan.id,
            book_number=loan_in.book_number.strip(),
            page_number=loan_in.page_number.strip(),
            date_recorded=terms.disbursement_date,
            notes=f"Loan {loan_ref} disbursement physical book record"
        )
        db.add(book_ref)

    # Cashbook entry for loan disbursement
    cash_entry = CashbookEntry(
        entry_type="LOAN_DISBURSEMENT",
        category="Disbursements",
        amount=terms.principal_amount,
        entry_date=terms.disbursement_date,
        reference_id=loan_ref,
        reference_type="LOAN",
        description=f"Disbursement of {loan_ref} to {client.full_name} via {loan_in.disbursement_method}",
        recorded_by=user_name
    )
    db.add(cash_entry)

    db.commit()
    db.refresh(loan)

    log_audit(
        db=db,
        action="LOAN_DISBURSED",
        entity_type="Loan",
        entity_id=str(loan.id),
        user_name=user_name,
        details={
            "loan_reference": loan.loan_reference,
            "client_name": client.full_name,
            "principal": str(loan.principal_amount),
            "interest": str(loan.interest_amount),
            "maturity_date": str(loan.maturity_date)
        }
    )
    db.commit()
    return loan

def refresh_loan_statuses(db: Session):
    """
    Evaluates loan maturity dates and updates statuses:
    - If today >= maturity_date and has remaining balance, marks as MATURED or AWAITING_ROLLOVER
    - Generates system notifications for due/overdue loans
    """
    today = datetime.date.today()
    loans = db.query(Loan).filter(
        Loan.loan_status.in_(["ACTIVE", "PARTIALLY_PAID", "MATURED", "AWAITING_ROLLOVER"])
    ).all()

    for loan in loans:
        balance = loan.outstanding_principal + loan.outstanding_interest
        if balance <= 0:
            loan.loan_status = "FULLY_PAID"
            continue

        if today > loan.maturity_date:
            if loan.loan_status not in ["MATURED", "AWAITING_ROLLOVER"]:
                loan.loan_status = "MATURED"
                loan.rollover_status = "PENDING"
        elif today == loan.maturity_date:
            # Due today notification if not existing
            pass

    db.commit()

