from typing import Literal, Optional

from pydantic import BaseModel, Field


SuggestionStatus = Literal["pending", "resolved"]


class SuggestionCreate(BaseModel):
    message: str = Field(min_length=3, max_length=2000)


class SuggestionUpdateAdmin(BaseModel):
    status: Optional[SuggestionStatus] = None
    admin_response: Optional[str] = Field(default=None, max_length=4000)


class SuggestionOut(BaseModel):
    id: int
    user_id: int
    message: str
    status: SuggestionStatus
    admin_response: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    resolved_at: Optional[str] = None


class SuggestionAdminOut(SuggestionOut):
    user_email: Optional[str] = None
    user_name: Optional[str] = None


class SuggestionsListResponse(BaseModel):
    suggestions: list[SuggestionOut]


class SuggestionsAdminListResponse(BaseModel):
    suggestions: list[SuggestionAdminOut]

