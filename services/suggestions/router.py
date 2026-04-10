from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.schemas.suggestion import SuggestionCreate, SuggestionOut, SuggestionsListResponse
from app.services.activity_service import create_activity_log
from services.auth.router import get_current_user


router = APIRouter(tags=["suggestions"])


def _iso(dt) -> str | None:
    if not dt:
        return None
    if getattr(dt, "tzinfo", None) is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.isoformat()


def _serialize(record: models.Suggestion) -> SuggestionOut:
    return SuggestionOut(
        id=record.id,
        user_id=record.user_id,
        message=record.message,
        status=record.status or "pending",
        admin_response=getattr(record, "admin_response", None),
        created_at=_iso(getattr(record, "created_at", None)),
        updated_at=_iso(getattr(record, "updated_at", None)),
        resolved_at=_iso(getattr(record, "resolved_at", None)),
    )


@router.get("/suggestions", response_model=SuggestionsListResponse)
def list_my_suggestions(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    suggestions = (
        db.query(models.Suggestion)
        .filter(models.Suggestion.user_id == current_user.id)
        .order_by(models.Suggestion.created_at.desc())
        .limit(20)
        .all()
    )
    return {"suggestions": [_serialize(item) for item in suggestions]}


@router.post("/suggestions", response_model=SuggestionOut)
def create_suggestion(
    payload: SuggestionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Suggestion message is required")

    record = models.Suggestion(user_id=current_user.id, message=message, status="pending")
    record.touch()
    db.add(record)
    create_activity_log(
        db,
        current_user.id,
        "suggestion_created",
        "User submitted a suggestion",
        {"message": message[:500]},
    )
    db.commit()
    db.refresh(record)
    return _serialize(record)

