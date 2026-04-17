from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base
from app.models.user import utc_now


class Suggestion(Base):
    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    message = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    status = Column(String, default="pending", index=True)
    admin_response = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now)
    resolved_at = Column(DateTime, nullable=True)

    def touch(self) -> datetime:
        now = utc_now()
        self.updated_at = now
        return now
