from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True)
    password = Column(String)


class UserInfo(Base):
    __tablename__ = "userinfo"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    dob = Column(String)
    birth_time = Column(String)
    contact = Column(String)


class BirthData(Base):
    __tablename__ = "birth_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    name = Column(String)
    dob = Column(String)
    birth_time = Column(String)
    birth_place = Column(String)
    birth_time_accuracy = Column(String, default="unknown")  # exact, approximate, unknown, estimated_by_ai
    address = Column(String, nullable=True)


class BirthTimeEstimate(Base):
    __tablename__ = "birth_time_estimates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    questionnaire_responses = Column(Text)  # JSON string of responses
    estimated_time = Column(String)
    confidence_score = Column(Float)  # 0-100
    created_at = Column(DateTime, default=datetime.utcnow)


# Career Profile
class CareerProfile(Base):
    __tablename__ = "career_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    education = Column(String)
    interests = Column(String)
    goals = Column(String)


# Career Alignment Score - Tracks user's alignment with career opportunities
class CareerAlignmentScore(Base):
    __tablename__ = "career_alignment_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    awareness_score = Column(Float)  # 0-100
    time_alignment_score = Column(Float)  # 0-100
    action_integrity_score = Column(Float)  # 0-100
    overall_score = Column(Float)  # 0-100 (average)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


# Career Phase - Determines current career phase
class CareerPhase(Base):
    __tablename__ = "career_phases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    phase_name = Column(String)  # Skill Building, Expansion, Opportunity Window, Consolidation
    phase_start_date = Column(String)
    phase_end_date = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# Opportunity Window - Identifies upcoming career opportunities
class OpportunityWindow(Base):
    __tablename__ = "opportunity_windows"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    window_start_date = Column(String)
    window_end_date = Column(String)
    opportunity_type = Column(String)
    confidence_level = Column(Float)  # 0-100
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


# Decision Guidance - Provides structured guidance for career decisions
class DecisionGuidance(Base):
    __tablename__ = "decision_guidance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    guidance_id = Column(String)  # Unique identifier
    focus = Column(Text)  # What to focus on
    avoid = Column(Text)  # What to avoid
    reason = Column(Text)  # Why this guidance
    recommendations = Column(Text)  # JSON string of recommendations
    created_at = Column(DateTime, default=datetime.utcnow)


# Activity Log - Logs user feedback and decisions for learning
class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    activity_type = Column(String)  # decision, outcome, feedback, etc
    description = Column(Text)
    data = Column(Text)  # JSON string of activity data
    created_at = Column(DateTime, default=datetime.utcnow)


# Score History
class CareerScore(Base):
    __tablename__ = "career_scores"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    score = Column(Integer)
    date = Column(String)


# Feedback Decision
class FeedbackDecision(Base):
    __tablename__ = "feedback_decisions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    decision = Column(String)
    notes = Column(String)


# Feedback Outcome
class FeedbackOutcome(Base):
    __tablename__ = "feedback_outcomes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    result = Column(String)
    comments = Column(String)