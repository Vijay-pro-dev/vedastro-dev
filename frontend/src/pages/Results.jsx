import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { FaArrowLeft, FaArrowUp, FaBullseye, FaShieldAlt } from "react-icons/fa"
import "../tailwind.css"
import { api } from "../lib/api"

const Icon = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const MiniDonut = ({ value = 0, color = "#22d3ee", label = "Score" }) => {
  const size = 86
  const stroke = 10
  const radius = (size - stroke) / 2
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, Number(value) || 0))
  const dashOffset = circumference - (clamped / 100) * circumference
  const gradId = `miniDonutGrad-${color.replace("#", "")}`

  return (
    <svg
      className="nd-core-donut-svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${label} ${clamped} out of 100`}
      shapeRendering="geometricPrecision"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#1a1d24" />
          <stop offset="55%" stopColor="#0a0b10" />
          <stop offset="100%" stopColor="#020307" />
        </radialGradient>
      </defs>

      <circle cx={center} cy={center} r={radius - stroke / 2} fill={`url(#${gradId})`} />
      <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${center} ${center})`}
      />

      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="nd-core-donut-text nd-core-donut-text--value">
        {clamped}
      </text>
      <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="nd-core-donut-text nd-core-donut-text--max">
        /100
      </text>
    </svg>
  )
}

const ICONS = {
  insight: "M12 2a9 9 0 0 0-5 16.44V21l3-1 3 1v-2.56A9 9 0 0 0 12 2Z",
  action: "M5 12h14M12 5l7 7-7 7",
  why: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 18h.01",
  risk: "M12 3 3 19h18L12 3Zm0 8v3m0 3h.01",
  mistake: "M9 9l6 6m0-6-6 6",
  calendar: "M8 2v3M16 2v3M3 9h18M6 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  head: "M12 2a7 7 0 0 0-4.6 12.28c.35.3.6.73.6 1.2V18a2 2 0 0 0 2 2h2m0-10.5a2.5 2.5 0 1 1 0 5m0 0v5",
  hourglass: "M6 2h12M6 22h12M8 2c0 6 8 6 8 10s-8 4-8 10",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  spark: "M12 2l1.6 5.1L19 9l-5.4 1.7L12 16l-1.6-5.3L5 9l5.4-1.9L12 2Z",
  crown: "M5 18h14l-1-9-4 4-3-6-3 6-4-4-1 9ZM5 21h14",
  chevronRight: "M10 6l6 6-6 6",
  close: "M6 6l12 12M18 6 6 18",
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
  const [ruleScores, setRuleScores] = useState(null)
  const [rulesMatch, setRulesMatch] = useState(null)
  const [showAllRules, setShowAllRules] = useState(false)
  const [retakeLoading, setRetakeLoading] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const [reportPaid, setReportPaid] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)

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
        setRuleScores(respRules.data?.scores || null)
        setRulesMatch(respRules.data?.match || null)
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

  useEffect(() => {
    if (!showTimeline) return
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowTimeline(false)
    }
    document.addEventListener("keydown", onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [showTimeline])

  const answers = useMemo(() => {
    if (apiAnswers) return apiAnswers
    const fromState = location.state?.answers || {}
    let stored = {}
    try {
      stored = JSON.parse(localStorage.getItem("guest_questionnaire_answers") || "{}")
    } catch {
      stored = {}
    }
    return Object.keys(fromState).length ? fromState : stored
  }, [location.state, apiAnswers])

  const questionsList = useMemo(() => {
    if (apiQuestions) return apiQuestions
    const fromState = location.state?.questions || []
    let stored = []
    try {
      stored = JSON.parse(localStorage.getItem("guest_questionnaire_questions") || "[]")
    } catch {
      stored = []
    }
    return fromState.length ? fromState : stored
  }, [location.state, apiQuestions])

  const confidencePct = useMemo(() => {
    const answerCount = Object.keys(answers || {}).length
    const questionCount = (questionsList || []).length || 20
    if (!answerCount) return 0
    const ratio = Math.min(1, answerCount / Math.max(1, questionCount))
    const weighted = ratio * 100 * 0.9 + 10
    return Math.max(45, Math.min(95, Math.round(weighted)))
  }, [answers, questionsList])

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
    Object.entries(answers || {}).forEach(([id, val], idx) => {
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

  const formatElementUi = (elementName) => {
    const key = String(elementName || "").trim().toLowerCase()
    const map = {
      fire: { label: "Action & Drive", code: "F" },
      earth: { label: "Stability & Growth", code: "E" },
      air: { label: "Thinking & Communication", code: "A" },
      water: { label: "Emotion & Flow", code: "W" },
      space: { label: "Vision & Purpose", code: "S" },
    }
    const picked = map[key]
    if (picked) return { ...picked, meterClass: key }
    const code = key ? key.slice(0, 1).toUpperCase() : ""
    return { label: elementName, code, meterClass: key || "unknown" }
  }

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

  const donutOuterStyle = useMemo(() => {
    // Match reference donut: fixed color layout (cyan -> green -> orange -> purple), 4 equal quarters
    return {
      background:
        "conic-gradient(from -90deg, #22d3ee 0deg 90deg, #22c55e 90deg 180deg, #f59e0b 180deg 270deg, #a855f7 270deg 360deg)",
    }
  }, [])

  const donutInnerStyle = useMemo(() => {
    // Inner should be dark (ring only) like reference screenshot
    return {
      // Use fully-opaque colors so the outer conic ring doesn't "bleed" into the center.
      backgroundColor: "#05060a",
      backgroundImage: [
        "radial-gradient(circle at 50% 38%, #0f2731 0%, #07131b 40%, #04060a 72%, #020307 100%)",
        "radial-gradient(circle at 50% 22%, #0b0f1e 0%, #05060a 58%, #020307 100%)",
      ].join(", "),
    }
  }, [])

  const rulesMatched = Boolean(rulesMatch && rulesMatch.source === "matched")

  const visibleRules = useMemo(() => {
    const list = rulesMatched ? rules || [] : []
    if (showAllRules) return list
    return list.slice(0, 2)
  }, [rules, showAllRules, rulesMatched])

  const topRules = visibleRules
  const primaryRule = rulesMatched ? topRules[0] : null
  const ruleInsight = primaryRule?.insight || primaryRule?.customer_message
  const ruleAction = primaryRule?.next_move || primaryRule?.alternative || primaryRule?.customer_message
  const ruleWhy = primaryRule?.why || primaryRule?.risk || primaryRule?.mistake || primaryRule?.customer_message
  const ruleRisk = primaryRule?.risk
  const ruleMistake = primaryRule?.mistake

  const currentState = useMemo(() => {
    const score = Number(scores.careerAlignmentScore || 0)
    if (score >= 75) {
      return {
        tone: "strong",
        label: "Strong",
        title: "Career Momentum",
        description: "You are in a stable and growth-ready phase. Keep your actions consistent to amplify outcomes.",
        recoveryDays: 7,
      }
    }
    if (score >= 55) {
      return {
        tone: "mixed",
        label: "Improving",
        title: "Career Momentum",
        description: "Momentum is building. Focus on clarity and follow-through this week to improve outcomes.",
        recoveryDays: 10,
      }
    }
    return {
      tone: "unstable",
      label: "Unstable",
      title: "Career Momentum",
      description: "Your energy is fluctuating. Stabilize your actions this week to improve outcomes.",
      recoveryDays: 14,
    }
  }, [scores.careerAlignmentScore])

  const ruleMatchPct = useMemo(() => {
    if (!rulesMatched || !primaryRule || !ruleScores) return null
    const metrics = [
      { key: "fire", low: "fire_element_low", high: "fire_element_high" },
      { key: "earth", low: "earth_element_low", high: "earth_element_high" },
      { key: "air", low: "air_element_low", high: "air_element_high" },
      { key: "water", low: "water_element_low", high: "water_element_high" },
      { key: "space", low: "space_element_low", high: "space_element_high" },
      { key: "action", low: "action_energy_low", high: "action_energy_high" },
      { key: "clarity", low: "clarity_energy_low", high: "clarity_energy_high" },
      { key: "emotional", low: "emotional_energy_low", high: "emotional_energy_high" },
      { key: "opportunity", low: "opportunity_energy_low", high: "opportunity_energy_high" },
    ]

    const clamp = (n, min, max) => Math.max(min, Math.min(max, n))
    const scores01 = metrics
      .map((m) => {
        const val = Number(ruleScores?.[m.key])
        const lo = Number(primaryRule?.[m.low])
        const hi = Number(primaryRule?.[m.high])
        if (![val, lo, hi].every((n) => Number.isFinite(n))) return null
        if (hi <= lo) return null
        const mid = (lo + hi) / 2
        const half = (hi - lo) / 2
        const dist = Math.abs(val - mid)
        const inside = dist <= half ? 1 : 0.85
        const closeness = 1 - clamp(dist / (half + 1), 0, 1)
        return inside * closeness
      })
      .filter(Boolean)

    if (!scores01.length) return null
    const avg = scores01.reduce((a, b) => a + b, 0) / scores01.length
    return clamp(Math.round(60 + avg * 40), 60, 98)
  }, [rulesMatched, primaryRule, ruleScores])

  const forecast = useMemo(() => {
    const overall = Number(scores.careerAlignmentScore || 0)
    const time = Number(scores.timeAlignment || 0)
    const action = Number(scores.actionScore || 0)
    const todayMode = overall < 55 || action < 50 ? "HOLD" : "ACT"
    const nextMode = overall >= 70 ? "Strong" : overall >= 55 ? "Improving" : "Unstable"
    const nextSub = overall >= 70 ? "Momentum accelerating" : overall >= 55 ? "Momentum rising" : "Momentum fluctuating"

    const windows = time >= 70 ? ["Thu", "Sat"] : time >= 55 ? ["Wed", "Fri"] : ["Mon", "Tue"]
    const bestLabel = `${windows[0]} – ${windows[1]}`
    const bestSub = time >= 55 ? "Take important actions" : "Keep decisions small"

    return {
      todayMode,
      todaySub: todayMode === "HOLD" ? "Avoid major decisions" : "Take one key action",
      nextMode,
      nextSub,
      bestLabel,
      bestSub,
    }
  }, [scores.careerAlignmentScore, scores.timeAlignment, scores.actionScore])

  const nextModeTone = useMemo(() => {
    const mode = String(forecast.nextMode || "").toLowerCase()
    if (mode.includes("strong")) return "strong"
    if (mode.includes("improv")) return "improving"
    if (mode.includes("unstable")) return "unstable"
    return "neutral"
  }, [forecast.nextMode])

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
    <div className="landing">
      <div className="results-shell results-shell--landing space-y-3">
        <div className="flex justify-start">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <FaArrowLeft />
          </button>
        </div>
        <section
          aria-labelledby="nd-current-state"
          className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[#070708] px-6 py-7 text-left shadow-[0_28px_70px_rgba(0,0,0,0.55)] md:px-9 md:py-9"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(212,175,55,0.18),transparent_56%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.12),transparent_62%),radial-gradient(circle_at_78%_58%,rgba(168,85,247,0.10),transparent_60%),linear-gradient(180deg,#0b0c0d_0%,#050607_100%)] opacity-95" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,0.06),transparent_52%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_92%,rgba(0,0,0,0.72),transparent_55%),radial-gradient(circle_at_90%_92%,rgba(0,0,0,0.72),transparent_55%)]" />

          <div className="grid items-start gap-8 md:grid-cols-[1fr_360px]">
            <div className="relative z-10 min-w-0 text-center md:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#B8941f]">YOUR CURRENT STATE</p>
              <div className="mt-3">
                <h1 className="text-[clamp(34px,4.2vw,54px)] font-bold leading-[1.02] tracking-[-0.02em] text-white" id="nd-current-state">
                  Career Momentum
                </h1>
                <div
                  className={`mt-1 text-[clamp(34px,4.2vw,54px)] font-bold leading-[1.02] tracking-[-0.02em] ${
                    currentState.tone === "strong"
                      ? "text-[#D4AF37]"
                      : currentState.tone === "mixed"
                        ? "text-[#a3e635]"
                        : "text-[#f59e0b]"
                  }`}
                >
                  {currentState.label}
                </div>
              </div>
              <p className="mt-5 mx-auto max-w-[72ch] text-[15px] leading-[1.5] text-white/70 md:mx-0 md:text-[16px]">
                {currentState.description}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-4 md:justify-start">
                <div className="flex min-w-[250px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/45 text-[#22d3ee]" aria-hidden="true">
                    <FaBullseye />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] text-white/70">Score</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-[26px] font-bold leading-none text-[#f59e0b]">{scores.careerAlignmentScore}</div>
                      <div className="text-[14px] font-semibold text-white/55">/100</div>
                    </div>
                  </div>
                </div>

                <div className="flex min-w-[250px] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-black/45 text-[#34d399]" aria-hidden="true">
                    <FaShieldAlt />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] text-white/70">Confidence</div>
                    <div className="text-[26px] font-bold leading-none text-[#34d399]">{confidencePct}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-4 pt-2">
              <div
                className="grid place-items-center rounded-full p-[14px] shadow-[0_30px_70px_rgba(0,0,0,0.58),0_0_26px_rgba(34,211,238,0.12)]"
                style={donutOuterStyle}
                aria-label={`Career score ${scores.careerAlignmentScore} out of 100`}
              >
                <div
                  className="relative grid h-[190px] w-[190px] place-items-center rounded-full border border-white/10 shadow-[inset_0_0_26px_rgba(0,0,0,0.72)] md:h-[210px] md:w-[210px]"
                  style={donutInnerStyle}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_55%,rgba(0,0,0,0.0),rgba(0,0,0,0.55)_72%)]" />
                  <div className="relative text-center">
                    <div className="text-[58px] font-bold leading-none text-white md:text-[66px]">{scores.careerAlignmentScore}</div>
                    <div className="mt-1 text-[13px] font-semibold text-white/70">Career Score</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-5 text-[13px] text-white/75" aria-label="Ring legend">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#22d3ee]" aria-hidden="true" /> Awareness
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" aria-hidden="true" /> Opportunity
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7]" aria-hidden="true" /> Action
                </span>
              </div>

              <button
                type="button"
                onClick={handleRetake}
                disabled={retakeLoading}
                className="nd-retake-btn w-full max-w-[280px] px-8 py-3 text-[14px] font-extrabold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {retakeLoading ? "Starting..." : "Retake Assessment"}
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-7 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-[14px] text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-black/25 text-white/80" aria-hidden="true">
              <FaArrowUp />
            </span>
            <span>
              Good recovery possible in next{" "}
              <span className="font-semibold text-[#34d399]">{currentState.recoveryDays} days</span>.
            </span>
          </div>
        </section>

        <section className="card nd-forecast" aria-labelledby="nd-forecast-title">
          <p className="nd-kicker" id="nd-forecast-title">TODAY & NEXT 7 DAYS</p>
          <div className="nd-forecast-row" role="list" aria-label="7 day forecast summary">
            <div className="nd-forecast-slot" role="listitem">
              <div className="nd-forecast-label">Today</div>
              <div className={`nd-forecast-value nd-forecast-value--${forecast.todayMode === "HOLD" ? "hold" : "act"}`}>{forecast.todayMode}</div>
              <div className="nd-forecast-sub">{forecast.todaySub}</div>
            </div>
            <div className="nd-forecast-slot" role="listitem">
              <div className="nd-forecast-label">Next 3 Days</div>
              <div className={`nd-forecast-value nd-forecast-value--${nextModeTone}`}>{forecast.nextMode}</div>
              <div className="nd-forecast-sub">{forecast.nextSub}</div>
            </div>
            <div className="nd-forecast-slot" role="listitem">
              <div className="nd-forecast-label">Best Window</div>
              <div className="nd-forecast-value nd-forecast-value--best">{forecast.bestLabel}</div>
              <div className="nd-forecast-sub">{forecast.bestSub}</div>
            </div>
            <div className="nd-forecast-action">
              <button type="button" className="nd-timeline-btn-compact" onClick={() => setShowTimeline(true)} aria-haspopup="dialog">
                <span className="nd-timeline-ico" aria-hidden="true"><Icon d={ICONS.calendar} /></span>
                <span className="nd-timeline-text">
                  <span>View</span>
                  <span>Timeline</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        <section className="card nd-core" aria-labelledby="nd-core-title">
          <div className="card-header nd-core-head">
            <h3 id="nd-core-title">YOUR CORE METRICS</h3>
            <span className="pill dark">Out of 100</span>
          </div>

          <div className="nd-core-row" role="list" aria-label="Core metrics summary">
            <div className="nd-core-slot" role="listitem">
              <div className="nd-core-top">
                <div className="nd-core-icon2 nd-core-icon2--blue" aria-hidden="true"><Icon d={ICONS.head} /></div>
                <div className="nd-core-copy">
                  <div className="nd-core-title">Awareness</div>
                  <div className="nd-core-sub">Clarity</div>
                </div>
                <MiniDonut value={scores.awarenessScore} color="#22d3ee" label="Awareness score" />
              </div>
              <div className="nd-core-foot">Good clarity. Stay focused.</div>
            </div>

            <div className="nd-core-slot" role="listitem">
              <div className="nd-core-top">
                <div className="nd-core-icon2 nd-core-icon2--orange" aria-hidden="true"><Icon d={ICONS.hourglass} /></div>
                <div className="nd-core-copy">
                  <div className="nd-core-title">Time</div>
                  <div className="nd-core-sub">Opportunity</div>
                </div>
                <MiniDonut value={scores.timeAlignment} color="#f59e0b" label="Time score" />
              </div>
              <div className="nd-core-foot">Good window coming soon.</div>
            </div>

            <div className="nd-core-slot" role="listitem">
              <div className="nd-core-top">
                <div className="nd-core-icon2 nd-core-icon2--violet" aria-hidden="true"><Icon d={ICONS.bolt} /></div>
                <div className="nd-core-copy">
                  <div className="nd-core-title">Action</div>
                  <div className="nd-core-sub">Execution</div>
                </div>
                <MiniDonut value={scores.actionScore} color="#a855f7" label="Action score" />
              </div>
              <div className="nd-core-foot">Consistency is the key.</div>
            </div>
          </div>
        </section>

        <section className="nd-split" aria-label="Rules and elements">
          <div className="card nd-rule" aria-labelledby="nd-rule-title">
            <div className="card-header nd-tight">
              <h3 id="nd-rule-title">TOP RULE MATCH</h3>
              <button
                type="button"
                className="pill dark"
                onClick={() => setShowAllRules((v) => !v)}
                aria-label={showAllRules ? "Show only top rule" : "Show more matching rules"}
              >
                {showAllRules ? "Top only" : "Details"}
              </button>
            </div>

            {primaryRule ? (
              <>
                <div className="nd-rule-row">
                  <div className="nd-rule-name">{primaryRule.rule_name || "Rule Match"}</div>
                  <div className="nd-rule-pill">{(ruleMatchPct ?? 84)}% Match</div>
                </div>
                <p className="nd-rule-desc">{primaryRule.customer_message || primaryRule.insight || "We matched your pattern with the closest rule."}</p>
                <div className="nd-rule-tags" aria-label="Rule tags">
                  <span className="nd-tag">{currentState.label} Momentum</span>
                  {primaryRule.rule_type && <span className="nd-tag nd-tag--muted">{primaryRule.rule_type}</span>}
                  {primaryRule.risk && <span className="nd-tag nd-tag--alert">{primaryRule.risk}</span>}
                </div>
                {showAllRules && (
                  <div className="rule-grid" style={{ marginTop: 12 }}>
                    {topRules.map((rule, idx) => (
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
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="subtle" style={{ marginTop: 6 }}>
                No matching rule available yet.
              </p>
            )}
          </div>

          <div className="card nd-elements" aria-labelledby="nd-elements-title">
            <div className="card-header nd-tight">
              <h3 id="nd-elements-title">ELEMENT BALANCE</h3>
              <span className="pill dark">Details</span>
            </div>
            <div className="nd-elements-body">
              <div className="donut-ring nd-elements-donut" style={elementDonutStyle} aria-label="Element balance donut">
                <div className="donut-hole">
                  <div className="donut-inner-glow">
                    <span className="donut-label">Elements</span>
                    <span className="donut-number small">5</span>
                  </div>
                </div>
              </div>
              <ul className="element-list" aria-label="Element list">
                {elementList.map((item) => (
                  <li key={item.name}>
                    {(() => {
                      const ui = formatElementUi(item.name)
                      return (
                        <>
                          <span>
                            {ui.label} ({ui.code})
                          </span>
                          <div className={`meter ${ui.meterClass}`} aria-hidden="true"><div style={{ width: `${item.value}%` }} /></div>
                          <strong>{item.value}%</strong>
                        </>
                      )
                    })()}
                  </li>
                ))}
                {!elementList.length && <li className="subtle">No element data yet.</li>}
              </ul>
            </div>
          </div>
        </section>

        <section className="card nd-guidance" aria-labelledby="nd-guidance-title">
          <div className="card-header nd-tight">
            <h3 id="nd-guidance-title">YOUR GUIDANCE</h3>
            <span className="pill dark">Focus</span>
          </div>

          <div className="nd-guidance-row" role="list" aria-label="Guidance summary">
            <div className="nd-guidance-slot" role="listitem">
              <div className="nd-guidance-top">
                <span className="nd-guidance-ico nd-guidance-ico--insight" aria-hidden="true"><Icon d={ICONS.insight} /></span>
                <div className="nd-guidance-title nd-guidance-title--insight">Insight</div>
              </div>
              <p className="nd-guidance-text">{ruleInsight || nextMove.why || "Good clarity. Stay focused."}</p>
            </div>

            <div className="nd-guidance-slot" role="listitem">
              <div className="nd-guidance-top">
                <span className="nd-guidance-ico nd-guidance-ico--action" aria-hidden="true"><Icon d={ICONS.action} /></span>
                <div className="nd-guidance-title nd-guidance-title--action">Action</div>
              </div>
              <p className="nd-guidance-text">{ruleAction || nextMove.action || "Stabilize your actions and pace."}</p>
            </div>

            <div className="nd-guidance-slot" role="listitem">
              <div className="nd-guidance-top">
                <span className="nd-guidance-ico nd-guidance-ico--why" aria-hidden="true"><Icon d={ICONS.why} /></span>
                <div className="nd-guidance-title nd-guidance-title--why">Why</div>
              </div>
              <p className="nd-guidance-text">{ruleWhy || nextMove.opportunity || "Inconsistent execution creates uncertainty."}</p>
            </div>

            <div className="nd-guidance-slot" role="listitem">
              <div className="nd-guidance-top">
                <span className="nd-guidance-ico nd-guidance-ico--risk" aria-hidden="true"><Icon d={ICONS.risk} /></span>
                <div className="nd-guidance-title nd-guidance-title--risk">Risk</div>
              </div>
              <p className="nd-guidance-text">{ruleRisk || ruleMistake || nextMove.avoid || "Wrong switching may cause burnout and missed opportunities."}</p>
            </div>
          </div>
        </section>

        <section className="card nd-report" aria-label="Full report">
          <div className="nd-report-bar">
            <div className="nd-report-left">
              <span className="nd-report-ico" aria-hidden="true"><Icon d={ICONS.spark} /></span>
              <div className="nd-report-copy">
                <div className="nd-report-title">Get your Personalized Action Plan</div>
                <div className="nd-report-sub">
                  {reportPaid ? "Unlocked • Get detailed guidance and next steps." : "Unlock timing windows, weekly plan & deep insights."}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="nd-report-btn"
              onClick={() => navigate(reportPaid ? "/report/dashboard" : "/report/unlock")}
              aria-label={reportPaid ? "View full report" : "Upgrade to Pro"}
            >
              <span className="nd-report-btn-ico" aria-hidden="true"><Icon d={ICONS.crown} /></span>
              <span className="nd-report-btn-text">{reportPaid ? "View Full Report" : "Upgrade to Pro"}</span>
              <span className="nd-report-btn-arrow" aria-hidden="true"><Icon d={ICONS.chevronRight} /></span>
            </button>
          </div>
        </section>

        {showTimeline && (
          <div className="nd-modal" role="dialog" aria-modal="true" aria-label="Timeline dialog" onClick={() => setShowTimeline(false)}>
            <div className="nd-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="nd-modal-head">
                <div className="nd-modal-title-wrap">
                  <h3 className="nd-modal-title" style={{ margin: 0 }}>Timeline</h3>
                  <div className="nd-modal-subtitle">Today • Next 3 Days • Best Window</div>
                </div>
                <button type="button" className="nd-modal-close" onClick={() => setShowTimeline(false)} aria-label="Close timeline">
                  <span className="nd-modal-close-ico" aria-hidden="true"><Icon d={ICONS.close} /></span>
                  Close
                </button>
              </div>
              <div className="nd-modal-body">
                <div className="nd-modal-item">
                  <div className="nd-modal-k">Today</div>
                  <div className="nd-modal-v">
                    <span className={`nd-modal-pill nd-modal-pill--${forecast.todayMode === "HOLD" ? "hold" : "act"}`}>{forecast.todayMode}</span>
                    <span className="nd-modal-dot" aria-hidden="true">•</span>
                    <span>{forecast.todaySub}</span>
                  </div>
                </div>
                <div className="nd-modal-item">
                  <div className="nd-modal-k">Next 3 Days</div>
                  <div className="nd-modal-v">
                    <span className={`nd-modal-pill nd-modal-pill--${nextModeTone}`}>{forecast.nextMode}</span>
                    <span className="nd-modal-dot" aria-hidden="true">•</span>
                    <span>{forecast.nextSub}</span>
                  </div>
                </div>
                <div className="nd-modal-item">
                  <div className="nd-modal-k">Best Window</div>
                  <div className="nd-modal-v">
                    <span className="nd-modal-pill nd-modal-pill--best">{forecast.bestLabel}</span>
                    <span className="nd-modal-dot" aria-hidden="true">•</span>
                    <span>{forecast.bestSub}</span>
                  </div>
                </div>
                <div className="nd-modal-item">
                  <div className="nd-modal-k">Focus</div>
                  <div className="nd-modal-v">
                    <span className="nd-modal-pill nd-modal-pill--focus">Focus</span>
                    <span className="nd-modal-dot" aria-hidden="true">•</span>
                    <span>{nextMove.nextMove || "Build one stable habit."}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTop && (
          <button className="top-button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Scroll to top">
            <FaArrowUp />
          </button>
        )}
      </div>
    </div>
  )
}

export default Results


