from fastapi import APIRouter, Depends, HTTPException
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

    # After saving answers, compute alignment scores per section and persist to career_alignment_scores
    try:
        agg_sql = text(
            """
            WITH base AS (
              SELECT ur.score_obtained,
                     TRIM(BOTH '\"' FROM COALESCE(
                       CASE WHEN jsonb_typeof(q.category_id) = 'object' THEN q.category_id->>'section' END,
                       q.category_id::text
                     )) AS section
              FROM user_responses ur
              JOIN questions q ON q.question_id = ur.question_id
              WHERE ur.user_id = :uid
            )
            SELECT
              AVG(CASE WHEN section = 'Awareness' THEN score_obtained END) AS awareness_score,
              AVG(CASE WHEN section = 'Alignment / Time' THEN score_obtained END) AS time_alignment_score,
              AVG(CASE WHEN section = 'Action' THEN score_obtained END) AS action_integrity_score
            FROM base
            """
        )
        agg = db.execute(agg_sql, {"uid": current_user.id}).mappings().first()
        awareness = agg.get("awareness_score")
        time_align = agg.get("time_alignment_score")
        action = agg.get("action_integrity_score")
        overall_parts = [v for v in [awareness, time_align, action] if v is not None]
        overall = sum(overall_parts) / len(overall_parts) if overall_parts else None

        insert_score = text(
            """
            INSERT INTO career_alignment_scores (user_id, awareness_score, time_alignment_score, action_integrity_score, overall_score, created_at, updated_at)
            VALUES (:uid, :awareness, :time_align, :action, :overall, NOW(), NOW())
            """
        )
        db.execute(
            insert_score,
            {
                "uid": current_user.id,
                "awareness": awareness,
                "time_align": time_align,
                "action": action,
                "overall": overall,
            },
        )
    except Exception as e:
        # Don't block response saving if the summary insert fails
        print(f"[career_alignment_scores] insert skipped: {e}")

    db.commit()
    return {"message": "Responses saved", "count": len(payload.answers)}


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
      CASE
        WHEN jsonb_typeof(q.category_id) = 'object' THEN q.category_id->>'section'
        ELSE q.category_id::text
      END AS section,
      sub.name AS subsection
    FROM user_responses ur
    JOIN questions q ON q.question_id = ur.question_id
    LEFT JOIN subsections sub ON q.subcategory_id = sub.id
    WHERE ur.user_id = :uid
    ORDER BY ur.created_at DESC, q.display_order ASC
    """
  )
  rows = db.execute(sql, {"uid": current_user.id}).mappings().all()
  return {"responses": rows}


@router.get("/career/alignment/latest")
def latest_alignment(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
  """Return the latest career alignment snapshot for the current user, or on-the-fly aggregation if none exists."""
  latest_sql = text(
    """
    SELECT *
    FROM career_alignment_scores
    WHERE user_id = :uid
    ORDER BY created_at DESC
    LIMIT 1
    """
  )
  row = db.execute(latest_sql, {"uid": current_user.id}).mappings().first()
  if row:
    return {"alignment": row}

  # Fallback: aggregate from existing responses without inserting
  agg_sql = text(
    """
    WITH base AS (
      SELECT ur.score_obtained,
             TRIM(BOTH '\"' FROM COALESCE(
               CASE WHEN jsonb_typeof(q.category_id) = 'object' THEN q.category_id->>'section' END,
               q.category_id::text
             )) AS section
      FROM user_responses ur
      JOIN questions q ON q.question_id = ur.question_id
      WHERE ur.user_id = :uid
    )
    SELECT
      AVG(CASE WHEN section = 'Awareness' THEN score_obtained END) AS awareness_score,
      AVG(CASE WHEN section = 'Alignment / Time' THEN score_obtained END) AS time_alignment_score,
      AVG(CASE WHEN section = 'Action' THEN score_obtained END) AS action_integrity_score
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
