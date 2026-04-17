"""Container startup helper for safe migrations and API boot."""

from __future__ import annotations

import os
import subprocess
import sys
import time


def alembic_quiet_enabled() -> bool:
    value = os.getenv("ALEMBIC_QUIET")
    if value is not None:
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return os.getenv("UVICORN_RELOAD", "").strip().lower() in {"1", "true", "yes", "on"}


def run_migrations_if_enabled() -> None:
    """Apply Alembic migrations before boot when enabled for the environment."""
    if os.getenv("AUTO_RUN_MIGRATIONS", "false").strip().lower() not in {"1", "true", "yes", "on"}:
        return
    # Prevent running migrations twice: once here and again inside the app's
    # startup hook (used for the legacy `uvicorn main:app` flow).
    os.environ["VEDASTRO_MIGRATIONS_RAN"] = "1"

    attempts = int(os.getenv("MIGRATION_RETRY_ATTEMPTS", "10"))
    delay_seconds = float(os.getenv("MIGRATION_RETRY_DELAY_SECONDS", "3"))
    command = [sys.executable, "-m", "alembic", "-c", "alembic.ini"]
    if alembic_quiet_enabled():
        command.append("-q")
    command += ["upgrade", "head"]

    for attempt in range(1, attempts + 1):
        result = subprocess.run(command, check=False)
        if result.returncode == 0:
            return
        if attempt == attempts:
            raise SystemExit(result.returncode)
        time.sleep(delay_seconds)


def start_api() -> None:
    """Start the FastAPI app with or without reload based on the env settings."""
    command = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        "0.0.0.0",
        "--port",
        os.getenv("PORT", "8000"),
    ]
    if os.getenv("UVICORN_RELOAD", "false").strip().lower() in {"1", "true", "yes", "on"}:
        command += ["--reload", "--reload-exclude", "venv", "--reload-exclude", ".git"]
    raise SystemExit(subprocess.call(command))


if __name__ == "__main__":
    run_migrations_if_enabled()
    start_api()
