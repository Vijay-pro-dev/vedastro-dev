from pydantic import BaseModel, Field


class SectionCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    display_order: int = Field(1, ge=1)
    is_active: bool = True


class SubsectionCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    display_order: int = Field(1, ge=1)
    is_active: bool = True
