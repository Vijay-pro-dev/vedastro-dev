from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Optional, Dict, Any


class Signup(BaseModel):
    email: str
    password: str


class Login(BaseModel):
    email: str
    password: str


class UserInfo(BaseModel):
    name: str
    dob: str
    birth_time: str
    contact: str


# Birth Time Accuracy Enum
class BirthTimeAccuracyEnum(str, Enum):
    exact = "exact"
    approximate = "approximate"
    unknown = "unknown"
    estimated_by_ai = "estimated_by_ai"
    estimated = "estimated"


class BirthData(BaseModel):
    user_id: Optional[int] = None
    name: Optional[str] = None
    dob: str
    birth_time: str
    birth_place: str
    birth_time_accuracy: BirthTimeAccuracyEnum = BirthTimeAccuracyEnum.unknown
    address: Optional[str] = None
    user_email: Optional[str] = None  # For updating by email


# Birth Time Estimation Questionnaire
class BirthTimeQuestionnaire(BaseModel):
    user_id: int
    life_turning_points: str = Field(..., description="Major turning points in life")
    major_changes_timing: str = Field(..., description="When major changes occurred")
    significant_events: str = Field(..., description="Significant events and approximate timing")
    career_transitions: str = Field(..., description="Career transition experiences")
    health_events: str = Field(..., description="Major health events and timing")


class BirthTimeEstimate(BaseModel):
    user_id: int
    questionnaire_responses: Dict[str, Any]
    estimated_time: str
    confidence_score: float = Field(..., ge=0, le=100)


class CareerProfile(BaseModel):
    user_id: Optional[int] = None
    education: str
    interests: str
    goals: str


# Career Alignment Score Components
class CareerAlignmentScore(BaseModel):
    user_id: int
    awareness_score: float = Field(..., ge=0, le=100)
    time_alignment_score: float = Field(..., ge=0, le=100)
    action_integrity_score: float = Field(..., ge=0, le=100)


class CareerPhase(BaseModel):
    user_id: int
    phase_name: str  # Skill Building, Expansion, Opportunity Window, Consolidation
    phase_start_date: str
    phase_end_date: str
    description: str = ""


class OpportunityWindow(BaseModel):
    user_id: int
    window_start_date: str
    window_end_date: str
    opportunity_type: str
    confidence_level: float = Field(..., ge=0, le=100)
    description: str = ""


class DecisionGuidance(BaseModel):
    user_id: int
    focus: str
    avoid: str
    reason: str
    recommendations: List[str] = []


class ActivityLog(BaseModel):
    user_id: int
    activity_type: str  # decision, outcome, feedback, etc
    description: str
    data: Dict[str, Any] = {}


class DecisionEnum(str, Enum):
    accepted = "accepted"
    rejected = "rejected"
    pending = "pending"


class FeedbackDecision(BaseModel):
    user_id: Optional[int] = None
    decision: DecisionEnum
    notes: str = Field(max_length=200)


class FeedbackOutcome(BaseModel):
    user_id: Optional[int] = None
    result: str
    comments: str