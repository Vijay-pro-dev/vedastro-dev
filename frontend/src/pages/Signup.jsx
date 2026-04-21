import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FiArrowLeft, FiEye, FiEyeOff, FiLock, FiMail, FiUser, FiUserPlus } from "react-icons/fi"
import "../tailwind.css"
import { useToast } from "../components/shared/ToastProvider"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"
import { getTranslations } from "../lib/i18n"

function Signup() {
  const navigate = useNavigate()
  const { loginUser } = useUser()
  const { showError, showInfo, showSuccess } = useToast()

  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    nationality: "global",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [errors, setErrors] = useState({})
  const [passwordStrength, setPasswordStrength] = useState(0)
  const languageByNationality = {
    india: "hindi",
    france: "french",
    germany: "german",
    arab: "arabic",
    global: "english",
  }
  const t = getTranslations(languageByNationality[formState.nationality] || "english")

  const calculatePasswordStrength = (password) => {
    let strength = 0
    if (!password) return 0
    if (password.length >= 8) strength += 25
    if (password.length >= 12) strength += 15
    if (/[a-z]/.test(password)) strength += 15
    if (/[A-Z]/.test(password)) strength += 15
    if (/[0-9]/.test(password)) strength += 15
    if (/[^A-Za-z0-9]/.test(password)) strength += 15
    return Math.min(strength, 100)
  }

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long."
    if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter."
    if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter."
    if (!/[0-9]/.test(password)) return "Password must include at least one number."
    return ""
  }

  const handleChange = (key, value) => {
    setFormState((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: "" }))
    if (key === "password") {
      setPasswordStrength(calculatePasswordStrength(value))
    }
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formState.name.trim()) nextErrors.name = "Full name is required."
    if (!isValidEmail(formState.email)) nextErrors.email = "Please enter a valid email address."
    const passwordMessage = validatePassword(formState.password)
    if (passwordMessage) nextErrors.password = passwordMessage
    if (formState.password !== formState.confirmPassword) nextErrors.confirmPassword = "Passwords do not match."

    setErrors(nextErrors)
    return nextErrors
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    const nextErrors = validateForm()

    if (Object.keys(nextErrors).length > 0) {
      const message = Object.values(nextErrors)[0]
      setError(message)
      showError(message)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await api.post("/signup", {
        email: formState.email.trim(),
        password: formState.password,
        name: formState.name || "User",
        nationality: formState.nationality,
      })

      const me = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${response.data.access_token}`,
        },
      })

      loginUser({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        user: me.data,
      })

      // If a guest filled /form earlier, save it to the new profile now
      try {
        const draftRaw = localStorage.getItem("guest_profile_draft")
        if (draftRaw) {
          const draft = JSON.parse(draftRaw) || {}
          const merged =
            draft.formData || draft.careerData ? { ...(draft.formData || {}), ...(draft.careerData || {}) } : draft
          await api.put("/profile", merged)
        }
      } catch (syncErr) {
        console.warn("Guest draft sync skipped during signup:", syncErr)
      }
      if (response.data.verification_token) {
        showInfo(`Email verification token: ${response.data.verification_token}`)
      }
      showSuccess("Account created successfully.")
      // Reset any guest draft/questionnaire data so signed-up users start clean
      localStorage.removeItem("guest_questionnaire_answers")
      localStorage.removeItem("guest_questionnaire_questions")
      localStorage.removeItem("guest_profile_draft")
      localStorage.removeItem("questionnaire_completed")
      navigate("/dashboard", { replace: true })
    } catch (err) {
      const apiDetail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg
      const message = apiDetail || "Signup failed. Please try again."
      setError(message)
      showError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const strengthColor =
    passwordStrength < 25 ? "#f87171" :
    passwordStrength < 50 ? "#fb923c" :
    passwordStrength < 75 ? "#fbbf24" : "#34d399"

  const strengthLabel =
    passwordStrength < 25 ? "Weak" :
    passwordStrength < 50 ? "Fair" :
    passwordStrength < 75 ? "Good" : "Strong"

  return (
    <div className="landing">
      <div className="auth-page signup-page auth-page--landing">
        <div className="auth-container auth-container-single">
          <div className="auth-card">
            <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
              <FiArrowLeft />
            </button>
            <div className="auth-header">
              <h1>{t.createAccount}</h1>
              <p>{t.createAccountSub}</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label className="form-label">{t.nationality}</label>
              <select
                className="form-input"
                value={formState.nationality}
                onChange={(event) => handleChange("nationality", event.target.value)}
                disabled={isLoading}
              >
                <option value="india">{t.india}</option>
                <option value="france">{t.france}</option>
                <option value="germany">{t.germany}</option>
                <option value="arab">{t.arab}</option>
                <option value="global">{t.global}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiUser className="form-icon" /> {t.fullName}
              </label>
              <input
                type="text"
                className={`form-input ${errors.name ? "input-invalid" : ""}`}
                value={formState.name}
                onChange={(event) => handleChange("name", event.target.value)}
                disabled={isLoading}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiMail className="form-icon" /> {t.email}
              </label>
              <input
                type="email"
                className={`form-input ${errors.email ? "input-invalid" : ""}`}
                value={formState.email}
                onChange={(event) => handleChange("email", event.target.value)}
                disabled={isLoading}
                required
              />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiLock className="form-icon" /> {t.password}
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-input ${errors.password ? "input-invalid" : ""}`}
                  value={formState.password}
                  onChange={(event) => handleChange("password", event.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <p className="field-error">{errors.password}</p>}
              {formState.password && (
                <>
                  <div className="strength-bar">
                    <div
                      className="strength-fill"
                      style={{ width: `${passwordStrength}%`, backgroundColor: strengthColor }}
                    />
                  </div>
                  <span className="strength-label" style={{ color: strengthColor }}>
                    {strengthLabel}
                  </span>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiLock className="form-icon" /> {t.confirmPassword}
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`form-input ${errors.confirmPassword ? "input-invalid" : ""}`}
                  value={formState.confirmPassword}
                  onChange={(event) => handleChange("confirmPassword", event.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.confirmPassword && <p className="field-error">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? t.creatingAccount : <><FiUserPlus /> {t.signUp}</>}
            </button>
            </form>

            <div className="auth-footer">
              <p>
                {t.alreadyHaveAccount} <Link to="/login">{t.loginHere}</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup
