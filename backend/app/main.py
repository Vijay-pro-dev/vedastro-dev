import os
import sqlite3
import logging
import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.security_middleware import SecurityMiddleware
from app.routes import admin, auth, dashboard, profile
from app.services.admin_service import ensure_default_admin

settings = get_settings()


def resolve_sqlite_database_file() -> str | None:
    """Resolve the SQLite file path from the configured database URL."""
    if not settings.is_sqlite:
        return None

    prefix = "sqlite:///"
    if not settings.database_url.startswith(prefix):
        return None

    raw_path = settings.database_url[len(prefix):]
    if not raw_path:
        return None

    return str(Path(raw_path))


class JsonLogFormatter(logging.Formatter):
    """Write compact JSON logs that are easier to ship to monitoring tools."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        return json.dumps(payload, ensure_ascii=True)


def configure_logging() -> None:
    """Write request/security logs to local files for easier debugging."""
    formatter = JsonLogFormatter()
    request_log_path = Path(settings.request_log_file)
    security_log_path = Path(settings.security_log_file)
    request_log_path.parent.mkdir(parents=True, exist_ok=True)
    security_log_path.parent.mkdir(parents=True, exist_ok=True)

    request_logger = logging.getLogger("vedastro.requests")
    request_logger.setLevel(logging.INFO)
    request_logger.handlers.clear()
    request_handler = logging.FileHandler(request_log_path, encoding="utf-8")
    request_handler.setFormatter(formatter)
    request_logger.addHandler(request_handler)
    request_logger.propagate = False

    security_logger = logging.getLogger("vedastro.security")
    security_logger.setLevel(logging.INFO)
    security_logger.handlers.clear()
    security_handler = logging.FileHandler(security_log_path, encoding="utf-8")
    security_handler.setFormatter(formatter)
    security_logger.addHandler(security_handler)
    security_logger.propagate = False


def ensure_sqlite_columns() -> None:
    """Apply lightweight SQLite migrations so older local databases keep working."""
    if not settings.is_sqlite:
        return

    migrations = {
        "users": {
            "phone": "ALTER TABLE users ADD COLUMN phone TEXT",
            "address": "ALTER TABLE users ADD COLUMN address TEXT",
            "nationality": "ALTER TABLE users ADD COLUMN nationality TEXT DEFAULT 'global'",
            "role": "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
            "suspended": "ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0",
            "email_verified": "ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0",
            "email_verification_token": "ALTER TABLE users ADD COLUMN email_verification_token TEXT",
            "password_reset_token": "ALTER TABLE users ADD COLUMN password_reset_token TEXT",
            "password_reset_sent_at": "ALTER TABLE users ADD COLUMN password_reset_sent_at TEXT",
            "failed_login_attempts": "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0",
            "locked_until": "ALTER TABLE users ADD COLUMN locked_until TEXT",
            "refresh_token_version": "ALTER TABLE users ADD COLUMN refresh_token_version INTEGER DEFAULT 0",
            "created_at": "ALTER TABLE users ADD COLUMN created_at TEXT",
            "updated_at": "ALTER TABLE users ADD COLUMN updated_at TEXT",
        },
        "birth_data": {
            "profile_pic": "ALTER TABLE birth_data ADD COLUMN profile_pic TEXT",
            "created_at": "ALTER TABLE birth_data ADD COLUMN created_at TEXT",
            "updated_at": "ALTER TABLE birth_data ADD COLUMN updated_at TEXT",
        },
        "career_profiles": {
            "current_role": "ALTER TABLE career_profiles ADD COLUMN current_role TEXT",
            "years_experience": "ALTER TABLE career_profiles ADD COLUMN years_experience INTEGER DEFAULT 0",
            "goal_clarity": "ALTER TABLE career_profiles ADD COLUMN goal_clarity TEXT DEFAULT 'medium'",
            "role_match": "ALTER TABLE career_profiles ADD COLUMN role_match TEXT DEFAULT 'medium'",
            "created_at": "ALTER TABLE career_profiles ADD COLUMN created_at TEXT",
            "updated_at": "ALTER TABLE career_profiles ADD COLUMN updated_at TEXT",
        },
    }

    database_file = resolve_sqlite_database_file()
    if not database_file or not os.path.exists(database_file):
        return

    conn = sqlite3.connect(database_file)
    try:
        cursor = conn.cursor()
        for table_name, columns in migrations.items():
            table_exists = cursor.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,),
            ).fetchone()
            if not table_exists:
                continue
            existing_columns = {row[1] for row in cursor.execute(f"PRAGMA table_info({table_name})").fetchall()}
            for column_name, statement in columns.items():
                if column_name not in existing_columns:
                    cursor.execute(statement)
        conn.commit()
    finally:
        conn.close()


def ensure_bootstrap_admin() -> None:
    db = Session(bind=engine)
    try:
        ensure_default_admin(db)
    finally:
        db.close()


def initialize_application_state() -> None:
    configure_logging()
    Path(settings.uploads_dir).mkdir(parents=True, exist_ok=True)
    ensure_sqlite_columns()
    Base.metadata.create_all(bind=engine)
    ensure_bootstrap_admin()


def create_app() -> FastAPI:
    initialize_application_state()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        description="Vedastro career guidance SaaS API with JWT auth, profile persistence, admin tooling, and AI-style dashboard insights.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_origin_regex=settings.cors_allow_origin_regex,
        allow_credentials=settings.allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityMiddleware)

    app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
    app.include_router(auth.router)
    app.include_router(admin.router)
    app.include_router(profile.router)
    app.include_router(dashboard.router)

    @app.get("/health")
    def health():
        return {"status": "Vedastro API running", "environment": settings.app_env}

    @app.get("/ready")
    def ready():
        return {"status": "ready", "database": settings.database_url.split(":", 1)[0]}

    return app


app = create_app()
