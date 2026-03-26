from typing import Optional

from pydantic import BaseModel, Field


class QuestionBase(BaseModel):
    question_text: str = Field(..., min_length=3)
    answer_type: str = Field(..., pattern="^(text|slider|radio|checkbox)$")
    score: Optional[int] = Field(3, ge=1, le=5)
    is_required: bool = True
    display_order: int = Field(1, ge=1)
    is_active: bool = True
    section: str = Field(..., min_length=1, max_length=100)
    user_type_code: str = Field(..., min_length=3, max_length=50)
    subsection: Optional[str] = Field(
        default=None,
        min_length=0,
        max_length=100,
        description="Element bucket for grouping questions",
    )


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(QuestionBase):
    pass


class QuestionToggleStatus(BaseModel):
    is_active: bool
