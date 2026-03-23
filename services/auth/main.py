"""Authentication service entrypoint.

This service wraps the existing auth router so the project can move toward
microservices without breaking the current auth flow.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .router import router as auth_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Vedastro Auth Service", debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=settings.allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "auth"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "auth"}
