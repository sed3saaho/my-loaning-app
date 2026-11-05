from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.models import BusinessSettings
from app.schemas import BusinessSettingsSchema, BusinessSettingsUpdate
from app.audit import log_audit

router = APIRouter(prefix="/api/settings", tags=["Settings"])

@router.get("", response_model=BusinessSettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings(
            business_name="Keith Capital Lending",
            currency="KES",
            default_duration_days=30,
            default_interest_rate=Decimal("20.00"),
            rollover_mode="MANUAL",
            require_mfa=False
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=BusinessSettingsSchema)
def update_settings(update_in: BusinessSettingsUpdate, db: Session = Depends(get_db)):
    settings = db.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings()
        db.add(settings)

    for field, val in update_in.dict(exclude_unset=True).items():
        setattr(settings, field, val)

    db.commit()
    db.refresh(settings)

    log_audit(db, action="SETTINGS_UPDATED", entity_type="BusinessSettings", details=update_in.dict(exclude_unset=True))
    db.commit()
    return settings

