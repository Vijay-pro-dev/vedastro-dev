import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaChartLine,
  FaClock,
  FaChevronDown,
  FaEye,
  FaEyeSlash,
  FaLightbulb,
  FaSignOutAlt,
  FaTimes,
  FaUser,
} from "react-icons/fa"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"
import { getTranslations } from "../lib/i18n"

function LandingPage() {
  const navigate = useNavigate()
  const { user, logoutUser, loginUser, updateUser } = useUser()

  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showLoginResetFields, setShowLoginResetFields] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [landingLanguage, setLandingLanguage] = useState(() => localStorage.getItem("landing_language") || "english")
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [resetPassword, setResetPassword] = useState("")
  const languageMenuRef = useRef(null)
  const activeLanguage = user?.language || landingLanguage
  const pageT = getTranslations(activeLanguage)
  const signupT = pageT
  const hasQuestionnaireAnswers = () => {
    try {
      const stored = JSON.parse(localStorage.getItem("guest_questionnaire_answers") || "{}")
      return stored && Object.keys(stored).length > 0
    } catch {
      return false
    }
  }

  const languageOptions = [
    { value: "english", label: "English (UK)" },
    { value: "hindi", label: "à¤¹à¤¿à¤¨à¥à¤¦à¥€" },
    { value: "french", label: "FranÃ§ais" },
    { value: "german", label: "Deutsch" },
    { value: "arabic", label: "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" },
  ]

  const activeLanguageLabel =
    languageOptions.find((option) => option.value === activeLanguage)?.label || "English (UK)"

  const resetAuthForm = () => {
    setFormState({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
    setError("")
    setShowLoginResetFields(false)
    setResetToken("")
    setResetPassword("")
  }

  const handleLanguageChange = (language) => {
    setLandingLanguage(language)
    localStorage.setItem("landing_language", language)
    if (user) {
      updateUser({ ...user, language })
      api.put("/profile", { language }).catch((error) => {
        console.warn("Could not save language preference", error)
      })
    }
    setShowLanguageDropdown(false)
  }

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setShowLanguageDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "Password must be at least 8 characters long."
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must include at least one uppercase letter."
    }
    if (!/[a-z]/.test(password)) {
      return "Password must include at least one lowercase letter."
    }
    if (!/[0-9]/.test(password)) {
      return "Password must include at least one number."
    }
    return ""
  }

  const handleAuth = async (mode) => {
    const trimmedEmail = formState.email.trim()
    const passwordError = validatePassword(formState.password)

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.")
      return
    }

    if (mode === "signup") {
      if (passwordError) {
        setError(passwordError)
        return
      }
      if (formState.password !== formState.confirmPassword) {
        setError("Password and confirm password must match.")
        return
      }
    }

    setLoading(true)
    setError("")

    try {
      const response = await api.post(mode === "signup" ? "/signup" : "/login", {
        name: formState.name || "User",
        email: trimmedEmail,
        password: formState.password,
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

      setShowSignupModal(false)
      setShowLoginModal(false)
      resetAuthForm()
      navigate("/")
    } catch (err) {
      setError(err.response?.data?.detail || `${mode} failed`)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    const trimmedEmail = formState.email.trim()
    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email address.")
      return
    }

    try {
      setLoading(true)
      setError("")
      const response = await api.post("/auth/request-password-reset", { email: trimmedEmail })
      setResetToken(response.data.reset_token || "")
      setShowLoginResetFields(true)
      setError("Password reset link sent to your email.")
    } catch (err) {
      setError(err.response?.data?.detail || "Could not start password reset")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetToken || !resetPassword) {
      setError("Please provide reset token and new password.")
      return
    }

    try {
      setLoading(true)
      setError("")
      await api.post("/auth/reset-password", {
        token: resetToken,
        new_password: resetPassword,
      })
      setShowLoginResetFields(false)
      setResetToken("")
      setResetPassword("")
      setError("Password reset successful. You can log in now.")
    } catch (err) {
      setError(err.response?.data?.detail || "Could not reset password")
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = user?.role === "admin"
  const primaryAction = isAdmin ? "admin-panel" : user?.profile_completed ? "dashboard" : "complete"

  return (
    <div className="landing">
      <nav className="navbar">
        <h2 className="logo">Vedastro</h2>

        <div className="navbar-actions">
          <div className="landing-language-menu" ref={languageMenuRef}>
            <button type="button" className="landing-language-btn" onClick={() => setShowLanguageDropdown((value) => !value)}>
                <span className="landing-language-value">{activeLanguageLabel}</span>
                <FaChevronDown size={14} />
              </button>

            {showLanguageDropdown && (
              <div className="landing-language-dropdown">
                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`landing-language-option ${activeLanguage === option.value ? "active" : ""}`}
                    onClick={() => handleLanguageChange(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <div className="profile-menu">
              <button
                type="button"
                className="profile-btn"
                onClick={() => {
                  setShowLanguageDropdown(false)
                  setShowProfileDropdown((value) => !value)
                }}
              >
                <FaUser size={18} /> {user.name || user.email?.split("@")[0]}
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown">
                  <div className="dropdown-item">
                    <strong>{user.name || user.email?.split("@")[0]}</strong>
                    <span>{user.profile_completed ? pageT.dashboardReady : pageT.profilePending}</span>
                  </div>
                  <button type="button" className="dropdown-action" onClick={() => navigate("/profile")}>
                    {pageT.profile}
                  </button>
                  <button
                    type="button"
                    className="dropdown-action"
                    onClick={() => {
                      navigate(isAdmin ? "/admin-panel" : "/dashboard")
                    }}
                  >
                    {isAdmin ? "Admin Panel" : pageT.dashboard}
                  </button>
                  <button
                    type="button"
                    className="dropdown-action dropdown-action-danger"
                    onClick={() => {
                      logoutUser()
                      setShowProfileDropdown(false)
                      navigate("/")
                    }}
                  >
                    <FaSignOutAlt /> {pageT.signOut}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="login-btn"
              onClick={() => {
                setShowLanguageDropdown(false)
                setShowLoginModal(true)
              }}
            >
              Login
            </button>
          )}
        </div>
      </nav>

      {showSignupModal && !user && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>{signupT.createAccount}</h2>
            <p>{signupT.createAccountSub}</p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleAuth("signup")
              }}
            >
              <div className="modal-input-group">
                <input
                  type="text"
                  placeholder={signupT.fullName}
                  value={formState.name}
                  onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="modal-input-group">
                <input
                  type="email"
                  placeholder={signupT.email}
                  value={formState.email}
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
              <div className="modal-input-group">
                <input
                  type="password"
                  placeholder={signupT.password}
                  value={formState.password}
                  onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                  required
                />
              </div>
              <div className="modal-input-group">
                <input
                  type="password"
                  placeholder={signupT.confirmPassword}
                  value={formState.confirmPassword}
                  onChange={(event) => setFormState((current) => ({ ...current, confirmPassword: event.target.value }))}
                  required
                />
              </div>
              <p className="modal-helper-text">
                Password must be 8+ characters with uppercase, lowercase, and a number.
              </p>
              {error && <p className="error-msg">{error}</p>}
              <button type="submit" className="modal-btn" disabled={loading}>
                {loading ? signupT.creatingAccount : signupT.signUp}
              </button>
            </form>
          </div>
        </div>
      )}

      {showLoginModal && !user && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="auth-close"
              aria-label="Close"
              onClick={() => {
                setShowLoginModal(false)
                resetAuthForm()
              }}
            >
              <FaTimes aria-hidden />
            </button>
            <h2>{pageT.login}</h2>
            <p>{pageT.loginSub}</p>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                handleAuth("login")
              }}
            >
              <div className="modal-input-group">
                <input
                  type="email"
                  placeholder="Email"
                  value={formState.email}
                  onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                  required
                />
              </div>
              <div className="modal-input-group password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formState.password}
                  onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                  required
                />
                <button
                  type="button"
                  className="modal-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {error && <p className="error-msg">{error}</p>}
              <button type="button" className="modal-link-btn" onClick={handleForgotPassword} disabled={loading}>
                Forgot password?
              </button>
              {showLoginResetFields && (
                <div className="modal-reset-stack">
                  <p className="modal-helper-text">
                    Check your email for the reset link. Enter a new password below to complete the reset.
                  </p>
                  <input
                    type="password"
                    className="modal-reset-input"
                    placeholder="New password"
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                  />
                  <button type="button" className="modal-btn secondary" onClick={handleResetPassword} disabled={loading}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              )}
              <button type="submit" className="modal-btn" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      )}

      <section className="hero">
        <div className="overlay" />
        <div className="hero-content">
          <h1>{pageT.heroTitle}</h1>
          <p>{pageT.heroSub}</p>

          {!user && (
            <div className="buttons">
              <button
                className="btn primary"
                onClick={() => {
                  setShowLanguageDropdown(false)
                  navigate("/form")
                }}
              >
                {pageT.startFreeAnalysis}
              </button>
            </div>
          )}

          {user && (
            <div className="buttons">
              <button
                className="btn primary"
                onClick={() => {
                  setShowLanguageDropdown(false)
                  navigate(isAdmin ? "/admin-panel" : "/dashboard")
                }}
              >
                {isAdmin ? "Admin Panel" : pageT.dashboard}
              </button>
              <button className="btn secondary" onClick={() => navigate("/profile")}>
                {pageT.profile}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="features">
        <h2>{pageT.builtFor}</h2>
        <div className="feature-grid">
          <div className="feature">
            <FaChartLine size={30} color="#4a6cf7" />
            <h3>{pageT.dynamicScore}</h3>
            <p>{pageT.dynamicScoreSub}</p>
          </div>
          <div className="feature">
            <FaClock size={30} color="#4a6cf7" />
            <h3>{pageT.savedWindow}</h3>
            <p>{pageT.savedWindowSub}</p>
          </div>
          <div className="feature">
            <FaLightbulb size={30} color="#4a6cf7" />
            <h3>{pageT.aiRecommendations}</h3>
            <p>{pageT.aiRecommendationsSub}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage

