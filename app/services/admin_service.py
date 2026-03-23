from sqlalchemy.orm import Session

from app import models
from app.core.config import get_settings
from app.core.security import hash_password, verify_password

settings = get_settings()
DEFAULT_ADMIN_EMAIL = settings.admin_email
DEFAULT_ADMIN_PASSWORD = settings.admin_password
DEFAULT_ADMIN_NAME = settings.admin_name


def ensure_default_admin(db: Session) -> models.User:
    """Create a default admin record if the local database does not have one yet."""
    admin = (
        db.query(models.User)
        .filter(models.User.email == DEFAULT_ADMIN_EMAIL.lower())
        .first()
    )
    if admin:
        if getattr(admin, "role", None) != "admin":
            admin.role = "admin"
            db.commit()
            db.refresh(admin)
        # If the env password changed, sync it so ops can recover admin access without manual DB edits.
        if not verify_password(DEFAULT_ADMIN_PASSWORD, admin.password):
            admin.password = hash_password(DEFAULT_ADMIN_PASSWORD)
            db.commit()
            db.refresh(admin)
        # Always clear lockouts for the default admin to avoid getting stuck.
        if getattr(admin, "failed_login_attempts", 0) or getattr(admin, "locked_until", None):
            admin.failed_login_attempts = 0
            admin.locked_until = None
            db.commit()
            db.refresh(admin)
        return admin

    admin = models.User(
        email=DEFAULT_ADMIN_EMAIL.lower(),
        password=hash_password(DEFAULT_ADMIN_PASSWORD),
        name=DEFAULT_ADMIN_NAME,
        nationality="global",
        language="english",
        role="admin",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin
