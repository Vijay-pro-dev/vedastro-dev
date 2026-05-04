import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiUser, FiUserPlus } from "react-icons/fi"
import { FaApple } from "react-icons/fa"
import "../tailwind.css"
import "../styles/pages/Signup.css"
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

  const renderAccentTitle = (text) => {
    if (!text) return null
    const words = String(text).trim().split(/\s+/).filter(Boolean)
    if (words.length < 2) return <span className="auth-title__main">{text}</span>
    const lastWord = words.pop()
    const prefix = words.join(" ")
    return (
      <>
        <span className="auth-title__main">{prefix}</span> <span className="auth-accent">{lastWord}</span>
      </>
    )
  }

  const handleSocialLogin = (provider) => {
    showInfo(`${provider} login is not configured yet in this project.`)
  }

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
              <div className="auth-header__icon" aria-hidden>
                <FiUserPlus />
              </div>
              <h1 className="auth-title">{renderAccentTitle(t.createAccount)}</h1>
              <p>{t.createAccountSub}</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSignup} className="auth-form">
            <div className="form-group">
              <label className="form-label">{t.nationality}</label>
              <select
                className="form-input auth-input__control"
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
              <label className="form-label sr-only">
                <FiUser className="form-icon" /> {t.fullName}
              </label>
              <div className="auth-input">
                <span className="auth-input__icon" aria-hidden>
                  <FiUser />
                </span>
                <input
                  type="text"
                  placeholder={t.fullName}
                  className={`form-input auth-input__control ${errors.name ? "input-invalid" : ""}`}
                  value={formState.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            <div className="form-group">
              <label className="form-label sr-only">
                <FiMail className="form-icon" /> {t.email}
              </label>
              <div className="auth-input">
                <span className="auth-input__icon" aria-hidden>
                  <FiMail />
                </span>
                <input
                  type="email"
                  placeholder={t.email}
                  className={`form-input auth-input__control ${errors.email ? "input-invalid" : ""}`}
                  value={formState.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label className="form-label sr-only">
                <FiLock className="form-icon" /> {t.password}
              </label>
              <div className="password-input-wrapper">
                <span className="auth-input__icon" aria-hidden>
                  <FiLock />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t.password}
                  className={`form-input auth-input__control ${errors.password ? "input-invalid" : ""}`}
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
              <label className="form-label sr-only">
                <FiLock className="form-icon" /> {t.confirmPassword}
              </label>
              <div className="password-input-wrapper">
                <span className="auth-input__icon" aria-hidden>
                  <FiLock />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t.confirmPassword}
                  className={`form-input auth-input__control ${errors.confirmPassword ? "input-invalid" : ""}`}
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
              {isLoading ? (
                t.creatingAccount
              ) : (
                <>
                  <span className="auth-button__content">{t.createAccount || "Create Account"}</span>
                  <FiArrowRight className="auth-button__arrow" aria-hidden />
                </>
              )}
            </button>
            </form>

            <div className="auth-divider" aria-hidden>
              <span>OR CONTINUE WITH</span>
            </div>
            <div className="auth-social">
              <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin("Google")}>
                <span className="auth-social-btn__icon" aria-hidden>
                  <svg viewBox="0 0 48 48" width="18" height="18">
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303C33.659 32.659 29.197 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.046 6.053 29.268 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306 14.691l6.571 4.819C14.655 15.109 18.961 12 24 12c3.059 0 5.842 1.154 7.962 3.038l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.165 35.091 26.715 36 24 36c-5.176 0-9.625-3.316-11.283-7.946l-6.522 5.024C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                </span>
                Google
              </button>
              <button type="button" className="auth-social-btn" onClick={() => handleSocialLogin("Apple")}>
                <span className="auth-social-btn__icon" aria-hidden>
                  <FaApple />
                </span>
                Apple
              </button>
            </div>

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
