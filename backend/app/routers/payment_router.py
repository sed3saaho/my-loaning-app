import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Payment, Loan, Client, PaymentAllocation
from app.schemas import (
    PaymentCreate, PaymentResponse, PaymentPreviewRequest,
    PaymentPreviewResponse, PaymentReversalRequest, PaymentAllocationResponse
)
from app.services.payment_service import (
    record_payment, reverse_payment, calculate_payment_allocation, quantize_money
)

router = APIRouter(prefix="/api/payments", tags=["Payments"])

def populate_payment_response(p: Payment) -> PaymentResponse:
    allocs = [
        PaymentAllocationResponse(
            id=a.id,
            allocation_type=a.allocation_type,
            amount_allocated=a.amount_allocated,
            created_at=a.created_at
        )
        for a in p.allocations
    ]
    return PaymentResponse(
        id=p.id,
        payment_reference=p.payment_reference,
        client_id=p.client_id,
        client_name=p.loan.client.full_name if p.loan and p.loan.client else "Client",
        loan_id=p.loan_id,
        loan_reference=p.loan.loan_reference if p.loan else "Loan",
        amount_received=p.amount_received,
        payment_date=p.payment_date,
        payment_method=p.payment_method,
        external_transaction_reference=p.external_transaction_reference,
        recorded_by=p.recorded_by,
        reversal_status=p.reversal_status,
        reversal_reason=p.reversal_reason,
        reversed_at=p.reversed_at,
        notes=p.notes,
        created_at=p.created_at,
        allocations=allocs
    )

@router.get("", response_model=List[PaymentResponse])
def list_payments(
    search: Optional[str] = Query(None, description="Search by payment ref, client, external ref"),
    loan_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="ACTIVE or REVERSED"),
    db: Session = Depends(get_db)
):
    query = db.query(Payment)

    if loan_id:
        query = query.filter(Payment.loan_id == loan_id)
    if client_id:
        query = query.filter(Payment.client_id == client_id)
    if status and status != "ALL":
        query = query.filter(Payment.reversal_status == status)

    if search:
        s = f"%{search.strip()}%"
        query = query.join(Client, Payment.client_id == Client.id).filter(
            or_(
                Payment.payment_reference.ilike(s),
                Payment.external_transaction_reference.ilike(s),
                Client.full_name.ilike(s),
                Client.client_number.ilike(s)
            )
        )

    payments = query.order_by(Payment.id.desc()).all()
    return [populate_payment_response(p) for p in payments]

@router.post("/preview", response_model=PaymentPreviewResponse)
def preview_payment(req: PaymentPreviewRequest, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == req.loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    result = calculate_payment_allocation(
        outstanding_interest=loan.outstanding_interest,
        outstanding_principal=loan.outstanding_principal,
        payment_amount=req.amount,
        maturity_date=loan.maturity_date
    )
    result.loan_id = loan.id
    return result

@router.post("", response_model=PaymentResponse)
def create_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db)
):
    try:
        payment = record_payment(db, payment_in, user_name="Admin")
        return populate_payment_response(payment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/reverse", response_model=PaymentResponse)
def do_reverse_payment(
    id: int,
    reversal_in: PaymentReversalRequest,
    db: Session = Depends(get_db)
):
    try:
        payment = reverse_payment(
            db=db,
            payment_id=id,
            reversal_reason=reversal_in.reason,
            user_name="Admin"
        )
        return populate_payment_response(payment)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

