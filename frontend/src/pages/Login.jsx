import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { FiArrowLeft, FiEye, FiEyeOff, FiLock, FiLogIn, FiMail, FiX } from "react-icons/fi"
import "../tailwind.css"
import "../styles/pages/Auth.css"
import { useToast } from "../components/shared/ToastProvider"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"

function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginUser, t } = useUser()
  const { showError, showInfo, showSuccess } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetFields, setShowResetFields] = useState(false)
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  const handleLogin = async (event) => {
    event.preventDefault()

    if (!email || !password) {
      const message = "Please fill in all fields"
      setError(message)
      showError(message)
      return
    }
    if (!isValidEmail(email)) {
      const message = "Please enter a valid email address."
      setError(message)
      showError(message)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await api.post("/login", { email, password })
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

      // If the user filled /form as a guest, sync that draft to their profile now
      try {
        const draftRaw = localStorage.getItem("guest_profile_draft")
        if (draftRaw) {
          const draft = JSON.parse(draftRaw) || {}
          const merged =
            draft.formData || draft.careerData ? { ...(draft.formData || {}), ...(draft.careerData || {}) } : draft
          await api.put("/profile", merged)
          localStorage.removeItem("guest_profile_draft")
        }
      } catch (syncErr) {
        console.warn("Guest draft sync skipped:", syncErr)
      }
      // Clear any questionnaire completion flag when logging in fresh
      localStorage.removeItem("questionnaire_completed")

      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email)
      } else {
        localStorage.removeItem("rememberedEmail")
      }

      showSuccess("Login successful.")
      navigate("/", { replace: true })
    } catch (err) {
      const apiDetail =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg
      const message = apiDetail || "Login failed. Please check your email and password."
      setError(message)
      showError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!isValidEmail(email)) {
      const message = "Enter a valid email first to request a password reset."
      setError(message)
      showError(message)
      return
    }

    try {
      setResetting(true)
      const response = await api.post("/auth/request-password-reset", { email })
      setShowResetFields(true)
      if (response.data.reset_token) {
        setResetToken(response.data.reset_token)
      }
      showInfo("Password reset link sent to your email.")
    } catch (err) {
      showError(err.response?.data?.detail || "Could not start password reset")
    } finally {
      setResetting(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!resetToken || !newPassword) {
      showError("Enter the reset token and your new password.")
      return
    }

    try {
      setResetting(true)
      await api.post("/auth/reset-password", {
        token: resetToken,
        new_password: newPassword,
      })
      setResetToken("")
      setNewPassword("")
      setShowResetFields(false)
      showSuccess("Password reset successfully. You can log in now.")
    } catch (err) {
      showError(err.response?.data?.detail || "Could not reset password")
    } finally {
      setResetting(false)
    }
  }

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail")
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
    const resetTokenFromUrl = searchParams.get("reset_token")
    const emailFromUrl = searchParams.get("email")
    if (resetTokenFromUrl) {
      setResetToken(resetTokenFromUrl)
      setEmail(emailFromUrl || "")
      setShowResetFields(true)
    }
    const verifyTokenFromUrl = searchParams.get("verify_token")
    if (verifyTokenFromUrl) {
      showInfo("Email verification token received from your link. You can use it from the profile page if needed.")
    }
  }, [searchParams, showInfo])

  return (
    <div className="landing">
      <div className="auth-page login-page auth-page--landing">
        <div className="auth-container auth-container-single">
          <div className="auth-card">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <FiArrowLeft />
          </button>
          <button
            type="button"
            className="auth-close"
            aria-label="Close"
            onClick={() => navigate(-1)}
          >
            <FiX aria-hidden />
          </button>
          <div className="auth-header">
            <h1>{t.welcomeBack}</h1>
            <p>{t.loginSub}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label className="form-label">
                <FiMail className="form-icon" /> {t.email}
              </label>
              <input
                type="email"
                className={`form-input ${error && !isValidEmail(email) ? "input-invalid" : ""}`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <FiLock className="form-icon" /> {t.password}
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-input ${error && !password ? "input-invalid" : ""}`}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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
            </div>

            <div className="form-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <label>{t.rememberMe}</label>
            </div>

            <button className="auth-button" disabled={isLoading}>
              {isLoading ? t.loggingIn : <><FiLogIn /> {t.login}</>}
            </button>
          </form>

          <button type="button" className="auth-link-btn" onClick={handleForgotPassword} disabled={resetting}>
            {resetting ? "Preparing reset..." : "Forgot password?"}
          </button>

              {showResetFields && (
                <div className="auth-reset-panel">
                  <p className="auth-reset-note">
                    Check your email for the reset link. Set a new password below to continue.
                  </p>
                  <input
                    type="password"
                    className="modal-reset-input"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
              <button type="button" className="auth-button" onClick={handlePasswordReset} disabled={resetting}>
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          )}

          <div className="auth-footer">
            <p>
              {t.noAccount} <Link to="/signup">{t.signup}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}

export default Login
