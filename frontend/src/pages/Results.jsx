import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { api } from "../lib/api"

const getScoresFromDraft = (draft = {}) => {
  const required = ["name", "phone", "dob", "birth_place", "education", "interests", "goals", "current_role"]
  const filled = required.filter((f) => draft[f] && String(draft[f]).trim() !== "").length
  const completeness = Math.max(20, Math.round((filled / required.length) * 100))
  const years = Number(draft.years_experience || 0)
  const timeAlignment = Math.min(100, Math.round(completeness * 0.6 + Math.min(years, 15) * 2.5))
  const actionIntegrity =
    (draft.goals ? 20 : 0) +
    (draft.interests ? 15 : 0) +
    (draft.current_role ? 15 : 0) +
    (draft.education ? 10 : 0) +
    (draft.role_match === "high" ? 20 : draft.role_match === "medium" ? 10 : 5) +
    (draft.goal_clarity === "high" ? 20 : draft.goal_clarity === "medium" ? 12 : 6)
  const actionScore = Math.min(100, Math.max(30, Math.round(actionIntegrity)))
  const awarenessScore = Math.min(100, Math.max(30, completeness))
  const careerAlignmentScore = Math.round((awarenessScore + timeAlignment + actionScore) / 3)
  return { awarenessScore, timeAlignment, actionScore, careerAlignmentScore }
}

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const [apiAnswers, setApiAnswers] = useState(null)
  const [apiQuestions, setApiQuestions] = useState(null)
  const [alignment, setAlignment] = useState(null)

  // Try to hydrate answers/questions from backend if authenticated
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    const load = async () => {
      try {
        const [respAlign, respResp] = await Promise.all([api.get("/career/alignment/latest"), api.get("/career/responses/latest")])

        const alignRow = respAlign.data?.alignment
        if (alignRow) setAlignment(alignRow)

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
      } catch (err) {
        console.warn("Could not load responses from API, using local cache", err)
      }
    }
    load()
  }, [])
  const draft = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem("guest_profile_draft") || "{}")
    return location.state?.guestProfile || stored.formData ? { ...(stored.formData || {}), ...(stored.careerData || {}) } : stored
  }, [location.state])

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
    return getScoresFromDraft(draft)
  }, [draft, alignment])

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
    { name: "Water", desc: "Emotion & Flow", color: "#1da1f2", emoji: "💧" },
    { name: "Fire", desc: "Action & Drive", color: "#ff6a00", emoji: "🔥" },
    { name: "Earth", desc: "Stability & Growth", color: "#58c16b", emoji: "🌿" },
    { name: "Air", desc: "Thinking & Communication", color: "#6dd5ed", emoji: "💨" },
    { name: "Space", desc: "Vision & Purpose", color: "#9b7bff", emoji: "✨" },
  ]

  const completionPercent = useMemo(() => {
    const totalQ = questionsList.length || 1
    const answered = Object.keys(answers || {}).length
    return Math.min(100, Math.round((answered / totalQ) * 100))
  }, [answers, questionsList])

  const whatsNext = [
    "Save your profile to keep personalized guidance",
    "Get your Energy & Element balance snapshot",
    "See timing windows and action plan in dashboard",
  ]

  const insights = useMemo(() => {
    const out = []
    const fire = elementBreakdown.Fire ?? 0
    const earth = elementBreakdown.Earth ?? 0
    const air = elementBreakdown.Air ?? 0
    const water = elementBreakdown.Water ?? 0
    const space = elementBreakdown.Space ?? 0

    if (fire > 70) out.push("Strong action taker")
    else if (fire < 40) out.push("Low execution — build action muscle")

    if (earth > 70) out.push("Highly consistent")
    else if (earth < 50) out.push("Inconsistent habits (big issue)")

    if (air > 70) out.push("Clear thinking and direction")
    else if (air < 50) out.push("Confused direction — regain clarity")

    if (space > 70) out.push("Opportunity aligned")
    else if (space < 50) out.push("Wrong timing / low exposure")

    if (fire > 70 && earth < 50) out.push("Starts fast but doesn’t stay consistent")
    if (air < 50 && water > 70) out.push("Confused and overthinking decisions")
    if (space > 70 && fire > 70) out.push("Strong growth window — act now")
    if (space > 70 && fire < 50) out.push("Opportunity is present but action is low")

    // Case logic
    if (air < 50 && water < 50) out.push("Confused & emotionally stuck")
    if (air > 70 && fire < 50) out.push("Knows what to do but not executing")
    if (fire > 70 && space > 70) out.push("Strong growth phase")
    if (space > 70 && fire < 50) out.push("Missing a big opportunity window")
    if (fire > 70 && water < 50) out.push("Acting but decisions may be unstable")

    return out
  }, [elementBreakdown])

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
        ? "Avoid starting multiple things at once—finish one before starting another."
        : "Avoid scattering focus; keep a single weekly priority."

    const opportunity =
      (elementBreakdown.Space ?? 0) > 70
        ? "Next 60 days are high potential. If you act, you’ll see fast progress."
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

  return (
    <div className="results-shell">
      <div className="cosmic-top">
        <div className="cosmic-left">
          <p className="eyebrow">Build Your <span className="accent">Cosmic Profile</span></p>
          <h1>Career Clarity Assessment</h1>
          <p className="subtle">Answer 20 questions to calculate your Elements, Energy & Mind nature.</p>
          <div className="chip-row">
            <span className="chip">⚡ Elements</span>
            <span className="chip">🔥 Energy</span>
            <span className="chip">🧠 Mind</span>
          </div>
          <div className="element-chips-row">
            {elementBadges.map((badge) => (
              <div
                key={badge.name}
                className="element-chip"
                style={{ background: `${badge.color}22`, borderColor: `${badge.color}55` }}
              >
                <div className="chip-icon" style={{ background: badge.color }}>{badge.emoji}</div>
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
              <p>Your clarity, timing, and execution scores derived from your inputs.</p>
            </div>
            <span className="pill dark">20 Questions</span>
          </div>
          <div className="pill-stack">
            <div className="metric">
              <span>Awareness (Clarity)</span>
              <div className="meter"><div style={{ width: `${scores.awarenessScore}%` }} /></div>
              <strong>{scores.awarenessScore}/100</strong>
            </div>
            <div className="metric">
              <span>Time (Opportunity)</span>
              <div className="meter"><div style={{ width: `${scores.timeAlignment}%` }} /></div>
              <strong>{scores.timeAlignment}/100</strong>
            </div>
            <div className="metric">
              <span>Action (Execution)</span>
              <div className="meter"><div style={{ width: `${scores.actionScore}%` }} /></div>
              <strong>{scores.actionScore}/100</strong>
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
                <span className="donut-number">{scores.careerAlignmentScore}</span>
                <small>Score</small>
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

      <div className="results-grid">
        <div className="card">
          <h3>Insights</h3>
          <ul className="insight-list">
            {insights.slice(0, 6).map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Next Move</h3>
          <p><strong>{nextMove.nextMove}</strong></p>
          <p>Why: {nextMove.why}</p>
          <p>Action: {nextMove.action}</p>
          <p>Avoid: {nextMove.avoid}</p>
          <p>Opportunity: {nextMove.opportunity}</p>
        </div>
      </div>

      <div className="results-grid tertiary">
        <div className="card">
          <h3>What's Next?</h3>
          <ul className="next-list">
            {whatsNext.map((item, idx) => (
              <li key={idx} className="next-item">
                <span className="next-bullet">{idx + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Results
