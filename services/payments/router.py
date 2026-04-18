from __future__ import annotations

import base64
import hashlib
import hmac
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import models
from app.core.config import get_settings
from app.core.database import get_db
from app.models.payment import ReportPayment
from app.models.subscription import SubscriptionPlan
from app.services.payment_service import has_paid_report, mark_payment_paid
from app.services.subscription_service import create_or_update_subscription_for_order, get_or_create_report_plan
from services.auth.router import get_current_user


router = APIRouter(tags=["payments"])
settings = get_settings()


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _razorpay_auth_header() -> str:
    if not settings.razorpay_key_id or not settings.razorpay_key_secret:
        raise HTTPException(status_code=500, detail="Razorpay credentials are not configured")
    raw = f"{settings.razorpay_key_id}:{settings.razorpay_key_secret}".encode("utf-8")
    return "Basic " + base64.b64encode(raw).decode("ascii")


def _razorpay_order_create(amount_paise: int, currency: str, receipt: str) -> dict:
    headers = {
        "Authorization": _razorpay_auth_header(),
        "Content-Type": "application/json",
    }
    payload = {
        "amount": int(amount_paise),
        "currency": currency,
        "receipt": receipt,
        "payment_capture": 1,
        "notes": {"product": settings.report_product_key},
    }
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post("https://api.razorpay.com/v1/orders", headers=headers, json=payload)
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Failed to reach Razorpay API")

    if resp.status_code >= 400:
        description = None
        try:
            data = resp.json()
            err = data.get("error") if isinstance(data, dict) else None
            if isinstance(err, dict):
                description = err.get("description") or err.get("code")
        except Exception:
            description = None

        msg = f"Razorpay order create failed ({resp.status_code})"
        if description:
            msg += f": {description}"
        raise HTTPException(status_code=502, detail=msg)

    return resp.json()


def _verify_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = settings.razorpay_key_secret or ""
    payload = f"{order_id}|{payment_id}".encode("utf-8")
    digest = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, signature or "")


class CreateOrderOut(BaseModel):
    key_id: str
    product_key: str
    plan_key: str
    amount: int
    currency: str
    order_id: str


@router.get("/payments/report/status")
def report_status(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    paid = has_paid_report(db, current_user.id, settings.report_product_key)
    return {"product_key": settings.report_product_key, "paid": paid}


class SubscriptionPlanOut(BaseModel):
    plan_id: int
    plan_key: str
    plan_name: str
    duration_days: int
    price: str | None = None
    features: dict | None = None
    is_active: bool


@router.get("/payments/report/plans", response_model=list[SubscriptionPlanOut])
def report_plans(db: Session = Depends(get_db)):
    # Ensure baseline plans exist so UI can always render names from DB.
    for key in ("monthly", "yearly"):
        get_or_create_report_plan(db, key)

    rows: list[SubscriptionPlan] = db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active == True).all()  # noqa: E712

    plans: list[SubscriptionPlanOut] = []
    for row in rows:
        features = row.features if isinstance(row.features, dict) else None
        if not features or features.get("product") != settings.report_product_key:
            continue
        plan_key = str(features.get("period") or "").strip().lower()
        if plan_key not in {"monthly", "yearly"}:
            continue
        plans.append(
            SubscriptionPlanOut(
                plan_id=int(row.plan_id),
                plan_key=plan_key,
                plan_name=str(row.plan_name),
                duration_days=int(row.duration_days),
                price=str(row.price) if row.price is not None else None,
                features=features,
                is_active=bool(row.is_active),
            )
        )

    plans.sort(key=lambda p: (0 if p.plan_key == "monthly" else 1, p.duration_days))
    return plans


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def _country_code(request: Request) -> str | None:
    for header in ("cf-ipcountry", "x-vercel-ip-country", "x-country-code"):
        value = request.headers.get(header)
        if value:
            return value.strip().upper()
    return None


def _currency_for_request(request: Request) -> str:
    if settings.payment_force_currency:
        return settings.payment_force_currency
    cc = _country_code(request)
    if cc == "IN":
        return "INR"
    if cc:
        return "USD"

    ip = _client_ip(request)
    if ip.startswith("127.") or ip.startswith("10.") or ip.startswith("192.168.") or ip.startswith("172.16."):
        return "INR"
    return "USD"


def _amount_for(currency: str, plan_key: str) -> int:
    plan = (plan_key or "monthly").strip().lower()
    if currency == "INR":
        if plan == "yearly":
            return int(settings.report_yearly_price_paise)
        return int(settings.report_monthly_price_paise)
    if plan == "yearly":
        return int(settings.report_yearly_price_cents)
    return int(settings.report_monthly_price_cents)


@router.get("/payments/report/pricing")
def report_pricing(request: Request):
    currency = _currency_for_request(request)
    return {
        "product_key": settings.report_product_key,
        "currency": currency,
        "plans": {
            "monthly": {"amount": _amount_for(currency, "monthly"), "period": "monthly"},
            "yearly": {"amount": _amount_for(currency, "yearly"), "period": "yearly"},
        },
        "minor_unit": "paise" if currency == "INR" else "cents",
    }


@router.post("/payments/report/order", response_model=CreateOrderOut)
def create_report_order(
    request: Request,
    plan_key: str = "monthly",
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if has_paid_report(db, current_user.id, settings.report_product_key):
        raise HTTPException(status_code=409, detail="Report already purchased")

    if (plan_key or "").strip().lower() not in {"monthly", "yearly"}:
        raise HTTPException(status_code=400, detail="Invalid plan")

    currency = _currency_for_request(request)
    amount = _amount_for(currency, plan_key)
    receipt = f"report_{settings.report_product_key}_{current_user.id}_{int(utc_now().timestamp())}"
    order = _razorpay_order_create(amount, currency, receipt)
    order_id = order.get("id")
    if not order_id:
        raise HTTPException(status_code=502, detail="Invalid Razorpay order response")

    payment = ReportPayment(
        user_id=current_user.id,
        product_key=settings.report_product_key,
        plan_key=plan_key.strip().lower(),
        provider="razorpay",
        status="created",
        amount_paise=amount,
        currency=currency,
        razorpay_order_id=str(order_id),
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(payment)
    db.commit()

    plan = get_or_create_report_plan(db, plan_key.strip().lower())
    create_or_update_subscription_for_order(
        db,
        user_id=current_user.id,
        plan_id=int(plan.plan_id),
        payment_order_id=str(order_id),
        provider_payment_id=None,
        status="pending",
        payment_status="pending",
        auto_renew=False,
    )

    return {
        "key_id": settings.razorpay_key_id,
        "product_key": settings.report_product_key,
        "plan_key": plan_key.strip().lower(),
        "amount": amount,
        "currency": currency,
        "order_id": str(order_id),
    }


class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str = Field(..., min_length=4)
    razorpay_payment_id: str = Field(..., min_length=4)
    razorpay_signature: str = Field(..., min_length=10)


@router.post("/payments/report/verify")
def verify_report_payment(payload: VerifyPaymentIn, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    payment: ReportPayment | None = (
        db.query(ReportPayment)
        .filter(ReportPayment.user_id == current_user.id)
        .filter(ReportPayment.product_key == settings.report_product_key)
        .filter(ReportPayment.razorpay_order_id == payload.razorpay_order_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Order not found")
    if payment.status == "paid":
        plan = get_or_create_report_plan(db, payment.plan_key)
        create_or_update_subscription_for_order(
            db,
            user_id=current_user.id,
            plan_id=int(plan.plan_id),
            payment_order_id=payload.razorpay_order_id,
            provider_payment_id=payload.razorpay_payment_id,
            status="active",
            payment_status="success",
            auto_renew=False,
        )
        return {"status": "paid"}

    if not _verify_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    mark_payment_paid(db, payment, payload.razorpay_payment_id)
    plan = get_or_create_report_plan(db, payment.plan_key)
    create_or_update_subscription_for_order(
        db,
        user_id=current_user.id,
        plan_id=int(plan.plan_id),
        payment_order_id=payload.razorpay_order_id,
        provider_payment_id=payload.razorpay_payment_id,
        status="active",
        payment_status="success",
        auto_renew=False,
    )
    return {"status": "paid"}
