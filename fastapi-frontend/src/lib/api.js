import axios from "axios"

const envBaseUrl = import.meta.env.VITE_API_BASE_URL
const currentHost = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1"
const apiHost = currentHost === "localhost" ? "localhost" : "127.0.0.1"
const API_BASE_URL = envBaseUrl || `http://${apiHost}:8000`

export const api = axios.create({
  baseURL: API_BASE_URL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
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
      const refreshToken = localStorage.getItem("refresh_token")
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

          localStorage.setItem("token", refreshResponse.data.access_token)
          if (refreshResponse.data.refresh_token) {
            localStorage.setItem("refresh_token", refreshResponse.data.refresh_token)
          }
          if (refreshResponse.data.user) {
            localStorage.setItem("user", JSON.stringify(refreshResponse.data.user))
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
      localStorage.removeItem("token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("user")
    }

    return Promise.reject(error)
  },
)

export { API_BASE_URL }
