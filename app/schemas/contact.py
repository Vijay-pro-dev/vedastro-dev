from typing import Optional

from pydantic import BaseModel, Field


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=320)
    subject: Optional[str] = Field(default=None, max_length=160)
    message: str = Field(min_length=10, max_length=4000)

