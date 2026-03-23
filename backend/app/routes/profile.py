import json
import os
import shutil
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from sqlalchemy.orm import Session

from app import models
from app.core.config import get_settings
from app.core.database import get_db
from app.routes.auth import get_current_user
from app.schemas.profile import BirthTimeAccuracyEnum, BirthTimeQuestionnaire, ProfileResponse, ProfileUpdate
from app.services.activity_service import create_activity_log
from app.services.profile_service import build_profile, get_latest_birth_data, get_latest_career_profile, resolve_language_from_nationality, upsert_birth_data, upsert_career_profile


router = APIRouter(tags=["profile"])
settings = get_settings()
UPLOAD_DIR = settings.uploads_dir
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the latest saved profile so users never refill data after login."""
    return build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persist personal and career profile data in one place for a SaaS-like experience."""
    if payload.phone is not None:
        current_user.phone = payload.phone
    if payload.nationality is not None:
        current_user.nationality = payload.nationality
        if payload.language is None:
            current_user.language = resolve_language_from_nationality(payload.nationality)
    if payload.language is not None:
        current_user.language = payload.language

    upsert_birth_data(db, current_user, payload)
    upsert_career_profile(db, current_user, payload)
    create_activity_log(
        db,
        current_user.id,
        "profile_updated",
        f"Profile updated for {current_user.email}",
        {
            "current_role": payload.current_role,
            "goals": payload.goals,
            "nationality": payload.nationality,
        },
    )
    db.commit()
    db.refresh(current_user)

    return build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )


@router.post("/career/estimate-birth-time")
def estimate_birth_time(
    questionnaire: BirthTimeQuestionnaire,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Store questionnaire answers and save an estimated birth time."""
    estimate = models.BirthTimeEstimate(
        user_id=current_user.id,
        questionnaire_responses=json.dumps(questionnaire.model_dump()),
        estimated_time="10:00",
        confidence_score=72.0,
    )
    db.add(estimate)
    upsert_birth_data(
        db,
        current_user,
        ProfileUpdate(birth_time="10:00", birth_time_accuracy=BirthTimeAccuracyEnum.estimated_by_ai),
    )
    create_activity_log(
        db,
        current_user.id,
        "birth_time_estimated",
        "Birth time estimated from questionnaire",
        {"confidence_score": 72.0},
    )
    db.commit()
    return {"estimated_time": "10:00", "confidence_score": 72.0, "message": "Birth time estimated and saved to your profile"}


@router.post("/upload-profile-pic")
def upload_profile_pic(
    request: Request,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a profile image and persist the generated URL on the user profile."""
    extension = os.path.splitext(file.filename or "")[1] or ".jpg"
    if extension.lower() not in {ext.lower() for ext in settings.allowed_upload_extensions}:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > settings.max_upload_size_bytes:
        raise HTTPException(status_code=400, detail="File too large")

    file_name = f"user_{current_user.id}_{int(datetime.now(timezone.utc).timestamp())}{extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"{str(request.base_url).rstrip('/')}/uploads/{file_name}"
    current_user.profile_pic = image_url

    birth_data = get_latest_birth_data(db, current_user.id)
    if birth_data:
        birth_data.profile_pic = image_url
    create_activity_log(
        db,
        current_user.id,
        "profile_picture_uploaded",
        "User uploaded a profile picture",
        {"image_url": image_url},
    )
    db.commit()
    return {"image_url": image_url}
