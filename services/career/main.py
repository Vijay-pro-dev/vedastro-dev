"""Career service entrypoint."""

from fastapi import FastAPI

from .profile_router import router as profile_router
from .router import router as career_router

app = FastAPI(title="Vedastro Career Service")
app.include_router(career_router)
app.include_router(profile_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "career"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "career"}
