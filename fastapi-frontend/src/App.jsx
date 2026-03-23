import { BrowserRouter, Route, Routes } from "react-router-dom"
import { lazy, Suspense } from "react"

import "./App.css"
import AdminRoute from "./components/shared/AdminRoute"
import PageLoader from "./components/shared/PageLoader"
import { ToastProvider } from "./components/shared/ToastProvider"
import { UserProvider } from "./context/UserContext"
import ProtectedRoute from "./components/shared/ProtectedRoute"

const AdminLogin = lazy(() => import("./pages/AdminLogin"))
const AdminPanel = lazy(() => import("./pages/AdminPanel"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const LandingPage = lazy(() => import("./pages/LandingPage"))
const Login = lazy(() => import("./pages/Login"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const Signup = lazy(() => import("./pages/Signup"))
const UserForm = lazy(() => import("./pages/UserForm"))

function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader message="Loading page..." />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route
                path="/admin-panel"
                element={
                  <AdminRoute>
                    <AdminPanel />
                  </AdminRoute>
                }
              />
              <Route
                path="/form"
                element={
                  <ProtectedRoute>
                    <UserForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </UserProvider>
  )
}

export default App
