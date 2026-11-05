from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import CashbookEntry, Loan
from app.schemas import CashbookEntryCreate, CashbookSummaryResponse
from app.services.loan_service import quantize_money
from app.audit import log_audit

def create_cashbook_entry(
    db: Session,
    entry_in: CashbookEntryCreate,
    user_name: str = "Admin"
) -> CashbookEntry:
    entry = CashbookEntry(
        entry_type=entry_in.entry_type,
        category=entry_in.category,
        amount=quantize_money(entry_in.amount),
        entry_date=entry_in.entry_date,
        reference_type="MANUAL",
        description=entry_in.description.strip(),
        recorded_by=user_name
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_audit(
        db=db,
        action="CASHBOOK_ENTRY_CREATED",
        entity_type="CashbookEntry",
        entity_id=str(entry.id),
        user_name=user_name,
        details={
            "type": entry.entry_type,
            "category": entry.category,
            "amount": str(entry.amount),
            "description": entry.description
        }
    )
    db.commit()
    return entry

def get_cashbook_summary(db: Session) -> CashbookSummaryResponse:
    entries = db.query(CashbookEntry).all()

    capital_in = Decimal("0.00")
    repayments = Decimal("0.00")
    other_income = Decimal("0.00")
    disbursements = Decimal("0.00")
    expenses = Decimal("0.00")
    withdrawals = Decimal("0.00")

    for e in entries:
        amt = quantize_money(e.amount)
        if e.entry_type == "CAPITAL_IN":
            capital_in += amt
        elif e.entry_type == "LOAN_REPAYMENT":
            repayments += amt
        elif e.entry_type == "OTHER_INCOME":
            other_income += amt
        elif e.entry_type == "LOAN_DISBURSEMENT":
            disbursements += amt
        elif e.entry_type == "EXPENSE":
            expenses += amt
        elif e.entry_type == "CAPITAL_WITHDRAWAL":
            withdrawals += amt

    available_cash = (capital_in + repayments + other_income) - (disbursements + expenses + withdrawals)

    # Active loans in field
    active_loans = db.query(Loan).filter(
        Loan.loan_status.in_(["ACTIVE", "PARTIALLY_PAID", "MATURED", "AWAITING_ROLLOVER"])
    ).all()

    out_principal = sum((l.outstanding_principal for l in active_loans), Decimal("0.00"))
    out_interest = sum((l.outstanding_interest for l in active_loans), Decimal("0.00"))

    return CashbookSummaryResponse(
        available_cash=quantize_money(available_cash),
        total_capital_introduced=quantize_money(capital_in),
        total_repayments_collected=quantize_money(repayments),
        total_other_income=quantize_money(other_income),
        total_loan_disbursements=quantize_money(disbursements),
        total_expenses=quantize_money(expenses),
        total_capital_withdrawn=quantize_money(withdrawals),
        outstanding_principal=quantize_money(out_principal),
        outstanding_interest=quantize_money(out_interest)
    )

