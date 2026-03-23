"""Finance service router."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/finance", tags=["finance"])


class FinancialHealthRequest(BaseModel):
    monthly_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    monthly_savings: float = Field(ge=0)
    total_debt: float = Field(ge=0)


class FinancialHealthResponse(BaseModel):
    score: int
    label: str
    summary: str


def _label_for_score(score: int) -> str:
    if score >= 85:
        return "strong"
    if score >= 70:
        return "stable"
    if score >= 50:
        return "watchful"
    return "at_risk"


@router.post("/health-score", response_model=FinancialHealthResponse)
def financial_health(payload: FinancialHealthRequest) -> FinancialHealthResponse:
    savings_rate = (payload.monthly_savings / payload.monthly_income) * 100
    expense_ratio = (payload.monthly_expenses / payload.monthly_income) * 100
    debt_penalty = min(payload.total_debt / max(payload.monthly_income, 1.0) * 10, 30)
    score = round(max(0, min(100, 60 + savings_rate - expense_ratio / 2 - debt_penalty)))
    label = _label_for_score(score)
    summary = "Finances look healthy with room to scale savings." if score >= 70 else "Track spending and debt more closely to improve stability."
    return FinancialHealthResponse(score=score, label=label, summary=summary)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "finance"}


@router.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready", "service": "finance"}

