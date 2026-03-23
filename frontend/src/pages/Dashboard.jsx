import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import GuidancePanel from "../components/dashboard/GuidancePanel"
import InsightCards from "../components/dashboard/InsightCards"
import { useToast } from "../components/shared/ToastProvider"
import { useUser } from "../context/UserContext"
import { api } from "../lib/api"

function Dashboard() {
  const navigate = useNavigate()
  const { updateUser, t } = useUser()
  const { showError } = useToast()
  const [data, setData] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get("/career/dashboard")
        setData(response.data)
        if (response.data.user_profile) {
          updateUser(response.data.user_profile)
        }
      } catch (error) {
        showError(error.response?.data?.detail || "Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    // Dashboard data is fetched once when the screen mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="ultra-dashboard">
        <div className="ultra-grid">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="skeleton-card">
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="ultra-dashboard">
        <div className="empty-state-card">
          <h3>{t.noDashboardData}</h3>
          <p>Complete your profile to unlock AI recommendations and score trends.</p>
          <button className="btn primary" onClick={() => navigate("/form")}>
            {t.completeProfile}
          </button>
        </div>
      </div>
    )
  }

  const radarData = [
    { subject: "Awareness", A: data.awareness_score || 75 },
    { subject: "Time Align", A: data.time_alignment_score || 75 },
    { subject: "Action", A: data.action_integrity_score || 75 },
    { subject: "Clarity", A: data.user_profile?.goal_clarity === "high" ? 85 : data.user_profile?.goal_clarity === "medium" ? 65 : 40 },
    { subject: "Role Fit", A: data.user_profile?.role_match === "high" ? 85 : data.user_profile?.role_match === "medium" ? 65 : 40 },
  ]

  return (
    <div className="ultra-dashboard">
      <div className="dashboard-header">
        <h1>{t.dashboard}</h1>
        <div className="tab-buttons">
          <button className={`tab-btn ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>{t.overview}</button>
          <button className={`tab-btn ${activeTab === "insights" ? "active" : ""}`} onClick={() => setActiveTab("insights")}>{t.insights}</button>
          <button className={`tab-btn ${activeTab === "trends" ? "active" : ""}`} onClick={() => setActiveTab("trends")}>{t.trends}</button>
        </div>
      </div>

      {!data.profile_completed && (
        <div className="ultra-card full-width">
          <h3>{t.profileIncomplete}</h3>
          <p>{t.finishProfile}</p>
          <button className="btn primary" onClick={() => navigate("/form")}>
            {t.completeProfile}
          </button>
        </div>
      )}

      {activeTab === "overview" && (
        <div className="ultra-grid">
          <div className="ultra-card score-card">
            <h3>Career Alignment Score</h3>
            <div className="circle">
              <h1>{Math.round(data.career_alignment_score)}</h1>
              <span style={{ fontSize: "12px" }}>/ 100</span>
            </div>
            <div className="score-breakdown">
              <small>
                Awareness: {data.awareness_score}% | Time: {data.time_alignment_score}% | Action: {data.action_integrity_score}%
              </small>
            </div>
          </div>

          <div className="ultra-card center-card">
            <h3>Current Career Phase</h3>
            <div className="zodiac" />
            <p style={{ marginTop: "30px", fontWeight: "600", fontSize: "18px" }}>
              {data.current_career_phase}
            </p>
            <small style={{ opacity: 0.7 }}>AI-derived from saved profile data</small>
          </div>

          <div className="ultra-card">
            <h3>Opportunity Window</h3>
            <p className="window-date">{data.opportunity_window.start_date}</p>
            <p className="window-to">to</p>
            <p className="window-date">{data.opportunity_window.end_date}</p>
            <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "10px" }}>
              Type: {data.opportunity_window.type}
            </p>
            <p style={{ fontSize: "13px", opacity: 0.7 }}>
              Action: {data.opportunity_window.recommended_action}
            </p>
          </div>

          <div className="ultra-card full-width">
            <h3>Career Momentum Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.trend_data || []}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00f5ff" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#aaa" />
                <YAxis stroke="#aaa" />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#00f5ff" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="ultra-card full-width">
            <h3>Alignment Components Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <Radar dataKey="A" stroke="#00f5ff" fill="#00f5ff" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="ultra-card full-width">
            <GuidancePanel guidance={data.guidance_recommendations} />
          </div>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="insights-section">
          <InsightCards
            careerPhase={data.current_career_phase}
            alignmentScore={data.career_alignment_score}
            opportunityWindow={data.opportunity_window}
          />

          <div className="ultra-grid" style={{ marginTop: "30px" }}>
            <div className="ultra-card">
              <h3>Profile Signals</h3>
              <ul className="focus-list">
                <li>Current role: {data.user_profile?.current_role || "Not added yet"}</li>
                <li>Education: {data.user_profile?.education || "Not added yet"}</li>
                <li>Goal clarity: {data.user_profile?.goal_clarity || "medium"}</li>
                <li>Role match: {data.user_profile?.role_match || "medium"}</li>
              </ul>
            </div>

            <div className="ultra-card">
              <h3>AI Recommendations</h3>
              <ul className="action-list">
                {(data.guidance_recommendations?.recommendations || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="ultra-card">
              <h3>AI Summary</h3>
              <p>{data.guidance_recommendations?.summary}</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "trends" && (
        <div className="trends-section">
          <div className="ultra-grid">
            <div className="ultra-card full-width">
              <h3>Career Score Evolution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend_data || []}>
                  <XAxis dataKey="month" stroke="#aaa" />
                  <YAxis stroke="#aaa" />
                  <Tooltip contentStyle={{ background: "rgba(0,0,0,0.7)", border: "1px solid #00f5ff" }} />
                  <Line type="monotone" dataKey="score" stroke="#00f5ff" strokeWidth={2} dot={{ fill: "#ff00ff", r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="ultra-card full-width">
              <h3>Recommendation Timeline</h3>
              <div className="timeline">
                <div className="timeline-item completed">
                  <div className="timeline-marker">1</div>
                  <div className="timeline-content">
                    <h4>Profile Saved</h4>
                    <p>Signup and personal details stored</p>
                  </div>
                </div>
                <div className="timeline-item completed">
                  <div className="timeline-marker">2</div>
                  <div className="timeline-content">
                    <h4>Career Inputs Added</h4>
                    <p>Goals, interests, experience, and role fit</p>
                  </div>
                </div>
                <div className="timeline-item active">
                  <div className="timeline-marker">3</div>
                  <div className="timeline-content">
                    <h4>{data.current_career_phase}</h4>
                    <p>Current AI phase</p>
                  </div>
                </div>
                <div className="timeline-item upcoming">
                  <div className="timeline-marker">4</div>
                  <div className="timeline-content">
                    <h4>Opportunity Window</h4>
                    <p>{data.opportunity_window.start_date}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ultra-card">
              <h3>Performance Summary</h3>
              <div className="performance-item">
                <label>Awareness Score</label>
                <div className="progress-bar"><div className="progress" style={{ width: `${data.awareness_score}%` }} /></div>
                <span>{data.awareness_score}%</span>
              </div>
              <div className="performance-item">
                <label>Time Alignment</label>
                <div className="progress-bar"><div className="progress" style={{ width: `${data.time_alignment_score}%` }} /></div>
                <span>{data.time_alignment_score}%</span>
              </div>
              <div className="performance-item">
                <label>Action Integrity</label>
                <div className="progress-bar"><div className="progress" style={{ width: `${data.action_integrity_score}%` }} /></div>
                <span>{data.action_integrity_score}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
