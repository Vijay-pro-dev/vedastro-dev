import { Navigate, useLocation } from "react-router-dom"
import { useUser } from "../../context/UserContext"

function ProtectedRoute({ children }) {
  const { user, loading } = useUser()
  const location = useLocation()

  if (loading) {
    return <div className="page-loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
