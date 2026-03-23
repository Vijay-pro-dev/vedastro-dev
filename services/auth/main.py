"""Authentication service entrypoint.

This service wraps the existing auth router so the project can move toward
microservices without breaking the current auth flow.
"""

from fastapi import FastAPI

from .router import router as auth_router

app = FastAPI(title="Vedastro Auth Service")
app.include_router(auth_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "auth"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "auth"}
