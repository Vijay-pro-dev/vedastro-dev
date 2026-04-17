import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaArrowLeft } from "react-icons/fa"

import { api } from "../lib/api"

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleAdmin = async () => {
    setIsLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await api.post("/admin-login", {
        email,
        password,
      })

      localStorage.setItem("admin_token", response.data.access_token)
      localStorage.setItem("admin_user", JSON.stringify(response.data.admin))
      setMessage(response.data.message)
      navigate("/admin-panel", { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Admin login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-single">
        <div className="auth-card">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <FaArrowLeft />
          </button>
          <div className="auth-header">
            <h1>Admin Login</h1>
            <p>Login with admin credentials to open the project admin panel.</p>
          </div>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                placeholder="admin@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button className="auth-button" onClick={handleAdmin} disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
