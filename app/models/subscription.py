from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects import postgresql
from sqlalchemy.types import JSON

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


JSON_VARIANT = JSON().with_variant(postgresql.JSONB(), "postgresql")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    plan_id = Column(Integer, primary_key=True, index=True)
    plan_name = Column(String(length=100), nullable=False)
    duration_days = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    features = Column(JSON_VARIANT, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=True)


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    subscription_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.plan_id"), index=True, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(
        SAEnum(
            "pending",
            "active",
            "canceled",
            "expired",
            name="subscription_status",
            native_enum=True,
            validate_strings=True,
        ),
        nullable=True,
    )
    payment_id = Column(String(length=100), nullable=True)
    payment_status = Column(
        SAEnum(
            "pending",
            "success",
            "failed",
            name="payment_status",
            native_enum=True,
            validate_strings=True,
        ),
        nullable=True,
    )
    auto_renew = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=True)
