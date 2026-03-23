"""Relationship service schemas."""

from pydantic import BaseModel, Field


class RelationshipCompatibilityRequest(BaseModel):
    communication: int = Field(ge=0, le=10)
    trust: int = Field(ge=0, le=10)
    values: int = Field(ge=0, le=10)
    respect: int = Field(ge=0, le=10)
    long_term_alignment: int = Field(ge=0, le=10)


class RelationshipCompatibilityResponse(BaseModel):
    score: int
    label: str
    summary: str

