"""Career service entrypoint with shared CORS config."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .profile_router import router as profile_router
from .router import router as career_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="Vedastro Career Service", debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_origin_regex=settings.cors_allow_origin_regex,
    allow_credentials=settings.allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(career_router)
app.include_router(profile_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "career"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "career"}
