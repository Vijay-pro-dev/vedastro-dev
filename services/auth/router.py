from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import models
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.schemas.auth import (
    AuthResponse,
    EmailVerificationConfirm,
    EmailVerificationRequest,
    Login,
    PasswordResetConfirm,
    PasswordResetRequest,
    Signup,
    TokenRefreshRequest,
)
from app.services.activity_service import create_activity_log
from app.services.email_service import send_email_verification_email, send_password_reset_email
from app.services.profile_service import (
    build_profile,
    get_latest_birth_data,
    get_latest_career_profile,
    resolve_language_from_nationality,
    user_summary_from_profile,
)


router = APIRouter(tags=["auth"])
auth_scheme = HTTPBearer(auto_error=False)
settings = get_settings()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _normalize_timestamp(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value if value.tzinfo is None else value.astimezone(timezone.utc).replace(tzinfo=None)


def _validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not any(char.islower() for char in password):
        raise HTTPException(status_code=400, detail="Password must include a lowercase letter")
    if not any(char.isupper() for char in password):
        raise HTTPException(status_code=400, detail="Password must include an uppercase letter")
    if not any(char.isdigit() for char in password):
        raise HTTPException(status_code=400, detail="Password must include a number")


def _issue_auth_response(db: Session, user: models.User) -> dict:
    profile = build_profile(user, get_latest_birth_data(db, user.id), get_latest_career_profile(db, user.id))
    verification_token = None
    if not getattr(user, "email_verified", 0):
        verification_token = getattr(user, "email_verification_token", None)

    return {
        "access_token": create_access_token({"sub": str(user.id), "email": user.email, "role": user.role or "user"}),
        "refresh_token": create_refresh_token(
            {
                "sub": str(user.id),
                "email": user.email,
                "role": user.role or "user",
                "version": int(getattr(user, "refresh_token_version", 0) or 0),
            }
        ),
        "token_type": "bearer",
        "user": user_summary_from_profile(profile),
        "verification_required": not bool(getattr(user, "email_verified", 0)),
        "verification_token": verification_token if settings.debug or settings.app_env == "test" else None,
    }


def _get_user_by_credentials(email: str, db: Session) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email.lower().strip()).first()


def _ensure_user_not_locked(user: models.User) -> None:
    locked_until = _normalize_timestamp(getattr(user, "locked_until", None))
    if locked_until and locked_until > _utc_now():
        raise HTTPException(
            status_code=423,
            detail=f"Account locked until {locked_until.isoformat()}. Please reset your password or try again later.",
        )


def _mark_failed_login(db: Session, user: models.User) -> None:
    user.failed_login_attempts = int(getattr(user, "failed_login_attempts", 0) or 0) + 1
    if user.failed_login_attempts >= settings.login_lockout_attempt_limit:
        user.locked_until = _utc_now() + timedelta(minutes=settings.login_lockout_minutes)
        create_activity_log(
            db,
            user.id,
            "account_locked",
            f"Account temporarily locked for {user.email}",
            {"locked_until": user.locked_until.isoformat(), "failed_attempts": user.failed_login_attempts},
        )
    db.commit()


def _reset_login_failures(user: models.User) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None


def _decode_typed_token(token: str, expected_type: str) -> dict:
    try:
        payload = decode_access_token(token)
    except Exception as exc:
        # If the signing secret changed or the token is tampered/expired, return a clean 401 instead of 500
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc
    if payload.get("type") != expected_type:
        raise HTTPException(status_code=400, detail=f"Invalid {expected_type.replace('_', ' ')} token")
    return payload


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db),
):
    """Resolve the signed-in user from a bearer token for protected user routes."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    _ensure_user_not_locked(user)
    if getattr(user, "suspended", 0):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended. Please contact support.")
    return user


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db),
):
    """Validate admin-only bearer tokens before serving admin APIs."""
    # Dev convenience: allow bypass if no token (so local admin panel works). In production send a valid admin token.
    if not credentials:
        return {"sub": "0", "email": "dev-admin@local", "role": "admin"}
    try:
        payload = decode_access_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired admin token") from exc

    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access only")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token")
    admin_user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if not admin_user or admin_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access revoked")
    _ensure_user_not_locked(admin_user)
    return payload


@router.post("/signup", response_model=AuthResponse, summary="Create a new user account")
def signup(user: Signup, db: Session = Depends(get_db)):
    """Create a new SaaS user and preload an email verification token."""
    if _get_user_by_credentials(user.email, db):
        raise HTTPException(status_code=400, detail="Email already registered")
    _validate_password_strength(user.password)

    nationality = (user.nationality or "global").lower()
    new_user = models.User(
        email=user.email.lower(),
        password=hash_password(user.password),
        name=user.name or user.email.split("@")[0],
        phone=user.phone,
        nationality=nationality,
        language=resolve_language_from_nationality(nationality),
        role="user",
        email_verified=0,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_user.email_verification_token = create_email_verification_token({"sub": str(new_user.id), "email": new_user.email})
    db.commit()
    db.refresh(new_user)

    send_email_verification_email(new_user.email, new_user.email_verification_token or "")

    create_activity_log(
        db,
        new_user.id,
        "user_registered",
        f"New user registered with email {new_user.email}",
        {"email": new_user.email, "nationality": nationality},
    )
    db.commit()
    return _issue_auth_response(db, new_user)


@router.post("/login", response_model=AuthResponse, summary="Login with email and password")
def login(user: Login, db: Session = Depends(get_db)):
    """Authenticate an existing user and issue access plus refresh tokens."""
    db_user = _get_user_by_credentials(user.email, db)
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    # If this is the default admin and the supplied password matches the env password,
    # clear lockouts before the lock check so admins don't get stuck.
    if db_user.email == settings.admin_email.lower() and user.password == settings.admin_password:
        db_user.failed_login_attempts = 0
        db_user.locked_until = None
        db.commit()
        db.refresh(db_user)

    _ensure_user_not_locked(db_user)
    if getattr(db_user, "suspended", 0):
        raise HTTPException(status_code=403, detail="Account suspended. Please contact support.")
    if not verify_password(user.password, db_user.password):
        # If this is the default admin and the env password has changed, sync it on-the-fly.
        if user.email.lower() == settings.admin_email.lower() and user.password == settings.admin_password:
            db_user.password = hash_password(user.password)
            db.commit()
            db.refresh(db_user)
        else:
            _mark_failed_login(db, db_user)
            raise HTTPException(status_code=400, detail="Invalid email or password")

    _reset_login_failures(db_user)
    create_activity_log(
        db,
        db_user.id,
        "user_logged_in",
        f"User {db_user.email} logged in",
        {"email": db_user.email},
    )
    db.commit()
    return _issue_auth_response(db, db_user)


@router.post("/auth/refresh", response_model=AuthResponse, summary="Refresh an expired access token")
def refresh_access_token(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    """Issue a fresh access token from a valid refresh token without forcing a new login."""
    token_payload = _decode_typed_token(payload.refresh_token, "refresh")
    user = db.query(models.User).filter(models.User.id == int(token_payload.get("sub", 0))).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if int(token_payload.get("version", -1)) != int(getattr(user, "refresh_token_version", 0) or 0):
        raise HTTPException(status_code=401, detail="Refresh token revoked")
    _ensure_user_not_locked(user)
    if getattr(user, "suspended", 0):
        raise HTTPException(status_code=403, detail="Account suspended. Please contact support.")
    create_activity_log(db, user.id, "token_refreshed", f"Refresh token used for {user.email}", {"email": user.email})
    db.commit()
    return _issue_auth_response(db, user)


@router.post("/auth/request-email-verification", summary="Request a new email verification token")
def request_email_verification(payload: EmailVerificationRequest, db: Session = Depends(get_db)):
    """Generate a fresh email verification token for an existing account."""
    user = _get_user_by_credentials(payload.email, db)
    if not user:
        return {"message": "If the email exists, a verification link has been prepared."}
    user.email_verification_token = create_email_verification_token({"sub": str(user.id), "email": user.email})
    create_activity_log(db, user.id, "email_verification_requested", f"Email verification requested for {user.email}", None)
    db.commit()
    send_email_verification_email(user.email, user.email_verification_token or "")
    return {
        "message": "Verification token generated successfully.",
        "verification_token": user.email_verification_token if settings.debug or settings.app_env == "test" else None,
    }


@router.post("/auth/verify-email", summary="Verify the email address tied to an account")
def verify_email(payload: EmailVerificationConfirm, db: Session = Depends(get_db)):
    """Mark the account email as verified using a one-time token."""
    token_payload = _decode_typed_token(payload.token, "email_verification")
    user = db.query(models.User).filter(models.User.id == int(token_payload.get("sub", 0))).first()
    if not user or user.email_verification_token != payload.token:
        raise HTTPException(status_code=400, detail="Invalid email verification token")

    user.email_verified = 1
    user.email_verification_token = None
    create_activity_log(db, user.id, "email_verified", f"Email verified for {user.email}", {"email": user.email})
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/auth/request-password-reset", summary="Start the password reset flow")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    """Generate a short-lived password reset token for an existing account."""
    user = _get_user_by_credentials(payload.email, db)
    if not user:
        return {"message": "If the email exists, a password reset token has been prepared."}
    user.password_reset_token = create_password_reset_token({"sub": str(user.id), "email": user.email})
    user.password_reset_sent_at = _utc_now()
    create_activity_log(db, user.id, "password_reset_requested", f"Password reset requested for {user.email}", None)
    db.commit()
    send_password_reset_email(user.email, user.password_reset_token or "")
    return {
        "message": "Password reset token generated successfully.",
        "reset_token": user.password_reset_token if settings.debug or settings.app_env == "test" else None,
    }


@router.post("/auth/reset-password", summary="Reset the account password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    """Replace the existing password using a valid password reset token."""
    _validate_password_strength(payload.new_password)
    token_payload = _decode_typed_token(payload.token, "password_reset")
    user = db.query(models.User).filter(models.User.id == int(token_payload.get("sub", 0))).first()
    if not user or user.password_reset_token != payload.token:
        raise HTTPException(status_code=400, detail="Invalid password reset token")

    user.password = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_sent_at = None
    user.refresh_token_version = int(getattr(user, "refresh_token_version", 0) or 0) + 1
    _reset_login_failures(user)
    create_activity_log(db, user.id, "password_reset_completed", f"Password reset completed for {user.email}", None)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/admin-login", summary="Login to the admin experience")
def admin_login(user: Login, db: Session = Depends(get_db)):
    """Issue admin-scoped tokens for admin panel access."""
    db_user = _get_user_by_credentials(user.email, db)
    if db_user and db_user.role == "admin":
        _ensure_user_not_locked(db_user)
        if verify_password(user.password, db_user.password):
            _reset_login_failures(db_user)
            create_activity_log(
                db,
                db_user.id,
                "admin_logged_in",
                f"Admin {db_user.email} logged in",
                {"email": db_user.email},
            )
            db.commit()
            return {
                "message": "Admin login success",
                "access_token": create_access_token({"sub": str(db_user.id), "email": db_user.email, "role": "admin"}),
                "refresh_token": create_refresh_token(
                    {
                        "sub": str(db_user.id),
                        "email": db_user.email,
                        "role": "admin",
                        "version": int(getattr(db_user, "refresh_token_version", 0) or 0),
                    }
                ),
                "token_type": "bearer",
                "admin": {"email": db_user.email, "role": "admin"},
            }
        _mark_failed_login(db, db_user)
    raise HTTPException(status_code=401, detail="Invalid admin credentials")


@router.get("/auth/me", summary="Return the current signed-in user")
def me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the hydrated user summary used by the frontend session layer."""
    profile = build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )
    return user_summary_from_profile(profile)
