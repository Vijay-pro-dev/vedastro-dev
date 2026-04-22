from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


JSON_VARIANT = JSON().with_variant(postgresql.JSONB(), "postgresql")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    plan_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_name: Mapped[str] = mapped_column(String(length=100), nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    features: Mapped[dict[str, object] | None] = mapped_column(JSON_VARIANT, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now, nullable=True)


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    subscription_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey("subscription_plans.plan_id"), index=True, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str | None] = mapped_column(
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
    payment_id: Mapped[str | None] = mapped_column(String(length=100), nullable=True)
    payment_status: Mapped[str | None] = mapped_column(
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
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=utc_now, nullable=True)
