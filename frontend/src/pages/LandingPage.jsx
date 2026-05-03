import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../tailwind.css"
import "../styles/pages/LandingPage.css"
import "../styles/pages/ProfileMenu.css"
import {
  FaBolt,
  FaChartLine,
  FaClock,
  FaChevronDown,
  FaCogs,
  FaComments,
  FaExchangeAlt,
  FaEye,
  FaEyeSlash,
  FaFacebookF,
  FaHeart,
  FaInstagram,
  FaLightbulb,
  FaLock,
  FaShieldAlt,
  FaSignOutAlt,
  FaShoppingBag,
  FaTimes,
  FaUser,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"
import { getTranslations } from "../lib/i18n"
import vedastroLogo from "../assets/vedastro-mark-96.jpg"
import useScrollReveal from "../hooks/useScrollReveal"

function LandingPage() {
  const navigate = useNavigate()
  const { user, logoutUser, loginUser, updateUser } = useUser()
  useScrollReveal({ selector: ".scroll-reveal:not(.landing-feature-card):not(.landing-proof-tile):not(.landing-trap-card):not(.landing-usecase-item)" })

  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || "https://instagram.com/"
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || "https://facebook.com/"

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
  const profileMenuRef = useRef(null)
  const hasInitSequentialFeatures = useRef(false)
  const hasInitSequentialProofTiles = useRef(false)
  const hasInitSequentialTrapCards = useRef(false)
  const hasInitSequentialUsecases = useRef(false)

  useEffect(() => {
    if (hasInitSequentialFeatures.current) return
    hasInitSequentialFeatures.current = true

    if (typeof window === "undefined") return
    if (typeof IntersectionObserver === "undefined") return
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    if (prefersReducedMotion) return

    const cards = Array.from(document.querySelectorAll(".landing-feature-card"))
    if (cards.length === 0) return

    cards.forEach((el) => el.classList.remove("is-visible"))

    let idx = 0
    let observer = null

    const observeNext = () => {
      if (observer) observer.disconnect()
      if (idx >= cards.length) return

      const el = cards[idx]
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
            idx += 1
            window.setTimeout(observeNext, 450)
          })
        },
        { threshold: 0.18, rootMargin: "0px 0px -18% 0px" },
      )
      observer.observe(el)
    }

    observeNext()

    return () => {
      if (observer) observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (hasInitSequentialProofTiles.current) return
    hasInitSequentialProofTiles.current = true

    if (typeof window === "undefined") return
    if (typeof IntersectionObserver === "undefined") return
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    if (prefersReducedMotion) return

    const tiles = Array.from(document.querySelectorAll(".landing-proof-tile"))
    if (tiles.length === 0) return

    tiles.forEach((el) => el.classList.remove("is-visible"))

    let idx = 0
    let observer = null

    const observeNext = () => {
      if (observer) observer.disconnect()
      if (idx >= tiles.length) return

      const el = tiles[idx]
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
            idx += 1
            window.setTimeout(observeNext, 520)
          })
        },
        { threshold: 0.22, rootMargin: "0px 0px -18% 0px" },
      )
      observer.observe(el)
    }

    observeNext()

    return () => {
      if (observer) observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (hasInitSequentialTrapCards.current) return
    hasInitSequentialTrapCards.current = true

    if (typeof window === "undefined") return
    if (typeof IntersectionObserver === "undefined") return
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    if (prefersReducedMotion) return

    const cards = Array.from(document.querySelectorAll(".landing-trap-card"))
    if (cards.length === 0) return

    cards.forEach((el) => el.classList.remove("is-visible"))

    let idx = 0
    let observer = null

    const observeNext = () => {
      if (observer) observer.disconnect()
      if (idx >= cards.length) return

      const el = cards[idx]
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
            idx += 1
            window.setTimeout(observeNext, 520)
          })
        },
        { threshold: 0.22, rootMargin: "0px 0px -18% 0px" },
      )
      observer.observe(el)
    }

    observeNext()

    return () => {
      if (observer) observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (hasInitSequentialUsecases.current) return
    hasInitSequentialUsecases.current = true

    if (typeof window === "undefined") return
    if (typeof IntersectionObserver === "undefined") return
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    if (prefersReducedMotion) return

    const cards = Array.from(document.querySelectorAll(".landing-usecase-item"))
    if (cards.length === 0) return

    cards.forEach((el) => el.classList.remove("is-visible"))

    let idx = 0
    let observer = null

    const observeNext = () => {
      if (observer) observer.disconnect()
      if (idx >= cards.length) return

      const el = cards[idx]
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add("is-visible")
            observer.unobserve(entry.target)
            idx += 1
            window.setTimeout(observeNext, 420)
          })
        },
        { threshold: 0.22, rootMargin: "0px 0px -18% 0px" },
      )
      observer.observe(el)
    }

    observeNext()

    return () => {
      if (observer) observer.disconnect()
    }
  }, [])
  const activeLanguage = user?.language || landingLanguage
  const pageT = getTranslations(activeLanguage)
  const signupT = pageT

  const languageOptions = [
    { value: "english", label: "English (UK)" },
    { value: "hindi", label: "à¤¹à¤¿à¤¨à¥à¤¦à¥€" },
    { value: "french", label: "FranÃ§ais" },
    { value: "german", label: "Deutsch" },
    { value: "arabic", label: "Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©" },
  ]

  const activeLanguageLabel =
    languageOptions.find((option) => option.value === activeLanguage)?.label || "English (UK)"
  const activeLanguageShort =
    {
      english: "EN",
      hindi: "HI",
      french: "FR",
      german: "DE",
      arabic: "AR",
    }[activeLanguage] || "EN"

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
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  // scroll reveal handled by `useScrollReveal`

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowLanguageDropdown(false)
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
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

  const role = (user?.role || "").toString().trim().toLowerCase()
  const storedAdmin = (() => {
    try {
      return JSON.parse(localStorage.getItem("admin_user") || "null")
    } catch {
      return null
    }
  })()
  const isAdmin = role === "admin" || (storedAdmin?.role || "").toString().trim().toLowerCase() === "admin"

  return (
    <div className="landing">
      <nav className="navbar bg-bg/70 backdrop-blur-xl border-b border-cardBorder/60">
        <div className="landing-brand" role="button" tabIndex={0} onClick={() => navigate("/")}>
          <span className="landing-brand-badge" aria-hidden="true">
            <img className="landing-brand-image" src={vedastroLogo} alt="" loading="eager" decoding="async" />
          </span>
          <span className="logo">Vedastro</span>
        </div>

        <div className="navbar-actions">
          {user && (
            <button
              type="button"
              className="landing-nav-cta "
              onClick={() => {
                setShowLanguageDropdown(false)
                setShowProfileDropdown(false)
                navigate(isAdmin ? "/admin-panel" : "/dashboard")
              }}
            >
              Dashboard
            </button>
          )}

          {user && (
            <button
              type="button"
              className="landing-nav-cta landing-nav-profile shadow-soft"
              onClick={() => {
                setShowLanguageDropdown(false)
                setShowProfileDropdown(false)
                navigate("/profile")
              }}
            >
              Profile
            </button>
          )}

          {!user && (
            <button
              type="button"
              className="landing-nav-login bg-card/50 border border-cardBorder/60 backdrop-blur-xl shadow-soft"
              onClick={() => {
                resetAuthForm()
                setShowLoginModal(true)
              }}
            >
              Login
            </button>
          )}
          <div className="landing-language-menu" ref={languageMenuRef}>
            <button type="button" className="landing-language-btn" onClick={() => setShowLanguageDropdown((value) => !value)}>
                <span className="landing-language-value landing-language-value--full">{activeLanguageLabel}</span>
                <span className="landing-language-value landing-language-value--short" aria-hidden="true">
                  {activeLanguageShort}
                </span>
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
            <div className="profile-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-btn bg-card/50 border border-cardBorder/60 backdrop-blur-xl shadow-soft"
                aria-haspopup="menu"
                aria-expanded={showProfileDropdown}
                aria-controls="profile-dropdown-menu"
                onClick={() => {
                  setShowLanguageDropdown(false)
                  setShowProfileDropdown((value) => !value)
                }}
              >
                <FaUser size={18} />
                <span className="profile-btn-label">{user.name || user.email?.split("@")[0]}</span>
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown bg-bg/80 backdrop-blur-xl border border-cardBorder/60 shadow-soft" id="profile-dropdown-menu" role="menu" aria-label="Profile menu">
                  <div className="dropdown-user">
                    <strong>{user.name || user.email?.split("@")[0]}</strong>
                    <span>{user.profile_completed ? pageT.dashboardReady : pageT.profilePending}</span>
                  </div>
                  <div className="dropdown-divider" aria-hidden="true" />
                  <button
                    type="button"
                    className="dropdown-action"
                    role="menuitem"
                    onClick={() => {
                      setShowProfileDropdown(false)
                      navigate("/suggestions")
                    }}
                  >
                    <FaLightbulb /> Suggestions
                  </button>
                  <div className="dropdown-divider" aria-hidden="true" />
                  <button
                    type="button"
                    className="dropdown-action dropdown-action-danger"
                    role="menuitem"
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
          ) : null}
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

      <section className={`hero ${user ? "hero-logged-in" : "hero-default"}`}>
        <div className="overlay" />
        <div className="hero-content scroll-reveal">
          {!user && (
            <>
              <h1>{pageT.heroTitle}</h1>
              <p>{pageT.heroSub}</p>
              <div className="buttons hero-cta-row">
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
            </>
          )}

          {user && (
            <div className="landing-welcome" aria-label="Welcome">
              <div className="landing-welcome-title">Welcome to Vedastro</div>
              <div className="landing-welcome-subtitle">
                {user.name ? `Good to see you, ${user.name}.` : "Good to see you again."}
              </div>
            </div>
          )}

        </div>
      </section>

      <section className="features">
        <h2>{pageT.builtFor}</h2>
          <div className="feature-grid scroll-reveal">
            <div className="feature landing-feature-card scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft">
              <FaChartLine size={30} color="#d6b34a" />
              <h3>{pageT.dynamicScore}</h3>
              <p>{pageT.dynamicScoreSub}</p>
            </div>
            <div className="feature landing-feature-card scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft">
              <FaClock size={30} color="#d6b34a" />
              <h3>{pageT.savedWindow}</h3>
              <p>{pageT.savedWindowSub}</p>
            </div>
            <div className="feature landing-feature-card scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft">
              <FaLightbulb size={30} color="#d6b34a" />
              <h3>{pageT.aiRecommendations}</h3>
              <p>{pageT.aiRecommendationsSub}</p>
            </div>
          </div>
        </section>

      <section className="landing-section landing-section-emphasis" aria-labelledby="landing-proof-heading">
        <div className="landing-section-inner">
          <h2 id="landing-proof-heading" className="scroll-reveal">Not Advice. Not Generic Motivation.</h2>
          <p className="landing-section-subtitle scroll-reveal">
            Built using behavioral signals, pattern recognition, and timing intelligence models. Helps users pause bad decisions and act at better
            moments.
          </p>

          <div className="landing-tile-grid scroll-reveal" role="list">
            <div className="landing-tile landing-proof-tile scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-tile-icon" aria-hidden="true">
                <FaShieldAlt />
              </span>
              <span className="landing-tile-label">Data Encrypted</span>
            </div>
            <div className="landing-tile landing-proof-tile scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-tile-icon" aria-hidden="true">
                <FaCogs />
              </span>
              <span className="landing-tile-label">Pattern Engine</span>
            </div>
            <div className="landing-tile landing-proof-tile scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-tile-icon" aria-hidden="true">
                <FaBolt />
              </span>
              <span className="landing-tile-label">Real-time Analysis</span>
            </div>
            <div className="landing-tile landing-proof-tile scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-tile-icon" aria-hidden="true">
                <FaLock />
              </span>
              <span className="landing-tile-label">Private &amp; Secure</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="landing-traps-heading">
        <div className="landing-section-inner">
          <h2 id="landing-traps-heading" className="scroll-reveal">Why Smart People Still Make Bad Decisions</h2>
          <p className="landing-section-subtitle scroll-reveal">Intelligence alone doesn&apos;t protect you from these three traps.</p>

          <div className="landing-card-grid scroll-reveal" role="list">
            <article className="landing-card landing-trap-card scroll-reveal shadow-card" role="listitem">
              <span className="landing-card-icon" aria-hidden="true">
                <FaEyeSlash />
              </span>
              <h3>Clarity</h3>
              <p>You can&apos;t see clearly. Fog in your judgment distorts what feels like a good choice.</p>
            </article>
            <article className="landing-card landing-trap-card scroll-reveal shadow-card" role="listitem">
              <span className="landing-card-icon" aria-hidden="true">
                <FaBolt />
              </span>
              <h3>Behavior</h3>
              <p>You react emotionally or impulsively. Speed without awareness compounds errors.</p>
            </article>
            <article className="landing-card landing-trap-card scroll-reveal shadow-card" role="listitem">
              <span className="landing-card-icon" aria-hidden="true">
                <FaClock />
              </span>
              <h3>Timing</h3>
              <p>Even good moves fail when timing is wrong. The right action at the wrong moment costs you.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="landing-usecases-heading">
        <div className="landing-section-inner">
          <h2 id="landing-usecases-heading" className="scroll-reveal">Use Vedastro Before Decisions Like:</h2>
          <p className="landing-section-subtitle scroll-reveal">When stakes are high, guessing is expensive.</p>

          <div className="landing-usecase-grid scroll-reveal" role="list">
            <div className="landing-usecase landing-usecase-item scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-usecase-icon" aria-hidden="true">
                <FaChartLine />
              </span>
              <span className="landing-usecase-label">Investing money</span>
            </div>
            <div className="landing-usecase landing-usecase-item scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-usecase-icon" aria-hidden="true">
                <FaExchangeAlt />
              </span>
              <span className="landing-usecase-label">Switching jobs</span>
            </div>
            <div className="landing-usecase landing-usecase-item scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-usecase-icon" aria-hidden="true">
                <FaHeart />
              </span>
              <span className="landing-usecase-label">Starting a relationship</span>
            </div>
            <div className="landing-usecase landing-usecase-item scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-usecase-icon" aria-hidden="true">
                <FaUsers />
              </span>
              <span className="landing-usecase-label">Business partnership</span>
            </div>
            <div className="landing-usecase landing-usecase-item scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-usecase-icon" aria-hidden="true">
                <FaUserPlus />
              </span>
              <span className="landing-usecase-label">Hiring someone</span>
            </div>
            <div className="landing-usecase landing-usecase-item scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-usecase-icon" aria-hidden="true">
                <FaShoppingBag />
              </span>
              <span className="landing-usecase-label">Major purchases</span>
            </div>
            <div className="landing-usecase landing-usecase-wide landing-usecase-item scroll-reveal bg-card/40 border border-cardBorder/60 backdrop-blur-xl shadow-soft" role="listitem">
              <span className="landing-usecase-icon" aria-hidden="true">
                <FaComments />
              </span>
              <span className="landing-usecase-label">Difficult conversations</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-top">
            <div className="landing-footer-brand">
              <div>
                <div className="landing-footer-name">Vedastro</div>
                <div className="landing-footer-tag">Career &amp; Decision Guidance</div>
              </div>
            </div>

            <div className="landing-footer-social" aria-label="Social links">
              <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook">
                <FaFacebookF />
              </a>
            </div>
          </div>

          <div className="landing-footer-grid">
            <div className="landing-footer-col">
              <div className="landing-footer-title">Get Started</div>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => navigate("/form")}
              >
                Start Free Analysis
              </button>
              {!user && (
                <button type="button" className="landing-footer-link" onClick={() => navigate("/login")}>
                  Login
                </button>
              )}
              <button type="button" className="landing-footer-link" onClick={() => navigate("/promo")}>
                Promotion Page
              </button>
            </div>

            <div className="landing-footer-col">
              <div className="landing-footer-title">Product</div>
              {!user && (
                <button type="button" className="landing-footer-link" onClick={() => navigate("/profile")}>
                  Profile
                </button>
              )}
              <button type="button" className="landing-footer-link" onClick={() => navigate("/suggestions")}>
                Suggestions
              </button>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Back to top
              </button>
            </div>

            <div className="landing-footer-col">
              <div className="landing-footer-title">Legal</div>
              <button type="button" className="landing-footer-link disabled" disabled>
                Privacy Policy
              </button>
              <button type="button" className="landing-footer-link disabled" disabled>
                Terms of Service
              </button>
              <button type="button" className="landing-footer-link" onClick={() => navigate("/contact")}>
                Contact Us
              </button>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} Vedastro</span>
            <span className="landing-footer-dot" aria-hidden="true">•</span>
            <span>Built for clarity, action, timing</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
