import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaArrowLeft, FaLightbulb } from "react-icons/fa"

import { api } from "../lib/api"
import { useUser } from "../context/UserContext"

function SuggestionsPage() {
  const navigate = useNavigate()
  const { user } = useUser()

  const [suggestionText, setSuggestionText] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  const loadMySuggestions = async () => {
    if (!user) return
    setLoading(true)
    setError("")
    try {
      const response = await api.get("/suggestions")
      setSuggestions(response.data?.suggestions || [])
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not load suggestions.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMySuggestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSendSuggestion = async () => {
    const message = suggestionText.trim()
    if (!message) return

    setSending(true)
    setError("")
    try {
      const response = await api.post("/suggestions", { message })
      setSuggestions((current) => [response.data, ...current].slice(0, 20))
      setSuggestionText("")
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not send suggestion.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="suggestions-page-shell">
      <div className="suggestions-page-header">
        <button type="button" className="suggestions-back" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
      </div>

      <div className="suggestions-page-card">
        <div className="suggestions-page-title">
          <FaLightbulb />
          <div>
            <h1>Suggestions</h1>
            <p>Tell us what to improve. Admin updates will show here.</p>
          </div>
        </div>

        <div className="suggestions-form">
          <textarea
            className="suggestion-textarea"
            rows={5}
            placeholder="Tell us what to improve..."
            value={suggestionText}
            onChange={(e) => setSuggestionText(e.target.value)}
          />
          <div className="suggestions-form-actions">
            <button
              type="button"
              className="suggestions-send-btn"
              disabled={sending || !suggestionText.trim()}
              onClick={handleSendSuggestion}
            >
              {sending ? "Sending..." : "Send"}
            </button>
            <button type="button" className="suggestions-refresh-btn" disabled={loading} onClick={loadMySuggestions}>
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="suggestions-hint error">{error}</div>}

        {loading ? (
          <div className="suggestions-hint">Loading your suggestions…</div>
        ) : suggestions.length ? (
          <div className="suggestions-list page">
            {suggestions.map((item) => (
              <div key={item.id} className="suggestion-item">
                <div className="suggestion-meta">
                  <span className={`suggestion-status ${item.status === "resolved" ? "resolved" : "pending"}`}>
                    {item.status === "resolved" ? "Done" : "Pending"}
                  </span>
                  <span className="suggestion-date">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
                  </span>
                </div>
                <div className="suggestion-message">{item.message}</div>
                {item.admin_response && <div className="suggestion-admin">Admin: {item.admin_response}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="suggestions-hint">No suggestions yet.</div>
        )}
      </div>
    </div>
  )
}

export default SuggestionsPage

