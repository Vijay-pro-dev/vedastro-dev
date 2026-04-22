import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaArrowLeft } from "react-icons/fa"
import "../tailwind.css"
import { api } from "../lib/api"

const Icon = ({ d }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)

const ICONS = {
  spark: "M12 2l1.6 5.1L19 9l-5.4 1.7L12 16l-1.6-5.3L5 9l5.4-1.9L12 2Z",
  crown: "M5 18h14l-1-9-4 4-3-6-3 6-4-4-1 9ZM5 21h14",
  download: "M12 3v10m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 8v6m0-9h.01",
  action: "M5 12h14M12 5l7 7-7 7",
  why: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 18h.01",
  risk: "M12 3 3 19h18L12 3Zm0 8v3m0 3h.01",
}

const extractSection = (text, key) => {
  const raw = typeof text === "string" ? text : ""
  if (!raw.trim()) return ""

  const headingMap = {
    insight: /KEY INSIGHT/i,
    action: /NEXT BEST MOVE|ACTION STEPS/i,
    why: /WHY THIS IS HAPPENING/i,
    risk: /RISK ALERTS|BLIND SPOT INDEX/i,
  }

  const allHeadings = [
    { k: "insight", re: headingMap.insight },
    { k: "action", re: headingMap.action },
    { k: "why", re: headingMap.why },
    { k: "risk", re: headingMap.risk },
    { k: "timing", re: /TIMING WINDOWS/i },
    { k: "elements", re: /ELEMENT( |AL) BALANCE/i },
    { k: "energy", re: /ENERGY (PROFILE|MAP)/i },
    { k: "summary", re: /EXECUTIVE SUMMARY|CORE SCORES|SCOREBOARD/i },
    { k: "verdict", re: /FINAL VERDICT/i },
  ]
    .map((h) => ({ ...h, idx: h.re.exec(raw)?.index ?? -1 }))
    .filter((h) => h.idx >= 0)
    .sort((a, b) => a.idx - b.idx)

  const target = allHeadings.find((h) => h.k === key)
  if (!target) return ""

  const end = allHeadings.find((h) => h.idx > target.idx)?.idx ?? raw.length
  const chunk = raw.slice(target.idx, end).trim()

  const lines = chunk.split(/\r?\n/)
  const headingLineIndex = lines.findIndex((line) => headingMap[key]?.test(line))
  const body = (headingLineIndex >= 0 ? lines.slice(headingLineIndex + 1) : lines.slice(1)).join("\n").trim()
  return body
}

function ReportDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [planKey, setPlanKey] = useState(null)
  const [engine, setEngine] = useState("v2")
  const [reportText, setReportText] = useState("")
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let mounted = true
    api
      .get("/payments/report/status")
      .then((r) => {
        if (!mounted) return
        const nextPlan = r.data?.plan_key || null
        setPlanKey(nextPlan)
        const isYearly = String(nextPlan || "").toLowerCase() === "yearly"
        setEngine((prev) => {
          if (isYearly) return prev === "v1" || prev === "v2" || prev === "v3" ? (prev === "v2" ? "v3" : prev) : "v3"
          return prev === "v3" ? "v2" : prev
        })
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError("")
      try {
        const resp = await api.get(`/career/report/ai?engine=${encodeURIComponent(engine)}`)
        const txt = resp.data?.report_text
        if (!mounted) return
        setReportText(typeof txt === "string" ? txt : "")
      } catch (e) {
        const status = e?.response?.status
        const detail = e?.response?.data?.detail
        if (!mounted) return
        if (status === 402) {
          setError("Payment required to view this report.")
        } else {
          setError(typeof detail === "string" ? detail : "Failed to load AI report.")
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [engine])

  const cards = useMemo(() => {
    const insight = extractSection(reportText, "insight")
    const action = extractSection(reportText, "action")
    const why = extractSection(reportText, "why")
    const risk = extractSection(reportText, "risk")
    return {
      insight,
      action,
      why,
      risk,
    }
  }, [reportText])

  const downloadPdf = async () => {
    if (downloading) return
    setDownloading(true)
    setError("")
    try {
      const resp = await api.get(`/career/report/pdf?engine=${encodeURIComponent(engine)}`, { responseType: "blob" })
      const blob = new Blob([resp.data], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `vedastro-report-${engine}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      const detail = e?.response?.data?.detail
      setError(typeof detail === "string" ? detail : "Failed to download PDF.")
    } finally {
      setDownloading(false)
    }
  }

  const canUseV3 = String(planKey || "").toLowerCase() === "yearly"

  return (
    <div className="landing">
      <div className="page-container narrow report-dashboard-shell report-dashboard-shell--landing">
        <div className="report-dashboard-topbar">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <FaArrowLeft />
          </button>
          <button type="button" className="pill dark report-dashboard-home" onClick={() => navigate("/")} aria-label="Back to Home">
            Back to Home
          </button>
        </div>

        <div className="card wide report-dashboard-card">
          <div className="card-header">
            <div className="report-dashboard-head">
              <span className="report-dashboard-ico" aria-hidden="true"><Icon d={ICONS.spark} /></span>
              <div className="report-dashboard-copy">
                <h3 style={{ margin: 0 }}>Report Dashboard</h3>
                <p className="subtle report-dashboard-sub">Detailed Insight • Action • Why • Risk</p>
              </div>
            </div>
            <div className="report-dashboard-actions">
              <label className="subtle report-dashboard-engine">
                Engine
                <select value={engine} onChange={(e) => setEngine(e.target.value)} className="report-dashboard-select" aria-label="Select report engine">
                  <option value="v1">v1</option>
                  <option value="v2">v2</option>
                  {canUseV3 && <option value="v3">v3</option>}
                </select>
              </label>
            </div>
          </div>

          {error && <p className="subtle report-dashboard-error">{error}</p>}

          {loading ? (
            <div className="report-dashboard-skeleton">
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
              <div className="skeleton-card" />
            </div>
          ) : (
            <>
              <div className="report-dashboard-grid" role="list" aria-label="AI report highlights">
                <div className="report-dashboard-panel report-dashboard-panel--cyan" role="listitem">
                  <div className="report-dashboard-panel-head">
                    <span className="report-dashboard-panel-ico" aria-hidden="true"><Icon d={ICONS.info} /></span>
                    <div className="report-dashboard-panel-title">Insight</div>
                  </div>
                  <div className="report-dashboard-panel-text">{cards.insight || "No Insight section found in this engine output."}</div>
                </div>

                <div className="report-dashboard-panel report-dashboard-panel--gold" role="listitem">
                  <div className="report-dashboard-panel-head">
                    <span className="report-dashboard-panel-ico" aria-hidden="true"><Icon d={ICONS.action} /></span>
                    <div className="report-dashboard-panel-title">Action</div>
                  </div>
                  <div className="report-dashboard-panel-text">{cards.action || "No Action section found in this engine output."}</div>
                </div>

                <div className="report-dashboard-panel report-dashboard-panel--green" role="listitem">
                  <div className="report-dashboard-panel-head">
                    <span className="report-dashboard-panel-ico" aria-hidden="true"><Icon d={ICONS.why} /></span>
                    <div className="report-dashboard-panel-title">Why</div>
                  </div>
                  <div className="report-dashboard-panel-text">{cards.why || "No Why section found in this engine output."}</div>
                </div>

                <div className="report-dashboard-panel report-dashboard-panel--red" role="listitem">
                  <div className="report-dashboard-panel-head">
                    <span className="report-dashboard-panel-ico" aria-hidden="true"><Icon d={ICONS.risk} /></span>
                    <div className="report-dashboard-panel-title">Risk</div>
                  </div>
                  <div className="report-dashboard-panel-text">{cards.risk || "No Risk section found in this engine output."}</div>
                </div>
              </div>

              <div className="report-dashboard-footer">
                <button type="button" className="nd-report-btn" onClick={downloadPdf} disabled={downloading} aria-label="Download report PDF">
                  <span className="nd-report-btn-ico" aria-hidden="true"><Icon d={ICONS.crown} /></span>
                  <span className="nd-report-btn-text">{downloading ? "Preparing PDF..." : "Download PDF"}</span>
                  <span className="nd-report-btn-arrow" aria-hidden="true"><Icon d={ICONS.download} /></span>
                </button>
              </div>

              <details className="report-dashboard-full" aria-label="Full AI report text">
                <summary className="report-dashboard-full-summary">View full AI report text</summary>
                <pre className="report-dashboard-pre">{reportText || "No report text returned."}</pre>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportDashboard
