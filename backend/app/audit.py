import json
from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models import AuditLog

def log_audit(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_name: str = "Admin",
    details: Optional[Any] = None
):
    details_str = None
    if details is not None:
        if isinstance(details, (dict, list)):
            try:
                details_str = json.dumps(details, default=str)
            except Exception:
                details_str = str(details)
        else:
            details_str = str(details)

    log_entry = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        user_name=user_name,
        details=details_str
    )
    db.add(log_entry)
    db.flush()
    return log_entry

