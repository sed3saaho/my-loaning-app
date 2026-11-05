import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DashboardSummaryResponse
from app.services.report_service import get_dashboard_summary, get_loan_aging_report, get_collections_report

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard(db: Session = Depends(get_db)):
    return get_dashboard_summary(db)

@router.get("/aging")
def get_aging(db: Session = Depends(get_db)):
    return get_loan_aging_report(db)

@router.get("/collections")
def get_collections(
    start_date: Optional[datetime.date] = None,
    end_date: Optional[datetime.date] = None,
    payment_method: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return get_collections_report(db, start_date, end_date, payment_method)

