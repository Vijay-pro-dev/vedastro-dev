from sqlalchemy.orm import Session

from app import models
from app.core.config import get_settings
from app.core.security import hash_password

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
