from __future__ import annotations

from datetime import datetime, timezone
from datetime import timedelta

from typing import cast

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.payment import ReportPayment


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def is_payment_active(payment: ReportPayment) -> bool:
    status = cast(str | None, getattr(payment, "status", None))
    if status != "paid":
        return False
    expires_at = cast(datetime | None, getattr(payment, "expires_at", None))
    if expires_at is None:
        return True
    return expires_at >= utc_now()


def has_paid_report(db: Session, user_id: int, product_key: str) -> bool:
    # Multiple rows can exist for the same user/product (retries, failed attempts).
    # Consider any active paid payment as valid.
    rows = (
        db.query(ReportPayment)
        .filter(ReportPayment.user_id == user_id)
        .filter(ReportPayment.product_key == product_key)
        .filter(ReportPayment.status == "paid")
        .order_by(
            desc(ReportPayment.expires_at.is_(None)),  # one-time (no expiry) first
            desc(ReportPayment.expires_at),
            desc(ReportPayment.updated_at),
            desc(ReportPayment.created_at),
        )
        .all()
    )
    return any(is_payment_active(row) for row in rows)


def _expiry_for_plan(plan_key: str) -> datetime | None:
    plan = (plan_key or "one_time").strip().lower()
    if plan == "monthly":
        return utc_now() + timedelta(days=30)
    if plan == "yearly":
        return utc_now() + timedelta(days=365)
    return None


def mark_payment_paid(db: Session, payment: ReportPayment, razorpay_payment_id: str) -> None:
    setattr(payment, "status", "paid")
    setattr(payment, "razorpay_payment_id", razorpay_payment_id)
    plan_key = cast(str | None, getattr(payment, "plan_key", None))
    setattr(payment, "expires_at", _expiry_for_plan(plan_key or "one_time"))
    setattr(payment, "updated_at", utc_now())
    db.add(payment)
    db.commit()
