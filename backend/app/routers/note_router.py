from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FollowUpNote, Client, Loan
from app.schemas import FollowUpNoteCreate, FollowUpNoteResponse
from app.audit import log_audit

router = APIRouter(prefix="/api/notes", tags=["Follow-up Notes"])

@router.get("", response_model=List[FollowUpNoteResponse])
def list_notes(
    client_id: Optional[int] = Query(None),
    loan_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(FollowUpNote)
    if client_id:
        query = query.filter(FollowUpNote.client_id == client_id)
    if loan_id:
        query = query.filter(FollowUpNote.loan_id == loan_id)

    notes = query.order_by(FollowUpNote.id.desc()).all()
    return notes

@router.post("", response_model=FollowUpNoteResponse)
def create_note(
    note_in: FollowUpNoteCreate,
    db: Session = Depends(get_db)
):
    client = db.query(Client).filter(Client.id == note_in.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    note = FollowUpNote(
        client_id=note_in.client_id,
        loan_id=note_in.loan_id,
        note_type=note_in.note_type,
        description=note_in.description.strip(),
        next_action_date=note_in.next_action_date,
        recorded_by="Admin"
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit(
        db=db,
        action="NOTE_ADDED",
        entity_type="FollowUpNote",
        entity_id=str(note.id),
        details={"type": note.note_type, "client": client.full_name}
    )
    db.commit()
    return note

