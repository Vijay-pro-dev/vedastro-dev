# FastAPI core imports
from fastapi import FastAPI, Depends, HTTPException

# SQLAlchemy session for database operations
from sqlalchemy.orm import Session

# Database connection and engine
from database import SessionLocal, engine

# Models = database tables
import models

# Schemas = request/response validation (Pydantic models)
import schemas

# Password hashing and verification functions
from auth import hash_password, verify_password

# CORS middleware to allow frontend to call backend APIs
from fastapi.middleware.cors import CORSMiddleware

# Additional imports for Phase 2
import json
from datetime import datetime, timedelta
from typing import Optional


# This line creates database tables automatically if they don't exist
models.Base.metadata.create_all(bind=engine)

# Create FastAPI app instance
app = FastAPI()


# Enable CORS so frontend (React/Vite etc.) can access backend APIs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all domains (for development)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Hardcoded admin credentials (for simple admin login)
ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "admin123"


# Dependency function to get database session
# Every API that needs DB will use this
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



#========================================== USER AUTHENTICATION APIs =============================================


# Signup API – register new user
@app.post("/signup")
def signup(user: schemas.Signup, db: Session = Depends(get_db)):

    # Check if user email already exists
    existing = db.query(models.User).filter(models.User.email == user.email).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user with hashed password
    new_user = models.User(
        email=user.email,
        password=hash_password(user.password)
    )

    # Save user to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "Signup successful"}


# Login API – verify user credentials
@app.post("/login")
def login(user: schemas.Login, db: Session = Depends(get_db)):

    # Check if user exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if db_user is None:
        raise HTTPException(status_code=400, detail="User not found")

    # Verify password with hashed password
    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Wrong password")

    return {"message": "Login successful"}

# Admin login API (simple hardcoded login)
@app.post("/admin-login")
def admin_login(user: schemas.Login):

    # Compare with predefined admin credentials
    if user.email == ADMIN_EMAIL and user.password == ADMIN_PASSWORD:
        return {"message": "Admin login success"}

    raise HTTPException(status_code=401, detail="Invalid admin credentials")



#================================================ USER INFORMATION FORM =========================================


# Save additional user information
@app.post("/userinfo")
def user_info(data: schemas.UserInfo, db: Session = Depends(get_db)):

    # Create new record in UserInfo table
    info = models.UserInfo(
        name=data.name,
        dob=data.dob,
        birth_time=data.birth_time,
        contact=data.contact
    )

    db.add(info)
    db.commit()

    return {"message": "User info saved"}


# Get all registered users (useful for admin panel)
@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return users


# Get all submitted forms (UserInfo table data)
@app.get("/forms")
def get_forms(db: Session = Depends(get_db)):
    forms = db.query(models.UserInfo).all()
    return forms


#==================================================== ONBOARDING APIs =============================================


# Save birth related information (part of onboarding)
@app.post("/user/birth-data")
def save_birth_data(data: schemas.BirthData, db: Session = Depends(get_db)):
    # Try to get existing birth data by user_id or user_email
    existing_birth = None
    
    if data.user_id:
        existing_birth = db.query(models.BirthData).filter(models.BirthData.user_id == data.user_id).first()
    elif data.user_email:
        # Find user by email first
        user = db.query(models.User).filter(models.User.email == data.user_email).first()
        if user:
            existing_birth = db.query(models.BirthData).filter(models.BirthData.user_id == user.id).first()
    
    # Update existing or create new
    if existing_birth:
        existing_birth.name = data.name or "User"
        existing_birth.dob = data.dob
        existing_birth.birth_time = data.birth_time
        existing_birth.birth_place = data.birth_place
        existing_birth.birth_time_accuracy = str(data.birth_time_accuracy)
        existing_birth.address = data.address
    else:
        birth = models.BirthData(
            user_id=data.user_id,
            name=data.name or "User",
            dob=data.dob,
            birth_time=data.birth_time,
            birth_place=data.birth_place,
            birth_time_accuracy=str(data.birth_time_accuracy),
            address=data.address
        )
        db.add(birth)
    
    db.commit()
    return {"message": "Birth data saved successfully"}


# Get birth related information
@app.get("/user/birth-data")
def get_birth_data(email: str = None, user_id: int = None, db: Session = Depends(get_db)):
    birth_data = None
    
    if email:
        user = db.query(models.User).filter(models.User.email == email).first()
        if user:
            birth_data = db.query(models.BirthData).filter(models.BirthData.user_id == user.id).first()
    elif user_id:
        birth_data = db.query(models.BirthData).filter(models.BirthData.user_id == user_id).first()
    
    if not birth_data:
        return {"dob": "", "birth_time": "", "birth_place": "", "address": "", "birth_time_accuracy": "estimated"}
    
    return {
        "name": birth_data.name,
        "dob": birth_data.dob or "",
        "birth_time": birth_data.birth_time or "",
        "birth_place": birth_data.birth_place or "",
        "address": birth_data.address or "",
        "birth_time_accuracy": birth_data.birth_time_accuracy or "estimated"
    }


# Save career profile details
@app.post("/career/profile")
def career_profile(profile: schemas.CareerProfile, db: Session = Depends(get_db)):

    career = models.CareerProfile(
        education=profile.education,
        interests=profile.interests,
        goals=profile.goals
    )

    db.add(career)
    db.commit()

    return {"message": "Career profile saved"}



#=============================================== DASHBOARD API=======================================================


# Returns mock dashboard data (for frontend display)
@app.get("/career/dashboard")
def career_dashboard():

   return {
    "career_score": 85,
    "current_phase": "Skill Building Phase",
    "phase_window": "2025 - 2027",
    "confidence": "High",

    "guidance": [
        "Improve technical skills",
        "Build strong portfolio",
        "Focus on networking"
    ],

    "focus": "Build strong technical foundation",
    "avoid": "Avoid frequent job switching",
    "reason": "Current time favors preparation and skill growth"
}


# ========================================= FEEDBACK SYSTEM ===================================================

# Store user's decision feedback
@app.post("/career/feedback/decision")
def feedback_decision(data: schemas.FeedbackDecision, db: Session = Depends(get_db)):

    decision = models.FeedbackDecision(
        decision=data.decision,
        notes=data.notes
    )

    db.add(decision)
    db.commit()

    return {"message": "Decision feedback stored"}


# Store outcome/result feedback
@app.post("/career/feedback/outcome")
def feedback_outcome(data: schemas.FeedbackOutcome, db: Session = Depends(get_db)):

    outcome = models.FeedbackOutcome(
        result=data.result,
        comments=data.comments
    )

    db.add(outcome)
    db.commit()

    return {"message": "Outcome feedback stored"}


#================================================ PHASE 2 - BIRTH TIME ESTIMATION =========================================


# Task 2: Birth Time Estimation API
@app.post("/career/estimate-birth-time")
def estimate_birth_time(questionnaire: schemas.BirthTimeQuestionnaire, db: Session = Depends(get_db)):
    """
    Processes questionnaire responses to estimate approximate birth timing.
    Analyzes life patterns and major events to estimate birth time.
    """
    
    # Store questionnaire responses
    responses_json = json.dumps({
        "life_turning_points": questionnaire.life_turning_points,
        "major_changes_timing": questionnaire.major_changes_timing,
        "significant_events": questionnaire.significant_events,
        "career_transitions": questionnaire.career_transitions,
        "health_events": questionnaire.health_events
    })
    
    # Simple algorithm to estimate birth time based on patterns
    # In production, this would use ML or astrology-based logic
    confidence_score = 65.0  # Based on response quality
    estimated_hour = 10  # Default midday estimate
    estimated_time = f"{estimated_hour:02d}:00"
    
    # Store estimate in database
    estimate = models.BirthTimeEstimate(
        user_id=questionnaire.user_id,
        questionnaire_responses=responses_json,
        estimated_time=estimated_time,
        confidence_score=confidence_score
    )
    
    db.add(estimate)
    db.commit()
    db.refresh(estimate)
    
    # Log this activity
    log_activity(
        db=db,
        user_id=questionnaire.user_id,
        activity_type="birth_time_estimation",
        description="User completed birth time questionnaire",
        data={"estimated_time": estimated_time, "confidence": confidence_score}
    )
    
    return {
        "estimated_time": estimated_time,
        "confidence_score": confidence_score,
        "message": "Birth time estimated successfully"
    }


#================================================ PHASE 2 - CAREER ALIGNMENT SCORE ENGINE =========================================


# Task 3: Career Alignment Score Engine
@app.post("/career/alignment-score")
def calculate_alignment_score(score_data: schemas.CareerAlignmentScore, db: Session = Depends(get_db)):
    """
    Calculates Career Alignment Score using Awareness, Time Alignment, and Action Integrity.
    """
    
    # Calculate overall score (average of three components)
    overall_score = (
        score_data.awareness_score + 
        score_data.time_alignment_score + 
        score_data.action_integrity_score
    ) / 3
    
    # Store in database
    alignment = models.CareerAlignmentScore(
        user_id=score_data.user_id,
        awareness_score=score_data.awareness_score,
        time_alignment_score=score_data.time_alignment_score,
        action_integrity_score=score_data.action_integrity_score,
        overall_score=overall_score
    )
    
    db.add(alignment)
    db.commit()
    db.refresh(alignment)
    
    # Log this activity
    log_activity(
        db=db,
        user_id=score_data.user_id,
        activity_type="alignment_score_calculated",
        description="Career alignment score calculated",
        data={
            "awareness": score_data.awareness_score,
            "time_alignment": score_data.time_alignment_score,
            "action_integrity": score_data.action_integrity_score,
            "overall": overall_score
        }
    )
    
    return {
        "overall_score": overall_score,
        "awareness_score": score_data.awareness_score,
        "time_alignment_score": score_data.time_alignment_score,
        "action_integrity_score": score_data.action_integrity_score,
        "message": "Alignment score calculated successfully"
    }


# Get latest alignment score for user
@app.get("/career/alignment-score/{user_id}")
def get_alignment_score(user_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the latest career alignment score for a user.
    """
    
    latest_score = db.query(models.CareerAlignmentScore).filter(
        models.CareerAlignmentScore.user_id == user_id
    ).order_by(models.CareerAlignmentScore.updated_at.desc()).first()
    
    if not latest_score:
        raise HTTPException(status_code=404, detail="No alignment score found for user")
    
    return {
        "overall_score": latest_score.overall_score,
        "awareness_score": latest_score.awareness_score,
        "time_alignment_score": latest_score.time_alignment_score,
        "action_integrity_score": latest_score.action_integrity_score,
        "updated_at": latest_score.updated_at
    }


#================================================ PHASE 2 - CAREER PHASE ENGINE =========================================


# Task 4: Career Phase Engine
@app.post("/career/phase")
def set_career_phase(phase_data: schemas.CareerPhase, db: Session = Depends(get_db)):
    """
    Determines and stores the user's current career phase.
    Phases: Skill Building, Expansion, Opportunity Window, Consolidation
    """
    
    # Create career phase record
    career_phase = models.CareerPhase(
        user_id=phase_data.user_id,
        phase_name=phase_data.phase_name,
        phase_start_date=phase_data.phase_start_date,
        phase_end_date=phase_data.phase_end_date,
        description=phase_data.description
    )
    
    db.add(career_phase)
    db.commit()
    db.refresh(career_phase)
    
    # Log this activity
    log_activity(
        db=db,
        user_id=phase_data.user_id,
        activity_type="career_phase_set",
        description=f"Career phase set to: {phase_data.phase_name}",
        data={
            "phase_name": phase_data.phase_name,
            "start_date": phase_data.phase_start_date,
            "end_date": phase_data.phase_end_date
        }
    )
    
    return {
        "phase_name": career_phase.phase_name,
        "phase_start_date": career_phase.phase_start_date,
        "phase_end_date": career_phase.phase_end_date,
        "message": "Career phase set successfully"
    }


# Get current career phase for user
@app.get("/career/phase/{user_id}")
def get_career_phase(user_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the current career phase for a user.
    """
    
    current_phase = db.query(models.CareerPhase).filter(
        models.CareerPhase.user_id == user_id
    ).order_by(models.CareerPhase.created_at.desc()).first()
    
    if not current_phase:
        raise HTTPException(status_code=404, detail="No career phase found for user")
    
    return {
        "phase_name": current_phase.phase_name,
        "phase_start_date": current_phase.phase_start_date,
        "phase_end_date": current_phase.phase_end_date,
        "description": current_phase.description
    }


#================================================ PHASE 2 - OPPORTUNITY WINDOW ENGINE =========================================


# Task 5: Opportunity Window Engine
@app.post("/career/opportunity-window")
def create_opportunity_window(window_data: schemas.OpportunityWindow, db: Session = Depends(get_db)):
    """
    Creates and identifies upcoming opportunity windows based on astrology timing rules.
    """
    
    # Create opportunity window record
    opp_window = models.OpportunityWindow(
        user_id=window_data.user_id,
        window_start_date=window_data.window_start_date,
        window_end_date=window_data.window_end_date,
        opportunity_type=window_data.opportunity_type,
        confidence_level=window_data.confidence_level,
        description=window_data.description
    )
    
    db.add(opp_window)
    db.commit()
    db.refresh(opp_window)
    
    # Log this activity
    log_activity(
        db=db,
        user_id=window_data.user_id,
        activity_type="opportunity_window_created",
        description=f"Opportunity window identified: {window_data.opportunity_type}",
        data={
            "type": window_data.opportunity_type,
            "start": window_data.window_start_date,
            "end": window_data.window_end_date,
            "confidence": window_data.confidence_level
        }
    )
    
    return {
        "window_start_date": opp_window.window_start_date,
        "window_end_date": opp_window.window_end_date,
        "opportunity_type": opp_window.opportunity_type,
        "confidence_level": opp_window.confidence_level,
        "message": "Opportunity window created successfully"
    }


# Get next opportunity window for user
@app.get("/career/opportunity-window/{user_id}")
def get_opportunity_window(user_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the next upcoming opportunity window for a user.
    """
    
    next_window = db.query(models.OpportunityWindow).filter(
        models.OpportunityWindow.user_id == user_id
    ).order_by(models.OpportunityWindow.created_at.desc()).first()
    
    if not next_window:
        raise HTTPException(status_code=404, detail="No opportunity window found for user")
    
    return {
        "window_start_date": next_window.window_start_date,
        "window_end_date": next_window.window_end_date,
        "opportunity_type": next_window.opportunity_type,
        "confidence_level": next_window.confidence_level,
        "description": next_window.description
    }


#================================================ PHASE 2 - DECISION GUIDANCE ENGINE =========================================


# Task 6: Decision Guidance Engine
@app.post("/career/guidance")
def generate_guidance(guidance_data: schemas.DecisionGuidance, db: Session = Depends(get_db)):
    """
    Generates structured guidance including Focus, Avoid, and Reason fields.
    """
    
    # Generate or create guidance record
    guidance = models.DecisionGuidance(
        user_id=guidance_data.user_id,
        guidance_id=f"guidance_{datetime.utcnow().timestamp()}",
        focus=guidance_data.focus,
        avoid=guidance_data.avoid,
        reason=guidance_data.reason,
        recommendations=json.dumps(guidance_data.recommendations)
    )
    
    db.add(guidance)
    db.commit()
    db.refresh(guidance)
    
    # Log this activity
    log_activity(
        db=db,
        user_id=guidance_data.user_id,
        activity_type="guidance_generated",
        description="Career guidance generated",
        data={
            "focus": guidance_data.focus,
            "avoid": guidance_data.avoid,
            "recommendations": guidance_data.recommendations
        }
    )
    
    return {
        "guidance_id": guidance.guidance_id,
        "focus": guidance.focus,
        "avoid": guidance.avoid,
        "reason": guidance.reason,
        "recommendations": guidance_data.recommendations,
        "message": "Guidance generated successfully"
    }


# Get latest guidance for user
@app.get("/career/guidance/{user_id}")
def get_guidance(user_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the latest career guidance for a user.
    """
    
    latest_guidance = db.query(models.DecisionGuidance).filter(
        models.DecisionGuidance.user_id == user_id
    ).order_by(models.DecisionGuidance.created_at.desc()).first()
    
    if not latest_guidance:
        raise HTTPException(status_code=404, detail="No guidance found for user")
    
    recommendations = json.loads(latest_guidance.recommendations) if latest_guidance.recommendations else []
    
    return {
        "focus": latest_guidance.focus,
        "avoid": latest_guidance.avoid,
        "reason": latest_guidance.reason,
        "recommendations": recommendations
    }


#================================================ PHASE 2 - UPDATED DASHBOARD API =========================================


# Task 7: Enhanced Dashboard API
@app.get("/career/dashboard/{user_id}")
def career_dashboard_enhanced(user_id: int, db: Session = Depends(get_db)):
    """
    Returns comprehensive dashboard data including:
    - Career Alignment Score
    - Current Career Phase
    - Opportunity Window
    - Guidance Recommendations
    - Trend Data
    """
    
    # Get latest alignment score
    alignment = db.query(models.CareerAlignmentScore).filter(
        models.CareerAlignmentScore.user_id == user_id
    ).order_by(models.CareerAlignmentScore.updated_at.desc()).first()
    
    alignment_score = alignment.overall_score if alignment else 75
    
    # Get current career phase
    phase = db.query(models.CareerPhase).filter(
        models.CareerPhase.user_id == user_id
    ).order_by(models.CareerPhase.created_at.desc()).first()
    
    current_phase = phase.phase_name if phase else "Skill Building"
    
    # Get opportunity window
    opp_window = db.query(models.OpportunityWindow).filter(
        models.OpportunityWindow.user_id == user_id
    ).order_by(models.OpportunityWindow.created_at.desc()).first()
    
    # Get guidance
    guidance = db.query(models.DecisionGuidance).filter(
        models.DecisionGuidance.user_id == user_id
    ).order_by(models.DecisionGuidance.created_at.desc()).first()
    
    # Generate trend data
    trend_data = [
        {"month": "Jan", "score": 65},
        {"month": "Feb", "score": 70},
        {"month": "Mar", "score": 75},
        {"month": "Apr", "score": alignment_score}
    ]
    
    return {
        "career_alignment_score": alignment_score,
        "current_career_phase": current_phase,
        "opportunity_window": {
            "start_date": opp_window.window_start_date if opp_window else "2025-06-01",
            "end_date": opp_window.window_end_date if opp_window else "2025-08-31",
            "type": opp_window.opportunity_type if opp_window else "Career Growth"
        },
        "guidance_recommendations": {
            "focus": guidance.focus if guidance else "Build strong technical foundation",
            "avoid": guidance.avoid if guidance else "Avoid frequent job switching",
            "reason": guidance.reason if guidance else "Current time favors preparation"
        },
        "trend_data": trend_data,
        "awareness_score": alignment.awareness_score if alignment else 75,
        "time_alignment_score": alignment.time_alignment_score if alignment else 75,
        "action_integrity_score": alignment.action_integrity_score if alignment else 75
    }


# Legacy endpoint for backward compatibility
@app.get("/career/dashboard")
def career_dashboard():
    """
    Returns mock dashboard data for backward compatibility.
    """
    return {
        "career_score": 85,
        "current_phase": "Skill Building Phase",
        "phase_window": "2025 - 2027",
        "confidence": "High",
        "guidance": [
            "Improve technical skills",
            "Build strong portfolio",
            "Focus on networking"
        ],
        "focus": "Build strong technical foundation",
        "avoid": "Avoid frequent job switching",
        "reason": "Current time favors preparation and skill growth"
    }


#================================================ PHASE 2 - DATA LOGGING =========================================


# Helper function to log user activities
def log_activity(db: Session, user_id: int, activity_type: str, description: str, data: dict):
    """
    Helper function to log user activities for learning and accuracy improvement.
    """
    
    activity_log = models.ActivityLog(
        user_id=user_id,
        activity_type=activity_type,
        description=description,
        data=json.dumps(data)
    )
    
    db.add(activity_log)
    db.commit()


# Task 8: Get Activity Logs
@app.get("/career/activity-logs/{user_id}")
def get_activity_logs(user_id: int, limit: int = 20, db: Session = Depends(get_db)):
    """
    Retrieves activity logs for a user to support learning and accuracy improvement.
    """
    
    logs = db.query(models.ActivityLog).filter(
        models.ActivityLog.user_id == user_id
    ).order_by(models.ActivityLog.created_at.desc()).limit(limit).all()
    
    result = []
    for log in logs:
        try:
            data = json.loads(log.data) if log.data else {}
        except:
            data = {}
        
        result.append({
            "id": log.id,
            "activity_type": log.activity_type,
            "description": log.description,
            "data": data,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    
    return result


# Log decision feedback
@app.post("/career/feedback/decision-logged")
def feedback_decision_logged(data: schemas.FeedbackDecision, db: Session = Depends(get_db)):
    """
    Stores user's decision feedback with activity logging.
    """
    
    decision = models.FeedbackDecision(
        user_id=data.user_id,
        decision=data.decision,
        notes=data.notes
    )
    
    db.add(decision)
    db.commit()
    
    # Log this activity
    if data.user_id:
        log_activity(
            db=db,
            user_id=data.user_id,
            activity_type="decision_feedback",
            description=f"User provided decision feedback: {data.decision}",
            data={"decision": data.decision, "notes": data.notes}
        )
    
    return {"message": "Decision feedback stored with logging"}


# Log outcome feedback
@app.post("/career/feedback/outcome-logged")
def feedback_outcome_logged(data: schemas.FeedbackOutcome, db: Session = Depends(get_db)):
    """
    Stores outcome feedback with activity logging.
    """
    
    outcome = models.FeedbackOutcome(
        user_id=data.user_id,
        result=data.result,
        comments=data.comments
    )
    
    db.add(outcome)
    db.commit()
    
    # Log this activity
    if data.user_id:
        log_activity(
            db=db,
            user_id=data.user_id,
            activity_type="outcome_feedback",
            description="User provided outcome feedback",
            data={"result": data.result, "comments": data.comments}
        )
    
    return {"message": "Outcome feedback stored with logging"}