"""Relationship service router."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/relationship", tags=["relationship"])


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


def _label_for_score(score: int) -> str:
    if score >= 85:
        return "strong"
    if score >= 70:
        return "promising"
    if score >= 55:
        return "mixed"
    return "needs_work"


@router.post("/compatibility", response_model=RelationshipCompatibilityResponse)
def relationship_compatibility(payload: RelationshipCompatibilityRequest) -> RelationshipCompatibilityResponse:
    average = (
        payload.communication
        + payload.trust
        + payload.values
        + payload.respect
        + payload.long_term_alignment
    ) / 5
    score = round(average * 10)
    label = _label_for_score(score)
    summary = "Relationship signals look balanced and supportive." if score >= 70 else "This pairing needs more alignment and communication."
    return RelationshipCompatibilityResponse(score=score, label=label, summary=summary)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "relationship"}


@router.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "relationship"}

