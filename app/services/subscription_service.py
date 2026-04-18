from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.subscription import SubscriptionPlan, UserSubscription


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass(frozen=True)
class PlanDefinition:
    name: str
    duration_days: int
    price: Decimal
    features: dict
    auto_renew: bool


def _report_plan_definition(plan_key: str) -> PlanDefinition:
    settings = get_settings()
    normalized = (plan_key or "monthly").strip().lower()

    if normalized == "yearly":
        price = (Decimal(int(settings.report_yearly_price_paise)) / Decimal(100)).quantize(Decimal("0.01"))
        return PlanDefinition(
            name="Report Yearly",
            duration_days=365,
            price=price,
            features={"product": settings.report_product_key, "period": "yearly"},
            auto_renew=False,
        )

    price = (Decimal(int(settings.report_monthly_price_paise)) / Decimal(100)).quantize(Decimal("0.01"))
    return PlanDefinition(
        name="Report Monthly",
        duration_days=30,
        price=price,
        features={"product": settings.report_product_key, "period": "monthly"},
        auto_renew=False,
    )


def get_or_create_report_plan(db: Session, plan_key: str) -> SubscriptionPlan:
    definition = _report_plan_definition(plan_key)

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_name == definition.name).first()
    if plan:
        if (
            plan.duration_days != definition.duration_days
            or Decimal(str(plan.price)) != definition.price
            or (plan.features or {}) != definition.features
            or plan.is_active is not True
        ):
            plan.duration_days = definition.duration_days
            plan.price = definition.price
            plan.features = definition.features
            plan.is_active = True
            db.add(plan)
            db.commit()
        return plan

    plan = SubscriptionPlan(
        plan_name=definition.name,
        duration_days=definition.duration_days,
        price=definition.price,
        features=definition.features,
        is_active=True,
        created_at=utc_now(),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def create_or_update_subscription_for_order(
    db: Session,
    *,
    user_id: int,
    plan_id: int,
    payment_order_id: str,
    provider_payment_id: str | None = None,
    status: str,
    payment_status: str,
    auto_renew: bool,
) -> UserSubscription:
    existing = (
        db.query(UserSubscription)
        .filter(UserSubscription.user_id == user_id)
        .filter(UserSubscription.payment_id.in_([payment_order_id, provider_payment_id] if provider_payment_id else [payment_order_id]))
        .first()
    )

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.plan_id == plan_id).first()
    duration_days = int(plan.duration_days) if plan else 30

    start = utc_now()
    end = start + timedelta(days=duration_days)

    if existing:
        existing.plan_id = plan_id
        existing.status = status
        existing.payment_status = payment_status
        existing.payment_id = provider_payment_id or payment_order_id
        existing.auto_renew = bool(auto_renew)
        if status == "active" and payment_status in {"paid", "success"}:
            existing.start_date = start
            existing.end_date = end
        else:
            if existing.start_date is None:
                existing.start_date = start
            if existing.end_date is None or existing.end_date < existing.start_date:
                existing.end_date = end
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    row = UserSubscription(
        user_id=user_id,
        plan_id=plan_id,
        start_date=start,
        end_date=end,
        status=status,
        payment_id=provider_payment_id or payment_order_id,
        payment_status=payment_status,
        auto_renew=bool(auto_renew),
        created_at=utc_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
