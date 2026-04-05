import csv
import io
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import models
from app.core.database import get_db
from services.auth.router import get_current_admin
from app.schemas.admin import SuspendUserPayload, UpdateUserRolePayload
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionToggleStatus
from app.schemas.config import SectionCreate, SubsectionCreate
from app.schemas.rule import RuleCreate, RuleOut
from fastapi import HTTPException
from app.services.activity_service import create_activity_log
from app.services.profile_service import build_profile, get_latest_birth_data, get_latest_career_profile


router = APIRouter(prefix="/admin", tags=["admin"])

SEED_QUESTIONS = [
    ("Do you have a clear long-term career goal?", "radio", 1, 1, True, "Awareness", "Air"),
    ("Do you know the skills required for your goal?", "radio", 2, 2, True, "Awareness", "Air"),
    ("Have you consciously chosen your career path?", "radio", 3, 3, True, "Awareness", "Air"),
    ("Do you clearly understand your strengths and weaknesses?", "radio", 4, 4, True, "Awareness", "Water"),
    ("Do you know which role/job suits you best?", "radio", 5, 5, True, "Awareness", "Water"),
    ("Are you aware of industry trends and demand?", "radio", 5, 6, True, "Awareness", "Air"),
    ("Do you regularly evaluate your career direction?", "radio", 5, 7, True, "Awareness", "Water"),
    ("Are you actively exploring job or career opportunities?", "radio", 5, 8, True, "Alignment / Time", "Space"),
    ("Are you receiving interviews or responses recently?", "radio", 5, 9, True, "Alignment / Time", "Space"),
    ("Is your network helping you with opportunities?", "radio", 5, 10, True, "Alignment / Time", "Space"),
    ("Is your profile (CV/LinkedIn/portfolio) strong?", "radio", 5, 11, True, "Alignment / Time", "Space"),
    ("Are you applying to the right roles?", "radio", 5, 12, True, "Alignment / Time", "Space"),
    ("Do you feel this is the right time for growth in your career?", "radio", 5, 13, True, "Alignment / Time", "Space"),
    ("Do you spend time daily on career improvement?", "radio", 5, 14, True, "Action", "Fire"),
    ("Are you actively learning new skills?", "radio", 5, 15, True, "Action", "Fire"),
    ("Have you created any project/output in the last 30 days?", "radio", 5, 16, True, "Action", "Fire"),
    ("Are you consistently applying or doing outreach?", "radio", 5, 17, True, "Action", "Fire"),
    ("Are you able to control distractions?", "radio", 5, 18, True, "Action", "Earth"),
    ("Do you follow a disciplined routine?", "radio", 5, 19, True, "Action", "Earth"),
    ("Do you track your progress regularly?", "radio", 5, 20, True, "Action", "Earth"),
]

ELEMENT_TO_CODE = {"Fire": 1, "Earth": 2, "Air": 3, "Water": 4, "Space": 5}
CODE_TO_ELEMENT = {v: k for k, v in ELEMENT_TO_CODE.items()}


def _admin_user_or_404(db: Session, user_id: int):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_or_create_section(db: Session, name: str, create_if_missing: bool = True) -> models.Section:
    section = (
        db.query(models.Section)
        .filter(models.Section.name.ilike(name.strip()))
        .first()
    )
    if section:
        return section
    if not create_if_missing:
        raise HTTPException(status_code=400, detail=f"Section '{name}' not found. Please choose an existing section.")
    section = models.Section(name=name.strip(), display_order=1, is_active=True)
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


def _user_type_by_code_or_404(db: Session, type_code: str) -> models.UserType:
    record = (
        db.query(models.UserType)
        .filter(models.UserType.type_code == type_code)
        .filter(models.UserType.is_active == True)  # noqa: E712
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail=f"User type '{type_code}' not found or inactive")
    return record


def _category_id_by_name(db: Session, name: str | None) -> int | None:
    if not name:
        return None
    cat = db.query(models.Category).filter(models.Category.category_name.ilike(name.strip())).first()
    return cat.id if cat else None


def _energy_id_by_name(db: Session, name: str | None) -> int | None:
    if not name:
        return None
    rec = db.query(models.Energy).filter(models.Energy.name.ilike(name.strip())).first()
    return rec.id if rec else None


def _category_lookup(db: Session) -> dict[int, str]:
    return {c.id: c.category_name for c in db.query(models.Category).all()}


def _energy_lookup(db: Session) -> dict[int, str]:
    return {e.id: e.name for e in db.query(models.Energy).all()}


def _serialize_question(question: models.Question, user_type_code: str | None = None, section_lookup: dict[int, str] | None = None) -> dict:
    def derive_section(order: int | None) -> str:
        if order is None:
            return "Awareness"
        if 1 <= order <= 7:
            return "Awareness"
        if 8 <= order <= 13:
            return "Alignment / Time"
        return "Action"

    section = None
    if section_lookup and getattr(question, "section_id", None):
        section = section_lookup.get(question.section_id)
    if not section:
        section = derive_section(getattr(question, "display_order", None))
    element = None
    if getattr(question, "element_id", None):
        element = getattr(question, "element_id")
    category_id = getattr(question, "category_id", None)
    energy_id = getattr(question, "energy_id", None)
    return {
        "id": question.id,
        "question_id": question.id,
        "question_text": question.question_text,
        "answer_type": question.answer_type,
        "score": question.score,
        "is_required": bool(question.is_required),
        "display_order": question.display_order,
        "is_active": bool(question.is_active),
        "subsection": element,
        "section": section,
        "category_id": category_id,
        "energy_id": energy_id,
        "user_type_code": user_type_code or "GENERAL",
        "created_at": question.created_at.isoformat() if question.created_at else None,
        "updated_at": question.updated_at.isoformat() if question.updated_at else None,
    }


def _ensure_default_user_types(db: Session) -> models.UserType:
    codes = {"GENERAL": "General", "VERIFIED": "Verified", "PREMIUM": "Premium"}
    for code, name in codes.items():
        record = db.query(models.UserType).filter(models.UserType.type_code == code).first()
        if not record:
            record = models.UserType(type_code=code, type_name=name, description=f"{name} users")
            db.add(record)
    db.commit()
    return db.query(models.UserType).filter(models.UserType.type_code == "GENERAL").first()


def _seed_questions_if_empty(db: Session) -> None:
    _ensure_config_defaults(db)
    count = db.query(models.Question).count()
    if count > 0:
        return
    general_type = _ensure_default_user_types(db)
    for text, answer_type, score, order, required, section, subsection in SEED_QUESTIONS:
        section_obj = _get_or_create_section(db, "Career")
        q = models.Question(
            question_text=text,
            answer_type=answer_type,
            score=score,
            is_required=required,
            display_order=order,
            is_active=True,
            section_id=section_obj.id,
            category_id=None,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(q)
        db.flush()
        db.add(models.QuestionUserTypeMap(question_id=q.id, user_type_id=general_type.id))
    db.commit()


def _ensure_config_defaults(db: Session) -> None:
    default_sections = [("Career", 1), ("Relationship", 2), ("Finance", 3), ("Health", 4)]
    for name, order in default_sections:
        existing = db.query(models.Section).filter(models.Section.name.ilike(name)).first()
        if not existing:
            db.add(models.Section(name=name, display_order=order, is_active=True))
    db.commit()


def _serialize_activity_log(log: models.ActivityLog) -> dict:
    return {
        "id": log.id,
        "user_id": log.user_id,
        "activity_type": log.activity_type,
        "description": log.description,
        "data": json.loads(log.data) if log.data else {},
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


@router.get("/dashboard")
def admin_dashboard(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Return high-level admin stats and a user list for the admin panel."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()

    user_profiles = []
    recent_users = []
    profile_completed_count = 0
    dashboard_ready_count = 0
    total_experience = 0
    nationality_counts: dict[str, int] = {}
    language_counts: dict[str, int] = {}
    role_counts: dict[str, int] = {}
    active_last_7_days = 0
    now = datetime.now(timezone.utc)

    for user in users:
        profile = build_profile(
            user,
            get_latest_birth_data(db, user.id),
            get_latest_career_profile(db, user.id),
        )
        if profile["profile_completed"]:
            profile_completed_count += 1
        if profile["profile_completed"] and profile["current_role"] and profile["goals"]:
            dashboard_ready_count += 1

        nationality = profile["nationality"] or "global"
        language = profile["language"] or "english"
        role = profile["current_role"] or "unassigned"
        total_experience += int(profile["years_experience"] or 0)
        nationality_counts[nationality] = nationality_counts.get(nationality, 0) + 1
        language_counts[language] = language_counts.get(language, 0) + 1
        role_counts[role] = role_counts.get(role, 0) + 1

        created_at_iso = user.created_at.isoformat() if user.created_at else None
        if user.updated_at:
            updated_at = user.updated_at
            if updated_at.tzinfo is None:
                updated_at = updated_at.replace(tzinfo=timezone.utc)
            if updated_at >= now - timedelta(days=7):
                active_last_7_days += 1

        user_record = {
            "user_id": profile["user_id"],
            "name": profile["name"] or "User",
            "email": profile["email"],
            "phone": profile["phone"] or "-",
            "role": profile["role"] or "user",
            "nationality": nationality,
            "language": language,
            "current_role": profile["current_role"] or "-",
            "goals": profile["goals"] or "-",
            "years_experience": int(profile["years_experience"] or 0),
            "profile_completed": profile["profile_completed"],
            "suspended": bool(getattr(user, "suspended", 0)),
            "created_at": created_at_iso,
        }
        user_profiles.append(user_record)

        if len(recent_users) < 5:
            recent_users.append(user_record)

    total_users = len(users)
    avg_experience = round((total_experience / total_users), 1) if total_users else 0
    completion_rate = round((profile_completed_count / total_users) * 100, 1) if total_users else 0

    activity_logs = (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "stats": {
            "total_users": total_users,
            "completed_profiles": profile_completed_count,
            "pending_profiles": max(total_users - profile_completed_count, 0),
            "dashboard_ready_users": dashboard_ready_count,
            "completion_rate": completion_rate,
            "avg_experience": avg_experience,
            "active_last_7_days": active_last_7_days,
            "top_nationalities": nationality_counts,
            "top_languages": language_counts,
            "top_roles": role_counts,
        },
        "recent_users": recent_users,
        "system_overview": {
            "api_status": "healthy",
            "generated_at": now.isoformat(),
            "admin_message": "JWT auth, protected routes, saved profiles, and AI dashboard are active.",
        },
        "recent_activity_logs": [_serialize_activity_log(log) for log in activity_logs],
        "users": user_profiles,
    }


@router.get("/activity-logs")
def admin_activity_logs(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Return the full admin activity feed."""
    activity_logs = (
        db.query(models.ActivityLog)
        .order_by(models.ActivityLog.created_at.desc())
        .all()
    )
    return {"activity_logs": [_serialize_activity_log(log) for log in activity_logs]}


@router.delete("/activity-logs/{log_id}")
def delete_activity_log(log_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Delete one activity log entry from the admin panel."""
    log = db.query(models.ActivityLog).filter(models.ActivityLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")

    db.delete(log)
    db.commit()
    return {"message": "Activity log deleted successfully", "log_id": log_id}


@router.delete("/activity-logs")
def delete_all_activity_logs(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Delete the full activity log history from the admin panel."""
    deleted_count = db.query(models.ActivityLog).delete(synchronize_session=False)
    db.commit()
    return {"message": "All activity logs deleted successfully", "deleted_count": deleted_count}


@router.get("/questions")
def list_questions(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Return all questions with their mapped user type codes (if any)."""
    _ensure_config_defaults(db)
    section_lookup = {s.id: s.name for s in db.query(models.Section).all()}
    element_lookup = {e.id: e.name for e in db.query(models.Element).all()}
    category_lookup = _category_lookup(db)
    energy_lookup = _energy_lookup(db)
    rows = (
        db.query(models.Question, models.UserType.type_code)
        .join(models.QuestionUserTypeMap, models.Question.id == models.QuestionUserTypeMap.question_id, isouter=True)
        .join(models.UserType, models.QuestionUserTypeMap.user_type_id == models.UserType.id, isouter=True)
        .order_by(models.Question.display_order.asc(), models.Question.id.asc())
        .all()
    )
    def serialize(q, code):
        elem_name = element_lookup.get(getattr(q, "element_id", None))
        energy_name = energy_lookup.get(getattr(q, "energy_id", None))
        data = _serialize_question(q, code, section_lookup)
        data["element"] = elem_name
        data["category"] = category_lookup.get(getattr(q, "category_id", None))
        data["energy"] = energy_name
        return data
    questions = [serialize(q, code) for q, code in rows]
    return {"questions": questions}


@router.post("/questions")
def create_question(
    payload: QuestionCreate,
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new question and map it to a user type."""
    user_type = _user_type_by_code_or_404(db, payload.user_type_code)
    section = _get_or_create_section(db, payload.section, create_if_missing=False)
    element = db.query(models.Element).filter(models.Element.name.ilike((payload.subsection or "").strip())).first()
    category_id = _category_id_by_name(db, getattr(payload, "category", None)) or _category_id_by_name(db, payload.section)
    energy_id = _energy_id_by_name(db, getattr(payload, "energy", None))

    question = models.Question(
        question_text=payload.question_text,
        answer_type=payload.answer_type,
        score=payload.score,
        is_required=payload.is_required,
        display_order=payload.display_order,
        is_active=payload.is_active,
        section_id=section.id,
        element_id=element.id if element else None,
        category_id=category_id,
        energy_id=energy_id,
        created_by=admin.get("id"),
        updated_by=admin.get("id"),
    )
    db.add(question)
    db.flush()  # so we get question.id

    link = models.QuestionUserTypeMap(question_id=question.id, user_type_id=user_type.id)
    db.add(link)
    db.commit()
    db.refresh(question)
    section_lookup = {section.id: section.name}
    element_lookup = {element.id: element.name} if element else {}
    category_lookup = _category_lookup(db)
    data = _serialize_question(question, user_type.type_code, section_lookup)
    if element:
        data["element"] = element.name
    if category_id:
        data["category"] = category_lookup.get(category_id)
    if energy_id:
        energy = db.query(models.Energy).filter(models.Energy.id == energy_id).first()
        if energy:
            data["energy"] = energy.name
    return {"question": data}


@router.put("/questions/{question_id}")
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update question text/meta and its user type mapping."""
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    user_type = _user_type_by_code_or_404(db, payload.user_type_code)
    section = _get_or_create_section(db, payload.section, create_if_missing=False)
    element = db.query(models.Element).filter(models.Element.name.ilike((payload.subsection or "").strip())).first()
    category_id = _category_id_by_name(db, getattr(payload, "category", None)) or _category_id_by_name(db, payload.section)
    energy_id = _energy_id_by_name(db, getattr(payload, "energy", None))

    question.question_text = payload.question_text
    question.answer_type = payload.answer_type
    question.score = payload.score
    question.is_required = payload.is_required
    question.display_order = payload.display_order
    question.is_active = payload.is_active
    question.section_id = section.id
    question.element_id = element.id if element else None
    question.category_id = category_id
    question.energy_id = energy_id
    question.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    question.updated_by = admin.get("id")

    # Update mapping (single mapping per question)
    link = (
        db.query(models.QuestionUserTypeMap)
        .filter(models.QuestionUserTypeMap.question_id == question.id)
        .first()
    )
    if link:
        link.user_type_id = user_type.id
    else:
        db.add(models.QuestionUserTypeMap(question_id=question.id, user_type_id=user_type.id))

    db.commit()
    db.refresh(question)
    section_lookup = {section.id: section.name}
    element_lookup = {element.id: element.name} if element else {}
    data = _serialize_question(question, user_type.type_code, section_lookup)
    if element:
        data["element"] = element.name
    category_lookup = _category_lookup(db)
    if category_id:
        data["category"] = category_lookup.get(category_id)
    if energy_id:
        energy = db.query(models.Energy).filter(models.Energy.id == energy_id).first()
        if energy:
            data["energy"] = energy.name
    return {"question": data}


@router.patch("/questions/{question_id}/status")
def toggle_question_status(
    question_id: int,
    payload: QuestionToggleStatus,
    admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Activate/deactivate a question."""
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    question.is_active = payload.is_active
    question.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    question.updated_by = admin.get("id")
    db.commit()
    db.refresh(question)

    # find user type code for serialization
    link = (
        db.query(models.QuestionUserTypeMap, models.UserType.type_code)
        .join(models.UserType, models.QuestionUserTypeMap.user_type_id == models.UserType.id, isouter=True)
        .filter(models.QuestionUserTypeMap.question_id == question.id)
        .first()
    )
    user_type_code = link[1] if link else "GENERAL"

    return {"question": _serialize_question(question, user_type_code)}


@router.delete("/questions/{question_id}")
def delete_question(
    question_id: int,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete a question and its mappings."""
    question = db.query(models.Question).filter(models.Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db.query(models.QuestionUserTypeMap).filter(models.QuestionUserTypeMap.question_id == question.id).delete()
    db.delete(question)
    db.commit()
    return {"message": "Question deleted", "question_id": question_id}


# ---------- Config: Sections & Subsections ----------

@router.get("/config/sections")
def list_sections(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    sections = (
        db.query(models.Section)
        .order_by(models.Section.display_order.asc(), models.Section.name.asc())
        .all()
    )
    return {"sections": [{"id": s.id, "name": s.name, "display_order": s.display_order, "is_active": s.is_active} for s in sections]}


@router.get("/config/categories")
def list_categories(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    cats = db.query(models.Category).order_by(models.Category.id.asc()).all()
    return {"categories": [{"id": c.id, "name": c.category_name} for c in cats]}


@router.get("/config/energy")
def list_energy(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(models.Energy)
        .filter((models.Energy.is_active == True) | (models.Energy.is_active.is_(None)))  # noqa: E712
        .order_by(models.Energy.display_order.asc().nulls_last(), models.Energy.id.asc())
        .all()
    )
    return {"energy": [{"id": e.id, "name": e.name, "display_order": e.display_order, "is_active": e.is_active} for e in rows]}


@router.post("/config/sections")
def create_section(payload: SectionCreate, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    section = _get_or_create_section(db, payload.name)
    section.display_order = payload.display_order
    section.is_active = payload.is_active
    db.commit()
    db.refresh(section)
    return {"section": {"id": section.id, "name": section.name, "display_order": section.display_order, "is_active": section.is_active}}


@router.patch("/config/sections/{section_id}/status")
def toggle_section(section_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    section = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    section.is_active = not section.is_active
    db.commit()
    db.refresh(section)
    return {"section": {"id": section.id, "name": section.name, "display_order": section.display_order, "is_active": section.is_active}}


@router.get("/config/element")
def list_elements(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    elems = db.query(models.Element).order_by(models.Element.id.asc()).all()
    return {"subsections": [{"id": e.id, "name": e.name, "display_order": e.id, "is_active": True} for e in elems]}


@router.post("/config/element")
def create_element(payload: SubsectionCreate, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    elem = db.query(models.Element).filter(models.Element.name.ilike(name)).first()
    if not elem:
        elem = models.Element(name=name)
        db.add(elem)
        db.commit()
        db.refresh(elem)
    return {"subsection": {"id": elem.id, "name": elem.name, "display_order": elem.id, "is_active": True}}


@router.patch("/config/element/{sub_id}/status")
def toggle_element(sub_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    elem = db.query(models.Element).filter(models.Element.id == sub_id).first()
    if not elem:
        raise HTTPException(status_code=404, detail="Element not found")
    return {"subsection": {"id": elem.id, "name": elem.name, "display_order": elem.id, "is_active": True}}


@router.delete("/config/sections/{section_id}")
def delete_section(section_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    section = db.query(models.Section).filter(models.Section.id == section_id).first()
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")
    db.delete(section)
    db.commit()
    return {"message": "Section deleted", "section_id": section_id}


@router.delete("/config/element/{sub_id}")
def delete_element(sub_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    elem = db.query(models.Element).filter(models.Element.id == sub_id).first()
    if not elem:
        raise HTTPException(status_code=404, detail="Element not found")
    db.delete(elem)
    db.commit()
    return {"message": "Element deleted", "subsection_id": sub_id}


# ---------- Rules management ----------

@router.get("/rules", response_model=dict)
def list_rules(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = db.query(models.MasterRule).order_by(models.MasterRule.id.asc()).all()
    return {"rules": [RuleOut.from_orm(r) for r in rows]}


@router.post("/rules", response_model=dict)
def create_rule(payload: RuleCreate, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    rule = models.MasterRule(**payload.dict())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return {"rule": RuleOut.from_orm(rule)}


@router.put("/rules/{rule_id}", response_model=dict)
def update_rule(rule_id: int, payload: RuleCreate, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    rule = db.query(models.MasterRule).filter(models.MasterRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    for key, value in payload.dict().items():
        setattr(rule, key, value)
    db.commit()
    db.refresh(rule)
    return {"rule": RuleOut.from_orm(rule)}


@router.delete("/rules/{rule_id}", response_model=dict)
def delete_rule(rule_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    rule = db.query(models.MasterRule).filter(models.MasterRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"message": "Rule deleted", "rule_id": rule_id}


@router.get("/users/{user_id}")
def admin_user_detail(user_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Return the full saved profile for one user so admin can inspect it directly."""
    user = _admin_user_or_404(db, user_id)
    profile = build_profile(
        user,
        get_latest_birth_data(db, user.id),
        get_latest_career_profile(db, user.id),
    )
    return {
        "user": {
            **profile,
            "suspended": bool(getattr(user, "suspended", 0)),
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
    }


@router.patch("/users/{user_id}/suspend")
def suspend_user(
    user_id: int,
    payload: SuspendUserPayload,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Suspend or unsuspend a user account from the admin panel."""
    user = _admin_user_or_404(db, user_id)
    user.suspended = 1 if payload.suspended else 0
    user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    create_activity_log(
        db,
        user.id,
        "user_suspended" if payload.suspended else "user_unsuspended",
        f"Admin {'suspended' if payload.suspended else 'reactivated'} {user.email}",
        {"suspended": payload.suspended},
    )
    db.commit()
    return {
        "message": "User suspended successfully" if payload.suspended else "User reactivated successfully",
        "user_id": user.id,
        "suspended": bool(user.suspended),
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UpdateUserRolePayload,
    _: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update a user's account role from the admin panel."""
    user = _admin_user_or_404(db, user_id)
    next_role = (payload.role or "").strip().lower()
    allowed_roles = {"user", "support", "admin"}
    if next_role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Role must be user, support, or admin")

    user.role = next_role
    user.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    create_activity_log(
        db,
        user.id,
        "user_role_updated",
        f"Admin changed role for {user.email} to {next_role}",
        {"role": next_role},
    )
    db.commit()
    return {"message": "User role updated successfully", "user_id": user.id, "role": user.role}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, _: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Delete a user and related records from the local SQLite database."""
    user = _admin_user_or_404(db, user_id)
    user_email = user.email

    for model in (
        models.BirthData,
        models.BirthTimeEstimate,
        models.CareerProfile,
        models.CareerAlignmentScore,
        models.CareerPhase,
        models.OpportunityWindow,
        models.DecisionGuidance,
        models.ActivityLog,
        models.CareerScore,
        models.FeedbackDecision,
        models.FeedbackOutcome,
    ):
        db.query(model).filter(model.user_id == user_id).delete(synchronize_session=False)

    db.delete(user)
    create_activity_log(
        db,
        user_id,
        "user_deleted",
        f"Admin deleted user {user_email}",
        {"email": user_email},
    )
    db.commit()
    return {"message": "User deleted successfully", "user_id": user_id}


@router.get("/export/users.csv")
def export_users_csv(_: dict = Depends(get_current_admin), db: Session = Depends(get_db)):
    """Export admin user data as CSV for local reporting."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "user_id",
            "name",
            "email",
            "role",
            "phone",
            "nationality",
            "language",
            "current_role",
            "goals",
            "years_experience",
            "profile_completed",
            "suspended",
            "created_at",
        ]
    )

    for user in users:
        profile = build_profile(
            user,
            get_latest_birth_data(db, user.id),
            get_latest_career_profile(db, user.id),
        )
        writer.writerow(
            [
                profile["user_id"],
                profile["name"],
                profile["email"],
                profile["role"],
                profile["phone"],
                profile["nationality"],
                profile["language"],
                profile["current_role"],
                profile["goals"],
                profile["years_experience"],
                profile["profile_completed"],
                bool(getattr(user, "suspended", 0)),
                user.created_at.isoformat() if user.created_at else "",
            ]
        )

    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vedastro-users.csv"},
    )
