import { useEffect, useState } from "react"
import { useToast } from "../components/shared/ToastProvider"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"

const initialFormState = {
  name: "",
  phone: "",
  dob: "",
  birth_time: "",
  birth_place: "",
  address: "",
  education: "",
  interests: "",
  goals: "",
  current_role: "",
  years_experience: 0,
}

function validateProfile(formData) {
  const nextErrors = {}

  if (!formData.name.trim()) nextErrors.name = "Full name is required."
  if (!formData.phone.trim()) {
    nextErrors.phone = "Phone number is required."
  } else if (!/^\d{10,15}$/.test(formData.phone.trim())) {
    nextErrors.phone = "Phone number should contain 10 to 15 digits."
  }
  if (!formData.dob) nextErrors.dob = "Date of birth is required."
  if (!formData.birth_place.trim()) nextErrors.birth_place = "Birth place is required."
  if (!formData.address.trim()) nextErrors.address = "Address is required."
  if (!formData.current_role.trim()) nextErrors.current_role = "Current role is required."
  if (!formData.education.trim()) nextErrors.education = "Education is required."
  if (!formData.interests.trim()) nextErrors.interests = "Interests are required."
  if (!formData.goals.trim()) nextErrors.goals = "Goals are required."
  if (Number(formData.years_experience) < 0) nextErrors.years_experience = "Experience cannot be negative."

  return nextErrors
}

function ProfilePage() {
  const { user, updateUser, t } = useUser()
  const { showError, showSuccess } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageFile, setImageFile] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState(initialFormState)

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get("/profile")
        setFormData({
          name: response.data.name || "",
          phone: response.data.phone || "",
          dob: response.data.dob || "",
          birth_time: response.data.birth_time || "",
          birth_place: response.data.birth_place || "",
          address: response.data.address || "",
          education: response.data.education || "",
          interests: response.data.interests || "",
          goals: response.data.goals || "",
          current_role: response.data.current_role || "",
          years_experience: response.data.years_experience || 0,
        })
        updateUser(response.data)
      } catch (error) {
        showError(error.response?.data?.detail || "Failed to load profile")
      } finally {
        setIsLoading(false)
      }
    }

    // Profile hydration runs once on mount to mirror saved backend data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadProfile()
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: name === "years_experience" ? Number(value) : value,
    }))
    setErrors((current) => ({ ...current, [name]: "" }))
  }

  const uploadImage = async () => {
    if (!imageFile) return user?.profile_pic

    const formPayload = new FormData()
    formPayload.append("file", imageFile)
    const response = await api.post("/upload-profile-pic", formPayload, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    return response.data.image_url
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setImagePreview(null)
    setImageFile(null)
    setErrors({})
  }

  const handleVerifyEmail = async () => {
    try {
      const verificationResponse = await api.post("/auth/request-email-verification", { email: user?.email })
      const suggestedToken = verificationResponse.data.verification_token || ""
      const token = window.prompt("Enter the email verification token", suggestedToken)
      if (!token) return
      await api.post("/auth/verify-email", { token })
      const refreshedProfile = await api.get("/profile")
      updateUser(refreshedProfile.data)
      showSuccess("Email verified successfully.")
    } catch (error) {
      showError(error.response?.data?.detail || "Could not verify email")
    }
  }

  const handleSave = async () => {
    const nextErrors = validateProfile(formData)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      showError("Please fix the highlighted profile fields.")
      return
    }

    try {
      setIsSaving(true)
      const imageUrl = await uploadImage()
      const response = await api.put("/profile", {
        ...formData,
        profile_pic: imageUrl,
      })
      updateUser(response.data)
      setImagePreview(null)
      setImageFile(null)
      setIsEditing(false)
      setErrors({})
      showSuccess("Profile updated successfully.")
    } catch (error) {
      showError(error.response?.data?.detail || "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="profile-page-shell">
        <div className="profile-summary-grid">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="skeleton-card">
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page-shell">
      <button type="button" className="back-btn" onClick={() => window.history.back()}>
        ← Back
      </button>
      <div className="profile-page-header">
        <div>
          <h1>{t.myProfile}</h1>
        </div>
        <div className="profile-page-status">
          <span className={`profile-badge ${user?.profile_completed ? "ready" : "pending"}`}>
            {user?.profile_completed ? t.dashboardReady : t.profilePending}
          </span>
          <span className="profile-badge neutral">{user?.role || "user"}</span>
        </div>
      </div>

      <div className="profile-summary-grid">
        <div className="profile-summary-card">
          <span>Name</span>
          <strong>{formData.name || "-"}</strong>
        </div>
        <div className="profile-summary-card">
          <span>Email</span>
          <strong>{user?.email || "-"}</strong>
        </div>
        <div className="profile-summary-card">
          <span>{t.currentRole}</span>
          <strong>{formData.current_role || "-"}</strong>
        </div>
        <div className="profile-summary-card">
          <span>{t.yearsOfExperience}</span>
          <strong>{formData.years_experience || 0} yrs</strong>
        </div>
      </div>

      <div className="profile-modern-card">
        <div className="profile-modern-grid">
          <aside className="profile-sidebar">
            <div className="profile-avatar-wrap">
              <img
                src={imagePreview || user?.profile_pic || "https://via.placeholder.com/150"}
                className="profile-modern-avatar"
              />
            </div>

            <div className="profile-sidebar-copy">
              <h3>{formData.name || user?.email?.split("@")[0] || "User"}</h3>
              <p>{user?.email}</p>
            </div>

            <div className="profile-page-status">
              <span className={`profile-badge ${user?.email_verified ? "ready" : "pending"}`}>
                {user?.email_verified ? "Email Verified" : "Email Pending"}
              </span>
            </div>

            {isEditing && (
              <label className="profile-upload-btn">
                {t.chooseImage}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    setImageFile(file)
                    setImagePreview(URL.createObjectURL(file))
                  }}
                />
              </label>
            )}
            {!user?.email_verified && (
              <button type="button" className="profile-secondary-btn" onClick={handleVerifyEmail}>
                Verify Email
              </button>
            )}
          </aside>

          <section className="profile-content-card">
            <div className="profile-section-header">
              <div>
                <h2>Profile Details</h2>
                <p>Update once and keep your dashboard in sync.</p>
              </div>
            </div>

            <div className="profile-fields-grid">
              <div className="profile-field">
                <label>{t.fullName}</label>
                <input className={`profile-input ${errors.name ? "input-invalid" : ""}`} name="name" value={formData.name} onChange={handleChange} disabled={!isEditing} />
                {errors.name && <p className="field-error">{errors.name}</p>}
              </div>
              <div className="profile-field">
                <label>{t.phone}</label>
                <input className={`profile-input ${errors.phone ? "input-invalid" : ""}`} name="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} />
                {errors.phone && <p className="field-error">{errors.phone}</p>}
              </div>
              <div className="profile-field">
                <label>{t.dateOfBirth}</label>
                <input className={`profile-input ${errors.dob ? "input-invalid" : ""}`} type="date" name="dob" value={formData.dob} onChange={handleChange} disabled={!isEditing} />
                {errors.dob && <p className="field-error">{errors.dob}</p>}
              </div>
              <div className="profile-field">
                <label>{t.birthTime}</label>
                <input className="profile-input" type="time" name="birth_time" value={formData.birth_time} onChange={handleChange} disabled={!isEditing} />
              </div>
              <div className="profile-field">
                <label>{t.birthPlace}</label>
                <input className={`profile-input ${errors.birth_place ? "input-invalid" : ""}`} name="birth_place" value={formData.birth_place} onChange={handleChange} disabled={!isEditing} />
                {errors.birth_place && <p className="field-error">{errors.birth_place}</p>}
              </div>
              <div className="profile-field">
                <label>{t.currentRole}</label>
                <input className={`profile-input ${errors.current_role ? "input-invalid" : ""}`} name="current_role" value={formData.current_role} onChange={handleChange} disabled={!isEditing} />
                {errors.current_role && <p className="field-error">{errors.current_role}</p>}
              </div>
              <div className="profile-field">
                <label>{t.education}</label>
                <input className={`profile-input ${errors.education ? "input-invalid" : ""}`} name="education" value={formData.education} onChange={handleChange} disabled={!isEditing} />
                {errors.education && <p className="field-error">{errors.education}</p>}
              </div>
              <div className="profile-field">
                <label>{t.yearsOfExperience}</label>
                <input
                  className={`profile-input ${errors.years_experience ? "input-invalid" : ""}`}
                  type="number"
                  min="0"
                  name="years_experience"
                  value={formData.years_experience}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                {errors.years_experience && <p className="field-error">{errors.years_experience}</p>}
              </div>
              <div className="profile-field profile-field-full">
                <label>{t.address}</label>
                <textarea className={`profile-textarea ${errors.address ? "input-invalid" : ""}`} name="address" value={formData.address} onChange={handleChange} disabled={!isEditing} rows="3" />
                {errors.address && <p className="field-error">{errors.address}</p>}
              </div>
              <div className="profile-field profile-field-full">
                <label>{t.interests}</label>
                <textarea className={`profile-textarea ${errors.interests ? "input-invalid" : ""}`} name="interests" value={formData.interests} onChange={handleChange} disabled={!isEditing} rows="3" />
                {errors.interests && <p className="field-error">{errors.interests}</p>}
              </div>
              <div className="profile-field profile-field-full">
                <label>{t.goals}</label>
                <textarea className={`profile-textarea ${errors.goals ? "input-invalid" : ""}`} name="goals" value={formData.goals} onChange={handleChange} disabled={!isEditing} rows="3" />
                {errors.goals && <p className="field-error">{errors.goals}</p>}
              </div>
            </div>

            <div className="profile-modern-actions">
              {!isEditing ? (
                <button className="profile-primary-btn" onClick={() => setIsEditing(true)}>
                  {t.edit}
                </button>
              ) : (
                <>
                  <button className="profile-secondary-btn" onClick={cancelEditing}>
                    {t.cancel}
                  </button>
                  <button className="profile-save-btn" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? t.saving : t.save}
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
