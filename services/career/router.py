from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
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
from app.services.pdf_service import build_professional_report_pdf
from app.core.config import get_settings


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
def full_report_pdf(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Download a simple PDF version of the full report (based on NewDashboard data)."""
    if not has_paid_report(db, current_user.id, settings.report_product_key):
        raise HTTPException(status_code=402, detail="Payment required")

    # Reuse the same sources the NewDashboard relies on.
    alignment_payload = latest_alignment(current_user=current_user, db=db)
    responses_payload = latest_responses(current_user=current_user, db=db)
    rules_payload = latest_rules(current_user=current_user, db=db)

    alignment = alignment_payload.get("alignment") if isinstance(alignment_payload, dict) else {}
    responses = (responses_payload.get("responses") if isinstance(responses_payload, dict) else []) or []
    rules = (rules_payload.get("rules") if isinstance(rules_payload, dict) else []) or []
    scores = (rules_payload.get("scores") if isinstance(rules_payload, dict) else {}) or {}

    user = {
        "id": getattr(current_user, "id", None),
        "name": getattr(current_user, "name", None),
        "email": getattr(current_user, "email", None),
    }

    primary_rule = rules[0] if isinstance(rules, list) and rules else None
    rule_insight = (primary_rule.get("insight") or primary_rule.get("customer_message")) if primary_rule else None
    rule_action = (primary_rule.get("next_move") or primary_rule.get("alternative") or primary_rule.get("customer_message")) if primary_rule else None
    rule_risk = primary_rule.get("risk") if primary_rule else None
    rule_mistake = primary_rule.get("mistake") if primary_rule else None

    report_payload = {
        "user": {"name": user.get("name"), "email": user.get("email")},
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "scores": {
            "overall": alignment.get("overall_score"),
            # Match NewDashboard "Alignment Snapshot" cards:
            # Awareness (Clarity), Time (Opportunity), Action (Execution)
            "awareness": alignment.get("awareness_score"),
            "time": alignment.get("time_alignment_score"),
            "action": alignment.get("action_integrity_score"),
        },
        "rule_matches": [r.get("rule_name") for r in rules[:5] if isinstance(r, dict) and r.get("rule_name")],
        "sections": {
            "insights": (str(rule_insight).strip() if rule_insight else ""),
            "action": (str(rule_action).strip() if rule_action else ""),
            "mistake": (str(rule_mistake).strip() if rule_mistake else ""),
            "risk": (str(rule_risk).strip() if rule_risk else ""),
        },
    }

    pdf_bytes = build_professional_report_pdf(report_payload)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=vedastro-report.pdf"},
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
  sql = text(
    """
    WITH element_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'fire'  THEN es.avg_score END), 0) AS fire,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'earth' THEN es.avg_score END), 0) AS earth,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'air'   THEN es.avg_score END), 0) AS air,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'water' THEN es.avg_score END), 0) AS water,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'space' THEN es.avg_score END), 0) AS space
      FROM element_score es
      JOIN master_element me ON me.id = es.element_id
      WHERE es.user_id = :uid
    ),
    energy_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'action'      THEN es.avg_score END), 0) AS action,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'clarity'     THEN es.avg_score END), 0) AS clarity,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'emotional'   THEN es.avg_score END), 0) AS emotional,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'opportunity' THEN es.avg_score END), 0) AS opportunity
      FROM energy_score es
      JOIN master_energy en ON en.id = es.energy_id
      WHERE es.user_id = :uid
    )
    SELECT r.*
    FROM master_rule r
    CROSS JOIN element_scores e
    CROSS JOIN energy_scores n
    WHERE
      e.fire BETWEEN r.fire_element_low AND r.fire_element_high
      AND e.earth BETWEEN r.earth_element_low AND r.earth_element_high
      AND e.air BETWEEN r.air_element_low AND r.air_element_high
      AND e.water BETWEEN r.water_element_low AND r.water_element_high
      AND e.space BETWEEN r.space_element_low AND r.space_element_high
      AND n.action BETWEEN r.action_energy_low AND r.action_energy_high
      AND n.clarity BETWEEN r.clarity_energy_low AND r.clarity_energy_high
      AND n.emotional BETWEEN r.emotional_energy_low AND r.emotional_energy_high
      AND n.opportunity BETWEEN r.opportunity_energy_low AND r.opportunity_energy_high
    ORDER BY r.priority, r.id
    """
  )
  rows = db.execute(sql, {"uid": current_user.id}).mappings().all()

  score_sql = text(
    """
    WITH element_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'fire'  THEN es.avg_score END), 0) AS fire,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'earth' THEN es.avg_score END), 0) AS earth,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'air'   THEN es.avg_score END), 0) AS air,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'water' THEN es.avg_score END), 0) AS water,
        COALESCE(MAX(CASE WHEN lower(trim(me.name)) = 'space' THEN es.avg_score END), 0) AS space
      FROM element_score es
      JOIN master_element me ON me.id = es.element_id
      WHERE es.user_id = :uid
    ),
    energy_scores AS (
      SELECT
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'action'      THEN es.avg_score END), 0) AS action,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'clarity'     THEN es.avg_score END), 0) AS clarity,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'emotional'   THEN es.avg_score END), 0) AS emotional,
        COALESCE(MAX(CASE WHEN lower(trim(en.name)) = 'opportunity' THEN es.avg_score END), 0) AS opportunity
      FROM energy_score es
      JOIN master_energy en ON en.id = es.energy_id
      WHERE es.user_id = :uid
    )
    SELECT e.fire, e.earth, e.air, e.water, e.space,
           n.action, n.clarity, n.emotional, n.opportunity
    FROM element_scores e
    CROSS JOIN energy_scores n
    """
  )
  score_row = db.execute(score_sql, {"uid": current_user.id}).mappings().first()
  # pydantic/fastapi cannot serialize RowMapping; convert to plain dicts
  rules = [dict(r) for r in rows]
  scores = dict(score_row) if score_row else {}
  return {"rules": rules, "scores": scores}
