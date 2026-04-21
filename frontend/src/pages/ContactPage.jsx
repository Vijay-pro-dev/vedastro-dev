import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../tailwind.css"
import {
  FaArrowLeft,
  FaAt,
  FaFacebookF,
  FaEnvelopeOpenText,
  FaGlobe,
  FaInstagram,
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegClock,
  FaShieldAlt,
} from "react-icons/fa"

import { api } from "../lib/api"
import { useUser } from "../context/UserContext"

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim())

const contactDetails = {
  address: String(import.meta.env.VITE_CONTACT_ADDRESS || "").trim(),
  phone: String(import.meta.env.VITE_CONTACT_PHONE || "").trim(),
  email: String(import.meta.env.VITE_CONTACT_EMAIL || "").trim(),
  website: String(import.meta.env.VITE_CONTACT_WEBSITE || "").trim(),
}

const normalizeWebsiteUrl = (value) => {
  if (!value) return ""
  if (value.startsWith("http://") || value.startsWith("https://")) return value
  return `https://${value}`
}

const toTelHref = (value) => {
  if (!value) return ""
  const normalized = value.replace(/[^\d+]/g, "")
  return normalized ? `tel:${normalized}` : ""
}

function ContactPage() {
  const navigate = useNavigate()
  const { user } = useUser()
  const isAdmin = (user?.role || "").toString().trim().toLowerCase() === "admin"
  const instagramUrl = import.meta.env.VITE_INSTAGRAM_URL || "https://instagram.com/"
  const facebookUrl = import.meta.env.VITE_FACEBOOK_URL || "https://facebook.com/"

  const defaultName = user?.name || ""
  const defaultEmail = user?.email || ""

  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    subject: "",
    message: "",
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const canSend = useMemo(() => {
    if (!form.name.trim() || form.name.trim().length < 2) return false
    if (!isValidEmail(form.email)) return false
    if (!form.message.trim() || form.message.trim().length < 10) return false
    return true
  }, [form])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!canSend) {
      setError("Please fill name, a valid email, and a message (min 10 chars).")
      return
    }

    setSending(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || undefined,
        message: form.message.trim(),
      }
      const response = await api.post("/contact", payload)
      setSuccess(response.data?.message || "Message sent.")
      setForm((current) => ({ ...current, subject: "", message: "" }))
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "Could not send message.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="landing">
      <div className="contact-page-shell">
        <div className="contact-page-header">
          <button type="button" className="contact-back" onClick={() => navigate(-1)} aria-label="Go back">
            <FaArrowLeft />
          </button>
        </div>

        <div className="contact-page-card">
          <div className="contact-layout">
            <section className="contact-hero" aria-label="Contact page introduction">
              <div className="contact-title">
                <FaEnvelopeOpenText />
                <div>
                  <h1>Contact Us</h1>
                  <p>Send your question, feedback, or support request. We&apos;ll reply on your email.</p>
                </div>
              </div>

              <div className="contact-hero-points">
                <div className="contact-point">
                  <FaRegClock />
                  <div>
                    <div className="contact-point-title">Fast response</div>
                    <div className="contact-point-sub">Usually within 24 hours.</div>
                  </div>
                </div>
                <div className="contact-point">
                  <FaShieldAlt />
                  <div>
                    <div className="contact-point-title">Secure by default</div>
                    <div className="contact-point-sub">Your message stays private.</div>
                  </div>
                </div>
                <div className="contact-point">
                  <FaLock />
                  <div>
                    <div className="contact-point-title">Account-aware</div>
                    <div className="contact-point-sub">
                      {user ? "We already know your login email." : "Login helps us reply faster."}
                    </div>
                  </div>
                </div>
              </div>

              {(contactDetails.address || contactDetails.phone || contactDetails.email || contactDetails.website) && (
                <div className="contact-details" aria-label="Contact details">
                  <div className="contact-details-title">Contact details</div>
                  <div className="contact-details-list">
                    {contactDetails.address && (
                      <div className="contact-detail">
                        <span className="contact-detail-icon" aria-hidden="true">
                          <FaMapMarkerAlt />
                        </span>
                        <div className="contact-detail-body">
                          <div className="contact-detail-label">Address</div>
                          <div className="contact-detail-value">{contactDetails.address}</div>
                        </div>
                      </div>
                    )}

                    {contactDetails.phone && (
                      <div className="contact-detail">
                        <span className="contact-detail-icon" aria-hidden="true">
                          <FaPhoneAlt />
                        </span>
                        <div className="contact-detail-body">
                          <div className="contact-detail-label">Phone</div>
                          <div className="contact-detail-value">
                            <a href={toTelHref(contactDetails.phone)}>{contactDetails.phone}</a>
                          </div>
                        </div>
                      </div>
                    )}

                    {contactDetails.email && (
                      <div className="contact-detail">
                        <span className="contact-detail-icon" aria-hidden="true">
                          <FaAt />
                        </span>
                        <div className="contact-detail-body">
                          <div className="contact-detail-label">Email</div>
                          <div className="contact-detail-value">
                            <a href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a>
                          </div>
                        </div>
                      </div>
                    )}

                    {contactDetails.website && (
                      <div className="contact-detail">
                        <span className="contact-detail-icon" aria-hidden="true">
                          <FaGlobe />
                        </span>
                        <div className="contact-detail-body">
                          <div className="contact-detail-label">Website</div>
                          <div className="contact-detail-value">
                            <a href={normalizeWebsiteUrl(contactDetails.website)} target="_blank" rel="noreferrer">
                              {contactDetails.website}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="contact-form-card" aria-label="Contact form">
              <div className="contact-form-head">
                <div className="contact-form-kicker">Write to Vedastro</div>
                <div className="contact-form-sub">Be as specific as possible so we can help quickly.</div>
              </div>

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-grid">
                  <label className="contact-field">
                    <span>Name</span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                      placeholder="Your full name"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                    />
                  </label>

                  <label className="contact-field">
                    <span>Email</span>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
                      placeholder="you@example.com"
                      required
                      type="email"
                      maxLength={140}
                      autoComplete="email"
                      readOnly={Boolean(user?.email)}
                    />
                  </label>

                  <label className="contact-field full">
                    <span>Subject (optional)</span>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm((c) => ({ ...c, subject: e.target.value }))}
                      placeholder="Example: Payment, bug report, feature request"
                      maxLength={140}
                    />
                  </label>

                  <label className="contact-field full">
                    <span>Message</span>
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))}
                      placeholder="Tell us what happened, what you expected, and any screenshots/steps..."
                      rows={7}
                      required
                      minLength={10}
                      maxLength={4000}
                    />
                  </label>
                </div>

                <div className="contact-status" aria-live="polite">
                  {error && <div className="contact-hint error">{error}</div>}
                  {success && <div className="contact-hint ok">{success}</div>}
                </div>

                <div className="contact-actions">
                  <button type="submit" className="contact-send" disabled={!canSend || sending}>
                    {sending ? "Sending..." : "Send Message"}
                  </button>
                  <button type="button" className="contact-secondary" onClick={() => navigate("/")} disabled={sending}>
                    Go Home
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-top">
            <div className="landing-footer-brand">
              <div>
                <div className="landing-footer-name">Vedastro</div>
                <div className="landing-footer-tag">Career &amp; Decision Guidance</div>
              </div>
            </div>

            <div className="landing-footer-social" aria-label="Social links">
              <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook">
                <FaFacebookF />
              </a>
            </div>
          </div>

          <div className="landing-footer-grid">
            <div className="landing-footer-col">
              <div className="landing-footer-title">Get Started</div>
              <button type="button" className="landing-footer-link" onClick={() => navigate("/form")}>
                Start Free Analysis
              </button>
              {user ? (
                <button
                  type="button"
                  className="landing-footer-link"
                  onClick={() => navigate(isAdmin ? "/admin-panel" : "/dashboard")}
                >
                  {isAdmin ? "Admin Panel" : "Dashboard"}
                </button>
              ) : (
                <button type="button" className="landing-footer-link" onClick={() => navigate("/login")}>
                  Login
                </button>
              )}
              <button type="button" className="landing-footer-link" onClick={() => navigate("/promo")}>
                Promotion Page
              </button>
            </div>

            <div className="landing-footer-col">
              <div className="landing-footer-title">Product</div>
              <button type="button" className="landing-footer-link" onClick={() => navigate("/profile")}>
                Profile
              </button>
              <button type="button" className="landing-footer-link" onClick={() => navigate("/suggestions")}>
                Suggestions
              </button>
              <button
                type="button"
                className="landing-footer-link"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                Back to top
              </button>
            </div>

            <div className="landing-footer-col">
              <div className="landing-footer-title">Legal</div>
              <button type="button" className="landing-footer-link disabled" disabled>
                Privacy Policy
              </button>
              <button type="button" className="landing-footer-link disabled" disabled>
                Terms of Service
              </button>
              <button type="button" className="landing-footer-link" onClick={() => navigate("/contact")}>
                Contact Us
              </button>
            </div>
          </div>

          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} Vedastro</span>
            <span className="landing-footer-dot" aria-hidden="true">
              •
            </span>
            <span>Built for clarity, action, timing</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ContactPage
