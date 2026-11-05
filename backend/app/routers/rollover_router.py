import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Loan
from app.schemas import RolloverProposal, RolloverExecuteRequest, LoanResponse
from app.services.rollover_service import (
    get_rollover_proposal, execute_rollover, get_loans_awaiting_rollover
)
from app.routers.loan_router import populate_loan_response

router = APIRouter(prefix="/api/rollovers", tags=["Rollovers"])

@router.get("/pending", response_model=List[LoanResponse])
def list_pending_rollovers(db: Session = Depends(get_db)):
    loans = get_loans_awaiting_rollover(db)
    return [populate_loan_response(l) for l in loans]

@router.get("/proposal/{loan_id}", response_model=RolloverProposal)
def get_proposal(loan_id: int, db: Session = Depends(get_db)):
    try:
        proposal = get_rollover_proposal(db, loan_id)
        return proposal
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/execute", response_model=LoanResponse)
def run_rollover(req: RolloverExecuteRequest, db: Session = Depends(get_db)):
    try:
        new_loan = execute_rollover(
            db=db,
            loan_id=req.loan_id,
            rollover_date=req.rollover_date,
            notes=req.notes,
            user_name="Admin"
        )
        return populate_loan_response(new_loan)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

