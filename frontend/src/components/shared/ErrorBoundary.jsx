import { Component } from "react"

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error("UI crashed:", error, info)
  }

  render() {
    const { hasError, error } = this.state
    const { fallback, children } = this.props

    if (!hasError) return children
    if (fallback) return typeof fallback === "function" ? fallback({ error }) : fallback

    return (
      <div className="page-loader-shell" role="alert">
        <div className="page-loader-spinner" />
        <p style={{ maxWidth: 520, padding: "0 16px", textAlign: "center" }}>
          Something went wrong while loading this page.
          <br />
          {error?.message ? `Error: ${error.message}` : ""}
        </p>
        <button
          type="button"
          className="auth-button"
          onClick={() => window.location.reload()}
          style={{ minWidth: 180 }}
        >
          Reload
        </button>
      </div>
    )
  }
}

export default ErrorBoundary

