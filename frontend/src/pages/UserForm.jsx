import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import BirthTimeQuestionnaire from "../components/profile/BirthTimeQuestionnaire"
import { useToast } from "../components/shared/ToastProvider"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"

function UserForm() {
  const navigate = useNavigate()
  const { user, updateUser, t } = useUser()
  const { showError, showSuccess } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(true)

  const [birthTimeKnowledge, setBirthTimeKnowledge] = useState("yes")
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    dob: "",
    birth_time: "",
    birth_place: "",
    birth_time_accuracy: "exact",
  })
  const [careerData, setCareerData] = useState({
    education: "",
    interests: "",
    goals: "",
    current_role: "",
    years_experience: 0,
    goal_clarity: "medium",
    role_match: "medium",
  })

  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        // unauthenticated: start with blank form, skip fetch
        setLoading(false)
        return
      }
      try {
        const response = await api.get("/profile")
        const profile = response.data

        setFormData({
          name: profile.name || "",
          phone: profile.phone || "",
          address: profile.address || "",
          dob: profile.dob || "",
          birth_time: profile.birth_time || "",
          birth_place: profile.birth_place || "",
          birth_time_accuracy: profile.birth_time_accuracy || "unknown",
        })
        setCareerData({
          education: profile.education || "",
          interests: profile.interests || "",
          goals: profile.goals || "",
          current_role: profile.current_role || "",
          years_experience: profile.years_experience || 0,
          goal_clarity: profile.goal_clarity || "medium",
          role_match: profile.role_match || "medium",
        })
        if (profile.birth_time_accuracy === "estimated_by_ai") {
          setBirthTimeKnowledge("no")
        }
      } catch (error) {
        console.error("Failed to load profile", error)
        showError("Could not load your saved profile data.")
      }
      setLoading(false)
    }

    // Initial profile bootstrap is intentionally a one-time load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadProfile()
  }, [])

  const validateBirthStep = () => {
    const nextErrors = {}
    if (!formData.name.trim()) nextErrors.name = "Full name is required."
    if (!formData.phone.trim()) {
      nextErrors.phone = "Phone number is required."
    } else if (!/^\d{10,15}$/.test(formData.phone.trim())) {
      nextErrors.phone = "Phone number should contain 10 to 15 digits."
    }
    if (!formData.dob) nextErrors.dob = "Date of birth is required."
    if (birthTimeKnowledge !== "no" && !formData.birth_time) nextErrors.birth_time = "Birth time is required."
    if (!formData.birth_place.trim()) nextErrors.birth_place = "Birth place is required."
    if (!formData.address.trim()) nextErrors.address = "Address is required."
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const validateCareerStep = () => {
    const nextErrors = {}
    if (!careerData.current_role.trim()) nextErrors.current_role = "Current role is required."
    if (!careerData.education.trim()) nextErrors.education = "Education is required."
    if (!careerData.interests.trim()) nextErrors.interests = "Interests are required."
    if (!careerData.goals.trim()) nextErrors.goals = "Goals are required."
    if (careerData.years_experience < 0) nextErrors.years_experience = "Experience cannot be negative."
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleBirthTimeKnowledge = (knowledge) => {
    setBirthTimeKnowledge(knowledge)
    if (knowledge === "yes") {
      setFormData((current) => ({ ...current, birth_time_accuracy: "exact" }))
      setCurrentStep(1)
      setShowQuestionnaire(false)
      return
    }
    if (knowledge === "approximate") {
      setFormData((current) => ({ ...current, birth_time_accuracy: "approximate" }))
      setCurrentStep(1)
      setShowQuestionnaire(false)
      return
    }
    setShowQuestionnaire(true)
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: "" }))
  }

  const handleCareerChange = (event) => {
    const { name, value } = event.target
    setCareerData((current) => ({
      ...current,
      [name]: name === "years_experience" ? Number(value) : value,
    }))
    setErrors((current) => ({ ...current, [name]: "" }))
  }

  const handleSaveBirthData = async () => {
    if (!validateBirthStep()) {
      showError("Please fix the highlighted personal profile fields.")
      return
    }
    const token = localStorage.getItem("token")
    if (!token) {
      // guest flow: keep data locally and move ahead
      localStorage.setItem("guest_profile_draft", JSON.stringify({ formData, careerData }))
      setCurrentStep(2)
      showSuccess("Profile saved locally. Create an account later to sync.")
      return
    }
    setSaving(true)
    try {
      const response = await api.put("/profile", {
        ...formData,
      })
      updateUser(response.data)
      showSuccess("Personal profile saved successfully.")
      setCurrentStep(2)
    } catch (error) {
      showError(error.response?.data?.detail || "Error saving birth data")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCareerProfile = async () => {
    if (!validateCareerStep()) {
      showError("Please fix the highlighted career profile fields.")
      return
    }
    const token = localStorage.getItem("token")
    if (!token) {
      localStorage.setItem("guest_profile_draft", JSON.stringify({ formData, careerData }))
      showSuccess("Profile saved locally. Sign up later to keep it in your account.")
      navigate("/dashboard", { state: { guestProfile: { ...formData, ...careerData } } })
      return
    }
    setSaving(true)
    try {
      const response = await api.put("/profile", {
        ...formData,
        ...careerData,
      })
      updateUser(response.data)
      showSuccess("Career profile saved successfully.")
      navigate("/dashboard")
    } catch (error) {
      showError(error.response?.data?.detail || "Error saving career profile")
    } finally {
      setSaving(false)
    }
  }

  if (showQuestionnaire) {
    return (
      <BirthTimeQuestionnaire
        userId={user?.user_id}
        onComplete={() => {
          setShowQuestionnaire(false)
          setCurrentStep(1)
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton-card">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      </div>
    )
  }

  return (
    <div className="user-form-container">
      {currentStep === 0 && (
        <div className="form-card">
          <h2>{t.birthTimeSetup}</h2>
          <p className="form-subtitle">{t.birthTimeSub}</p>

          <div className="birth-time-options">
            <button className="option-btn" onClick={() => handleBirthTimeKnowledge("yes")}>
              <span className="option-icon">Yes</span>
              <span className="option-text">{t.knowExactBirthTime}</span>
            </button>
            <button className="option-btn" onClick={() => handleBirthTimeKnowledge("approximate")}>
              <span className="option-icon">Near</span>
              <span className="option-text">{t.knowApproxBirthTime}</span>
            </button>
            <button className="option-btn" onClick={() => handleBirthTimeKnowledge("no")}>
              <span className="option-icon">AI</span>
              <span className="option-text">{t.estimateWithAi}</span>
            </button>
          </div>
        </div>
      )}

      {currentStep === 1 && (
        <div className="form-card">
          <h2>{t.personalProfile}</h2>

          <div className="input-group">
            <label>{t.fullName}</label>
            <input className={errors.name ? "input-invalid" : ""} name="name" value={formData.name} onChange={handleFormChange} />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="input-group">
            <label>{t.phone}</label>
            <input className={errors.phone ? "input-invalid" : ""} name="phone" value={formData.phone} onChange={handleFormChange} />
            {errors.phone && <p className="field-error">{errors.phone}</p>}
          </div>

          <div className="input-group">
            <label>{t.dateOfBirth}</label>
            <input className={errors.dob ? "input-invalid" : ""} type="date" name="dob" value={formData.dob} onChange={handleFormChange} />
            {errors.dob && <p className="field-error">{errors.dob}</p>}
          </div>

          {birthTimeKnowledge !== "no" && (
            <div className="input-group">
              <label>{t.birthTime}</label>
              <input className={errors.birth_time ? "input-invalid" : ""} type="time" name="birth_time" value={formData.birth_time} onChange={handleFormChange} />
              {errors.birth_time && <p className="field-error">{errors.birth_time}</p>}
            </div>
          )}

          <div className="input-group">
            <label>{t.birthPlace}</label>
            <input className={errors.birth_place ? "input-invalid" : ""} name="birth_place" value={formData.birth_place} onChange={handleFormChange} />
            {errors.birth_place && <p className="field-error">{errors.birth_place}</p>}
          </div>

          <div className="input-group">
            <label>{t.address}</label>
            <textarea className={errors.address ? "input-invalid" : ""} name="address" value={formData.address} onChange={handleFormChange} rows="3" />
            {errors.address && <p className="field-error">{errors.address}</p>}
          </div>

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(0)}>
              {t.back}
            </button>
            <button className="btn-primary" onClick={handleSaveBirthData} disabled={saving}>
              {saving ? t.saving : t.next}
            </button>
          </div>
        </div>
      )}

      {currentStep === 2 && (
        <div className="form-card">
          <h2>{t.careerProfile}</h2>

          <div className="input-group">
            <label>{t.currentRole}</label>
            <input className={errors.current_role ? "input-invalid" : ""} name="current_role" value={careerData.current_role} onChange={handleCareerChange} />
            {errors.current_role && <p className="field-error">{errors.current_role}</p>}
          </div>

          <div className="input-group">
            <label>{t.education}</label>
            <input className={errors.education ? "input-invalid" : ""} name="education" value={careerData.education} onChange={handleCareerChange} />
            {errors.education && <p className="field-error">{errors.education}</p>}
          </div>

          <div className="input-group">
            <label>{t.yearsOfExperience}</label>
            <input
              type="number"
              min="0"
              name="years_experience"
              value={careerData.years_experience}
              onChange={handleCareerChange}
            />
            {errors.years_experience && <p className="field-error">{errors.years_experience}</p>}
          </div>

          <div className="input-group">
            <label>{t.interests}</label>
            <textarea className={errors.interests ? "input-invalid" : ""} name="interests" value={careerData.interests} onChange={handleCareerChange} rows="3" />
            {errors.interests && <p className="field-error">{errors.interests}</p>}
          </div>

          <div className="input-group">
            <label>{t.goals}</label>
            <textarea className={errors.goals ? "input-invalid" : ""} name="goals" value={careerData.goals} onChange={handleCareerChange} rows="3" />
            {errors.goals && <p className="field-error">{errors.goals}</p>}
          </div>

          <div className="input-group">
            <label>{t.goalClarity}</label>
            <select name="goal_clarity" value={careerData.goal_clarity} onChange={handleCareerChange}>
              <option value="low">{t.low}</option>
              <option value="medium">{t.medium}</option>
              <option value="high">{t.high}</option>
            </select>
          </div>

          <div className="input-group">
            <label>{t.roleMatch}</label>
            <select name="role_match" value={careerData.role_match} onChange={handleCareerChange}>
              <option value="low">{t.low}</option>
              <option value="medium">{t.medium}</option>
              <option value="high">{t.high}</option>
            </select>
          </div>

          <div className="button-group">
            <button className="btn-secondary" onClick={() => setCurrentStep(1)}>
              {t.back}
            </button>
            <button className="btn-primary" onClick={handleSaveCareerProfile} disabled={saving}>
              {saving ? t.saving : t.complete}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserForm
