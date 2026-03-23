from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app import models
from app.schemas.profile import ProfileUpdate


def utc_now() -> datetime:
    """Return a naive UTC timestamp compatible with existing DB columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_latest_birth_data(db: Session, user_id: int):
    return (
        db.query(models.BirthData)
        .filter(models.BirthData.user_id == user_id)
        .order_by(models.BirthData.id.desc())
        .first()
    )


def get_latest_career_profile(db: Session, user_id: int):
    return (
        db.query(models.CareerProfile)
        .filter(models.CareerProfile.user_id == user_id)
        .order_by(models.CareerProfile.id.desc())
        .first()
    )


def build_profile(user: models.User, birth_data, career_profile) -> dict:
    raw_birth_time_accuracy = getattr(birth_data, "birth_time_accuracy", "unknown") or "unknown"
    if raw_birth_time_accuracy.startswith("BirthTimeAccuracyEnum."):
        raw_birth_time_accuracy = raw_birth_time_accuracy.split(".", 1)[1]

    profile = {
        "user_id": user.id,
        "email": user.email,
        "email_verified": bool(getattr(user, "email_verified", 0)),
        "name": user.name or "",
        "phone": user.phone or "",
        "address": user.address or getattr(birth_data, "address", "") or "",
        "nationality": user.nationality or "global",
        "language": user.language or "english",
        "role": user.role or "user",
        "profile_pic": user.profile_pic or getattr(birth_data, "profile_pic", "") or "",
        "dob": getattr(birth_data, "dob", "") or "",
        "birth_time": getattr(birth_data, "birth_time", "") or "",
        "birth_place": getattr(birth_data, "birth_place", "") or "",
        "birth_time_accuracy": raw_birth_time_accuracy,
        "education": getattr(career_profile, "education", "") or "",
        "interests": getattr(career_profile, "interests", "") or "",
        "goals": getattr(career_profile, "goals", "") or "",
        "current_role": getattr(career_profile, "current_role", "") or "",
        "years_experience": getattr(career_profile, "years_experience", 0) or 0,
        "goal_clarity": getattr(career_profile, "goal_clarity", "medium") or "medium",
        "role_match": getattr(career_profile, "role_match", "medium") or "medium",
    }
    profile["profile_completed"] = all(
        bool(value)
        for value in [profile["name"], profile["dob"], profile["birth_place"], profile["education"], profile["goals"]]
    )
    return profile


def user_summary_from_profile(profile: dict) -> dict:
    return {
        "user_id": profile["user_id"],
        "email": profile["email"],
        "email_verified": profile["email_verified"],
        "name": profile["name"],
        "phone": profile["phone"],
        "address": profile["address"],
        "nationality": profile["nationality"],
        "language": profile["language"],
        "role": profile["role"],
        "profile_pic": profile["profile_pic"],
        "profile_completed": profile["profile_completed"],
    }


def upsert_birth_data(db: Session, user: models.User, payload: ProfileUpdate):
    birth_data = get_latest_birth_data(db, user.id)
    if not birth_data:
        birth_data = models.BirthData(user_id=user.id)
        db.add(birth_data)

    if payload.name is not None:
        user.name = payload.name
        birth_data.name = payload.name
    if payload.address is not None:
        user.address = payload.address
        birth_data.address = payload.address
    if payload.profile_pic is not None:
        user.profile_pic = payload.profile_pic
        birth_data.profile_pic = payload.profile_pic
    if payload.dob is not None:
        birth_data.dob = payload.dob
    if payload.birth_time is not None:
        birth_data.birth_time = payload.birth_time
    if payload.birth_place is not None:
        birth_data.birth_place = payload.birth_place
    if payload.birth_time_accuracy is not None:
        birth_data.birth_time_accuracy = payload.birth_time_accuracy.value

    birth_data.updated_at = utc_now()
    user.updated_at = utc_now()


def upsert_career_profile(db: Session, user: models.User, payload: ProfileUpdate):
    career_profile = get_latest_career_profile(db, user.id)
    if not career_profile:
        career_profile = models.CareerProfile(user_id=user.id)
        db.add(career_profile)

    if payload.education is not None:
        career_profile.education = payload.education
    if payload.interests is not None:
        career_profile.interests = payload.interests
    if payload.goals is not None:
        career_profile.goals = payload.goals
    if payload.current_role is not None:
        career_profile.current_role = payload.current_role
    if payload.years_experience is not None:
        career_profile.years_experience = payload.years_experience
    if payload.goal_clarity is not None:
        career_profile.goal_clarity = payload.goal_clarity
    if payload.role_match is not None:
        career_profile.role_match = payload.role_match

    career_profile.updated_at = utc_now()
    user.updated_at = utc_now()


def resolve_language_from_nationality(nationality: str | None) -> str:
    mapping = {
        "india": "hindi",
        "france": "french",
        "germany": "german",
        "arab": "arabic",
        "saudi_arabia": "arabic",
        "uae": "arabic",
        "global": "english",
    }
    return mapping.get((nationality or "global").lower(), "english")
