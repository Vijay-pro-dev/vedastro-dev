import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import dotenv_values

BASE_DIR = Path(__file__).resolve().parents[2]


def _load_environment() -> None:
    """Load layered env files so local dev/prod runs work without manual exports."""
    current_env = os.getenv("APP_ENV", "development").strip().lower()
    env_alias = {
        "development": "dev",
        "production": "prod",
        "test": "test",
    }.get(current_env, current_env)

    # IMPORTANT:
    # - On hosting providers (Render, etc.), secrets come from the process environment.
    # - We should never override already-set env vars with values from committed .env files.
    # This keeps local convenience while preventing production secrets from being clobbered.
    base = dotenv_values(BASE_DIR / ".env")
    layered = {**base, **dotenv_values(BASE_DIR / f".env.{env_alias}")}
    for key, value in layered.items():
        if not key or value is None:
            continue
        os.environ.setdefault(str(key), str(value))


_load_environment()


def _env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def _env_list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    raw = raw.strip()
    if raw.startswith("["):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except json.JSONDecodeError:
            pass
    return [item.strip() for item in raw.split(",") if item.strip()]


@dataclass
class Settings:
    app_name: str = os.getenv("APP_NAME", "Vedastro SaaS API")
    app_env: str = os.getenv("APP_ENV", "development")
    debug: bool = _env_bool("DEBUG", True)
    secret_key: str = os.getenv("SECRET_KEY", "change-this-secret-in-production-vedastro")
    secret_key_fallbacks: list[str] = None  # type: ignore[assignment]
    algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_hours: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "12"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    email_token_expire_hours: int = int(os.getenv("EMAIL_TOKEN_EXPIRE_HOURS", "24"))
    password_reset_token_expire_minutes: int = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30"))
    login_lockout_attempt_limit: int = int(os.getenv("LOGIN_LOCKOUT_ATTEMPT_LIMIT", "5"))
    login_lockout_minutes: int = int(os.getenv("LOGIN_LOCKOUT_MINUTES", "15"))
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./storage/users.db")
    redis_url: str = os.getenv("REDIS_URL", "redis://redis:6379/0")
    use_redis_rate_limit: bool = _env_bool("USE_REDIS_RATE_LIMIT", False)
    allow_credentials: bool = _env_bool("CORS_ALLOW_CREDENTIALS", True)
    cors_allow_origins: list[str] = None  # type: ignore[assignment]
    # Allow localhost and any *.vercel.app by default so prod frontend works even if env var is missed.
    cors_allow_origin_regex: str = os.getenv(
        "CORS_ALLOW_ORIGIN_REGEX",
        r"https?://(localhost|127\.0\.0\.1|[a-z0-9-]+\.vercel\.app)(:\d+)?$",
    )
    uploads_dir: str = os.getenv("UPLOADS_DIR", "storage/uploads")
    max_upload_size_bytes: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(5 * 1024 * 1024)))
    allowed_upload_extensions: list[str] = None  # type: ignore[assignment]
    auth_rate_limit_per_minute: int = int(os.getenv("AUTH_RATE_LIMIT_PER_MINUTE", "12"))
    general_rate_limit_per_minute: int = int(os.getenv("GENERAL_RATE_LIMIT_PER_MINUTE", "120"))
    admin_email: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@gmail.com")
    admin_password: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    admin_name: str = os.getenv("DEFAULT_ADMIN_NAME", "Vedastro Admin")
    frontend_base_url: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    email_from: str = os.getenv("EMAIL_FROM", "no-reply@vedastro.local")
    smtp_host: str = os.getenv("SMTP_HOST", "")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_username: str = os.getenv("SMTP_USERNAME", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_use_tls: bool = _env_bool("SMTP_USE_TLS", True)
    request_log_file: str = os.getenv("REQUEST_LOG_FILE", "logs/backend.log")
    security_log_file: str = os.getenv("SECURITY_LOG_FILE", "logs/backend.err.log")
    razorpay_key_id: str = os.getenv("RAZORPAY_KEY_ID", "")
    razorpay_key_secret: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    report_product_key: str = os.getenv("REPORT_PRODUCT_KEY", "career_report_v1")
    report_currency: str = os.getenv("REPORT_CURRENCY", "INR")
    report_monthly_price_paise: int = int(os.getenv("REPORT_MONTHLY_PRICE_PAISE", "9900"))
    report_yearly_price_paise: int = int(os.getenv("REPORT_YEARLY_PRICE_PAISE", "49900"))
    report_monthly_price_cents: int = int(os.getenv("REPORT_MONTHLY_PRICE_CENTS", "1999"))
    report_yearly_price_cents: int = int(os.getenv("REPORT_YEARLY_PRICE_CENTS", "9999"))
    report_downloads_per_week: int = int(os.getenv("REPORT_DOWNLOADS_PER_WEEK", "4"))
    report_download_window_days: int = int(os.getenv("REPORT_DOWNLOAD_WINDOW_DAYS", "7"))
    report_pdf_word_limit_v1: int = int(os.getenv("REPORT_PDF_WORD_LIMIT_V1", "300"))
    report_pdf_word_limit_v2: int = int(os.getenv("REPORT_PDF_WORD_LIMIT_V2", "500"))
    report_pdf_word_limit_v3: int = int(os.getenv("REPORT_PDF_WORD_LIMIT_V3", "700"))
    payment_force_currency: str = os.getenv("PAYMENT_FORCE_CURRENCY", "").strip().upper()
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "").strip()
    openai_report_enabled: bool = _env_bool("OPENAI_REPORT_ENABLED", False)
    # Keep the default aligned with `.env.example` and `render.yaml`.
    openai_report_model: str = os.getenv("OPENAI_REPORT_MODEL", "gpt-5.4-mini").strip()

    def __post_init__(self) -> None:
        if self.secret_key_fallbacks is None:
            self.secret_key_fallbacks = _env_list("SECRET_KEY_FALLBACKS", [])
        if self.cors_allow_origins is None:
            self.cors_allow_origins = _env_list("CORS_ALLOW_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"])
        if self.allowed_upload_extensions is None:
            self.allowed_upload_extensions = _env_list("ALLOWED_UPLOAD_EXTENSIONS", [".jpg", ".jpeg", ".png", ".webp"])

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
