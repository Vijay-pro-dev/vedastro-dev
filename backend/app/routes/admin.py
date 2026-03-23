import csv
import io
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from app.routes.auth import get_current_admin
from app.schemas.admin import SuspendUserPayload, UpdateUserRolePayload
from app.services.activity_service import create_activity_log
from app.services.profile_service import build_profile, get_latest_birth_data, get_latest_career_profile


router = APIRouter(prefix="/admin", tags=["admin"])


def _admin_user_or_404(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _serialize_activity_log(log: models.ActivityLog) -> dict:
    return {
        "id": log.id,
        "user_id": log.user_id,
        "activity_type": log.activity_type,
        "description": log.description,
        "data": json.loads(log.data) if log.data else {},
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


@router.get("/dashboard")
def admin_dashboard(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Return high-level admin stats and a user list for the admin panel."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()

    user_profiles = []
    recent_users = []
    profile_completed_count = 0
    dashboard_ready_count = 0
    total_experience = 0
    nationality_counts: dict[str, int] = {}
    language_counts: dict[str, int] = {}
    role_counts: dict[str, int] = {}
    active_last_7_days = 0
    now = datetime.now(timezone.utc)

    for user in users:
        profile = build_profile(
            user,
            get_latest_birth_data(db, user.id),
            get_latest_career_profile(db, user.id),
        )
        if profile["profile_completed"]:
            profile_completed_count += 1
        if profile["profile_completed"] and profile["current_role"] and profile["goals"]:
            dashboard_ready_count += 1

        nationality = profile["nationality"] or "global"
        language = profile["language"] or "english"
        role = profile["current_role"] or "unassigned"
        total_experience += int(profile["years_experience"] or 0)
        nationality_counts[nationality] = nationality_counts.get(nationality, 0) + 1
        language_counts[language] = language_counts.get(language, 0) + 1
        role_counts[role] = role_counts.get(role, 0) + 1

        created_at_iso = user.created_at.isoformat() if user.created_at else None
        if user.updated_at:
            updated_at = user.updated_at
            if updated_at.tzinfo is None:
                updated_at = updated_at.replace(tzinfo=timezone.utc)
            if updated_at >= now - timedelta(days=7):
                active_last_7_days += 1

        user_record = {
            "user_id": profile["user_id"],
            "name": profile["name"] or "User",
            "email": profile["email"],
            "phone": profile["phone"] or "-",
            "role": profile["role"] or "user",
            "nationality": nationality,
            "language": language,
            "current_role": profile["current_role"] or "-",
            "goals": profile["goals"] or "-",
            "years_experience": int(profile["years_experience"] or 0),
            "profile_completed": profile["profile_completed"],
            "suspended": bool(getattr(user, "suspended", 0)),
            "created_at": created_at_iso,
        }
        user_profiles.append(user_record)

        if len(recent_users) < 5:
            recent_users.append(user_record)

    total_users = len(users)
    avg_experience = round((total_experience / total_users), 1) if total_users else 0
    completion_rate = round((profile_completed_count / total_users) * 100, 1) if total_users else 0

    activity_logs = (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "stats": {
            "total_users": total_users,
            "completed_profiles": profile_completed_count,
            "pending_profiles": max(total_users - profile_completed_count, 0),
            "dashboard_ready_users": dashboard_ready_count,
            "completion_rate": completion_rate,
            "avg_experience": avg_experience,
            "active_last_7_days": active_last_7_days,
            "top_nationalities": nationality_counts,
            "top_languages": language_counts,
            "top_roles": role_counts,
        },
        "recent_users": recent_users,
        "system_overview": {
            "api_status": "healthy",
            "generated_at": now.isoformat(),
            "admin_message": "JWT auth, protected routes, saved profiles, and AI dashboard are active.",
        },
        "recent_activity_logs": [_serialize_activity_log(log) for log in activity_logs],
        "users": user_profiles,
    }


@router.get("/activity-logs")
def admin_activity_logs(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Return the full admin activity feed."""
    activity_logs = (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.created_at.desc())
        .all()
    )
    return {"activity_logs": [_serialize_activity_log(log) for log in activity_logs]}


@router.delete("/activity-logs/{log_id}")
def delete_activity_log(log_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Delete one activity log entry from the admin panel."""
    log = db.query(models.ActivityLog).filter(models.ActivityLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")

    db.delete(log)
    db.commit()
    return {"message": "Activity log deleted successfully", "log_id": log_id}


@router.delete("/activity-logs")
def delete_all_activity_logs(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Delete the full activity log history from the admin panel."""
    deleted_count = db.query(models.ActivityLog).delete(synchronize_session=False)
    db.commit()
    return {"message": "All activity logs deleted successfully", "deleted_count": deleted_count}


@router.get("/users/{user_id}")
def admin_user_detail(user_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Return the full saved profile for one user so admin can inspect it directly."""
    user = _admin_user_or_404(db, user_id)
    profile = build_profile(
        user,
        get_latest_birth_data(db, user.id),
        get_latest_career_profile(db, user.id),
    )
    return {
        "user": {
            **profile,
            "suspended": bool(getattr(user, "suspended", 0)),
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
    }


@router.patch("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    payload: SuspendUserPayload,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Suspend or unsuspend a user account from the admin panel."""
    user = _admin_user_or_404(db, user_id)
    user.suspended = 1 if payload.suspended else 0
    user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    create_activity_log(
        db,
        user.id,
        "user_suspended" if payload.suspended else "user_unsuspended",
        f"Admin {'suspended' if payload.suspended else 'reactivated'} {user.email}",
        {"suspended": payload.suspended},
    )
    db.commit()
    return {
        "message": "User suspended successfully" if payload.suspended else "User reactivated successfully",
        "user_id": user.id,
        "suspended": bool(user.suspended),
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UpdateUserRolePayload,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a user's account role from the admin panel."""
    user = _admin_user_or_404(db, user_id)
    next_role = (payload.role or "").strip().lower()
    allowed_roles = {"user", "support", "admin"}
    if next_role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Role must be user, support, or admin")

    user.role = next_role
    user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    create_activity_log(
        db,
        user.id,
        "user_role_updated",
        f"Admin changed role for {user.email} to {next_role}",
        {"role": next_role},
    )
    db.commit()
    return {"message": "User role updated successfully", "user_id": user.id, "role": user.role}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Delete a user and related records from the local SQLite database."""
    user = _admin_user_or_404(db, user_id)
    user_email = user.email

    for model in (
        models.BirthData,
        models.BirthTimeEstimate,
        models.CareerProfile,
        models.CareerAlignmentScore,
        models.CareerPhase,
        models.OpportunityWindow,
        models.DecisionGuidance,
        models.ActivityLog,
        models.CareerScore,
        models.FeedbackDecision,
        models.FeedbackOutcome,
    ):
        db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)

    db.delete(user)
    create_activity_log(
        db,
        user_id,
        "user_deleted",
        f"Admin deleted user {user_email}",
        {"email": user_email},
    )
    db.commit()
    return {"message": "User deleted successfully", "user_id": user_id}


@router.get("/export/users.csv")
def export_users_csv(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Export admin user data as CSV for local reporting."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "user_id",
            "name",
            "email",
            "role",
            "phone",
            "nationality",
            "language",
            "current_role",
            "goals",
            "years_experience",
            "profile_completed",
            "suspended",
            "created_at",
        ]
    )

    for user in users:
        profile = build_profile(
            user,
            get_latest_birth_data(db, user.id),
            get_latest_career_profile(db, user.id),
        )
        writer.writerow(
            [
                profile["user_id"],
                profile["name"],
                profile["email"],
                profile["role"],
                profile["phone"],
                profile["nationality"],
                profile["language"],
                profile["current_role"],
                profile["goals"],
                profile["years_experience"],
                profile["profile_completed"],
                bool(getattr(user, "suspended", 0)),
                user.created_at.isoformat() if user.created_at else "",
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vedastro-users.csv"},
    )
