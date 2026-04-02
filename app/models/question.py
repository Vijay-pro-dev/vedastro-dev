from datetime import datetime, timezone

from sqlalchemy import (
  BigInteger,
  Boolean,
  Column,
  DateTime,
  Enum,
  ForeignKey,
  Integer,
  Numeric,
  String,
  Text,
)
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
  __tablename__ = "master_questions"

  id = Column("question_id", Integer, primary_key=True, index=True, autoincrement=True)
  question_text = Column(Text, nullable=False)
  answer_type = Column(Enum("text", "slider", "radio", "checkbox", name="answer_type_enum"), nullable=False)
  score = Column(Integer, nullable=True)  # SMALLINT 1-5; app-level validation can enforce range
  is_required = Column(Boolean, default=True)
  display_order = Column(Integer, default=1)
  is_active = Column(Boolean, default=True)
  created_at = Column(DateTime, default=utc_now)
  created_by = Column(BigInteger, nullable=True)
  updated_at = Column(DateTime, default=None, nullable=True)
  updated_by = Column(BigInteger, nullable=True)
  set_id = Column(Integer, nullable=True)
  energy_id = Column(Integer, nullable=True)
  weight = Column(Numeric(5, 2), default=1.0)
  section_id = Column(Integer, nullable=True)
  element_id = Column(Integer, nullable=True)
  category_id = Column(Integer, nullable=True)

  user_type_links = relationship(
    "QuestionUserTypeMap", back_populates="question", cascade="all, delete-orphan"
  )


class QuestionUserTypeMap(Base):
  __tablename__ = "question_user_type_map"

  id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
  question_id = Column(Integer, ForeignKey("master_questions.question_id", ondelete="CASCADE"), nullable=False)
  user_type_id = Column(Integer, ForeignKey("user_types.user_type_id", ondelete="CASCADE"), nullable=False)

  question = relationship("Question", back_populates="user_type_links")
  user_type = relationship("UserType", back_populates="question_links")


class Section(Base):
  __tablename__ = "master_sections"

  id = Column(Integer, primary_key=True, index=True, autoincrement=True)
  name = Column(String(100), unique=True, nullable=False)
  display_order = Column(Integer, nullable=True)
  is_active = Column(Boolean, nullable=True)
  created_at = Column(DateTime, default=utc_now)


class Energy(Base):
  __tablename__ = "master_energy"

  id = Column(Integer, primary_key=True, index=True, autoincrement=True)
  name = Column(String(100), unique=True, nullable=False)
  display_order = Column(Integer, nullable=True)
  is_active = Column(Boolean, nullable=True)
  created_at = Column(DateTime, default=utc_now)


class Element(Base):
  __tablename__ = "master_element"

  id = Column(Integer, primary_key=True, index=True, autoincrement=True)
  name = Column(String(100), nullable=False)


class Category(Base):
  __tablename__ = "master_category"

  id = Column(Integer, primary_key=True, index=True, autoincrement=True)
  category_name = Column(String(255), nullable=False)
