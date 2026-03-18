import { useEffect, useState } from "react"
import axios from "axios"
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area
} from "recharts"
import InsightCards from "./InsightCards"
import GuidancePanel from "./GuidancePanel"

function Dashboard() {
  const [data, setData] = useState(null)
  const [userId] = useState(1) // In production, get from context/localStorage
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Try to fetch enhanced dashboard first, fall back to legacy endpoint
    axios.get(`http://127.0.0.1:8000/career/dashboard/${userId}`)
      .then(res => {
        setData(res.data)
        setLoading(false)
      })
      .catch(() => {
        // Fallback to legacy endpoint
        axios.get("http://127.0.0.1:8000/career/dashboard")
          .then(res => {
            // Transform legacy data to new format
            setData({
              career_alignment_score: res.data.career_score,
              current_career_phase: res.data.current_phase,
              opportunity_window: {
                start_date: res.data.phase_window?.split(" - ")[0] || "2025-06-01",
                end_date: res.data.phase_window?.split(" - ")[1] || "2025-08-31",
                type: "Career Growth"
              },
              guidance_recommendations: {
                focus: res.data.focus,
                avoid: res.data.avoid,
                reason: res.data.reason
              },
              trend_data: [
                { month: "Jan", score: 40 },
                { month: "Feb", score: 55 },
                { month: "Mar", score: 60 },
                { month: "Apr", score: res.data.career_score }
              ],
              awareness_score: 80,
              time_alignment_score: 82,
              action_integrity_score: 75
            })
            setLoading(false)
          })
      })
  }, [userId])

  if (loading) return <h2 className="loading">Loading Dashboard...</h2>
  if (!data) return <h2 className="loading">No data available</h2>

  const radarData = [
    { subject: "Awareness", A: data.awareness_score || 75 },
    { subject: "Time Align", A: data.time_alignment_score || 75 },
    { subject: "Action", A: data.action_integrity_score || 75 },
    { subject: "Skills", A: 80 },
    { subject: "Growth", A: 85 },
  ]

  return (
    <div className="ultra-dashboard">
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>Career Intelligence Dashboard</h1>
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === "insights" ? "active" : ""}`}
            onClick={() => setActiveTab("insights")}
          >
            Insights
          </button>
          <button 
            className={`tab-btn ${activeTab === "trends" ? "active" : ""}`}
            onClick={() => setActiveTab("trends")}
          >
            Trends
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="ultra-grid">
          {/* ✅ Career Alignment Score */}
          <div className="ultra-card score-card">
            <h3>Career Alignment Score</h3>
            <div className="circle">
              <h1>{Math.round(data.career_alignment_score)}</h1>
              <span style={{ fontSize: "12px" }}>/ 100</span>
            </div>
            <div className="score-breakdown">
              <small>Awareness: {data.awareness_score}% | Time: {data.time_alignment_score}% | Action: {data.action_integrity_score}%</small>
            </div>
          </div>

          {/* ✅ Current Career Phase */}
          <div className="ultra-card center-card">
            <h3>Current Career Phase</h3>
            <div className="zodiac"></div>
            <p style={{ marginTop: "30px", fontWeight: "600", fontSize: "18px" }}>
              {data.current_career_phase || "Skill Building"}
            </p>
            <small style={{ opacity: 0.7 }}>Active Phase</small>
          </div>

          {/* ✅ Next Opportunity Window */}
          <div className="ultra-card">
            <h3>Next Opportunity Window 🔮</h3>
            <p className="window-date">{data.opportunity_window.start_date}</p>
            <p className="window-to">to</p>
            <p className="window-date">{data.opportunity_window.end_date}</p>
            <p style={{ fontSize: "13px", opacity: 0.7, marginTop: "10px" }}>
              Type: {data.opportunity_window.type}
            </p>
          </div>

          {/* Career Trend Chart */}
          <div className="ultra-card full-width">
            <h3>Career Momentum Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.trend_data || []}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00f5ff" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#aaa"/>
                <YAxis stroke="#aaa"/>
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#00f5ff" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Alignment Components Radar */}
          <div className="ultra-card full-width">
            <h3>Alignment Components Analysis</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <defs>
                  <linearGradient id="colorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f5ff" />
                    <stop offset="100%" stopColor="#ff00ff" />
                  </linearGradient>
                </defs>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <Radar dataKey="A" stroke="url(#colorGradient)" fill="url(#colorGradient)" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* ✅ AI INSIGHTS (STRUCTURED) */}
          <div className="ultra-card full-width">
            <GuidancePanel guidance={data.guidance_recommendations} />
          </div>
        </div>
      )}

      {/* INSIGHTS TAB */}
      {activeTab === "insights" && (
        <div className="insights-section">
          <InsightCards 
            careerPhase={data.current_career_phase}
            alignmentScore={data.career_alignment_score}
            opportunityWindow={data.opportunity_window}
          />
          
          <div className="ultra-grid" style={{ marginTop: "30px" }}>
            {/* Focus Areas */}
            <div className="ultra-card">
              <h3>📚 Key Focus Areas</h3>
              <ul className="focus-list">
                <li>✓ Strengthen technical foundations</li>
                <li>✓ Build professional network</li>
                <li>✓ Develop leadership skills</li>
                <li>✓ Create portfolio projects</li>
              </ul>
            </div>

            {/* Action Items */}
            <div className="ultra-card">
              <h3>⚡ Immediate Actions</h3>
              <ul className="action-list">
                <li>→ Update LinkedIn profile</li>
                <li>→ Attend industry events</li>
                <li>→ Complete online certification</li>
                <li>→ Network with mentors</li>
              </ul>
            </div>

            {/* Success Metrics */}
            <div className="ultra-card">
              <h3>🎯 Success Metrics</h3>
              <ul className="metrics-list">
                <li><strong>Skill Growth:</strong> 75%</li>
                <li><strong>Network Expansion:</strong> 68%</li>
                <li><strong>Opportunity Readiness:</strong> 82%</li>
                <li><strong>Career Alignment:</strong> {Math.round(data.career_alignment_score)}%</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === "trends" && (
        <div className="trends-section">
          <div className="ultra-grid">
            {/* Detailed Trend Chart */}
            <div className="ultra-card full-width">
              <h3>Career Score Evolution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.trend_data || []}>
                  <XAxis dataKey="month" stroke="#aaa"/>
                  <YAxis stroke="#aaa"/>
                  <Tooltip 
                    contentStyle={{ background: "rgba(0,0,0,0.7)", border: "1px solid #00f5ff" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#00f5ff"
                    strokeWidth={2}
                    dot={{ fill: "#ff00ff", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Phase Timeline */}
            <div className="ultra-card full-width">
              <h3>Career Phase Timeline</h3>
              <div className="timeline">
                <div className="timeline-item completed">
                  <div className="timeline-marker">1</div>
                  <div className="timeline-content">
                    <h4>Foundation Phase</h4>
                    <p>2022 - 2023</p>
                  </div>
                </div>
                <div className="timeline-item completed">
                  <div className="timeline-marker">2</div>
                  <div className="timeline-content">
                    <h4>Skill Building</h4>
                    <p>2023 - 2024</p>
                  </div>
                </div>
                <div className="timeline-item active">
                  <div className="timeline-marker">3</div>
                  <div className="timeline-content">
                    <h4>Current Phase: {data.current_career_phase}</h4>
                    <p>2024 - 2025</p>
                  </div>
                </div>
                <div className="timeline-item upcoming">
                  <div className="timeline-marker">4</div>
                  <div className="timeline-content">
                    <h4>Next Opportunity</h4>
                    <p>{data.opportunity_window.start_date}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="ultra-card">
              <h3>📊 Performance Summary</h3>
              <div className="performance-item">
                <label>Awareness Score</label>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${data.awareness_score}%` }}></div>
                </div>
                <span>{data.awareness_score}%</span>
              </div>
              <div className="performance-item">
                <label>Time Alignment</label>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${data.time_alignment_score}%` }}></div>
                </div>
                <span>{data.time_alignment_score}%</span>
              </div>
              <div className="performance-item">
                <label>Action Integrity</label>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${data.action_integrity_score}%` }}></div>
                </div>
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