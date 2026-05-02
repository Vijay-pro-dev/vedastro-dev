import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaArrowLeft, FaLightbulb } from "react-icons/fa"
import "../tailwind.css"
import "../styles/pages/ProfileMenu.css"

import { api } from "../lib/api"
import { useUser } from "../context/UserContext"

function SuggestionsPage() {
  const navigate = useNavigate()
  const { user } = useUser()

  const [suggestionText, setSuggestionText] = useState("")
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState("")
  const [imageUploading, setImageUploading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)

  const imagePreviewUrl = useMemo(() => {
    if (!imageFile) return ""
    return URL.createObjectURL(imageFile)
  }, [imageFile])

  useEffect(() => {
    if (!imagePreviewUrl) return undefined
    return () => URL.revokeObjectURL(imagePreviewUrl)
  }, [imagePreviewUrl])

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

  const handleUploadImage = async (file) => {
    if (!file) return

    setImageUploading(true)
    setError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await api.post("/suggestions/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      setImageUrl(response.data?.image_url || "")
    } catch (requestError) {
      setImageUrl("")
      setError(requestError.response?.data?.detail || "Could not upload image.")
    } finally {
      setImageUploading(false)
    }
  }

  const handleSendSuggestion = async () => {
    const message = suggestionText.trim()
    if (!message) return

    setSending(true)
    setError("")
    try {
      const payload = { message }
      if (imageUrl) payload.image_url = imageUrl
      const response = await api.post("/suggestions", payload)
      setSuggestions((current) => [response.data, ...current].slice(0, 20))
      setSuggestionText("")
      setImageFile(null)
      setImageUrl("")
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not send suggestion.")
    } finally {
      setSending(false)
    }
  }

  return (
      <div className="suggestions-page-shell">
      <div className="suggestions-page-header">
        <button type="button" className="suggestions-back" onClick={() => navigate(-1)} aria-label="Go back">
          <FaArrowLeft />
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
          <div className="suggestions-upload">
            <div className="suggestions-upload-row">
              <label className="suggestions-upload-btn">
                Upload image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    setImageFile(file)
                    setImageUrl("")
                    if (file) handleUploadImage(file)
                  }}
                />
              </label>
              {imageUploading && <span className="suggestions-upload-hint">Uploading…</span>}
              {!imageUploading && imageUrl && <span className="suggestions-upload-hint ok">Uploaded</span>}
              {!imageUploading && imageFile && !imageUrl && <span className="suggestions-upload-hint">Ready</span>}
            </div>

            {(imagePreviewUrl || imageUrl) && (
              <div className="suggestions-image-preview">
                <img src={imageUrl || imagePreviewUrl} alt="Suggestion upload preview" />
                <button
                  type="button"
                  className="suggestions-remove-image"
                  onClick={() => {
                    setImageFile(null)
                    setImageUrl("")
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <div className="suggestions-form-actions">
            <button
              type="button"
              className="suggestions-send-btn"
              disabled={sending || imageUploading || !suggestionText.trim()}
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
                {item.image_url && (
                  <a className="suggestion-image-link" href={item.image_url} target="_blank" rel="noreferrer">
                    View image
                  </a>
                )}
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
