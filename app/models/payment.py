from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ReportPayment(Base):
    __tablename__ = "report_payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    product_key = Column(String(length=64), index=True, nullable=False)
    plan_key = Column(String(length=16), default="one_time", nullable=False)  # monthly|yearly|one_time
    provider = Column(String(length=32), default="razorpay", nullable=False)
    status = Column(String(length=20), default="created", nullable=False)  # created|paid|failed
    amount_paise = Column(Integer, nullable=False)
    currency = Column(String(length=8), default="INR", nullable=False)
    razorpay_order_id = Column(String(length=40), unique=True, index=True, nullable=False)
    razorpay_payment_id = Column(String(length=40), unique=True, index=True, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=True)
    updated_at = Column(DateTime, default=utc_now, nullable=True)
