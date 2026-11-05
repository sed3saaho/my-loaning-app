import datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models import Loan, Client, BusinessSettings, Notification
from app.schemas import RolloverProposal
from app.services.loan_service import generate_loan_reference, quantize_money
from app.audit import log_audit

def get_rollover_proposal(db: Session, loan_id: int) -> RolloverProposal:
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise ValueError("Loan not found")

    client = db.query(Client).filter(Client.id == loan.client_id).first()
    client_name = client.full_name if client else "Unknown"

    settings = db.query(BusinessSettings).first()
    rate = Decimal(str(settings.default_interest_rate)) if settings else Decimal("20.00")
    duration = settings.default_duration_days if settings else 30

    eligible_principal = quantize_money(loan.outstanding_principal)
    unpaid_interest = quantize_money(loan.outstanding_interest)

    can_rollover = True
    reason_if_not = None

    if loan.loan_status == "ROLLED_OVER" or loan.rollover_status == "PROCESSED":
        can_rollover = False
        reason_if_not = "This loan cycle has already been rolled over to another cycle."
    elif loan.loan_status == "FULLY_PAID":
        can_rollover = False
        reason_if_not = "This loan cycle is fully settled and cannot be rolled over."
    elif eligible_principal <= Decimal("0.00"):
        can_rollover = False
        reason_if_not = "Outstanding principal is zero. Only remaining eligible principal can be rolled over."

    today = datetime.date.today()
    new_interest = quantize_money(eligible_principal * (rate / Decimal("100.00")))
    new_scheduled_total = quantize_money(eligible_principal + new_interest)
    proposed_maturity = today + datetime.timedelta(days=duration)

    return RolloverProposal(
        previous_loan_id=loan.id,
        previous_loan_reference=loan.loan_reference,
        client_id=loan.client_id,
        client_name=client_name,
        eligible_principal=eligible_principal,
        unpaid_previous_interest=unpaid_interest,
        new_interest_rate=rate,
        new_interest_amount=new_interest,
        new_scheduled_total=new_scheduled_total,
        proposed_disbursement_date=today,
        proposed_maturity_date=proposed_maturity,
        can_rollover=can_rollover,
        reason_if_not=reason_if_not
    )

def execute_rollover(
    db: Session,
    loan_id: int,
    rollover_date: Optional[datetime.date] = None,
    notes: Optional[str] = None,
    user_name: str = "Admin"
) -> Loan:
    old_loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not old_loan:
        raise ValueError("Loan not found")

    if old_loan.loan_status == "ROLLED_OVER" or old_loan.rollover_status == "PROCESSED":
        raise ValueError(f"Loan {old_loan.loan_reference} has already been rolled over")

    if old_loan.outstanding_principal <= Decimal("0.00"):
        raise ValueError(f"Loan {old_loan.loan_reference} has zero principal remaining to rollover")

    rollover_date = rollover_date or datetime.date.today()

    settings = db.query(BusinessSettings).first()
    rate = Decimal(str(settings.default_interest_rate)) if settings else Decimal("20.00")
    duration = settings.default_duration_days if settings else 30

    eligible_principal = quantize_money(old_loan.outstanding_principal)
    prior_unpaid_interest = quantize_money(old_loan.outstanding_interest)

    new_interest = quantize_money(eligible_principal * (rate / Decimal("100.00")))
    new_scheduled_total = quantize_money(eligible_principal + new_interest)
    new_maturity = rollover_date + datetime.timedelta(days=duration)

    new_ref = generate_loan_reference(db)

    # 1. Update old loan cycle
    old_loan.loan_status = "ROLLED_OVER"
    old_loan.rollover_status = "PROCESSED"

    # 2. Create new cycle atomically linked to old cycle
    note_text = (
        f"Rolled over from cycle {old_loan.loan_reference}. "
        f"Prior unpaid interest: KES {prior_unpaid_interest:,.2f} retained in historical record. "
        + (f"Note: {notes}" if notes else "")
    )

    new_loan = Loan(
        loan_reference=new_ref,
        client_id=old_loan.client_id,
        parent_loan_id=old_loan.id,
        principal_amount=eligible_principal,
        interest_rate=rate,
        interest_amount=new_interest,
        scheduled_total=new_scheduled_total,
        loan_duration_days=duration,
        disbursement_date=rollover_date,
        maturity_date=new_maturity,
        outstanding_principal=eligible_principal,
        outstanding_interest=new_interest,
        loan_status="ACTIVE",
        rollover_status="NOT_ELIGIBLE",
        disbursement_method="Rollover",
        book_number=old_loan.book_number,
        page_number=old_loan.page_number,
        notes=note_text
    )
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)

    # System notification
    client = db.query(Client).filter(Client.id == old_loan.client_id).first()
    client_name = client.full_name if client else f"Client #{old_loan.client_id}"

    notif = Notification(
        title=f"Rollover Completed: {new_ref}",
        message=f"Loan {old_loan.loan_reference} for {client_name} successfully rolled over to new cycle {new_ref} with principal KES {eligible_principal:,.2f}.",
        category="ROLLOVER_PROPOSAL",
        loan_id=new_loan.id,
        client_id=old_loan.client_id
    )
    db.add(notif)

    log_audit(
        db=db,
        action="ROLLOVER_PROCESSED",
        entity_type="Loan",
        entity_id=str(new_loan.id),
        user_name=user_name,
        details={
            "previous_loan_reference": old_loan.loan_reference,
            "new_loan_reference": new_loan.loan_reference,
            "rolled_principal": str(eligible_principal),
            "new_interest": str(new_interest),
            "new_maturity_date": str(new_maturity),
            "prior_unpaid_interest": str(prior_unpaid_interest)
        }
    )
    db.commit()
    return new_loan

def get_loans_awaiting_rollover(db: Session) -> List[Loan]:
    today = datetime.date.today()
    loans = (
        db.query(Loan)
        .filter(
            Loan.loan_status.in_(["MATURED", "AWAITING_ROLLOVER"]),
            Loan.outstanding_principal > 0,
            Loan.rollover_status != "PROCESSED"
        )
        .order_by(Loan.maturity_date.asc())
        .all()
    )
    return loans

