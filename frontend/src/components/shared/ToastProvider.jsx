/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

const ToastContext = createContext(null)
const DEFAULT_TIMEOUT_MS = 3500

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timeoutsRef = useRef(new Map())
  const idCounterRef = useRef(0)

  const removeToast = useCallback((id) => {
    const timeoutId = timeoutsRef.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutsRef.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(({ title, message, type = "info", timeoutMs = DEFAULT_TIMEOUT_MS }) => {
    idCounterRef.current += 1
    const id = `toast-${idCounterRef.current}`
    setToasts((current) => [...current, { id, title, message, type }])
    const timeoutId = window.setTimeout(() => removeToast(id), timeoutMs)
    timeoutsRef.current.set(id, timeoutId)
  }, [removeToast])

  const api = useMemo(
    () => ({
      showToast: pushToast,
      showSuccess: (message, title = "Success") => pushToast({ title, message, type: "success" }),
      showError: (message, title = "Error") => pushToast({ title, message, type: "error" }),
      showInfo: (message, title = "Info") => pushToast({ title, message, type: "info" }),
    }),
    [pushToast],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card toast-${toast.type}`}>
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button className="toast-close" type="button" onClick={() => removeToast(toast.id)}>
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
