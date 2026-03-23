import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaChartLine, FaClock, FaLightbulb, FaSignOutAlt, FaUser } from "react-icons/fa"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"
import { getTranslations } from "../lib/i18n"

function LandingPage() {
  const navigate = useNavigate()
  const { user, logoutUser, loginUser, t } = useUser()

  const [showSignupModal, setShowSignupModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showLoginResetFields, setShowLoginResetFields] = useState(false)
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    nationality: "india",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [resetPassword, setResetPassword] = useState("")
  const languageByNationality = {
    india: "hindi",
    france: "french",
    germany: "german",
    arab: "arabic",
    global: "english",
  }
  const signupT = getTranslations(languageByNationality[formState.nationality] || "english")

  const resetAuthForm = () => {
    setFormState({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      nationality: "india",
    })
    setError("")
    setShowLoginResetFields(false)
    setResetToken("")
    setResetPassword("")
  }

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

        {user ? (
          <div className="profile-menu">
            <button className="profile-btn" onClick={() => setShowProfileDropdown((value) => !value)}>
              <FaUser size={18} /> {user.name || user.email?.split("@")[0]}
            </button>

            {showProfileDropdown && (
              <div className="profile-dropdown">
                <div className="dropdown-item">
                  <strong>{user.name || user.email?.split("@")[0]}</strong>
                  <span>{user.profile_completed ? t.dashboardReady : t.profilePending}</span>
                </div>
                <button className="dropdown-action" onClick={() => navigate("/profile")}>
                  {t.profile}
                </button>
                <button
                  className="dropdown-action"
                  onClick={() => navigate(isAdmin ? "/admin-panel" : "/dashboard")}
                >
                  {isAdmin ? "Admin Panel" : t.dashboard}
                </button>
                <button
                  className="dropdown-action dropdown-action-danger"
                  onClick={() => {
                    logoutUser()
                    setShowProfileDropdown(false)
                    navigate("/")
                  }}
                >
                  <FaSignOutAlt /> {t.signOut}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="login-btn" onClick={() => setShowLoginModal(true)}>
            Login
          </button>
        )}
      </nav>

      {showSignupModal && !user && (
        <div className="modal-overlay" onClick={() => {
          setShowSignupModal(false)
          resetAuthForm()
        }}>
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
                <label className="modal-label">{signupT.nationality}</label>
                <select
                  className="modal-select"
                  value={formState.nationality}
                  onChange={(event) => setFormState((current) => ({ ...current, nationality: event.target.value }))}
                >
                  <option value="india">{signupT.india}</option>
                  <option value="france">{signupT.france}</option>
                  <option value="germany">{signupT.germany}</option>
                  <option value="arab">{signupT.arab}</option>
                  <option value="global">{signupT.global}</option>
                </select>
              </div>
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
        <div className="modal-overlay" onClick={() => {
          setShowLoginModal(false)
          resetAuthForm()
        }}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>Login</h2>
            <p>Your saved dashboard will open after login.</p>
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
              <div className="modal-input-group">
                <input
                  type="password"
                  placeholder="Password"
                  value={formState.password}
                  onChange={(event) => setFormState((current) => ({ ...current, password: event.target.value }))}
                  required
                />
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
          <h1>{t.heroTitle}</h1>
          <p>{t.heroSub}</p>

          {!user && (
            <div className="buttons">
              <button className="btn primary" onClick={() => setShowSignupModal(true)}>
                {t.startFreeAnalysis}
              </button>
              <button className="btn secondary" onClick={() => setShowLoginModal(true)}>
                {t.login}
              </button>
            </div>
          )}

          {user && (
            <div className="buttons">
              <button
                className="btn primary"
                onClick={() =>
                  navigate(
                    primaryAction === "admin-panel"
                      ? "/admin-panel"
                      : primaryAction === "dashboard"
                        ? "/dashboard"
                        : "/form",
                  )
                }
              >
                {primaryAction === "admin-panel"
                  ? "Admin Panel"
                  : primaryAction === "dashboard"
                    ? t.dashboard
                    : t.completeProfile}
              </button>
              <button className="btn secondary" onClick={() => navigate("/profile")}>
                {t.profile}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="features">
        <h2>{t.builtFor}</h2>
        <div className="feature-grid">
          <div className="feature">
            <FaChartLine size={30} color="#4a6cf7" />
            <h3>{t.dynamicScore}</h3>
            <p>{t.dynamicScoreSub}</p>
          </div>
          <div className="feature">
            <FaClock size={30} color="#4a6cf7" />
            <h3>{t.savedWindow}</h3>
            <p>{t.savedWindowSub}</p>
          </div>
          <div className="feature">
            <FaLightbulb size={30} color="#4a6cf7" />
            <h3>{t.aiRecommendations}</h3>
            <p>{t.aiRecommendationsSub}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
