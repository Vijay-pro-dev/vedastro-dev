import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

const BOOT_ERROR_ID = "app-boot-error-overlay"
const RELOAD_ONCE_KEY = "app_reload_once_after_chunk_error"

function showBootError(error) {
  if (typeof document === "undefined") return
  if (document.getElementById(BOOT_ERROR_ID)) return

  const overlay = document.createElement("div")
  overlay.id = BOOT_ERROR_ID
  overlay.style.position = "fixed"
  overlay.style.inset = "0"
  overlay.style.zIndex = "999999"
  overlay.style.background = "linear-gradient(180deg, #0f172a, #020617)"
  overlay.style.color = "#e2e8f0"
  overlay.style.display = "flex"
  overlay.style.flexDirection = "column"
  overlay.style.alignItems = "center"
  overlay.style.justifyContent = "center"
  overlay.style.gap = "12px"
  overlay.style.padding = "18px"
  overlay.style.textAlign = "center"

  const title = document.createElement("div")
  title.textContent = "App failed to load"
  title.style.fontWeight = "800"
  title.style.fontSize = "18px"

  const message = document.createElement("div")
  message.textContent = (error && (error.message || String(error))) || "Unknown error"
  message.style.maxWidth = "720px"
  message.style.opacity = "0.9"
  message.style.fontSize = "13px"
  message.style.lineHeight = "1.4"
  message.style.wordBreak = "break-word"

  const hint = document.createElement("div")
  hint.textContent = "If this happens after an update, refresh once."
  hint.style.opacity = "0.7"
  hint.style.fontSize = "12px"

  const btn = document.createElement("button")
  btn.textContent = "Reload"
  btn.type = "button"
  btn.style.borderRadius = "12px"
  btn.style.border = "1px solid rgba(255,255,255,0.14)"
  btn.style.background = "rgba(255,255,255,0.06)"
  btn.style.color = "#e2e8f0"
  btn.style.padding = "10px 14px"
  btn.style.fontWeight = "700"
  btn.style.cursor = "pointer"
  btn.onclick = () => window.location.reload()

  overlay.appendChild(title)
  overlay.appendChild(message)
  overlay.appendChild(hint)
  overlay.appendChild(btn)
  document.body.appendChild(overlay)
}

function isChunkLoadError(reason) {
  const text = (reason && (reason.message || String(reason))) || ""
  return (
    text.includes("Failed to fetch dynamically imported module") ||
    text.includes("Importing a module script failed") ||
    text.includes("Loading chunk") ||
    text.includes("ChunkLoadError") ||
    text.includes("error loading dynamically imported module")
  )
}

function reloadOnceForChunkError(reason) {
  if (!isChunkLoadError(reason)) return false
  try {
    if (sessionStorage.getItem(RELOAD_ONCE_KEY) === "true") return false
    sessionStorage.setItem(RELOAD_ONCE_KEY, "true")
    window.location.reload()
    return true
  } catch {
    return false
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    if (!reloadOnceForChunkError(e)) showBootError(e)
  })

  window.addEventListener("unhandledrejection", (event) => {
    if (!reloadOnceForChunkError(event.reason)) showBootError(event.reason)
  })

  window.addEventListener("error", (event) => {
    if (!reloadOnceForChunkError(event.error || event.message)) showBootError(event.error || event.message)
  })
}

try {
  ReactDOM.createRoot(document.getElementById("root")).render(<App />)
} catch (err) {
  showBootError(err)
}
