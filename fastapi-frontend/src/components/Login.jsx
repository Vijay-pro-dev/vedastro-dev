import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"
import { useUser } from "../context/UserContext"
import { FiMail, FiLock, FiEye, FiEyeOff, FiLogIn } from "react-icons/fi"

function Login() {
  const navigate = useNavigate()

  // ✅ ONLY loginUser (setLoading hata diya)
  const { loginUser } = useUser()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()

    // ✅ Validation
    if (!email || !password) {
      setError("Please fill in all fields")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await axios.post("http://127.0.0.1:8000/login", {
        email,
        password,
      })

      console.log("Login Response:", response.data)

      // ✅ Safe user store
      loginUser({
        user_id: response.data.user_id || null,
        email: response.data.email || email,
        name: response.data.name || "User",
        language: response.data.language || "english",
      })

      // ✅ Remember email
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email)
      } else {
        localStorage.removeItem("rememberedEmail")
      }

      // ✅ Redirect
      navigate("/dashboard")

    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  // ✅ Load remembered email
  useEffect(() => {
    const remembered = localStorage.getItem("rememberedEmail")
    if (remembered) {
      setEmail(remembered)
      setRememberMe(true)
    }
  }, [])

  return (
    <div className="auth-page login-page">

      <div className="auth-container">
        <div className="auth-card">

          <div className="auth-header">
            <h1>Welcome Back 👋</h1>
            <p>Login to your account</p>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}

          <form onSubmit={handleLogin} className="auth-form">

            {/* EMAIL */}
            <div className="form-group">
              <label><FiMail /> Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label><FiLock /> Password</label>

              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* REMEMBER */}
            <div className="form-checkbox">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label>Remember me</label>
            </div>

            {/* BUTTON */}
            <button className="auth-button" disabled={isLoading}>
              {isLoading ? "Logging in..." : (
                <>
                  <FiLogIn /> Login
                </>
              )}
            </button>

          </form>

          <div className="auth-footer">
            <p>
              Don't have an account? <Link to="/signup">Signup</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Login