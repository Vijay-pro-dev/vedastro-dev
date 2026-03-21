# ============================================
# Pydantic Schemas for FastAPI Request/Response Validation
# These schemas define the structure of API requests and responses
# ============================================

from pydantic import BaseModel, Field
from enum import Enum
from typing import List, Optional, Dict, Any


# ==================== AUTHENTICATION SCHEMAS ====================

class Signup(BaseModel):
    """Schema for user registration/signup"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (minimum 6 characters)")
    name: Optional[str] = None
    phone: Optional[str] = None


class Login(BaseModel):
    """Schema for user login"""
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class LoginResponse(BaseModel):
    """Schema for login response - includes user_id for tracking"""
    message: str
    user_id: int
    email: str
    name: Optional[str] = None
    language: str


# ==================== USER PROFILE SCHEMAS ====================

class UserProfile(BaseModel):
    """Schema for user profile information"""
    id: Optional[int] = None
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    language: str = "english"  # english or hindi


class UpdateUserProfile(BaseModel):
    """Schema for updating user profile"""
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    language: Optional[str] = None


class LanguagePreference(BaseModel):
    """Schema for language preference"""
    language: str = Field(..., description="Language code: english or hindi")


# ==================== USER INFORMATION SCHEMAS ====================

class UserInfo(BaseModel):
    """Schema for basic user information"""
    name: str
    dob: str
    birth_time: str
    contact: str


# ==================== TASK 1 - BIRTH DATA ACCURACY SCHEMAS ====================

class BirthTimeAccuracyEnum(str, Enum):
    """
    Enum for birth time accuracy levels
    
    Values:
    - exact: Exact birth time confirmed with documents
    - approximate: Birth time is approximately known (within 30 min)
    - unknown: Birth time not known
    - estimated_by_ai: Birth time estimated using AI questionnaire
    """
    exact = "exact"
    approximate = "approximate"
    unknown = "unknown"
    estimated_by_ai = "estimated_by_ai"
    estimated = "estimated"


class BirthData(BaseModel):
    """
    Schema for birth data with accuracy tracking
    
    Task 1: Handles birth data with different accuracy levels for better prediction accuracy
    """
    user_id: Optional[int] = None
    name: Optional[str] = None
    dob: str = Field(..., description="Date of birth (YYYY-MM-DD)")
    birth_time: str = Field(..., description="Time of birth (HH:MM)")
    birth_place: str = Field(..., description="Birth city/location")
    birth_time_accuracy: BirthTimeAccuracyEnum = BirthTimeAccuracyEnum.unknown
    address: Optional[str] = None
    user_email: Optional[str] = None  # For updating by email
    profile_pic: Optional[str] = None

# ==================== TASK 2 - BIRTH TIME ESTIMATION SCHEMAS ====================

class BirthTimeQuestionnaire(BaseModel):
    """
    Schema for birth time estimation questionnaire
    
    Task 2: Processes questionnaire responses to estimate approximate birth timing
    User provides information about major life events and patterns
    """
    user_id: int
    life_turning_points: str = Field(..., description="Major turning points in life")
    major_changes_timing: str = Field(..., description="When major changes occurred")
    significant_events: str = Field(..., description="Significant events and timing")
    career_transitions: str = Field(..., description="Career transition experiences")
    health_events: str = Field(..., description="Major health events and timing")


class BirthTimeEstimate(BaseModel):
    """Schema for birth time estimation results"""
    user_id: int
    questionnaire_responses: Dict[str, Any]
    estimated_time: str
    confidence_score: float = Field(..., ge=0, le=100)


# ==================== CAREER PROFILE SCHEMAS ====================

class CareerProfile(BaseModel):
    """Schema for user career profile"""
    user_id: Optional[int] = None
    education: str
    interests: str
    goals: str


# ==================== TASK 3 - CAREER ALIGNMENT SCORE SCHEMAS ====================

class CareerAlignmentScore(BaseModel):
    """
    Schema for Career Alignment Score components
    
    Task 3: Calculates Career Alignment Score using three components:
    - Awareness: Knowledge of self and market opportunities (0-100)
    - Time Alignment: Alignment with astrological timing (0-100)
    - Action Integrity: Consistency between plans and actions (0-100)
    """
    user_id: int
    awareness_score: float = Field(..., ge=0, le=100, description="Self awareness score")
    time_alignment_score: float = Field(..., ge=0, le=100, description="Time alignment with astrology")
    action_integrity_score: float = Field(..., ge=0, le=100, description="Action consistency score")


# ==================== TASK 4 - CAREER PHASE SCHEMAS ====================

class CareerPhase(BaseModel):
    """
    Schema for career phase
    
    Task 4: Determines user's current career phase:
    - Skill Building: Early career, focus on competencies
    - Expansion: Growing responsibilities
    - Opportunity Window: Critical transition period
    - Consolidation: Stability and expertise
    """
    user_id: int
    phase_name: str = Field(..., description="Phase: Skill Building, Expansion, Opportunity Window, Consolidation")
    phase_start_date: str = Field(..., description="Phase start date (YYYY-MM-DD)")
    phase_end_date: str = Field(..., description="Phase end date (YYYY-MM-DD)")
    description: str = ""


# ==================== TASK 5 - OPPORTUNITY WINDOW SCHEMAS ====================

class OpportunityWindow(BaseModel):
    """
    Schema for opportunity window
    
    Task 5: Identifies upcoming career opportunities based on
    astrology timing rules and career patterns
    """
    user_id: int
    window_start_date: str = Field(..., description="Opportunity window start date")
    window_end_date: str = Field(..., description="Opportunity window end date")
    opportunity_type: str = Field(..., description="Type of opportunity")
    confidence_level: float = Field(..., ge=0, le=100, description="Confidence prediction (0-100)")
    description: str = ""


# ==================== TASK 6 - DECISION GUIDANCE SCHEMAS ====================

class DecisionGuidance(BaseModel):
    """
    Schema for decision guidance
    
    Task 6: Generates structured guidance with:
    - focus: What to focus on
    - avoid: What to avoid
    - reason: Why this guidance
    - recommendations: Actionable recommendations
    """
    user_id: int
    focus: str = Field(..., description="What user should focus on")
    avoid: str = Field(..., description="What user should avoid")
    reason: str = Field(..., description="Reason for this guidance")
    recommendations: List[str] = []


# ==================== ACTIVITY & FEEDBACK SCHEMAS ====================

class ActivityLog(BaseModel):
    """Schema for activity logging"""
    user_id: int
    activity_type: str  # assessment, decision, outcome, feedback, etc
    description: str
    data: Dict[str, Any] = {}


class DecisionEnum(str, Enum):
    """Enum for decision feedback"""
    accepted = "accepted"
    rejected = "rejected"
    pending = "pending"


class FeedbackDecision(BaseModel):
    """
    Schema for decision feedback
    
    Task 8: Stores user's decision feedback to improve accuracy
    """
    user_id: Optional[int] = None
    decision: DecisionEnum
    notes: str = Field(max_length=200)


class FeedbackOutcome(BaseModel):
    """
    Schema for outcome feedback
    
    Task 8: Stores results of user decisions for learning
    """
    user_id: Optional[int] = None
    result: str
    comments: str
