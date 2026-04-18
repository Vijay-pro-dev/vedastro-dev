import { BrowserRouter, Route, Routes } from "react-router-dom"
import { lazy, Suspense } from "react"

import "./App.css"
import AdminRoute from "./components/shared/AdminRoute"
import PageLoader from "./components/shared/PageLoader"
import ScrollToTop from "./components/shared/ScrollToTop"
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
const Questionnaire = lazy(() => import("./pages/Questionnaire"))
const Results = lazy(() => import("./pages/Results"))
const ReportUnlock = lazy(() => import("./pages/ReportUnlock"))
const SuggestionsPage = lazy(() => import("./pages/SuggestionsPage"))
const PromotionPage = lazy(() => import("./pages/PromotionPage"))
const ContactPage = lazy(() => import("./pages/ContactPage"))

function App() {
  return (
    <UserProvider>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
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
              <Route path="/form" element={<UserForm />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/questionnaire" element={<Questionnaire />} />
              <Route path="/newdashboard" element={<Results />} />
              <Route
                path="/report/unlock"
                element={
                  <ProtectedRoute>
                    <ReportUnlock />
                  </ProtectedRoute>
                }
              />
              <Route path="/promo" element={<PromotionPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route
                path="/suggestions"
                element={
                  <ProtectedRoute>
                    <SuggestionsPage />
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
