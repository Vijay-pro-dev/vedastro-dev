import os
import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app import models
from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.suggestion import SuggestionCreate, SuggestionOut, SuggestionsListResponse
from app.services.activity_service import create_activity_log
from services.auth.router import get_current_user


router = APIRouter(tags=["suggestions"])
settings = get_settings()


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
        image_url=getattr(record, "image_url", None),
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

    image_url = payload.image_url.strip() if payload.image_url else None
    record = models.Suggestion(user_id=current_user.id, message=message, image_url=image_url, status="pending")
    record.touch()
    db.add(record)
    create_activity_log(
        db,
        current_user.id,
        "suggestion_created",
        "User submitted a suggestion",
        {"message": message[:500], "has_image": bool(image_url)},
    )
    db.commit()
    db.refresh(record)
    return _serialize(record)


@router.post("/suggestions/upload")
def upload_suggestion_image(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
):
    """Upload an image attachment for a suggestion and return a public URL."""
    extension = os.path.splitext(file.filename or "")[1] or ".jpg"
    if extension.lower() not in {ext.lower() for ext in settings.allowed_upload_extensions}:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > settings.max_upload_size_bytes:
        raise HTTPException(status_code=400, detail="File too large")

    os.makedirs(settings.uploads_dir, exist_ok=True)
    file_name = f"suggestion_{current_user.id}_{int(datetime.now(timezone.utc).timestamp())}{extension}"
    file_path = os.path.join(settings.uploads_dir, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"{str(request.base_url).rstrip('/')}/uploads/{file_name}"
    return {"image_url": image_url}
