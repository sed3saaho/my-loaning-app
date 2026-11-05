from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.database import get_db
from app.models import Client, Loan, User, ClientGuarantor, Guarantor, LoanBookReference, FollowUpNote
from app.schemas import ClientCreate, ClientUpdate, ClientResponse, DuplicateCheckResponse
from app.services.client_service import create_client, update_client, check_duplicate_clients
from app.auth import get_current_user

router = APIRouter(prefix="/api/clients", tags=["Clients"])

def populate_client_response(client: Client) -> ClientResponse:
    active_loans = [l for l in client.loans if l.loan_status in ["ACTIVE", "PARTIALLY_PAID", "MATURED", "AWAITING_ROLLOVER"]]
    out_principal = sum((l.outstanding_principal for l in active_loans), Decimal("0.00"))
    out_interest = sum((l.outstanding_interest for l in active_loans), Decimal("0.00"))

    return ClientResponse(
        id=client.id,
        client_number=client.client_number,
        full_name=client.full_name,
        identification_type=client.identification_type,
        identification_number=client.identification_number,
        year_of_birth=client.year_of_birth,
        primary_phone=client.primary_phone,
        alternative_phone=client.alternative_phone,
        county=client.county,
        town=client.town,
        physical_address=client.physical_address,
        registration_date=client.registration_date,
        client_status=client.client_status,
        notes=client.notes,
        created_at=client.created_at,
        active_loans_count=len(active_loans),
        total_outstanding_principal=out_principal,
        total_outstanding_interest=out_interest
    )

@router.get("", response_model=List[ClientResponse])
def list_clients(
    search: Optional[str] = Query(None, description="Search by name, client number, ID, or phone"),
    status: Optional[str] = Query(None, description="Filter by ACTIVE, INACTIVE, BLACKLISTED"),
    db: Session = Depends(get_db)
):
    query = db.query(Client)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Client.full_name.ilike(s),
                Client.client_number.ilike(s),
                Client.identification_number.ilike(s),
                Client.primary_phone.ilike(s),
                Client.county.ilike(s),
                Client.town.ilike(s)
            )
        )
    if status and status != "ALL":
        query = query.filter(Client.client_status == status)

    clients = query.order_by(Client.id.desc()).all()
    return [populate_client_response(c) for c in clients]

@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate(
    full_name: str,
    primary_phone: str,
    identification_number: Optional[str] = None,
    db: Session = Depends(get_db)
):
    duplicates = check_duplicate_clients(db, full_name, primary_phone, identification_number)
    return DuplicateCheckResponse(
        has_duplicates=len(duplicates) > 0,
        matching_clients=[populate_client_response(c) for c in duplicates]
    )

@router.post("", response_model=ClientResponse)
def register_client(
    client_in: ClientCreate,
    db: Session = Depends(get_db)
):
    try:
        client = create_client(db, client_in, user_name="Admin")
        return populate_client_response(client)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}")
def get_client_profile(id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    client_resp = populate_client_response(client)

    # Detailed loans
    loans_data = []
    for l in sorted(client.loans, key=lambda x: x.id, reverse=True):
        loans_data.append({
            "id": l.id,
            "loan_reference": l.loan_reference,
            "parent_loan_id": l.parent_loan_id,
            "principal_amount": float(l.principal_amount),
            "interest_rate": float(l.interest_rate),
            "interest_amount": float(l.interest_amount),
            "scheduled_total": float(l.scheduled_total),
            "outstanding_principal": float(l.outstanding_principal),
            "outstanding_interest": float(l.outstanding_interest),
            "disbursement_date": str(l.disbursement_date),
            "maturity_date": str(l.maturity_date),
            "loan_status": l.loan_status,
            "rollover_status": l.rollover_status,
            "disbursement_method": l.disbursement_method,
            "book_number": l.book_number,
            "page_number": l.page_number,
            "notes": l.notes
        })

    # Linked Guarantors
    guarantors_data = []
    for link in client.guarantor_links:
        g = link.guarantor
        if g:
            guarantors_data.append({
                "id": g.id,
                "full_name": g.full_name,
                "phone_number": g.phone_number,
                "alternative_phone": g.alternative_phone,
                "relationship": g.relationship,
                "consent_status": g.consent_status,
                "residential_address": g.residential_address
            })

    # Book references
    book_refs = [
        {
            "id": b.id,
            "book_number": b.book_number,
            "page_number": b.page_number,
            "date_recorded": str(b.date_recorded),
            "notes": b.notes
        }
        for b in client.book_references
    ]

    # Follow up notes
    notes = [
        {
            "id": n.id,
            "note_type": n.note_type,
            "description": n.description,
            "next_action_date": str(n.next_action_date) if n.next_action_date else None,
            "recorded_by": n.recorded_by,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for n in sorted(client.follow_up_notes, key=lambda x: x.id, reverse=True)
    ]

    return {
        "client": client_resp,
        "loans": loans_data,
        "guarantors": guarantors_data,
        "book_references": book_refs,
        "follow_up_notes": notes
    }

@router.put("/{id}", response_model=ClientResponse)
def update_client_details(
    id: int,
    client_update: ClientUpdate,
    db: Session = Depends(get_db)
):
    client = update_client(db, id, client_update, user_name="Admin")
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return populate_client_response(client)

