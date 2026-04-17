from sqlalchemy import Column, DateTime, Integer, String, Text

from app.core.database import Base
from app.models.user import utc_now


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    name = Column(String(120), nullable=False)
    email = Column(String(320), nullable=False, index=True)
    subject = Column(String(160), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)
