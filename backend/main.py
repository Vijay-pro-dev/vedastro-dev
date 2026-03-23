"""Root ASGI entrypoint kept thin for clean project structure."""

try:
    from backend.app.main import app
except ModuleNotFoundError:
    from app.main import app
