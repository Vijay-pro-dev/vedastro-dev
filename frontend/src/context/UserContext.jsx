/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react"
import { api } from "../lib/api"
import { getTranslations } from "../lib/i18n"

const UserContext = createContext()

const IDLE_LOGOUT_MS = 15 * 60 * 1000
const LAST_ACTIVE_KEY = "vedastro_last_active_at"

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hydrateUser = async () => {
      const token = localStorage.getItem("token")
      const storedUser = localStorage.getItem("user")

      if (!token) {
        setLoading(false)
        return
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          localStorage.removeItem("user")
        }
      }

      try {
        const response = await api.get("/auth/me")
        const nextUser = {
          ...response.data,
          user_id: response.data.user_id,
        }
        localStorage.setItem("user", JSON.stringify(nextUser))
        setUser(nextUser)
      } catch {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    hydrateUser()
  }, [])

  const loginUser = ({ access_token, refresh_token, user: userData }) => {
    localStorage.setItem("token", access_token)
    if (refresh_token) {
      localStorage.setItem("refresh_token", refresh_token)
    }
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
    if (userData?.role === "admin") {
      localStorage.setItem("admin_token", access_token)
      localStorage.setItem(
        "admin_user",
        JSON.stringify({
          email: userData.email,
          role: userData.role,
          user_id: userData.user_id,
          name: userData.name,
        }),
      )
    }
    setUser(userData)
  }

  const logoutUser = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_user")
    localStorage.removeItem(LAST_ACTIVE_KEY)
    setUser(null)
  }

  const updateUser = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData))
    if (userData?.role === "admin") {
      localStorage.setItem(
        "admin_user",
        JSON.stringify({
          email: userData.email,
          role: userData.role,
          user_id: userData.user_id,
          name: userData.name,
        }),
      )
    }
    setUser(userData)
  }

  const t = getTranslations(user?.language || "english")

  useEffect(() => {
    if (!user) return undefined

    let lastWriteAt = 0

    const markActive = () => {
      const now = Date.now()
      if (now - lastWriteAt < 10_000) return
      lastWriteAt = now
      localStorage.setItem(LAST_ACTIVE_KEY, String(now))
    }

    const checkIdle = () => {
      const raw = localStorage.getItem(LAST_ACTIVE_KEY)
      const lastActiveAt = raw ? Number(raw) : Date.now()
      if (Number.isNaN(lastActiveAt)) return

      if (Date.now() - lastActiveAt >= IDLE_LOGOUT_MS) {
        logoutUser()
        window.location.assign("/login")
      }
    }

    markActive()
    const interval = setInterval(checkIdle, 30_000)

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"]
    events.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }))

    return () => {
      clearInterval(interval)
      events.forEach((eventName) => window.removeEventListener(eventName, markActive))
    }
  }, [user])

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser, updateUser, loading, t }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  return useContext(UserContext)
}
