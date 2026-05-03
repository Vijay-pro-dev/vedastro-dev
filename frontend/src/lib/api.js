import axios from "axios"
import { safeStorage } from "./storage"

const envBaseUrl = import.meta.env.VITE_API_BASE_URL
const currentHost = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1"
const defaultProdBase = "https://vedastro-dev.onrender.com"
const defaultLocalBase = "http://localhost:8000"

// Priority:
// 1) Explicit env override
// 2) If running on localhost, hit local API
// 3) Otherwise, use hosted API
const API_BASE_URL = envBaseUrl || (currentHost === "localhost" || currentHost === "127.0.0.1" ? defaultLocalBase : defaultProdBase)

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = safeStorage.get("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status
    const requestUrl = error.config?.url || ""
    const originalRequest = error.config || {}
    const isSessionEndpoint =
      requestUrl.includes("/auth/me") ||
      requestUrl.includes("/profile") ||
      requestUrl.includes("/career/") ||
      requestUrl.includes("/upload-profile-pic")

    if (
      status === 401 &&
      !originalRequest._retry &&
      !requestUrl.includes("/auth/refresh") &&
      !requestUrl.includes("/login") &&
      !requestUrl.includes("/signup")
    ) {
      const refreshToken = safeStorage.get("refresh_token")
      if (refreshToken) {
        try {
          originalRequest._retry = true
          refreshPromise =
            refreshPromise ||
            api.post("/auth/refresh", {
              refresh_token: refreshToken,
            })
          const refreshResponse = await refreshPromise
          refreshPromise = null

          safeStorage.set("token", refreshResponse.data.access_token)
          if (refreshResponse.data.refresh_token) {
            safeStorage.set("refresh_token", refreshResponse.data.refresh_token)
          }
          if (refreshResponse.data.user) {
            safeStorage.set("user", JSON.stringify(refreshResponse.data.user))
          }

          originalRequest.headers = originalRequest.headers || {}
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`
          return api(originalRequest)
        } catch {
          refreshPromise = null
        }
      }
    }

    // If an old token becomes invalid, clear local session so protected screens recover cleanly.
    if (status === 401 && isSessionEndpoint) {
      safeStorage.remove("token")
      safeStorage.remove("refresh_token")
      safeStorage.remove("user")
    }

    return Promise.reject(error)
  },
)

export { API_BASE_URL }
