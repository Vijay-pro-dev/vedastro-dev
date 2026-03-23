"""Health service entrypoint."""

from fastapi import FastAPI

from .router import router as health_router

app = FastAPI(title="Vedastro Health Service")
app.include_router(health_router)
