from datetime import datetime, timedelta, timezone


def calculate_age(dob: str | None) -> int:
    if not dob:
        return 28
    try:
        born = datetime.strptime(dob, "%Y-%m-%d").date()
    except ValueError:
        return 28
    today = datetime.now(timezone.utc).date()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


def awareness_score(goal_clarity: str | None, role_match: str | None) -> int:
    if (goal_clarity or "medium").lower() == "high" and (role_match or "medium").lower() == "high":
        return 85
    if (goal_clarity or "medium").lower() == "medium" or (role_match or "medium").lower() == "medium":
        return 65
    return 40


def time_alignment(age: int) -> int:
    if 22 <= age <= 26:
        return 60
    if 27 <= age <= 32:
        return 75
    if 33 <= age <= 40:
        return 85
    return 70


def action_strength(experience: int) -> int:
    if experience <= 2:
        return 50
    if experience <= 5:
        return 65
    if experience <= 10:
        return 75
    return 85


def career_phase(score: float) -> str:
    if score < 60:
        return "Skill Building"
    if score < 75:
        return "Growth Phase"
    if score < 85:
        return "Expansion Phase"
    return "Opportunity Phase"


def classify_opportunity(score: float) -> tuple[str, str]:
    if score >= 80:
        return "High", "Take action in next 3 months"
    if score >= 60:
        return "Moderate", "Prepare for upcoming opportunity"
    if score >= 40:
        return "Neutral", "Focus on skill building"
    return "Low", "Avoid major decisions"


def generate_time_window() -> tuple[str, str]:
    today = datetime.now(timezone.utc).date()
    start = today + timedelta(days=30)
    end = today + timedelta(days=90)
    return start.strftime("%b %Y"), end.strftime("%b %Y")


def build_dashboard(profile: dict) -> dict:
    age = calculate_age(profile.get("dob"))
    experience = int(profile.get("years_experience") or 0)
    awareness = awareness_score(profile.get("goal_clarity"), profile.get("role_match"))
    time_score = time_alignment(age)
    action = action_strength(experience)
    final_score = round((awareness * 0.3) + (time_score * 0.4) + (action * 0.3), 2)
    opp_level, opp_action = classify_opportunity(time_score + (final_score / 2))
    phase = career_phase(final_score)
    start_date, end_date = generate_time_window()
    focus_target = (profile.get("goals") or "your next career milestone").split(",")[0].strip()
    interest_target = (profile.get("interests") or "market-ready skills").split(",")[0].strip()

    return {
        "career_alignment_score": final_score,
        "career_phase": phase,
        "current_career_phase": phase,
        "opportunity_window": {
            "start_date": start_date,
            "end_date": end_date,
            "type": opp_level,
            "recommended_action": opp_action,
        },
        "guidance_recommendations": {
            "focus": f"Build momentum in {focus_target}",
            "avoid": "Random switching without a clear story",
            "reason": f"Your profile shows the strongest upside comes from combining {focus_target} with {interest_target}.",
            "recommendations": [
                f"Pick one measurable target in {focus_target} this month.",
                f"Turn your interest in {interest_target} into a visible project.",
                "Review your resume, portfolio, and LinkedIn before your next move.",
            ],
            "summary": f"AI recommendation: focus on {focus_target} and use {interest_target} as your growth lever.",
        },
        "trend_data": [
            {"month": "Jan", "score": max(35, round(final_score - 16))},
            {"month": "Feb", "score": max(40, round(final_score - 10))},
            {"month": "Mar", "score": max(45, round(final_score - 5))},
            {"month": "Apr", "score": round(final_score)},
        ],
        "awareness_score": awareness,
        "time_alignment_score": time_score,
        "action_integrity_score": action,
        "profile_completed": profile["profile_completed"],
        "user_profile": profile,
    }
