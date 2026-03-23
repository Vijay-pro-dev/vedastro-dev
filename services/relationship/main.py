"""Relationship service scaffold."""

from fastapi import FastAPI

from .router import router as relationship_router

app = FastAPI(title="Vedastro Relationship Service")
app.include_router(relationship_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "relationship"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "relationship"}
