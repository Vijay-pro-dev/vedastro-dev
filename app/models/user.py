from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Float, Integer, String, Text

from app.core.database import Base


def utc_now() -> datetime:
    """Return a naive UTC timestamp compatible with existing DB columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    nationality = Column(String, default="global")
    language = Column(String, default="english")
    role = Column(String, default="user")
    suspended = Column(Integer, default=0)
    email_verified = Column(Integer, default=0)
    email_verification_token = Column(String, nullable=True)
    password_reset_token = Column(String, nullable=True)
    password_reset_sent_at = Column(DateTime, nullable=True)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    refresh_token_version = Column(Integer, default=0)
    profile_pic = Column(String, nullable=True)
    user_type_id = Column(Integer, nullable=True)
    referral_code = Column(String(20), nullable=True)
    referred_by = Column(BigInteger, nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now)


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
    user_id = Column(Integer, nullable=True, index=True)
    name = Column(String)
    dob = Column(String)
    birth_time = Column(String)
    birth_place = Column(String)
    birth_time_accuracy = Column(String, default="unknown")
    address = Column(String, nullable=True)
    profile_pic = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now)


class BirthTimeEstimate(Base):
    __tablename__ = "birth_time_estimates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    questionnaire_responses = Column(Text)
    estimated_time = Column(String)
    confidence_score = Column(Float)
    created_at = Column(DateTime, default=utc_now)


class CareerProfile(Base):
    __tablename__ = "career_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    education = Column(String)
    interests = Column(String)
    goals = Column(String)
    current_role = Column(String, nullable=True)
    years_experience = Column(Integer, default=0)
    goal_clarity = Column(String, default="medium")
    role_match = Column(String, default="medium")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now)


class CareerAlignmentScore(Base):
    __tablename__ = "career_alignment_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    category_id = Column(Float)
    score = Column(Integer)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now)


class CareerPhase(Base):
    __tablename__ = "career_phases"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    phase_name = Column(String)
    phase_start_date = Column(String)
    phase_end_date = Column(String)
    description = Column(Text)
    created_at = Column(DateTime, default=utc_now)


class OpportunityWindow(Base):
    __tablename__ = "opportunity_windows"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    window_start_date = Column(String)
    window_end_date = Column(String)
    opportunity_type = Column(String)
    confidence_level = Column(Float)
    description = Column(Text)
    created_at = Column(DateTime, default=utc_now)


class DecisionGuidance(Base):
    __tablename__ = "decision_guidance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    guidance_id = Column(String)
    focus = Column(Text)
    avoid = Column(Text)
    reason = Column(Text)
    recommendations = Column(Text)
    created_at = Column(DateTime, default=utc_now)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    activity_type = Column(String)
    description = Column(Text)
    data = Column(Text)
    created_at = Column(DateTime, default=utc_now)


class CareerScore(Base):
    __tablename__ = "career_scores"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    score = Column(Integer)
    date = Column(String)


class FeedbackDecision(Base):
    __tablename__ = "feedback_decisions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    decision = Column(String)
    notes = Column(String)


class FeedbackOutcome(Base):
    __tablename__ = "feedback_outcomes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    result = Column(String)
    comments = Column(String)
