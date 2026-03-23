"""Finance service scaffold."""

from fastapi import FastAPI

from .router import router as finance_router

app = FastAPI(title="Vedastro Finance Service")
app.include_router(finance_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "finance"}


@app.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "finance"}
