from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import LoanBookReference, Client, Loan
from app.schemas import LoanBookReferenceCreate, LoanBookReferenceResponse
from app.audit import log_audit

router = APIRouter(prefix="/api/book-references", tags=["Book References"])

@router.get("", response_model=List[LoanBookReferenceResponse])
def search_book_references(
    search: Optional[str] = Query(None, description="Search by book number, page number, client"),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(LoanBookReference)
    if client_id:
        query = query.filter(LoanBookReference.client_id == client_id)
    if search:
        s = f"%{search.strip()}%"
        query = query.join(Client, LoanBookReference.client_id == Client.id).filter(
            or_(
                LoanBookReference.book_number.ilike(s),
                LoanBookReference.page_number.ilike(s),
                Client.full_name.ilike(s),
                Client.client_number.ilike(s)
            )
        )

    records = query.order_by(LoanBookReference.id.desc()).all()
    results = []
    for r in records:
        results.append(
            LoanBookReferenceResponse(
                id=r.id,
                client_id=r.client_id,
                client_name=r.client.full_name if r.client else "Client",
                loan_id=r.loan_id,
                loan_reference=r.loan.loan_reference if r.loan else None,
                book_number=r.book_number,
                page_number=r.page_number,
                date_recorded=r.date_recorded,
                scanned_document_path=r.scanned_document_path,
                notes=r.notes,
                created_at=r.created_at
            )
        )
    return results

@router.post("", response_model=LoanBookReferenceResponse)
def create_book_reference(
    ref_in: LoanBookReferenceCreate,
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == ref_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    rec = LoanBookReference(
        client_id=client.id,
        loan_id=ref_in.loan_id,
        book_number=ref_in.book_number.strip(),
        page_number=ref_in.page_number.strip(),
        date_recorded=ref_in.date_recorded,
        notes=ref_in.notes
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    log_audit(
        db=db,
        action="BOOK_REFERENCE_RECORDED",
        entity_type="LoanBookReference",
        entity_id=str(rec.id),
        details={"book": rec.book_number, "page": rec.page_number, "client": client.full_name}
    )
    db.commit()

    loan = db.query(Loan).filter(Loan.id == rec.loan_id).first() if rec.loan_id else None

    return LoanBookReferenceResponse(
        id=rec.id,
        client_id=rec.client_id,
        client_name=client.full_name,
        loan_id=rec.loan_id,
        loan_reference=loan.loan_reference if loan else None,
        book_number=rec.book_number,
        page_number=rec.page_number,
        date_recorded=rec.date_recorded,
        scanned_document_path=rec.scanned_document_path,
        notes=rec.notes,
        created_at=rec.created_at
    )

