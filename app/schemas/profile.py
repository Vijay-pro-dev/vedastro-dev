from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class BirthTimeAccuracyEnum(str, Enum):
    exact = "exact"
    approximate = "approximate"
    unknown = "unknown"
    estimated_by_ai = "estimated_by_ai"
    estimated = "estimated"


class ProfileResponse(BaseModel):
    user_id: int
    email: str
    email_verified: bool = False
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    nationality: str = "global"
    language: str = "english"
    profile_pic: Optional[str] = None
    dob: str = ""
    birth_time: str = ""
    birth_place: str = ""
    birth_time_accuracy: BirthTimeAccuracyEnum = BirthTimeAccuracyEnum.unknown
    education: str = ""
    interests: str = ""
    goals: str = ""
    current_role: str = ""
    years_experience: int = 0
    goal_clarity: str = "medium"
    role_match: str = "medium"
    profile_completed: bool = False


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    nationality: Optional[str] = None
    language: Optional[str] = None
    profile_pic: Optional[str] = None
    dob: Optional[str] = None
    birth_time: Optional[str] = None
    birth_place: Optional[str] = None
    birth_time_accuracy: Optional[BirthTimeAccuracyEnum] = None
    education: Optional[str] = None
    interests: Optional[str] = None
    goals: Optional[str] = None
    current_role: Optional[str] = None
    years_experience: Optional[int] = Field(default=None, ge=0)
    goal_clarity: Optional[str] = None
    role_match: Optional[str] = None


class BirthTimeQuestionnaire(BaseModel):
    user_id: Optional[int] = None
    life_turning_points: str
    major_changes_timing: str
    significant_events: str
    career_transitions: str
    health_events: str
