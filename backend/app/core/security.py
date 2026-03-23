import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone

from app.core.config import get_settings

try:
    from passlib.context import CryptContext
except Exception:
    CryptContext = None


settings = get_settings()
SECRET_KEY = settings.secret_key
SECRET_KEY_FALLBACKS = settings.secret_key_fallbacks
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_HOURS = settings.access_token_expire_hours
REFRESH_TOKEN_EXPIRE_DAYS = settings.refresh_token_expire_days
EMAIL_TOKEN_EXPIRE_HOURS = settings.email_token_expire_hours
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = settings.password_reset_token_expire_minutes
LEGACY_PWD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto") if CryptContext else None


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}${hashed.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    if hashed.startswith("$2") and LEGACY_PWD_CONTEXT:
        try:
            return LEGACY_PWD_CONTEXT.verify(plain, hashed)
        except Exception:
            return False

    try:
        salt, digest = hashed.split("$", 1)
    except ValueError:
        return False

    candidate = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt.encode("utf-8"), 100_000).hex()
    return hmac.compare_digest(candidate, digest)


def _sign_jwt_payload(payload: dict, secret_key: str) -> str:
    header = {"alg": ALGORITHM, "typ": "JWT"}
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    signature = hmac.new(secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header_segment}.{payload_segment}.{_b64url_encode(signature)}"


def create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    payload = data.copy()
    payload["type"] = token_type
    payload["exp"] = int((datetime.now(timezone.utc) + expires_delta).timestamp())
    return _sign_jwt_payload(payload, SECRET_KEY)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    return create_token(data, expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS), "access")


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    return create_token(data, expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def create_email_verification_token(data: dict) -> str:
    return create_token(data, timedelta(hours=EMAIL_TOKEN_EXPIRE_HOURS), "email_verification")


def create_password_reset_token(data: dict) -> str:
    return create_token(data, timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES), "password_reset")


def decode_access_token(token: str) -> dict:
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError as exc:
        raise ValueError("Malformed token") from exc

    signing_input = f"{header_segment}.{payload_segment}".encode("utf-8")
    provided_signature = _b64url_decode(signature_segment)

    signature_valid = False
    for secret_key in [SECRET_KEY, *SECRET_KEY_FALLBACKS]:
        expected_signature = hmac.new(secret_key.encode("utf-8"), signing_input, hashlib.sha256).digest()
        if hmac.compare_digest(expected_signature, provided_signature):
            signature_valid = True
            break
    if not signature_valid:
        raise ValueError("Invalid token signature")

    payload = json.loads(_b64url_decode(payload_segment).decode("utf-8"))
    if datetime.now(timezone.utc).timestamp() > payload.get("exp", 0):
        raise ValueError("Token expired")
    return payload
