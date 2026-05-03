/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react"
import { api } from "../lib/api"
import { getTranslations } from "../lib/i18n"
import { safeStorage } from "../lib/storage"

const UserContext = createContext()

const IDLE_LOGOUT_MS = 15 * 60 * 1000
const LAST_ACTIVE_KEY = "vedastro_last_active_at"

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hydrateUser = async () => {
      const token = safeStorage.get("token")
      const storedUser = safeStorage.get("user")

      if (!token) {
        setLoading(false)
        return
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser))
        } catch {
          safeStorage.remove("user")
        }
      }

      try {
        const response = await api.get("/auth/me")
        const nextUser = {
          ...response.data,
          user_id: response.data.user_id,
        }
        safeStorage.set("user", JSON.stringify(nextUser))
        setUser(nextUser)
      } catch {
        safeStorage.remove("token")
        safeStorage.remove("user")
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    hydrateUser()
  }, [])

  const loginUser = ({ access_token, refresh_token, user: userData }) => {
    safeStorage.set("token", access_token)
    if (refresh_token) {
      safeStorage.set("refresh_token", refresh_token)
    }
    safeStorage.set("user", JSON.stringify(userData))
    safeStorage.set(LAST_ACTIVE_KEY, String(Date.now()))
    if (userData?.role === "admin") {
      safeStorage.set("admin_token", access_token)
      safeStorage.set(
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
    safeStorage.remove("token")
    safeStorage.remove("refresh_token")
    safeStorage.remove("user")
    safeStorage.remove("admin_token")
    safeStorage.remove("admin_user")
    safeStorage.remove(LAST_ACTIVE_KEY)
    setUser(null)
  }

  const updateUser = (userData) => {
    safeStorage.set("user", JSON.stringify(userData))
    if (userData?.role === "admin") {
      safeStorage.set(
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
      safeStorage.set(LAST_ACTIVE_KEY, String(now))
    }

    const checkIdle = () => {
      const raw = safeStorage.get(LAST_ACTIVE_KEY)
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
