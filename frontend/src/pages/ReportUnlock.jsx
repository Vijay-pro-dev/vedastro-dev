import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { api } from "../lib/api"
import { loadRazorpay } from "../lib/razorpay"

const formatMoney = (currency, minor) => {
  const amount = Number(minor || 0) / 100
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

function ReportUnlock() {
  const navigate = useNavigate()
  const [pricing, setPricing] = useState(null)
  const [plans, setPlans] = useState([])
  const [planKey, setPlanKey] = useState("monthly")
  const [paid, setPaid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fullReport, setFullReport] = useState(null)

  useEffect(() => {
    api
      .get("/payments/report/pricing")
      .then((r) => setPricing(r.data))
      .catch(() => {})

    api
      .get("/payments/report/plans")
      .then((r) => {
        const nextPlans = Array.isArray(r.data) ? r.data : []
        setPlans(nextPlans)
        if (nextPlans.length && !nextPlans.some((p) => p?.plan_key === planKey)) {
          setPlanKey(nextPlans[0]?.plan_key || "monthly")
        }
      })
      .catch(() => {})

    api
      .get("/payments/report/status")
      .then((r) => setPaid(Boolean(r.data?.paid)))
      .catch(() => {})
  }, [])

  const currency = pricing?.currency || "INR"
  const planAmount = pricing?.plans?.[planKey]?.amount
  const selectedPlan = useMemo(() => plans.find((p) => p?.plan_key === planKey), [plans, planKey])
  const planPriceLabel = useMemo(() => {
    if (planAmount == null) return ""
    const label = selectedPlan?.plan_name || planKey
    return `${formatMoney(currency, planAmount)} / ${label}`
  }, [currency, planAmount, planKey, selectedPlan])

  const startPayment = async () => {
    setError("")
    setLoading(true)
    try {
      const orderResp = await api.post(`/payments/report/order?plan_key=${encodeURIComponent(planKey)}`)
      await loadRazorpay()

      const user = JSON.parse(localStorage.getItem("user") || "{}")
      const options = {
        key: orderResp.data.key_id,
        amount: orderResp.data.amount,
        currency: orderResp.data.currency,
        name: "Vedastro",
        description: "Full Career Report",
        order_id: orderResp.data.order_id,
        handler: async (response) => {
          try {
            await api.post("/payments/report/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
            setPaid(true)
            setError("")
          } catch (e) {
            setError(e?.response?.data?.detail || "Payment verification failed.")
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#7c3aed" },
      }

      const rzp = new window.Razorpay(options)
      rzp.on("payment.failed", () => setError("Payment failed. Please try again."))
      rzp.open()
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not start payment.")
    } finally {
      setLoading(false)
    }
  }

  const loadReport = async () => {
    setError("")
    setLoading(true)
    try {
      const resp = await api.get("/career/report/full")
      setFullReport(resp.data)
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to load report.")
    } finally {
      setLoading(false)
    }
  }

  const downloadPdf = async () => {
    setError("")
    setLoading(true)
    try {
      const resp = await api.get("/career/report/pdf", { responseType: "blob" })
      const blob = new Blob([resp.data], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "vedastro-report.pdf"
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      const status = e?.response?.status
      const data = e?.response?.data
      let detail = ""

      if (data && typeof data === "object" && typeof data.detail === "string") {
        detail = data.detail
      } else if (data && typeof Blob !== "undefined" && data instanceof Blob) {
        try {
          const text = await data.text()
          try {
            const parsed = JSON.parse(text)
            if (parsed && typeof parsed.detail === "string") detail = parsed.detail
            else detail = text
          } catch {
            detail = text
          }
        } catch {
          detail = ""
        }
      }

      setError(detail || (status ? `Failed to download PDF (${status}).` : "Failed to download PDF."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container narrow report-unlock-shell">
      <div className="card wide report-unlock-card">
        <div className="card-header">
          <h3>Unlock Full Report</h3>
          <span className="pill dark">{paid ? "Unlocked" : "Locked"}</span>
        </div>
        <p className="subtle report-unlock-sub">
          Choose a plan and complete payment to unlock your complete report.
        </p>

        {error && (
          <p className="subtle report-unlock-error">
            {error}
          </p>
        )}

        {!paid && (
          <>
            <div className="report-plan-grid">
              {(plans?.length ? plans : [{ plan_key: "monthly", plan_name: "Monthly", duration_days: 30 }, { plan_key: "yearly", plan_name: "Yearly", duration_days: 365 }]).map((plan) => {
                const key = plan?.plan_key || "monthly"
                const amount = pricing?.plans?.[key]?.amount
                const copy = key === "yearly" ? "Best value for ongoing access." : "Best for trying the full report."
                return (
                  <button
                    key={key}
                    type="button"
                    className={`report-plan-card ${planKey === key ? "selected" : ""}`}
                    onClick={() => setPlanKey(key)}
                  >
                    <div className="report-plan-head">
                      <div className="report-plan-title">
                        <strong>{plan?.plan_name || key}</strong>
                        <span className="report-plan-meta">{plan?.duration_days || (key === "yearly" ? 365 : 30)} days access</span>
                      </div>
                      {amount != null && <span className="pill dark">{formatMoney(currency, amount)}</span>}
                    </div>
                    <p className="subtle report-plan-copy">{copy}</p>
                  </button>
                )
              })}
            </div>

            <div className="report-actions">
              {planPriceLabel && <span className="pill dark report-selected-pill">Selected: {planPriceLabel}</span>}
              <div className="report-action-buttons">
                <button type="button" className="auth-button report-pay-btn" disabled={loading} onClick={startPayment}>
                  {loading ? "Starting payment..." : "Pay & Unlock"}
                </button>
                <button type="button" className="auth-button report-back-btn" onClick={() => navigate("/newdashboard")}>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </>
        )}

        {paid && (
          <div className="report-actions">
            <div className="report-action-buttons">
              <button type="button" className="auth-button report-pay-btn" disabled={loading} onClick={downloadPdf}>
                {loading ? "Preparing PDF..." : "Download PDF"}
              </button>
              <button type="button" className="auth-button report-back-btn" onClick={() => navigate("/newdashboard")}>
                Back to Dashboard
              </button>
              {fullReport && (
                <button
                  type="button"
                  className="auth-button report-back-btn"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(fullReport, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "vedastro-report.json"
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Download JSON
                </button>
              )}
            </div>
          </div>
        )}

        {paid && fullReport && (
          <div className="report-preview">
            <pre className="report-preview-pre">
              {JSON.stringify(fullReport, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReportUnlock
