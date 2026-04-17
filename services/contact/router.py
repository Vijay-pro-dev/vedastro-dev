from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.core.security import decode_access_token
from app.schemas.contact import ContactRequest
from app.services.activity_service import create_activity_log


router = APIRouter(tags=["contact"])
auth_scheme = HTTPBearer(auto_error=False)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _maybe_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> models.User | None:
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub"))
    except Exception:
        return None
    return db.query(models.User).filter(models.User.id == user_id).first()


@router.post("/contact")
def submit_contact_request(
    payload: ContactRequest,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(_maybe_current_user),
):
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid email.")

    name = payload.name.strip()
    subject = (payload.subject or "").strip() or "Contact request"
    message = payload.message.strip()

    record = models.ContactMessage(
        user_id=getattr(current_user, "id", None),
        name=name,
        email=email,
        subject=subject,
        message=message,
    )
    db.add(record)

    create_activity_log(
        db,
        getattr(current_user, "id", None),
        "contact_request",
        f"Contact request from {email}",
        {
            "name": name,
            "email": email,
            "subject": subject,
            "message": message,
            "submitted_at": _utc_now().isoformat(),
        },
    )
    db.commit()
    db.refresh(record)
    return {"ok": True, "message": "Thanks! We received your message.", "contact_id": record.id}
