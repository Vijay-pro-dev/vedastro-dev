import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiStar, FiX } from "react-icons/fi"
import { FaApple } from "react-icons/fa"
import "../tailwind.css"
import "../styles/pages/Login.css"
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

  const handleSocialLogin = (provider) => {
    showInfo(`${provider} login is not configured yet in this project.`)
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
            <div className="auth-header__icon" aria-hidden>
              <FiStar />
            </div>
            <h1 className="auth-title">{renderAccentTitle(t.welcomeBack)}</h1>
            <p>{t.loginSub}</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin} className="auth-form">
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
                  className={`form-input auth-input__control ${error && !isValidEmail(email) ? "input-invalid" : ""}`}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
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
                  className={`form-input auth-input__control ${error && !password ? "input-invalid" : ""}`}
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

            <div className="auth-row">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>{t.rememberMe}</span>
              </label>
              <button type="button" className="auth-link-inline" onClick={handleForgotPassword} disabled={resetting}>
                {resetting ? "Preparing reset..." : "Forgot password?"}
              </button>
            </div>

            <button className="auth-button" disabled={isLoading}>
              {isLoading ? (
                t.loggingIn
              ) : (
                <>
                  <span className="auth-button__content">
                    {t.signIn || t.login || "Sign In"}
                  </span>
                  <FiArrowRight className="auth-button__arrow" aria-hidden />
                </>
              )}
            </button>
          </form>

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
