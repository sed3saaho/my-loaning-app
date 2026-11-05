import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CashbookEntry
from app.schemas import CashbookEntryCreate, CashbookEntryResponse, CashbookSummaryResponse
from app.services.cashbook_service import create_cashbook_entry, get_cashbook_summary

router = APIRouter(prefix="/api/cashbook", tags=["Cashbook"])

@router.get("", response_model=List[CashbookEntryResponse])
def list_cashbook_entries(
    start_date: Optional[datetime.date] = None,
    end_date: Optional[datetime.date] = None,
    entry_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(CashbookEntry)
    if start_date:
        query = query.filter(CashbookEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(CashbookEntry.entry_date <= end_date)
    if entry_type and entry_type != "ALL":
        query = query.filter(CashbookEntry.entry_type == entry_type)

    entries = query.order_by(CashbookEntry.entry_date.desc(), CashbookEntry.id.desc()).all()
    return entries

@router.get("/summary", response_model=CashbookSummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    return get_cashbook_summary(db)

@router.post("/entry", response_model=CashbookEntryResponse)
def add_entry(entry_in: CashbookEntryCreate, db: Session = Depends(get_db)):
    try:
        entry = create_cashbook_entry(db, entry_in, user_name="Admin")
        return entry
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

