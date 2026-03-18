import { createContext, useContext, useState, useEffect } from "react"

const UserContext = createContext()

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in
useEffect(() => {
  const loadUser = async () => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch {
        localStorage.removeItem("user")
      }
    }
    setLoading(false)
  }
  loadUser()
}, [])

  const loginUser = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
  }

  const logoutUser = () => {
    localStorage.removeItem("user")
    setUser(null)
  }

  const updateUser = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)
  }

  return (
    <UserContext.Provider value={{ user, setUser, loginUser, logoutUser, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  return useContext(UserContext)
}
