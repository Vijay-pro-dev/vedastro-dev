from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.report_download import ReportDownload


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


@dataclass(frozen=True)
class ReportDownloadQuota:
    remaining: int
    limit: int
    window_days: int
    reset_at: datetime | None


def _quota(db: Session, *, user_id: int, report_kind: str, limit: int, window_days: int) -> ReportDownloadQuota:
    limit = max(1, int(limit))
    window_days = max(1, int(window_days))
    since = utc_now() - timedelta(days=window_days)

    used = (
        db.query(func.count(ReportDownload.id))
        .filter(ReportDownload.user_id == user_id)
        .filter(ReportDownload.report_kind == report_kind)
        .filter(ReportDownload.created_at >= since)
        .scalar()
    )
    used_int = int(used or 0)
    remaining = max(0, limit - used_int)

    reset_at: datetime | None = None
    if remaining == 0:
        oldest = (
            db.query(ReportDownload.created_at)
            .filter(ReportDownload.user_id == user_id)
            .filter(ReportDownload.report_kind == report_kind)
            .filter(ReportDownload.created_at >= since)
            .order_by(ReportDownload.created_at.asc())
            .first()
        )
        if oldest and isinstance(oldest[0], datetime):
            reset_at = oldest[0] + timedelta(days=window_days)

    return ReportDownloadQuota(remaining=remaining, limit=limit, window_days=window_days, reset_at=reset_at)


def enforce_report_download_quota(
    db: Session,
    *,
    user_id: int,
    report_kind: str,
    limit: int,
    window_days: int,
) -> ReportDownloadQuota:
    quota = _quota(db, user_id=user_id, report_kind=report_kind, limit=limit, window_days=window_days)
    if quota.remaining <= 0:
        reset_hint = ""
        if quota.reset_at is not None:
            reset_hint = f" Try again after {quota.reset_at.isoformat()}Z."
        raise HTTPException(
            status_code=429,
            detail=f"Weekly report download limit reached ({quota.limit} per {quota.window_days} days).{reset_hint}",
        )
    return quota


def log_report_download(db: Session, *, user_id: int, report_kind: str) -> None:
    db.add(ReportDownload(user_id=user_id, report_kind=report_kind))
    db.commit()

