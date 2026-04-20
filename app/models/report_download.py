from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ReportDownload(Base):
    __tablename__ = "report_downloads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    report_kind = Column(String(length=32), index=True, nullable=False)  # e.g. "career_ai_pdf"
    created_at = Column(DateTime, default=utc_now, index=True, nullable=False)

