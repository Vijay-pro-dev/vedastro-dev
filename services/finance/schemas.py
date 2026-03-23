"""Finance service schemas."""

from pydantic import BaseModel, Field


class FinancialHealthRequest(BaseModel):
    monthly_income: float = Field(gt=0)
    monthly_expenses: float = Field(ge=0)
    monthly_savings: float = Field(ge=0)
    total_debt: float = Field(ge=0)


class FinancialHealthResponse(BaseModel):
    score: int
    label: str
    summary: str

