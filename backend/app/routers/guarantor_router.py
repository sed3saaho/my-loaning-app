from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models import Guarantor, ClientGuarantor
from app.schemas import GuarantorCreate, GuarantorUpdate, GuarantorResponse
from app.audit import log_audit

router = APIRouter(prefix="/api/guarantors", tags=["Guarantors"])

@router.get("", response_model=List[GuarantorResponse])
def list_guarantors(
    search: Optional[str] = Query(None, description="Search by name, ID, or phone"),
    db: Session = Depends(get_db)
):
    query = db.query(Guarantor)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Guarantor.full_name.ilike(s),
                Guarantor.identification_number.ilike(s),
                Guarantor.phone_number.ilike(s)
            )
        )
    return query.order_by(Guarantor.id.desc()).all()

@router.post("", response_model=GuarantorResponse)
def create_guarantor(
    guarantor_in: GuarantorCreate,
    db: Session = Depends(get_db)
):
    guarantor = Guarantor(
        full_name=guarantor_in.full_name.strip(),
        identification_type=guarantor_in.identification_type,
        identification_number=guarantor_in.identification_number.strip() if guarantor_in.identification_number else None,
        phone_number=guarantor_in.phone_number.strip(),
        alternative_phone=guarantor_in.alternative_phone.strip() if guarantor_in.alternative_phone else None,
        residential_address=guarantor_in.residential_address.strip() if guarantor_in.residential_address else None,
        relationship_type=guarantor_in.relationship.strip() if guarantor_in.relationship else None,
        consent_status=guarantor_in.consent_status,
        notes=guarantor_in.notes
    )
    db.add(guarantor)
    db.commit()
    db.refresh(guarantor)

    log_audit(
        db,
        action="GUARANTOR_CREATED",
        entity_type="Guarantor",
        entity_id=str(guarantor.id),
        details={"name": guarantor.full_name, "phone": guarantor.phone_number}
    )
    db.commit()
    return guarantor

@router.get("/{id}")
def get_guarantor_detail(id: int, db: Session = Depends(get_db)):
    guarantor = db.query(Guarantor).filter(Guarantor.id == id).first()
    if not guarantor:
        raise HTTPException(status_code=404, detail="Guarantor not found")

    linked_clients = []
    for link in guarantor.client_links:
        c = link.client
        if c:
            linked_clients.append({
                "client_id": c.id,
                "client_number": c.client_number,
                "full_name": c.full_name,
                "primary_phone": c.primary_phone,
                "status": c.client_status
            })

    return {
        "guarantor": guarantor,
        "linked_clients": linked_clients
    }

@router.put("/{id}", response_model=GuarantorResponse)
def update_guarantor(
    id: int,
    guarantor_update: GuarantorUpdate,
    db: Session = Depends(get_db)
):
    guarantor = db.query(Guarantor).filter(Guarantor.id == id).first()
    if not guarantor:
        raise HTTPException(status_code=404, detail="Guarantor not found")

    for field, val in guarantor_update.dict(exclude_unset=True).items():
        setattr(guarantor, field, val)

    db.commit()
    db.refresh(guarantor)
    log_audit(db, action="GUARANTOR_UPDATED", entity_type="Guarantor", entity_id=str(guarantor.id))
    db.commit()
    return guarantor
