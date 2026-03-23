import json

from app import models


def create_activity_log(db, user_id: int | None, activity_type: str, description: str, data: dict | None = None):
    """Persist lightweight activity entries used by the admin panel."""
    entry = models.ActivityLog(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        data=json.dumps(data or {}),
    )
    db.add(entry)
    return entry
