from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    """Return a naive UTC timestamp compatible with existing DB columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    nationality: Mapped[str | None] = mapped_column(String, default="global")
    language: Mapped[str | None] = mapped_column(String, default="english")
    role: Mapped[str | None] = mapped_column(String, default="user")
    suspended: Mapped[int | None] = mapped_column(Integer, default=0)
    email_verified: Mapped[int | None] = mapped_column(Integer, default=0)
    email_verification_token: Mapped[str | None] = mapped_column(String, nullable=True)
    password_reset_token: Mapped[str | None] = mapped_column(String, nullable=True)
    password_reset_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_login_attempts: Mapped[int | None] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    refresh_token_version: Mapped[int | None] = mapped_column(Integer, default=0)
    profile_pic: Mapped[str | None] = mapped_column(String, nullable=True)
    user_type_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    referral_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    referred_by: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    is_verified: Mapped[bool | None] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool | None] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now)


class UserInfo(Base):
    __tablename__ = "userinfo"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    dob = Column(String)
    birth_time = Column(String)
    contact = Column(String)


class BirthData(Base):
    __tablename__ = "birth_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    dob: Mapped[str | None] = mapped_column(String, nullable=True)
    birth_time: Mapped[str | None] = mapped_column(String, nullable=True)
    birth_place: Mapped[str | None] = mapped_column(String, nullable=True)
    birth_time_accuracy: Mapped[str | None] = mapped_column(String, default="unknown", nullable=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    profile_pic: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now)


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

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    education: Mapped[str | None] = mapped_column(String, nullable=True)
    interests: Mapped[str | None] = mapped_column(String, nullable=True)
    goals: Mapped[str | None] = mapped_column(String, nullable=True)
    current_role: Mapped[str | None] = mapped_column(String, nullable=True)
    years_experience: Mapped[int | None] = mapped_column(Integer, default=0, nullable=True)
    goal_clarity: Mapped[str | None] = mapped_column(String, default="medium", nullable=True)
    role_match: Mapped[str | None] = mapped_column(String, default="medium", nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now)


class CareerAlignmentScore(Base):
    __tablename__ = "career_alignment_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    category_id = Column(Float)
    score = Column(Integer)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now)


class ElementScore(Base):
    __tablename__ = "element_score"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    element_id = Column(Integer, nullable=False)
    score = Column(Integer, nullable=True)       # total/summed score for the element
    avg_score = Column(Integer, nullable=True)   # averaged 0-100 score for the element
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now)


class EnergyScore(Base):
    __tablename__ = "energy_score"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    energy_id = Column(Integer, nullable=False)
    score = Column(Integer, nullable=True)       # total/summed score for the energy
    avg_score = Column(Integer, nullable=True)   # averaged 0-100 score for the energy
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
