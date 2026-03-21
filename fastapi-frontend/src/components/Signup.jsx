import { useState } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"
import { useUser } from "../context/UserContext"
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiUserPlus } from "react-icons/fi"

function Signup() {
  const navigate = useNavigate()
  
  // ✅ Context se sirf loginUser liya kyunki setLoading aksar undefined hota hai
  const { loginUser } = useUser()

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [passwordStrength, setPasswordStrength] = useState(0)

  // Password strength logic (Aapka original)
  const calculatePasswordStrength = (pass) => {
    let strength = 0
    if (!pass) return 0
    if (pass.length >= 8) strength += 25
    if (pass.length >= 12) strength += 15
    if (/[a-z]/.test(pass)) strength += 15
    if (/[A-Z]/.test(pass)) strength += 15
    if (/[0-9]/.test(pass)) strength += 15
    if (/[^A-Za-z0-9]/.test(pass)) strength += 15
    return Math.min(strength, 100)
  }

  const handlePasswordChange = (e) => {
    const pass = e.target.value
    setPassword(pass)
    setPasswordStrength(calculatePasswordStrength(pass))
  }

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 25) return "Weak"
    if (passwordStrength < 50) return "Fair"
    if (passwordStrength < 75) return "Good"
    return "Strong"
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return "#f87171"
    if (passwordStrength < 50) return "#fb923c"
    if (passwordStrength < 75) return "#fbbf24"
    return "#34d399"
  }

  const handleSignup = async (e) => {
    e.preventDefault()

    // Validation
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all required fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      // ✅ API call
      const response = await axios.post("http://127.0.0.1:8000/signup", {
        email: email,
        password: password,
        name: name || "User",
      })

      // ✅ Agar signup successful ho jaye
      if (response.data) {
        loginUser({
          user_id: response.data.user_id,
          email: response.data.email,
          name: response.data.name || name,
          language: "english",
        })

        // Redirect to dashboard or profile
        navigate("/dashboard")
      }
    } catch (err) {
      // ✅ Detail check for FastAPI errors
      const errorMessage = err.response?.data?.detail || "Signup failed. Please try again."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page signup-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account 🚀</h1>
            <p>Join our community to get career guidance</p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="auth-form">
            {/* Name */}
            <div className="form-group">
              <label className="form-label"><FiUser className="form-icon" /> Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label"><FiMail className="form-icon" /> Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label"><FiLock className="form-icon" /> Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {password && (
                <div className="password-strength">
                  <div className="strength-bar">
                    <div className="strength-fill" style={{ width: `${passwordStrength}%`, backgroundColor: getPasswordStrengthColor() }}></div>
                  </div>
                  <span className="strength-label" style={{ color: getPasswordStrengthColor() }}>{getPasswordStrengthLabel()}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label"><FiLock className="form-icon" /> Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-button" disabled={isLoading}>
              {isLoading ? "Creating Account..." : <><FiUserPlus /> Sign Up</>}
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup