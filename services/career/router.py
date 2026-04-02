from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app import models
from app.core.database import get_db
from services.auth.router import get_current_user
from app.services.dashboard_service import build_dashboard
from app.services.profile_service import build_profile, get_latest_birth_data, get_latest_career_profile


router = APIRouter(tags=["dashboard"])


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
              s.name AS section
            FROM master_questions q
            JOIN question_user_type_map map ON map.question_id = q.question_id
            LEFT JOIN master_sections s ON q.section_id = s.id
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
              s.name AS section
            FROM master_questions q
            LEFT JOIN master_sections s ON q.section_id = s.id
            WHERE (q.is_active IS NULL OR q.is_active = TRUE)
            ORDER BY COALESCE(q.display_order, 0), q.question_id
            """
        )
        rows = db.execute(sql).mappings().all()

    return {"questions": rows}


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
  return {"responses": rows}


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
