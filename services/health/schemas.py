"""Health service schemas."""

from pydantic import BaseModel


class ServiceHealthResponse(BaseModel):
    status: str
    service: str
    environment: str | None = None
    database: str | None = None

