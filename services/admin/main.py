"""Admin service entrypoint."""

from fastapi import FastAPI

from .router import router as admin_router

app = FastAPI(title="Vedastro Admin Service")
app.include_router(admin_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "admin"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "admin"}
