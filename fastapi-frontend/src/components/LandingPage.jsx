import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaChartLine, FaClock, FaLightbulb, FaUser, FaSignOutAlt } from "react-icons/fa"
import { useUser } from "../context/UserContext"

function LandingPage() {
  const navigate = useNavigate()
  const { user, logoutUser, loginUser, updateUser } = useUser()
  const [showSignupModal, setShowSignupModal] = useState(!user && localStorage.getItem("showSignup") !== "false")
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Profile edit form fields
  const [dob, setDob] = useState(user?.dob || "")
  const [birthTime, setBirthTime] = useState(user?.birth_time || "")
  const [birthPlace, setBirthPlace] = useState(user?.birth_place || "")
  const [address, setAddress] = useState(user?.address || "")
  const [birthTimeAccuracy, setBirthTimeAccuracy] = useState(user?.birth_time_accuracy || "estimated")

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Signup
      const signupRes = await fetch("http://127.0.0.1:8000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      if (!signupRes.ok) throw new Error("Signup failed")

      // Auto login after signup
      const loginRes = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      if (!loginRes.ok) throw new Error("Login failed")

      // Store user and close modal
      loginUser({ email, id: Math.random() })
      setShowSignupModal(false)
      setEmail("")
      setPassword("")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const loginRes = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      const data = await loginRes.json()

      if (!loginRes.ok) throw new Error(data.detail || "Login failed")

      // Fetch user birth data
      const userDataRes = await fetch(`http://127.0.0.1:8000/user/birth-data?email=${email}`)
      const userData = await userDataRes.json()

      // Store user with all info
      const userInfo = { 
        email, 
        id: data.user_id || Math.random(),
        dob: userData.dob || "",
        birth_time: userData.birth_time || "",
        birth_place: userData.birth_place || "",
        address: userData.address || "",
        birth_time_accuracy: userData.birth_time_accuracy || "estimated"
      }
      
      loginUser(userInfo)
      setShowLoginModal(false)
      setEmail("")
      setPassword("")
      
      // Update form fields with fetched data
      setDob(userData.dob || "")
      setBirthTime(userData.birth_time || "")
      setBirthPlace(userData.birth_place || "")
      setAddress(userData.address || "")
      setBirthTimeAccuracy(userData.birth_time_accuracy || "estimated")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const updateRes = await fetch("http://127.0.0.1:8000/user/birth-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: user.email,
          dob,
          birth_time: birthTime,
          birth_place: birthPlace,
          address,
          birth_time_accuracy: birthTimeAccuracy
        })
      })

      if (!updateRes.ok) throw new Error("Update failed")

      // Update local user context
      const updatedUser = {
        ...user,
        dob,
        birth_time: birthTime,
        birth_place: birthPlace,
        address,
        birth_time_accuracy: birthTimeAccuracy
      }
      updateUser(updatedUser)
      setShowEditModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logoutUser()
    setShowProfileDropdown(false)
    navigate("/")
  }

  return (
    <div className="landing">
      {/* Navbar */}
     {/* Navbar */}
      <nav className="navbar">
        <h2 className="logo">Vedastro</h2>

        {user ? (
          <div className="profile-menu">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <FaUser size={18} /> {user.name || user.email?.split("@")[0]}
            </button>

            {showProfileDropdown && (
  <div className="profile-dropdown">

    {/* Username */}
    <div className="dropdown-item" style={{ padding: "10px" }}>
      <strong>{user.name || user.email?.split("@")[0]}</strong>
    </div>

    {/* Profile Button */}
    <button
      className="dropdown-item"
      onClick={() => {
        navigate("/profile") // ya "/form" agar wahi profile page hai
        setShowProfileDropdown(false)
      }}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px",
        background: "none",
        border: "none",
        cursor: "pointer"
      }}
    >
      Profile
    </button>

    {/* Sign Out */}
    <button
      className="dropdown-item"
      onClick={handleLogout}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "10px",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "red"
      }}
    >
      <FaSignOutAlt /> Sign Out
    </button>

  </div>
)}
          </div>
        ) : (
          <button 
            className="login-btn"
            onClick={() => setShowLoginModal(true)}
          >
            Login
          </button>
        )}
      </nav>
      {/* Signup Modal */}
      {showSignupModal && !user && (
        <div className="modal-overlay" onClick={() => setShowSignupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Join Vedastro</h2>
            <p>Start your career analysis today</p>

            <form onSubmit={handleSignup}>
              <div className="modal-input-group">
                <input 
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="modal-input-group">
                <input 
                  type="password"
                  placeholder="Create Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button 
                type="submit" 
                className="modal-btn"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Sign Up & Continue"}
              </button>
            </form>

            <button 
              className="close-modal"
              onClick={() => setShowSignupModal(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && !user && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Welcome Back</h2>
            <p>Login to your Vedastro account</p>

            <form onSubmit={handleLogin}>
              <div className="modal-input-group">
                <input 
                  type="email"
                  placeholder="Your Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="modal-input-group">
                <input 
                  type="password"
                  placeholder="Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button 
                type="submit" 
                className="modal-btn"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </button>

              <p style={{textAlign: "center", marginTop: "16px", fontSize: "14px", color: "rgba(255,255,255,0.7)"}}>
                Don't have an account? 
                <button 
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false)
                    setShowSignupModal(true)
                    setEmail("")
                    setPassword("")
                    setError("")
                  }}
                  style={{background: "none", border: "none", color: "#00f5ff", cursor: "pointer", marginLeft: "4px", textDecoration: "underline"}}
                >
                  Sign up here
                </button>
              </p>
            </form>

            <button 
              className="close-modal"
              onClick={() => setShowLoginModal(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && user && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <h2>Edit Profile</h2>
            <p>Update your personal information</p>

            <form onSubmit={handleUpdateProfile}>
              <div className="modal-input-group">
                <label>Birth Date</label>
                <input 
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div className="modal-input-group">
                <label>Birth Time</label>
                <input 
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                />
              </div>

              <div className="modal-input-group">
                <label>Birth Time Accuracy</label>
                <select 
                  value={birthTimeAccuracy}
                  onChange={(e) => setBirthTimeAccuracy(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid rgba(0, 245, 255, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#fff",
                    fontSize: "14px"
                  }}
                >
                  <option value="exact">Exact</option>
                  <option value="approximate">Approximate</option>
                  <option value="estimated">Estimated</option>
                </select>
              </div>

              <div className="modal-input-group">
                <label>Birth Place</label>
                <input 
                  type="text"
                  placeholder="City, Country"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                />
              </div>

              <div className="modal-input-group">
                <label>Full Address</label>
                <textarea 
                  placeholder="Enter your full address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid rgba(0, 245, 255, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "#fff",
                    fontSize: "14px",
                    minHeight: "80px",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
              </div>

              {error && <p className="error-msg">{error}</p>}

              <button 
                type="submit" 
                className="modal-btn"
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </form>

            <button 
              className="close-modal"
              onClick={() => setShowEditModal(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero">
        <div className="overlay"></div>

        <div className="hero-content">
          <h1>Know When to Act in Your Career</h1>
          <p>
            Understand when to build skills, when to switch roles,
            and when opportunities are likely to appear.
          </p>

          {!user && (
            <div className="buttons">
              <button
                className="btn primary"
                onClick={() => setShowSignupModal(true)}
              >
                Start Free Analysis
              </button>
              <button className="btn secondary">
                See Sample Report
              </button>
            </div>
          )}
          
          {user && (
            <div className="buttons">
              <button
                className="btn primary"
                onClick={() => navigate("/form")}
              >
                Complete Profile
              </button>
              <button 
                className="btn secondary"
                onClick={() => navigate("/dashboard")}
              >
                View Dashboard
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <h2>Discover the Best Times for Your Career</h2>
        <div className="feature-grid">
          <div className="feature">
            <FaChartLine size={30} color="#4a6cf7"/>
            <h3>Career Alignment Score</h3>
            <p>Measure your career readiness and alignment.</p>
          </div>

          <div className="feature">
            <FaClock size={30} color="#4a6cf7"/>
            <h3>Opportunity Windows</h3>
            <p>Identify the right times to make career changes.</p>
          </div>

          <div className="feature">
            <FaLightbulb size={30} color="#4a6cf7"/>
            <h3>Decision Guidance</h3>
            <p>Receive personalized actions to support your goals.</p>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="testimonial">
        <h3>Trusted by Thousands</h3>
        <p>Accurate career predictions with 92% satisfaction.</p>

        <div className="testimonial-box">
          <div className="accuracy">
            <strong>92% Accuracy</strong>
            <p>Based on user feedback</p>
          </div>

          <p className="quote">
            "Vedastro pinpointed my ideal career switch window.
            Their timing predictions were remarkably precise."
          </p>

          <div className="user">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="user"
            />
            <span>Erica S., Marketing Manager</span>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
