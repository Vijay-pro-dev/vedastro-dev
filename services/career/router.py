from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app import models
from app.core.database import get_db
from services.auth.router import get_current_user
from app.services.dashboard_service import build_dashboard
from app.services.profile_service import build_profile, get_latest_birth_data, get_latest_career_profile
from app.services.payment_service import has_paid_report
from app.services.openai_report_service import OpenAIReportRequest, generate_report_text_via_openai
from app.services.pdf_service import build_ai_report_pdf, build_ai_report_pdf_pro, build_professional_report_pdf, build_simple_pdf
from app.core.config import get_settings
from app.services.report_download_service import enforce_report_download_quota, log_report_download


router = APIRouter(tags=["dashboard"])
settings = get_settings()


class ResponseIn(BaseModel):
    question_id: int
    answer: int = Field(..., ge=1, le=5)


class ResponsesPayload(BaseModel):
    answers: list[ResponseIn]


@router.get("/career/questions")
def list_career_questions(
    user_type_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Return active career questions, optionally filtered by user_type_id.
    """
    if user_type_id:
        sql = text(
            """
            SELECT
              q.question_id,
              q.question_text,
              q.answer_type,
              q.score,
              q.is_required,
              q.is_active,
              q.display_order,
              s.name AS section,
              me.name AS subsection,
              q.element_id AS element_id
            FROM master_questions q
            JOIN question_user_type_map map ON map.question_id = q.question_id
            LEFT JOIN master_sections s ON q.section_id = s.id
            LEFT JOIN master_element me ON q.element_id = me.id
            WHERE map.user_type_id = :uid AND (q.is_active IS NULL OR q.is_active = TRUE)
            ORDER BY COALESCE(q.display_order, 0), q.question_id
            """
        )
        rows = db.execute(sql, {"uid": user_type_id}).mappings().all()
    else:
        sql = text(
            """
            SELECT
              q.question_id,
              q.question_text,
              q.answer_type,
              q.score,
              q.is_required,
              q.is_active,
              q.display_order,
              s.name AS section,
              me.name AS subsection,
              q.element_id AS element_id
            FROM master_questions q
            LEFT JOIN master_sections s ON q.section_id = s.id
            LEFT JOIN master_element me ON q.element_id = me.id
            WHERE (q.is_active IS NULL OR q.is_active = TRUE)
            ORDER BY COALESCE(q.display_order, 0), q.question_id
            """
        )
        rows = db.execute(sql).mappings().all()

    return {"questions": [dict(r) for r in rows]}


@router.get("/career/dashboard")
def career_dashboard(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate dashboard analytics from saved user profile data."""
    profile = build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )
    return build_dashboard(profile)


@router.get("/career/dashboard/{user_id}")
def career_dashboard_by_id(user_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own dashboard")
    profile = build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )
    return build_dashboard(profile)


@router.get("/career/report/full")
def full_report(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return a detailed report payload once the user has purchased report access."""
    if not has_paid_report(db, current_user.id, settings.report_product_key):
        raise HTTPException(status_code=402, detail="Payment required")

    profile = build_profile(
        current_user,
        get_latest_birth_data(db, current_user.id),
        get_latest_career_profile(db, current_user.id),
    )
    dashboard = build_dashboard(profile)
    return {
        "product_key": settings.report_product_key,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "dashboard": dashboard,
    }


@router.get("/career/report/pdf")
def full_report_pdf(
    engine: str = Query(default="v2"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download the AI-generated report PDF (alias of /career/report/ai/pdf)."""
    return ai_report_pdf(engine=engine, payload=None, current_user=current_user, db=db)


def _default_openai_report_payload(current_user: models.User, db: Session) -> dict:
    alignment_payload = latest_alignment(current_user=current_user, db=db)
    rules_payload = latest_rules(current_user=current_user, db=db)

    alignment = alignment_payload.get("alignment") if isinstance(alignment_payload, dict) else {}
    scores = (rules_payload.get("scores") if isinstance(rules_payload, dict) else {}) or {}

    def g(d: dict, key: str) -> Any:
        return d.get(key) if isinstance(d, dict) else None

    user_name = getattr(current_user, "name", None)
    report_date = datetime.utcnow().strftime("%d %b %Y")

    return {
        "name": user_name or "User",
        "report_date": report_date,
        "mode": "Career Guidance",
        "core_scores": {
            "awareness": g(alignment, "awareness_score"),
            "clarity": g(scores, "clarity"),
            "action_power": g(alignment, "action_integrity_score"),
            "stability": g(scores, "earth"),
            "opportunity_readiness": g(scores, "opportunity") or g(alignment, "time_alignment_score"),
        },
        "elements": {
            "earth": g(scores, "earth"),
            "fire": g(scores, "fire"),
            "air": g(scores, "air"),
            "water": g(scores, "water"),
            "space": g(scores, "space"),
        },
        "energy": {
            "mental": g(scores, "clarity"),
            "emotional": g(scores, "emotional"),
            "physical": g(alignment, "action_integrity_score"),
            "spiritual": g(scores, "space"),
        },
    }


@router.api_route("/career/report/ai", methods=["GET", "POST"])
def ai_report(
    engine: str = Query(default="v2"),
    payload: dict | None = Body(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an AI-written report (requires OPENAI_API_KEY + OPENAI_REPORT_ENABLED)."""
    if not has_paid_report(db, current_user.id, settings.report_product_key):
        raise HTTPException(status_code=402, detail="Payment required")

    engine_norm = (engine or "v2").strip().lower()
    if engine_norm not in {"v1", "v2", "v3"}:
        raise HTTPException(status_code=400, detail="Invalid engine. Use v1, v2, or v3.")

    user_data = payload if isinstance(payload, dict) else _default_openai_report_payload(current_user, db)

    try:
        report_text = generate_report_text_via_openai(
            OpenAIReportRequest(engine=engine_norm, user_data=user_data),
            settings,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        detail = str(e) if settings.debug else "Failed to generate AI report"
        raise HTTPException(status_code=500, detail=detail) from e

    return {"engine": engine_norm, "report_text": report_text, "input": user_data}


@router.api_route("/career/report/ai/pdf", methods=["GET", "POST"])
def ai_report_pdf(
    engine: str = Query(default="v2"),
    payload: dict | None = Body(default=None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download the AI-written report as a simple text PDF."""
    if not has_paid_report(db, current_user.id, settings.report_product_key):
        raise HTTPException(status_code=402, detail="Payment required")

    engine_norm = (engine or "v2").strip().lower()
    if engine_norm not in {"v1", "v2", "v3"}:
        raise HTTPException(status_code=400, detail="Invalid engine. Use v1, v2, or v3.")

    quota = enforce_report_download_quota(
        db,
        user_id=current_user.id,
        report_kind="career_ai_pdf",
        limit=settings.report_downloads_per_week,
        window_days=settings.report_download_window_days,
    )

    report = ai_report(engine=engine_norm, payload=payload, current_user=current_user, db=db)
    report_text = report.get("report_text") if isinstance(report, dict) else None
    if not isinstance(report_text, str) or not report_text.strip():
        raise HTTPException(status_code=502, detail="Failed to generate report text")

    pdf_bytes = build_ai_report_pdf_pro(report_text)
    try:
        log_report_download(db, user_id=current_user.id, report_kind="career_ai_pdf")
    except Exception:
        pass

    remaining_after = max(0, int(quota.remaining) - 1)
    headers = {
        "Content-Disposition": f"attachment; filename=vedastro-report-{engine_norm}.pdf",
        "X-Report-Downloads-Limit": str(quota.limit),
        "X-Report-Downloads-Remaining": str(remaining_after),
        "X-Report-Downloads-Window-Days": str(quota.window_days),
    }
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers,
    )


@router.post("/career/responses")
def save_responses(payload: ResponsesPayload, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Store questionnaire responses for the current user."""
    if not payload.answers:
        raise HTTPException(status_code=400, detail="No answers provided")

    answers_count = len(payload.answers)

    mapping = {1: 0, 2: 25, 3: 50, 4: 75, 5: 100}
    insert_sql = text(
        """
        INSERT INTO user_responses (user_id, question_id, answer_numeric, score_obtained)
        VALUES (:user_id, :question_id, :answer_numeric, :score_obtained)
        """
    )

    for item in payload.answers:
        score = mapping.get(item.answer, 0)
        db.execute(
            insert_sql,
            {
                "user_id": current_user.id,
                "question_id": item.question_id,
                "answer_numeric": score,
                "score_obtained": score,
            },
        )

    # Let DB-side function handle per-category + overall aggregation (future categories auto-supported)
    db.execute(text("SELECT sync_alignment(:uid)"), {"uid": current_user.id})

    db.commit()
    return {"message": "Responses saved", "count": answers_count}


@router.get("/career/responses/latest")
def latest_responses(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
  """
  Return the most recent set of responses for the current user, joined with question meta so
  the frontend can compute results without relying on local cache.
  """
  sql = text(
    """
    SELECT
      ur.question_id,
      ur.answer_numeric,
      ur.score_obtained,
      ur.created_at,
      q.question_text,
      q.display_order,
      s.name AS section,
      NULL AS subsection
    FROM user_responses ur
    JOIN master_questions q ON q.question_id = ur.question_id
    LEFT JOIN master_sections s ON q.section_id = s.id
    WHERE ur.user_id = :uid
    ORDER BY ur.created_at DESC, q.display_order ASC
    """
  )
  rows = db.execute(sql, {"uid": current_user.id}).mappings().all()
  return {"responses": [dict(r) for r in rows]}


@router.api_route("/career/responses/reset", methods=["POST", "GET"])
def reset_responses(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
  """
  Clear the current user's saved questionnaire responses and any derived alignment scores
  so they can retake the assessment from scratch.
  """
  db.execute(text("DELETE FROM user_responses WHERE user_id = :uid"), {"uid": current_user.id})
  db.execute(text("DELETE FROM career_alignment_scores WHERE user_id = :uid"), {"uid": current_user.id})
  db.commit()
  return {"message": "Responses reset"}


@router.get("/career/alignment/latest")
def latest_alignment(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
  """
  Return the latest career alignment snapshot for the current user (computed on the fly).
  """
  agg_sql = text(
    """
    WITH base AS (
      SELECT ur.score_obtained,
             q.category_id
      FROM user_responses ur
      JOIN master_questions q ON q.question_id = ur.question_id
      WHERE ur.user_id = :uid
    )
    SELECT
      AVG(CASE WHEN category_id = 1 THEN score_obtained END) AS awareness_score,
      AVG(CASE WHEN category_id = 2 THEN score_obtained END) AS time_alignment_score,
      AVG(CASE WHEN category_id = 3 THEN score_obtained END) AS action_integrity_score
    FROM base
    """
  )
  agg = db.execute(agg_sql, {"uid": current_user.id}).mappings().first()
  awareness = agg.get("awareness_score")
  time_align = agg.get("time_alignment_score")
  action = agg.get("action_integrity_score")
  overall_parts = [v for v in [awareness, time_align, action] if v is not None]
  overall = sum(overall_parts) / len(overall_parts) if overall_parts else None
  return {
    "alignment": {
      "user_id": current_user.id,
      "awareness_score": awareness,
      "time_alignment_score": time_align,
      "action_integrity_score": action,
      "overall_score": overall,
    }
  }


@router.get("/career/rules/latest", response_model=dict)
def latest_rules(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
  match_source = "matched"
  sql = text(
    """
    WITH element_raw AS (
      SELECT
        q.element_id,
        CAST(ROUND(AVG(ur.score_obtained)) AS INTEGER) AS avg_score
      FROM user_responses ur
      JOIN master_questions q ON q.question_id = ur.question_id
      WHERE ur.user_id = :uid AND q.element_id IS NOT NULL
      GROUP BY q.element_id
    ),
    element_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%fire%'  THEN er.avg_score END), 0) AS fire,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%earth%' THEN er.avg_score END), 0) AS earth,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%air%'   THEN er.avg_score END), 0) AS air,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%water%' THEN er.avg_score END), 0) AS water,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%space%' THEN er.avg_score END), 0) AS space
      FROM element_raw er
      JOIN master_element me ON me.id = er.element_id
    ),
    energy_raw AS (
      SELECT
        q.energy_id,
        CAST(ROUND(AVG(ur.score_obtained)) AS INTEGER) AS avg_score
      FROM user_responses ur
      JOIN master_questions q ON q.question_id = ur.question_id
      WHERE ur.user_id = :uid AND q.energy_id IS NOT NULL
      GROUP BY q.energy_id
    ),
    energy_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%action%' OR lower(trim(en.name)) LIKE '%execution%' THEN er.avg_score END), 0) AS action,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%clarity%' OR lower(trim(en.name)) LIKE '%focus%' THEN er.avg_score END), 0) AS clarity,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%emotional%' OR lower(trim(en.name)) LIKE '%stability%' THEN er.avg_score END), 0) AS emotional,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%opportunity%' OR lower(trim(en.name)) LIKE '%time%' THEN er.avg_score END), 0) AS opportunity
      FROM energy_raw er
      JOIN master_energy en ON en.id = er.energy_id
    )
    SELECT r.*
    FROM master_rule r
    CROSS JOIN element_scores e
    CROSS JOIN energy_scores n
    WHERE
      e.fire BETWEEN COALESCE(r.fire_element_low, 0) AND COALESCE(r.fire_element_high, 100)
      AND e.earth BETWEEN COALESCE(r.earth_element_low, 0) AND COALESCE(r.earth_element_high, 100)
      AND e.air BETWEEN COALESCE(r.air_element_low, 0) AND COALESCE(r.air_element_high, 100)
      AND e.water BETWEEN COALESCE(r.water_element_low, 0) AND COALESCE(r.water_element_high, 100)
      AND e.space BETWEEN COALESCE(r.space_element_low, 0) AND COALESCE(r.space_element_high, 100)
      AND n.action BETWEEN COALESCE(r.action_energy_low, 0) AND COALESCE(r.action_energy_high, 100)
      AND n.clarity BETWEEN COALESCE(r.clarity_energy_low, 0) AND COALESCE(r.clarity_energy_high, 100)
      AND n.emotional BETWEEN COALESCE(r.emotional_energy_low, 0) AND COALESCE(r.emotional_energy_high, 100)
      AND n.opportunity BETWEEN COALESCE(r.opportunity_energy_low, 0) AND COALESCE(r.opportunity_energy_high, 100)
    ORDER BY r.priority, r.id
    """
  )
  rows = db.execute(sql, {"uid": current_user.id}).mappings().all()
  if not rows:
    match_source = "none"

  score_sql = text(
    """
    WITH element_raw AS (
      SELECT
        q.element_id,
        CAST(ROUND(AVG(ur.score_obtained)) AS INTEGER) AS avg_score
      FROM user_responses ur
      JOIN master_questions q ON q.question_id = ur.question_id
      WHERE ur.user_id = :uid AND q.element_id IS NOT NULL
      GROUP BY q.element_id
    ),
    element_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%fire%'  THEN er.avg_score END), 0) AS fire,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%earth%' THEN er.avg_score END), 0) AS earth,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%air%'   THEN er.avg_score END), 0) AS air,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%water%' THEN er.avg_score END), 0) AS water,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) LIKE '%space%' THEN er.avg_score END), 0) AS space
      FROM element_raw er
      JOIN master_element me ON me.id = er.element_id
    ),
    energy_raw AS (
      SELECT
        q.energy_id,
        CAST(ROUND(AVG(ur.score_obtained)) AS INTEGER) AS avg_score
      FROM user_responses ur
      JOIN master_questions q ON q.question_id = ur.question_id
      WHERE ur.user_id = :uid AND q.energy_id IS NOT NULL
      GROUP BY q.energy_id
    ),
    energy_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%action%' OR lower(trim(en.name)) LIKE '%execution%' THEN er.avg_score END), 0) AS action,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%clarity%' OR lower(trim(en.name)) LIKE '%focus%' THEN er.avg_score END), 0) AS clarity,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%emotional%' OR lower(trim(en.name)) LIKE '%stability%' THEN er.avg_score END), 0) AS emotional,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) LIKE '%opportunity%' OR lower(trim(en.name)) LIKE '%time%' THEN er.avg_score END), 0) AS opportunity
      FROM energy_raw er
      JOIN master_energy en ON en.id = er.energy_id
    )
    SELECT e.fire, e.earth, e.air, e.water, e.space,
           n.action, n.clarity, n.emotional, n.opportunity
    FROM element_scores e
    CROSS JOIN energy_scores n
    """
  )
  score_row = db.execute(score_sql, {"uid": current_user.id}).mappings().first()

  debug_sql = text(
    """
    SELECT
      SUM(CASE WHEN q.element_id IS NOT NULL THEN 1 ELSE 0 END) AS element_tagged_responses,
      SUM(CASE WHEN q.energy_id IS NOT NULL THEN 1 ELSE 0 END) AS energy_tagged_responses,
      COUNT(DISTINCT q.element_id) AS distinct_elements_seen,
      COUNT(DISTINCT q.energy_id) AS distinct_energies_seen
    FROM user_responses ur
    JOIN master_questions q ON q.question_id = ur.question_id
    WHERE ur.user_id = :uid
    """
  )
  debug_row = db.execute(debug_sql, {"uid": current_user.id}).mappings().first()
  # pydantic/fastapi cannot serialize RowMapping; convert to plain dicts
  rules = [dict(r) for r in rows]
  scores = dict(score_row) if score_row else {}
  debug = dict(debug_row) if debug_row else {}
  return {
    "rules": rules,
    "scores": scores,
    "debug": debug,
    "match": {
      "source": match_source,
      "matched_count": len(rows) if match_source == "matched" else 0,
      "returned": len(rules),
    },
  }
