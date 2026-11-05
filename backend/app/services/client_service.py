import datetime
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models import Client, Loan, Guarantor, ClientGuarantor, LoanBookReference
from app.schemas import ClientCreate, ClientUpdate
from app.audit import log_audit

def generate_client_number(db: Session) -> str:
    year = datetime.date.today().year
    prefix = f"CL-{year}-"
    # Find max sequence for this year
    last_client = (
        db.query(Client)
        .filter(Client.client_number.like(f"{prefix}%"))
        .order_by(Client.id.desc())
        .first()
    )
    if not last_client:
        return f"{prefix}0001"
    try:
        last_num = int(last_client.client_number.split("-")[-1])
        next_num = last_num + 1
        return f"{prefix}{next_num:04d}"
    except Exception:
        count = db.query(Client).count() + 1
        return f"{prefix}{count:04d}"

def check_duplicate_clients(
    db: Session,
    full_name: str,
    primary_phone: str,
    identification_number: Optional[str] = None
) -> List[Client]:
    query = db.query(Client)
    filters = [
        func.lower(Client.full_name) == full_name.strip().lower(),
        Client.primary_phone == primary_phone.strip()
    ]
    if identification_number and identification_number.strip():
        filters.append(Client.identification_number == identification_number.strip())

    duplicates = query.filter(or_(*filters)).all()
    return duplicates

def create_client(db: Session, client_in: ClientCreate, user_name: str = "Admin") -> Client:
    client_number = generate_client_number(db)
    reg_date = client_in.registration_date or datetime.date.today()

    client = Client(
        client_number=client_number,
        full_name=client_in.full_name.strip(),
        identification_type=client_in.identification_type,
        identification_number=client_in.identification_number.strip() if client_in.identification_number else None,
        year_of_birth=client_in.year_of_birth,
        primary_phone=client_in.primary_phone.strip(),
        alternative_phone=client_in.alternative_phone.strip() if client_in.alternative_phone else None,
        county=client_in.county.strip() if client_in.county else None,
        town=client_in.town.strip() if client_in.town else None,
        physical_address=client_in.physical_address.strip() if client_in.physical_address else None,
        registration_date=reg_date,
        client_status="ACTIVE",
        notes=client_in.notes
    )
    db.add(client)
    db.flush()

    # Link guarantors if supplied
    if client_in.guarantor_ids:
        for g_id in client_in.guarantor_ids:
            link = ClientGuarantor(client_id=client.id, guarantor_id=g_id)
            db.add(link)

    # Initial physical book opening reference if supplied
    if client_in.initial_book_number and client_in.initial_page_number:
        book_ref = LoanBookReference(
            client_id=client.id,
            book_number=client_in.initial_book_number.strip(),
            page_number=client_in.initial_page_number.strip(),
            date_recorded=reg_date,
            notes="Opening physical book reference recorded at registration"
        )
        db.add(book_ref)

    db.commit()
    db.refresh(client)

    log_audit(
        db=db,
        action="CLIENT_CREATED",
        entity_type="Client",
        entity_id=str(client.id),
        user_name=user_name,
        details={
            "client_number": client.client_number,
            "full_name": client.full_name,
            "primary_phone": client.primary_phone
        }
    )
    db.commit()
    return client

def update_client(db: Session, client_id: int, client_update: ClientUpdate, user_name: str = "Admin") -> Optional[Client]:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        return None

    changes = {}
    for field, val in client_update.dict(exclude_unset=True).items():
        old_val = getattr(client, field)
        if old_val != val:
            changes[field] = {"old": str(old_val), "new": str(val)}
            setattr(client, field, val)

    if changes:
        db.commit()
        db.refresh(client)
        log_audit(
            db=db,
            action="CLIENT_UPDATED",
            entity_type="Client",
            entity_id=str(client.id),
            user_name=user_name,
            details=changes
        )
        db.commit()

    return client

