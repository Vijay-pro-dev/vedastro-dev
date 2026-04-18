import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaArrowUp, FaBolt, FaBrain, FaFire, FaLeaf, FaRegStar, FaTint, FaWind } from "react-icons/fa"
import { api } from "../lib/api"

const Icon = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const ICONS = {
  insight: "M12 2a9 9 0 0 0-5 16.44V21l3-1 3 1v-2.56A9 9 0 0 0 12 2Z",
  action: "M5 12h14M12 5l7 7-7 7",
  why: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 18h.01",
  risk: "M12 3 3 19h18L12 3Zm0 8v3m0 3h.01",
  mistake: "M9 9l6 6m0-6-6 6",
}
const getScoresFromAnswers = (answers = {}, questions = []) => {
  const mapValue = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 100 }
  const buckets = { awareness: [], time: [], action: [] }

  Object.entries(answers || {}).forEach(([id, val]) => {
    const q = (questions || []).find((item) => (item.id || item.question_id) == id)
    const rawSection = (q?.section || q?.category || q?.category_id || "").toString().trim().toLowerCase()
    const numericCategory = Number(q?.category_id)

    const mapped = mapValue[val] ?? 0

    if (Number.isFinite(numericCategory) && numericCategory) {
      if (numericCategory === 1) buckets.awareness.push(mapped)
      else if (numericCategory === 2) buckets.time.push(mapped)
      else if (numericCategory === 3) buckets.action.push(mapped)
      return
    }

    if (rawSection.includes("awareness") || rawSection.includes("clarity")) buckets.awareness.push(mapped)
    else if (rawSection.includes("time") || rawSection.includes("opportunity") || rawSection.includes("alignment")) buckets.time.push(mapped)
    else if (rawSection.includes("action") || rawSection.includes("execution")) buckets.action.push(mapped)
  })

  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0)
  const awarenessScore = avg(buckets.awareness)
  const timeAlignment = avg(buckets.time)
  const actionScore = avg(buckets.action)
  const parts = [awarenessScore, timeAlignment, actionScore]
  const careerAlignmentScore = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
  return { awarenessScore, timeAlignment, actionScore, careerAlignmentScore }
}

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const [apiAnswers, setApiAnswers] = useState(null)
  const [apiQuestions, setApiQuestions] = useState(null)
  const [alignment, setAlignment] = useState(null)
  const [rules, setRules] = useState([])
  const [retakeLoading, setRetakeLoading] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [reportPaid, setReportPaid] = useState(false)

  // Try to hydrate answers/questions from backend if authenticated
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    const load = async () => {
      try {
        const [respAlign, respResp, respRules] = await Promise.all([
          api.get("/career/alignment/latest"),
          api.get("/career/responses/latest"),
          api.get("/career/rules/latest"),
        ])

        const alignRow = respAlign.data?.alignment
        if (alignRow && alignRow.overall_score != null) setAlignment(alignRow)

        const responses = respResp.data?.responses || []
        if (!responses.length) return
        const answersMap = {}
        responses.forEach((row) => {
          const val = Number(row.answer_numeric || 0)
          let scale = 1
          if (val >= 90) scale = 5
          else if (val >= 70) scale = 4
          else if (val >= 45) scale = 3
          else if (val >= 20) scale = 2
          answersMap[row.question_id] = scale
        })
        setApiAnswers(answersMap)
        const qList = responses.map((row) => ({
          id: row.question_id,
          question_id: row.question_id,
          question_text: row.question_text,
          display_order: row.display_order,
          subsection: row.subsection,
          category_id: row.section,
        }))
        setApiQuestions(qList)
        setRules(respRules.data?.rules || [])
      } catch (err) {
        console.warn("Could not load responses from API, using local cache", err)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    api
      .get("/payments/report/status")
      .then((r) => setReportPaid(Boolean(r.data?.paid)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 240)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const answers = useMemo(() => {
    if (apiAnswers) return apiAnswers
    const fromState = location.state?.answers || {}
    const stored = JSON.parse(localStorage.getItem("guest_questionnaire_answers") || "{}")
    return Object.keys(fromState).length ? fromState : stored
  }, [location.state, apiAnswers])

  const questionsList = useMemo(() => {
    if (apiQuestions) return apiQuestions
    const fromState = location.state?.questions || []
    const stored = JSON.parse(localStorage.getItem("guest_questionnaire_questions") || "[]")
    return fromState.length ? fromState : stored
  }, [location.state, apiQuestions])

  const scores = useMemo(() => {
    if (alignment) {
      const awarenessScore = Math.round(alignment.awareness_score ?? 0)
      const timeAlignment = Math.round(alignment.time_alignment_score ?? 0)
      const actionScore = Math.round(alignment.action_integrity_score ?? 0)
      const careerAlignmentScore = Math.round(alignment.overall_score ?? 0)
      return { awarenessScore, timeAlignment, actionScore, careerAlignmentScore }
    }
    if (!answers || !Object.keys(answers).length) {
      return { awarenessScore: 0, timeAlignment: 0, actionScore: 0, careerAlignmentScore: 0 }
    }
    return getScoresFromAnswers(answers, questionsList)
  }, [alignment, answers, questionsList])

  const elementBreakdown = useMemo(() => {
    const mapValue = { 1: 0, 2: 25, 3: 50, 4: 75, 5: 100 }
    const buckets = { Fire: [], Earth: [], Air: [], Water: [], Space: [] }
    Object.entries(answers).forEach(([id, val], idx) => {
      const q = questionsList.find((item) => (item.id || item.question_id) == id)
      const element = q?.subsection || ["Fire", "Earth", "Air", "Water", "Space"][idx % 5]
      const mapped = mapValue[val] ?? 0
      if (buckets[element]) buckets[element].push(mapped)
    })
    const scores = Object.entries(buckets).reduce((acc, [key, arr]) => {
      if (!arr.length) return acc
      acc[key] = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
      return acc
    }, {})
    return scores
  }, [answers, questionsList])

  const elementList = useMemo(() => {
    const entries = Object.entries(elementBreakdown)
    const total = entries.reduce((a, [, v]) => a + v, 1)
    return entries.map(([name, value]) => ({ name, value: Math.round((value / total) * 100) }))
  }, [elementBreakdown])

  const elementDonutStyle = useMemo(() => {
    if (!elementList.length) return {}
    const colors = {
      Fire: "#ff6a00",
      Earth: "#7bc043",
      Air: "#22d3ee",
      Water: "#3f87ff",
      Space: "#9b7bff",
    }
    let current = 0
    const stops = elementList
      .map(({ name, value }) => {
        const start = current
        const end = current + (value / 100) * 360
        current = end
        const color = colors[name] || "#22d3ee"
        return `${color} ${start}deg ${end}deg`
      })
      .join(", ")
    return { background: `conic-gradient(${stops})` }
  }, [elementList])

  const topDonutStyle = useMemo(() => {
    // Use the three pillar scores for top ring: awareness, time (opportunity), action
    const parts = [
      { val: scores.awarenessScore || 0, color: "#22d3ee" },
      { val: scores.timeAlignment || 0, color: "#f59e0b" },
      { val: scores.actionScore || 0, color: "#a855f7" },
    ]
    const total = parts.reduce((a, b) => a + b.val, 0) || 1
    let current = 0
    const stops = parts
      .map((p) => {
        const pct = (p.val / total) * 360
        const start = current
        const end = current + pct
        current = end
        return `${p.color} ${start}deg ${end}deg`
      })
      .join(", ")
    return { background: `conic-gradient(${stops})` }
  }, [scores.awarenessScore, scores.timeAlignment, scores.actionScore])

  const elementBadges = [
    { name: "Water", desc: "Emotion & Flow", color: "#1da1f2", Icon: FaTint },
    { name: "Fire", desc: "Action & Drive", color: "#ff6a00", Icon: FaFire },
    { name: "Earth", desc: "Stability & Growth", color: "#58c16b", Icon: FaLeaf },
    { name: "Air", desc: "Thinking & Communication", color: "#6dd5ed", Icon: FaWind },
    { name: "Space", desc: "Vision & Purpose", color: "#9b7bff", Icon: FaRegStar },
  ]

  const topRules = useMemo(() => (rules || []).slice(0, 2), [rules])
  const primaryRule = topRules[0]
  const ruleInsight = primaryRule?.insight || primaryRule?.customer_message
  const ruleAction = primaryRule?.next_move || primaryRule?.alternative || primaryRule?.customer_message
  const ruleWhy = primaryRule?.why || primaryRule?.risk || primaryRule?.mistake || primaryRule?.customer_message
  const ruleRisk = primaryRule?.risk
  const ruleMistake = primaryRule?.mistake
  const insights = []

  const nextMove = useMemo(() => {
    const entries = Object.entries(elementBreakdown)
    if (!entries.length) return {}
    const strongest = entries.reduce((a, b) => (b[1] > a[1] ? b : a))
    const weakest = entries.reduce((a, b) => (b[1] < a[1] ? b : a))

    const actionPlanByWeak = {
      Fire: "Do 1 focused task daily for 7 days to build execution.",
      Earth: "Set a fixed 30-minute block each day to create consistency.",
      Air: "Define one clear goal and break it into 3 milestones.",
      Water: "Avoid big decisions; journal feelings 10 minutes daily.",
      Space: "Increase exposure: meet 3 new people or opportunities weekly.",
    }

    const avoidByCombo =
      strongest[0] === "Fire" && weakest[0] === "Earth"
        ? "Avoid starting multiple things at once - finish one before starting another."
        : "Avoid scattering focus; keep a single weekly priority."

    const opportunity =
      (elementBreakdown.Space ?? 0) > 70
        ? "Next 60 days are high potential. If you act, you'll see fast progress."
        : "Normal window. Focus on habits and clarity first."

    return {
      strongest,
      weakest,
      nextMove: `Focus: Improve ${weakest[0]}`,
      why: `You have strong ${strongest[0]} but ${weakest[0]} is pulling you down.`,
      action: actionPlanByWeak[weakest[0]] || "Stay consistent with one daily habit.",
      avoid: avoidByCombo,
      opportunity,
    }
  }, [elementBreakdown])

  const handleRetake = async () => {
    if (retakeLoading) return
    setRetakeLoading(true)
    try {
      // clear local cached answers/questions
      localStorage.removeItem("guest_questionnaire_answers")
      localStorage.removeItem("guest_questionnaire_questions")
      // ask backend to start a fresh attempt if logged in
      const token = localStorage.getItem("token")
      if (token) {
        try {
          await api.post("/career/responses/reset")
        } catch (err) {
          console.warn("Retake reset failed (non-blocking)", err)
        }
      }
    } finally {
      setRetakeLoading(false)
      navigate("/questionnaire")
    }
  }

  return (
    <div className="results-shell">
      <button type="button" className="back-btn" onClick={() => navigate("/", { replace: true })} aria-label="Go back">
        <FaArrowLeft />
      </button>
      <div className="cosmic-top">
        <div className="cosmic-left">
          <p className="eyebrow">Build Your <span className="accent">Cosmic Profile</span></p>
          <h1>Career Clarity Assessment</h1>
          <p className="subtle">Answer 20 questions to calculate your Elements, Energy & Mind nature.</p>
          <div className="chip-row">
            <span className="chip"><FaBolt /> Elements</span>
            <span className="chip"><FaFire /> Energy</span>
            <span className="chip"><FaBrain /> Mind</span>
          </div>
          <div className="element-chips-row">
            {elementBadges.map((badge) => (
              <div
                key={badge.name}
                className="element-chip"
                style={{ background: `${badge.color}22`, borderColor: `${badge.color}55` }}
              >
                <div className="chip-icon" style={{ background: badge.color }}>
                  <badge.Icon />
                </div>
                <div>
                  <div className="chip-name">{badge.name}</div>
                  <div className="chip-desc">{badge.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="cosmic-right">
          <div className="score-orb" style={topDonutStyle}>
            <div className="score-orb-inner">
              <span className="score">{scores.careerAlignmentScore}</span>
              <small>Career Score</small>
            </div>
          </div>
          <div className="mini-legend">
            <div className="legend-dot blue" /> Awareness
            <div className="legend-dot orange" /> Opportunity
            <div className="legend-dot violet" /> Action
          </div>
        </div>
      </div>

      <div className="results-grid">
        <div className="card wide">
          <div className="card-header">
            <div>
              <h3>Alignment Snapshot</h3>
              <p>We've turned your answers into clarity, timing, and action scores.</p>
            </div>
            <div className="card-actions">
              <span className="pill dark">20 Questions</span>
              <button type="button" className="retake-btn" onClick={handleRetake} disabled={retakeLoading}>
                {retakeLoading ? "Starting..." : "Retake Assessment"}
              </button>
            </div>
          </div>
          <div className="mini-metric-grid">
            <div className="mini-metric-card">
              <div className="mini-metric-header">
                <span>Awareness (Clarity)</span>
                <strong>{scores.awarenessScore}/100</strong>
              </div>
              <div
                className="mini-donut"
                style={{
                  background: `conic-gradient(#22d3ee ${scores.awarenessScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
                }}
              >
                <div className="mini-donut-hole" style={{ color: "#22d3ee" }}>{scores.awarenessScore}</div>
              </div>
            </div>
            <div className="mini-metric-card">
              <div className="mini-metric-header">
                <span>Time (Opportunity)</span>
                <strong>{scores.timeAlignment}/100</strong>
              </div>
              <div
                className="mini-donut"
                style={{
                  background: `conic-gradient(#f59e0b ${scores.timeAlignment * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
                }}
              >
                <div className="mini-donut-hole" style={{ color: "#f59e0b" }}>{scores.timeAlignment}</div>
              </div>
            </div>
            <div className="mini-metric-card">
              <div className="mini-metric-header">
                <span>Action (Execution)</span>
                <strong>{scores.actionScore}/100</strong>
              </div>
              <div
                className="mini-donut"
                style={{
                  background: `conic-gradient(#a855f7 ${scores.actionScore * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
                }}
              >
                <div className="mini-donut-hole" style={{ color: "#a855f7" }}>{scores.actionScore}</div>
              </div>
            </div>
          </div>
        </div>

          <div className="card slim">
            <div className="card-header">
              <h3>Element Balance</h3>
              <span className="pill dark">Live Preview</span>
            </div>
            <div className="live-donut">
            <div className="donut-ring" style={elementDonutStyle}>
              <div className="donut-hole">
                <div className="donut-inner-glow">
                  <span className="donut-label">Elements</span>
                  <span className="donut-number small">5</span>
                </div>
              </div>
            </div>
            <ul className="element-list">
              {elementList.map((item) => (
                <li key={item.name}>
                  <span>{item.name}</span>
                  <div className={`meter ${item.name.toLowerCase()}`}><div style={{ width: `${item.value}%` }} /></div>
                  <strong>{item.value}%</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="results-grid two-col-rule">
        <div className="left-stack">
          <div className="card wide">
            <div className="card-header">
              <h3>Top Rule Matches</h3>
              <span className="pill dark">{topRules.length} matched</span>
            </div>
            <div className="rule-grid">
              {topRules.length ? (
                topRules.map((rule, idx) => (
                  <div className="rule-box" key={rule.id || idx}>
                    <div className="rule-box-head">
                      <span className="rule-name">{rule.rule_name || "Rule"}</span>
                      {rule.priority && <span className="rule-badge">{rule.priority}</span>}
                      {!rule.priority && (idx === 0 ? <span className="rule-badge">Top</span> : <span className="rule-badge subtle">Match</span>)}
                    </div>
                    <p className="rule-text">{rule.customer_message || rule.insight || "No description available."}</p>
                    <div className="rule-meta">
                      {rule.rule_type && <span className="rule-tag">{rule.rule_type}</span>}
                      {rule.risk && <span className="rule-tag alert">{rule.risk}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <p className="subtle">No matching rules yet.</p>
              )}
            </div>
          </div>
          <div className="card">
            <h3><span className="card-icon"><Icon d={ICONS.insight} /></span> Insights</h3>
            <ul className="insight-list">
            {(ruleInsight ? [ruleInsight, ...insights] : insights).slice(0, 6).map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
            {!ruleInsight && !insights.length && <li className="subtle">No insights yet.</li>}
            </ul>
          </div>
        </div>
        <div className="action-stack">
          <div className="card">
            <h3><span className="card-icon"><Icon d={ICONS.action} /></span> Action</h3>
            <p><strong>{ruleAction || nextMove.action || "Stay consistent with one focused action daily."}</strong></p>
          </div>
          <div className="card">
            <h3><span className="card-icon"><Icon d={ICONS.why} /></span> Why</h3>
            <p>{ruleWhy || "No why provided for this rule."}</p>
          </div>
          <div className="card">
            <h3><span className="card-icon"><Icon d={ICONS.risk} /></span> Risk</h3>
            <p>{ruleRisk || "No risk noted for this rule."}</p>
          </div>
          <div className="card">
            <h3><span className="card-icon"><Icon d={ICONS.mistake} /></span> Mistake</h3>
            <p>{ruleMistake || "No common mistake captured yet."}</p>
          </div>
          <div className="card feedback-card">
            <div className="feedback-header">
              <span className="card-icon"><Icon d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Z" /></span>
              <h3>Feedback</h3>
            </div>
            <ul className="todo-list">
              <li>
                <input type="checkbox" id="todo-action" />
                <label htmlFor="todo-action">{ruleAction || "Complete today's priority action."}</label>
              </li>
            </ul>
            <button type="button" className="fb-submit">Submit</button>
          </div>
          <div className="card full-report-card">
            <div className="full-report-copy">
              <div className="card-header">
                <h3>Full Report</h3>
                <span className="pill dark">{reportPaid ? "Unlocked" : "Locked"}</span>
              </div>
              <p className="subtle">
                Unlock the full report when you're ready.
              </p>
            </div>
            <button type="button" className="auth-button" onClick={() => navigate("/report/unlock")}>
              {reportPaid ? "View Full Report" : "Unlock Full Report"}
            </button>
          </div>
        </div>
      </div>

      {showTop && (
        <button className="top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Scroll to top">
          <FaArrowUp />
        </button>
      )}
    </div>
  )
}

export default Results


