import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Loan, Client, BusinessSettings, Payment
from app.schemas import LoanCreate, LoanResponse, LoanCalculationPreview
from app.services.loan_service import create_loan, calculate_loan_terms, refresh_loan_statuses, quantize_money

router = APIRouter(prefix="/api/loans", tags=["Loans"])

def populate_loan_response(l: Loan) -> LoanResponse:
    today = datetime.date.today()
    days_over = max(0, (today - l.maturity_date).days) if today > l.maturity_date else 0
    return LoanResponse(
        id=l.id,
        loan_reference=l.loan_reference,
        client_id=l.client_id,
        client_name=l.client.full_name if l.client else "Client",
        client_number=l.client.client_number if l.client else "",
        parent_loan_id=l.parent_loan_id,
        principal_amount=l.principal_amount,
        interest_rate=l.interest_rate,
        interest_amount=l.interest_amount,
        scheduled_total=l.scheduled_total,
        loan_duration_days=l.loan_duration_days,
        disbursement_date=l.disbursement_date,
        maturity_date=l.maturity_date,
        outstanding_principal=l.outstanding_principal,
        outstanding_interest=l.outstanding_interest,
        loan_status=l.loan_status,
        rollover_status=l.rollover_status,
        disbursement_method=l.disbursement_method,
        book_number=l.book_number,
        page_number=l.page_number,
        notes=l.notes,
        days_overdue=days_over,
        created_at=l.created_at
    )

@router.get("", response_model=List[LoanResponse])
def list_loans(
    status: Optional[str] = Query(None, description="ACTIVE, MATURED, AWAITING_ROLLOVER, ROLLED_OVER, FULLY_PAID, etc."),
    client_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None, description="Search loan ref, client name, book number"),
    due_filter: Optional[str] = Query(None, description="due_today, overdue, due_soon"),
    db: Session = Depends(get_db)
):
    refresh_loan_statuses(db)
    today = datetime.date.today()

    query = db.query(Loan)

    if client_id:
        query = query.filter(Loan.client_id == client_id)

    if status and status != "ALL":
        query = query.filter(Loan.loan_status == status)

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Client, Loan.client_id == Client.id).filter(
            or_(
                Loan.loan_reference.ilike(s),
                Loan.book_number.ilike(s),
                Loan.page_number.ilike(s),
                Client.full_name.ilike(s),
                Client.client_number.ilike(s)
            )
        )

    if due_filter == "due_today":
        query = query.filter(Loan.maturity_date == today, (Loan.outstanding_principal + Loan.outstanding_interest) > 0)
    elif due_filter == "overdue":
        query = query.filter(Loan.maturity_date < today, (Loan.outstanding_principal + Loan.outstanding_interest) > 0)
    elif due_filter == "due_soon":
        soon = today + datetime.timedelta(days=5)
        query = query.filter(Loan.maturity_date >= today, Loan.maturity_date <= soon, (Loan.outstanding_principal + Loan.outstanding_interest) > 0)

    loans = query.order_by(Loan.id.desc()).all()
    return [populate_loan_response(l) for l in loans]

@router.post("/calculate", response_model=LoanCalculationPreview)
def preview_loan_calculation(
    principal: Decimal,
    rate_percent: Optional[Decimal] = None,
    duration_days: Optional[int] = None,
    disbursement_date: Optional[datetime.date] = None,
    db: Session = Depends(get_db)
):
    settings = db.query(BusinessSettings).first()
    default_rate = Decimal(str(settings.default_interest_rate)) if settings else Decimal("20.00")
    default_duration = settings.default_duration_days if settings else 30

    rate = rate_percent if rate_percent is not None else default_rate
    duration = duration_days if duration_days is not None else default_duration
    disb_date = disbursement_date or datetime.date.today()

    terms = calculate_loan_terms(principal, rate, duration, disb_date)
    return terms

@router.post("", response_model=LoanResponse)
def create_new_loan(
    loan_in: LoanCreate,
    db: Session = Depends(get_db)
):
    try:
        loan = create_loan(db, loan_in, user_name="Admin")
        return populate_loan_response(loan)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}")
def get_loan_details(id: int, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    client = loan.client
    loan_resp = populate_loan_response(loan)

    # Payments associated with this loan
    payments_data = []
    for p in sorted(loan.payments, key=lambda x: x.id, reverse=True):
        allocs = [
            {"type": a.allocation_type, "amount": float(a.amount_allocated)}
            for a in p.allocations
        ]
        payments_data.append({
            "id": p.id,
            "payment_reference": p.payment_reference,
            "amount_received": float(p.amount_received),
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method,
            "external_reference": p.external_transaction_reference,
            "reversal_status": p.reversal_status,
            "reversal_reason": p.reversal_reason,
            "allocations": allocs,
            "notes": p.notes,
            "created_at": p.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })

    # Rollover cycle history
    history = []
    # Parent cycle
    if loan.parent_loan:
        history.append({
            "relation": "PREVIOUS_CYCLE",
            "loan_reference": loan.parent_loan.loan_reference,
            "id": loan.parent_loan.id,
            "principal": float(loan.parent_loan.principal_amount),
            "status": loan.parent_loan.loan_status,
            "maturity_date": str(loan.parent_loan.maturity_date)
        })

    # Child cycles
    for child in loan.child_cycles:
        history.append({
            "relation": "NEXT_CYCLE",
            "loan_reference": child.loan_reference,
            "id": child.id,
            "principal": float(child.principal_amount),
            "status": child.loan_status,
            "maturity_date": str(child.maturity_date)
        })

    return {
        "loan": loan_resp,
        "client": {
            "id": client.id,
            "client_number": client.client_number,
            "full_name": client.full_name,
            "primary_phone": client.primary_phone,
            "identification_number": client.identification_number
        },
        "payments": payments_data,
        "rollover_history": history
    }

