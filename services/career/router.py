from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from services.auth.router import get_current_user
from app.services.dashboard_service import build_dashboard
from app.services.profile_service import build_profile, get_latest_birth_data, get_latest_career_profile


router = APIRouter(tags=["dashboard"])


@router.get("/career/dashboard")
def career_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate dashboard analytics from saved user profile data."""
    profile = build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )
    return build_dashboard(profile)


@router.get("/career/dashboard/{user_id}")
def career_dashboard_by_id(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own dashboard")
    profile = build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )
    return build_dashboard(profile)
