import { Navigate, useLocation } from "react-router-dom"

function AdminRoute({ children }) {
  const location = useLocation()
  const adminToken = localStorage.getItem("admin_token")
  const userToken = localStorage.getItem("token")
  const storedUser = localStorage.getItem("user")

  if (!adminToken && userToken && storedUser) {
    try {
      const user = JSON.parse(storedUser)
      if (user?.role === "admin") {
        localStorage.setItem("admin_token", userToken)
        localStorage.setItem(
          "admin_user",
          JSON.stringify({
            email: user.email,
            role: user.role,
            user_id: user.user_id,
            name: user.name,
          }),
        )
        return children
      }
    } catch {
      localStorage.removeItem("admin_user")
    }
  }

  if (!adminToken) {
    return <Navigate to="/admin" replace state={{ from: location.pathname }} />
  }

  return children
}

export default AdminRoute
