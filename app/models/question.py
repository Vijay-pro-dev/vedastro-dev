from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now() -> datetime:
  return datetime.now(timezone.utc).replace(tzinfo=None)


class UserType(Base):
  __tablename__ = "user_types"

  id = Column("user_type_id", Integer, primary_key=True, index=True)
  type_code = Column(String(50), unique=True, nullable=False)
  type_name = Column(String(100), nullable=False)
  description = Column(String(255), nullable=True)
  priority = Column(Integer, default=1)
  is_active = Column(Boolean, default=True)
  created_at = Column(DateTime, default=utc_now)
  created_by = Column(Integer, nullable=True)
  updated_at = Column(DateTime, default=None, nullable=True)
  updated_by = Column(Integer, nullable=True)

  question_links = relationship("QuestionUserTypeMap", back_populates="user_type", cascade="all, delete-orphan")


class Question(Base):
  __tablename__ = "questions"

  id = Column("question_id", Integer, primary_key=True, index=True)
  question_text = Column(Text, nullable=False)
  answer_type = Column(Enum("text", "slider", "radio", "checkbox", name="answer_type_enum"), nullable=False)
  score = Column(Integer, nullable=True)
  is_required = Column(Boolean, default=True)
  display_order = Column(Integer, default=1)
  is_active = Column(Boolean, default=True)
  subcategory_id = Column(Integer, nullable=True)
  category_id = Column(JSON, nullable=True)
  created_at = Column(DateTime, default=utc_now)
  created_by = Column(Integer, nullable=True)
  updated_at = Column(DateTime, default=None, nullable=True)
  updated_by = Column(Integer, nullable=True)

  user_type_links = relationship("QuestionUserTypeMap", back_populates="question", cascade="all, delete-orphan")


class QuestionUserTypeMap(Base):
  __tablename__ = "question_user_type_map"

  id = Column(Integer, primary_key=True, index=True)
  question_id = Column(Integer, ForeignKey("questions.question_id", ondelete="CASCADE"), nullable=False)
  user_type_id = Column(Integer, ForeignKey("user_types.user_type_id", ondelete="CASCADE"), nullable=False)

  question = relationship("Question", back_populates="user_type_links")
  user_type = relationship("UserType", back_populates="question_links")


class Section(Base):
  __tablename__ = "sections"

  id = Column(Integer, primary_key=True, index=True, autoincrement=True)
  name = Column(String(100), unique=True, nullable=False)
  display_order = Column(Integer, default=1)
  is_active = Column(Boolean, default=True)
  created_at = Column(DateTime, default=utc_now)


class Subsection(Base):
  __tablename__ = "subsections"

  id = Column(Integer, primary_key=True, index=True, autoincrement=True)
  name = Column(String(100), unique=True, nullable=False)
  display_order = Column(Integer, default=1)
  is_active = Column(Boolean, default=True)
  created_at = Column(DateTime, default=utc_now)
