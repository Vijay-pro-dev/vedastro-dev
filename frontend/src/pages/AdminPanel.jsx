import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  FaArrowLeft,
  FaBars,
  FaClipboardList,
  FaCogs,
  FaHome,
  FaLightbulb,
  FaQuestionCircle,
  FaTimes,
  FaUsers,
} from "react-icons/fa"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useToast } from "../components/shared/ToastProvider"
import { api } from "../lib/api"

const USER_PAGE_SIZE = 10
const ACTIVITY_PAGE_SIZE = 12
const chartColors = ["#22d3ee", "#38bdf8", "#4ade80", "#facc15", "#f97316"]
const LOCAL_QUESTION_CACHE_KEY = "vedastro_admin_questions_cache"
const SUGGESTION_PREVIEW_COUNT = 4
const RULE_PREVIEW_COUNT = 4

const QUESTION_SEED = [
  { question_text: "Do you have a clear long-term career goal?", section: "Awareness", display_order: 1 },
  { question_text: "Do you know the skills required for your goal?", section: "Awareness", display_order: 2 },
  { question_text: "Have you consciously chosen your career path?", section: "Awareness", display_order: 3 },
  { question_text: "Do you clearly understand your strengths and weaknesses?", section: "Awareness", display_order: 4 },
  { question_text: "Do you know which role/job suits you best?", section: "Awareness", display_order: 5 },
  { question_text: "Are you aware of industry trends and demand?", section: "Awareness", display_order: 6 },
  { question_text: "Do you regularly evaluate your career direction?", section: "Awareness", display_order: 7 },
  { question_text: "Are you actively exploring job or career opportunities?", section: "Alignment / Time", display_order: 8 },
  { question_text: "Are you receiving interviews or responses recently?", section: "Alignment / Time", display_order: 9 },
  { question_text: "Is your network helping you with opportunities?", section: "Alignment / Time", display_order: 10 },
  { question_text: "Is your profile (CV/LinkedIn/portfolio) strong?", section: "Alignment / Time", display_order: 11 },
  { question_text: "Are you applying to the right roles?", section: "Alignment / Time", display_order: 12 },
  { question_text: "Do you feel this is the right time for growth in your career?", section: "Alignment / Time", display_order: 13 },
  { question_text: "Do you spend time daily on career improvement?", section: "Action", display_order: 14 },
  { question_text: "Are you actively learning new skills?", section: "Action", display_order: 15 },
  { question_text: "Have you created any project/output in the last 30 days?", section: "Action", display_order: 16 },
  { question_text: "Are you consistently applying or doing outreach?", section: "Action", display_order: 17 },
  { question_text: "Are you able to control distractions?", section: "Action", display_order: 18 },
  { question_text: "Do you follow a disciplined routine?", section: "Action", display_order: 19 },
  { question_text: "Do you track your progress regularly?", section: "Action", display_order: 20 },
].map((item, index) => ({
  ...item,
  id: `seed-${index + 1}`,
  answer_type: "radio",
  score: 3,
  is_required: true,
  is_active: true,
  user_type_code: "GENERAL",
}))

const USER_TYPE_OPTIONS = [
  { code: "GENERAL", label: "General" },
  { code: "VERIFIED", label: "Verified" },
  { code: "PREMIUM", label: "Premium" },
]

const getErrorMessage = (error) => {
  const detail = error?.response?.data?.detail
  if (!detail) return "Unexpected error"
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    // Pydantic v2 validation error format
    const first = detail[0]
    if (first?.msg) return first.msg
    return detail.map((item) => item.msg || JSON.stringify(item)).join(", ")
  }
  if (detail.msg) return detail.msg
  return typeof detail === "object" ? JSON.stringify(detail) : String(detail)
}

function AdminPanel() {
  const navigate = useNavigate()
  const { showError, showInfo, showSuccess } = useToast()
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 680 : false))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [showAllActivities, setShowAllActivities] = useState(false)
  const [allActivityLogs, setAllActivityLogs] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [showAllUsers, setShowAllUsers] = useState(false)
  const [currentUserPage, setCurrentUserPage] = useState(1)
  const [currentActivityPage, setCurrentActivityPage] = useState(1)
  const [questionList, setQuestionList] = useState([])
  const [questionLoading, setQuestionLoading] = useState(true)
  const [questionError, setQuestionError] = useState("")
  const [questionFilter, setQuestionFilter] = useState("all")
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [sectionOptions, setSectionOptions] = useState([])
  const [subsectionOptions, setSubsectionOptions] = useState([])
  const [energyOptions, setEnergyOptions] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  const [suggestionList, setSuggestionList] = useState([])
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [suggestionError, setSuggestionError] = useState("")
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState("all")
  const [suggestionDrafts, setSuggestionDrafts] = useState({})
  const [showAllSuggestions, setShowAllSuggestions] = useState(false)
  const [newSection, setNewSection] = useState("")
  const [newElement, setNewElement] = useState("")
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    answer_type: "radio",
    score: 3,
    display_order: 1,
    is_required: true,
    is_active: true,
    user_type_code: "GENERAL",
    section: "",
    subsection: "",
    category: "",
    energy: "",
  })
  const [ruleList, setRuleList] = useState([])
  const [ruleLoading, setRuleLoading] = useState(false)
  const [ruleError, setRuleError] = useState("")
  const [editingRuleId, setEditingRuleId] = useState(null)
  const [showAllRules, setShowAllRules] = useState(false)
  const [ruleForm, setRuleForm] = useState({
    rule_name: "",
    rule_type: "",
    insight: "",
    why: "",
    action_energy_low: "",
    action_energy_high: "",
    clarity_energy_low: "",
    clarity_energy_high: "",
    emotional_energy_low: "",
    emotional_energy_high: "",
    opportunity_energy_low: "",
    opportunity_energy_high: "",
    fire_element_low: "",
    fire_element_high: "",
    earth_element_low: "",
    earth_element_high: "",
    air_element_low: "",
    air_element_high: "",
    water_element_low: "",
    water_element_high: "",
    space_element_low: "",
    space_element_high: "",
    section: "",
    next_move: "",
    alternative: "",
    risk: "",
    mistake: "",
    priority: "",
    customer_message: "",
  })

  const activeSectionNames = sectionOptions.filter((s) => s.is_active !== false).map((s) => s.name)
  const activeSubsectionNames = subsectionOptions.filter((s) => s.is_active !== false).map((s) => s.name)
  const [categoryOptions, setCategoryOptions] = useState([])
  const activeEnergyNames = energyOptions.filter((e) => e.is_active !== false).map((e) => e.name)

  const getAdminToken = () => localStorage.getItem("admin_token")

  const loadAdminData = useCallback(async () => {
    const adminToken = getAdminToken()
    const response = await api.get("/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
    setData(response.data)
  }, [])

  const loadAdminSuggestions = useCallback(async (nextStatus = "all") => {
    setSuggestionLoading(true)
    setSuggestionError("")
    try {
      const adminToken = getAdminToken()
      const response = await api.get("/admin/suggestions", {
        params: { status: nextStatus },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      setSuggestionList(response.data?.suggestions || [])
      setSuggestionDrafts({})
      setShowAllSuggestions(false)
    } catch (requestError) {
      setSuggestionError(getErrorMessage(requestError) || "Failed to load suggestions.")
    } finally {
      setSuggestionLoading(false)
    }
  }, [])

  const saveSuggestionDraft = async (suggestionId, overridePatch = null) => {
    const patch = overridePatch || suggestionDrafts[suggestionId]
    if (!patch) return

    try {
      const adminToken = getAdminToken()
      const response = await api.patch(`/admin/suggestions/${suggestionId}`, patch, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      })
      const updated = response.data
      setSuggestionList((current) => current.map((item) => (item.id === suggestionId ? updated : item)))
      setSuggestionDrafts((current) => {
        const next = { ...current }
        delete next[suggestionId]
        return next
      })
      showSuccess("Suggestion updated.")
    } catch (requestError) {
      showError(getErrorMessage(requestError) || "Failed to update suggestion.")
    }
  }

  useEffect(() => {
    const loadAdminDashboard = async () => {
      const adminToken = getAdminToken()
      if (!adminToken) {
        navigate("/admin", { replace: true })
        return
      }

      try {
        await loadAdminData()
      } catch (requestError) {
        localStorage.removeItem("admin_token")
        localStorage.removeItem("admin_user")
        const message = requestError.response?.data?.detail || "Failed to load admin panel"
        setError(message)
        showError(message)
      } finally {
        setLoading(false)
      }
    }

    loadAdminDashboard()
  }, [navigate, loadAdminData, showError])

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 680)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const loadQuestions = async () => {
    setQuestionLoading(true)
    setQuestionError("")
    try {
      const adminToken = getAdminToken()
      const response = await api.get("/admin/questions", {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const serverQuestions = (response.data?.questions || []).map((question) => ({
        ...question,
        id: question.id || question.question_id,
      }))
      if (serverQuestions.length === 0) {
        // fall back to local cache if exists
        const cached = JSON.parse(localStorage.getItem(LOCAL_QUESTION_CACHE_KEY) || "[]")
        if (cached.length) {
          setQuestionList(cached)
          showInfo("Loaded questions from local cache (API returned none).")
        } else {
          setQuestionList(QUESTION_SEED)
          showInfo("Using default 20-question model (no questions returned from API).")
        }
      } else {
        setQuestionList(serverQuestions)
        localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(serverQuestions))
      }
    } catch (requestError) {
      const cached = JSON.parse(localStorage.getItem(LOCAL_QUESTION_CACHE_KEY) || "[]")
      if (cached.length) {
        setQuestionList(cached)
        setQuestionError("API failed. Loaded questions from local cache.")
      } else {
        setQuestionList(QUESTION_SEED)
        setQuestionError(getErrorMessage(requestError) || "Falling back to default question set.")
      }
    } finally {
      setQuestionLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
    loadConfigOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetRuleForm = () => {
    setRuleForm({
      rule_name: "",
      rule_type: "",
      insight: "",
      why: "",
      action_energy_low: "",
      action_energy_high: "",
      clarity_energy_low: "",
      clarity_energy_high: "",
      emotional_energy_low: "",
      emotional_energy_high: "",
      opportunity_energy_low: "",
      opportunity_energy_high: "",
      fire_element_low: "",
      fire_element_high: "",
      earth_element_low: "",
      earth_element_high: "",
      air_element_low: "",
      air_element_high: "",
      water_element_low: "",
      water_element_high: "",
      space_element_low: "",
      space_element_high: "",
      section: "",
      next_move: "",
      alternative: "",
      risk: "",
      mistake: "",
      priority: "",
      customer_message: "",
    })
    setEditingRuleId(null)
  }

  const loadRules = async () => {
    setRuleLoading(true)
    setRuleError("")
    try {
      const adminToken = getAdminToken()
      const resp = await api.get("/admin/rules", { headers: { Authorization: `Bearer ${adminToken}` } })
      setRuleList(resp.data?.rules || [])
      setShowAllRules(false)
    } catch (err) {
      setRuleError(getErrorMessage(err))
      showError("Failed to load rules")
    } finally {
      setRuleLoading(false)
    }
  }

  const handleRuleSubmit = async (event) => {
    event.preventDefault()
    setRuleLoading(true)
    setRuleError("")

    const errors = []
    const checkText = (label, value, min, max, required = true) => {
      const val = value ?? ""
      if (!val.trim()) {
        if (required) errors.push(`${label} is required`)
        return
      }
      if (val.trim().length < min) errors.push(`${label} must be at least ${min} chars`)
      if (val.trim().length > max) errors.push(`${label} must be at most ${max} chars`)
    }
    const checkOptionalText = (label, value, min, max) => {
      const val = value ?? ""
      if (!val.trim()) return
      if (val.trim().length < min) errors.push(`${label} must be at least ${min} chars`)
      if (val.trim().length > max) errors.push(`${label} must be at most ${max} chars`)
    }
    const checkRangePair = (label, low, high) => {
      const hasLow = low !== "" && low !== null && low !== undefined
      const hasHigh = high !== "" && high !== null && high !== undefined
      if (!hasLow || !hasHigh) {
        errors.push(`${label} min and max are required`)
        return
      }
      const lowNum = Number(low)
      const highNum = Number(high)
      if (Number.isNaN(lowNum) || lowNum < 0 || lowNum > 500) errors.push(`${label} min must be 0-500`)
      if (Number.isNaN(highNum) || highNum < 0 || highNum > 500) errors.push(`${label} max must be 0-500`)
      if (!Number.isNaN(lowNum) && !Number.isNaN(highNum) && lowNum > highNum) errors.push(`${label} min cannot exceed max`)
    }

    checkText("Rule Name", ruleForm.rule_name, 3, 100)
    checkText("Type", ruleForm.rule_type, 2, 50)
    checkText("Insight", ruleForm.insight, 2, 500)
    checkText("Why", ruleForm.why, 2, 500)
    const checkNumber = (label, value) => {
      if (value === "" || value === null || value === undefined) {
        errors.push(`${label} is required`)
        return
      }
      const num = Number(value)
      if (Number.isNaN(num) || num < 0 || num > 500) {
        errors.push(`${label} must be between 0 and 500`)
      }
    }
    checkNumber("Section", ruleForm.section)
    checkText("Next move", ruleForm.next_move, 5, 500)
    checkOptionalText("Alternative", ruleForm.alternative, 5, 500)
    checkOptionalText("Risk", ruleForm.risk, 5, 500)
    checkOptionalText("Mistake", ruleForm.mistake, 5, 500)
    checkText("Priority", ruleForm.priority, 3, 100)
    checkOptionalText("Customer message", ruleForm.customer_message, 5, 500)

    checkRangePair("Action Energy", ruleForm.action_energy_low, ruleForm.action_energy_high)
    checkRangePair("Clarity Energy", ruleForm.clarity_energy_low, ruleForm.clarity_energy_high)
    checkRangePair("Emotional Energy", ruleForm.emotional_energy_low, ruleForm.emotional_energy_high)
    checkRangePair("Opportunity Energy", ruleForm.opportunity_energy_low, ruleForm.opportunity_energy_high)
    checkRangePair("Fire", ruleForm.fire_element_low, ruleForm.fire_element_high)
    checkRangePair("Earth", ruleForm.earth_element_low, ruleForm.earth_element_high)
    checkRangePair("Air", ruleForm.air_element_low, ruleForm.air_element_high)
    checkRangePair("Water", ruleForm.water_element_low, ruleForm.water_element_high)
    checkRangePair("Space", ruleForm.space_element_low, ruleForm.space_element_high)

    if (errors.length) {
      const message = errors[0]
      setRuleError(message)
      showError(message)
      setRuleLoading(false)
      return
    }

    try {
      const adminToken = getAdminToken()
      const payload = { ...ruleForm }
      Object.keys(payload).forEach((key) => {
        if (payload[key] === "") payload[key] = null
        if (typeof payload[key] === "string" && payload[key] !== null && /^\d+$/.test(payload[key])) {
          payload[key] = Number(payload[key])
        }
      })
      if (editingRuleId) {
        const resp = await api.put(`/admin/rules/${editingRuleId}`, payload, { headers: { Authorization: `Bearer ${adminToken}` } })
        setRuleList((prev) => prev.map((r) => (r.id === editingRuleId ? resp.data.rule : r)))
        showSuccess("Rule updated")
      } else {
        const resp = await api.post("/admin/rules", payload, { headers: { Authorization: `Bearer ${adminToken}` } })
        setRuleList((prev) => [...prev, resp.data.rule])
        showSuccess("Rule saved")
      }
      resetRuleForm()
    } catch (err) {
      setRuleError(getErrorMessage(err))
      showError("Failed to save rule")
    } finally {
      setRuleLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin_token")
    localStorage.removeItem("admin_user")
    navigate("/admin", { replace: true })
  }

  const handleExportCsv = async () => {
    try {
      const response = await api.get("/admin/export/users.csv", {
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
        responseType: "blob",
      })
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: "text/csv" }))
      const link = document.createElement("a")
      link.href = blobUrl
      link.setAttribute("download", "vedastro-users.csv")
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
      showSuccess("CSV exported successfully.")
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to export CSV"
      setError(message)
      showError(message)
    }
  }

  const handleViewUser = async (userId) => {
    try {
      setProfileLoading(true)
      const response = await api.get(`/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
      })
      setSelectedUser(response.data.user)
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to load user profile"
      setError(message)
      showError(message)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleSuspendToggle = async (user) => {
    try {
      await api.patch(
        `/admin/users/${user.user_id}/suspend`,
        { suspended: !user.suspended },
        {
          headers: {
            Authorization: `Bearer ${getAdminToken()}`,
          },
        },
      )
      await loadAdminData()
      if (selectedUser?.user_id === user.user_id) {
        await handleViewUser(user.user_id)
      }
      showSuccess(user.suspended ? "User unsuspended successfully." : "User suspended successfully.")
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to update user status"
      setError(message)
      showError(message)
    }
  }

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Delete ${user.email}? This cannot be undone.`)
    if (!confirmed) return

    try {
      await api.delete(`/admin/users/${user.user_id}`, {
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
      })
      if (selectedUser?.user_id === user.user_id) {
        setSelectedUser(null)
      }
      await loadAdminData()
      showSuccess("User deleted successfully.")
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to delete user"
      setError(message)
      showError(message)
    }
  }

  const handleRoleChange = async (userId, role) => {
    try {
      await api.patch(
        `/admin/users/${userId}/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${getAdminToken()}`,
          },
        },
      )
      await loadAdminData()
      if (selectedUser?.user_id === userId) {
        await handleViewUser(userId)
      }
      showSuccess(`User role updated to ${role}.`)
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to update user role"
      setError(message)
      showError(message)
    }
  }

  const handleOpenAllActivities = async () => {
    try {
      setActivityLoading(true)
      setShowAllActivities(true)
      setCurrentActivityPage(1)
      const response = await api.get("/admin/activity-logs", {
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
      })
      setAllActivityLogs(response.data.activity_logs || [])
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to load activity logs"
      setError(message)
      showError(message)
    } finally {
      setActivityLoading(false)
    }
  }

  const handleDeleteActivityLog = async (logId) => {
    const confirmed = window.confirm("Delete this activity log?")
    if (!confirmed) return

    try {
      await api.delete(`/admin/activity-logs/${logId}`, {
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
      })
      setAllActivityLogs((current) => current.filter((log) => log.id !== logId))
      await loadAdminData()
      showSuccess("Activity log deleted.")
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to delete activity log"
      setError(message)
      showError(message)
    }
  }

  const handleDeleteAllActivityLogs = async () => {
    const confirmed = window.confirm("Delete complete activity history?")
    if (!confirmed) return

    try {
      await api.delete("/admin/activity-logs", {
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
      })
      setAllActivityLogs([])
      await loadAdminData()
      showInfo("All activity history deleted.")
    } catch (requestError) {
      const message = requestError.response?.data?.detail || "Failed to delete activity history"
      setError(message)
      showError(message)
    }
  }

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: "",
      answer_type: "radio",
      score: 3,
      display_order: (questionList?.length || 0) + 1,
      is_required: true,
      is_active: true,
      user_type_code: "GENERAL",
      section: sectionOptions[0]?.name || "",
      subsection: activeSubsectionNames[0] || "",
      category: categoryOptions[0]?.name || "",
      energy: activeEnergyNames[0] || "",
    })
    setEditingQuestionId(null)
  }

  const handleQuestionSubmit = async (event) => {
    event.preventDefault()
      const payload = {
        ...questionForm,
        score: Number(questionForm.score),
        display_order: Number(questionForm.display_order),
        subsection: questionForm.subsection,
        section: questionForm.section,
        category: questionForm.category,
        energy: questionForm.energy,
      }
    const normalizedSection = (payload.section || "").trim().toLowerCase()
    const validSectionSet = new Set(sectionOptions.map((s) => (s.name || "").trim().toLowerCase()))
    if (validSectionSet.size && !validSectionSet.has(normalizedSection)) {
      showError("Please pick a valid section from the dropdown.")
      return
    }
    if (!payload.question_text.trim()) {
      showError("Question text is required.")
      return
    }

    try {
      const adminToken = getAdminToken()
      if (editingQuestionId) {
        const response = await api.put(`/admin/questions/${editingQuestionId}`, payload, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        const updated = response.data?.question || payload
        setQuestionList((current) => {
          const next = current.map((q) => (q.id === editingQuestionId ? { ...q, ...updated } : q))
          localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(next))
          return next
        })
        showSuccess("Question updated.")
      } else {
        const response = await api.post("/admin/questions", payload, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })
        const created = response.data?.question || { ...payload, id: `local-${Date.now()}` }
        setQuestionList((current) => {
          const next = [...current, created]
          localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(next))
          return next
        })
        showSuccess("Question added.")
      }
      resetQuestionForm()
    } catch (requestError) {
      const message = getErrorMessage(requestError) || "Unable to save question (UI-only fallback updated)."
      showInfo(message)
      // UI-only optimistic update when API fails
      if (!editingQuestionId) {
        setQuestionList((current) => [...current, { ...payload, id: `local-${Date.now()}` }])
      } else {
        setQuestionList((current) => current.map((q) => (q.id === editingQuestionId ? { ...q, ...payload } : q)))
      }
      resetQuestionForm()
    }
  }

  const handleQuestionEdit = (question) => {
    setEditingQuestionId(question.id)
    setQuestionForm({
      question_text: question.question_text || "",
      answer_type: question.answer_type || "radio",
      score: Number(question.score ?? 3),
      display_order: Number(question.display_order ?? 1),
      is_required: Boolean(question.is_required),
      is_active: Boolean(question.is_active),
      user_type_code: question.user_type_code || "GENERAL",
      section: question.section || sectionOptions[0]?.name || "",
      subsection: question.subsection || activeSubsectionNames[0] || "",
      category: question.category || categoryOptions[0]?.name || "",
      energy: question.energy || activeEnergyNames[0] || "",
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleQuestionToggle = async (question) => {
    const updated = { ...question, is_active: !question.is_active }
    const isLocalOnly = !question.id || `${question.id}`.startsWith("seed") || `${question.id}`.startsWith("local-")

    // Optimistic local update first
    setQuestionList((current) => current.map((q) => (q.id === question.id ? { ...q, ...updated } : q)))

    // If this is a seed/local question and backend route doesn't exist yet, skip API noise
    if (isLocalOnly) {
      showSuccess(`Question ${updated.is_active ? "activated" : "deactivated"} (local seed).`)
      setQuestionList((current) => {
        const next = current.map((q) => (q.id === question.id ? { ...q, ...updated } : q))
        localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(next))
        return next
      })
      return
    }

    try {
      const adminToken = getAdminToken()
      await api.patch(
        `/admin/questions/${question.id || question.question_id}/status`,
        { is_active: updated.is_active },
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )
      setQuestionList((current) => {
        const next = current.map((q) => (q.id === question.id ? { ...q, ...updated } : q))
        localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(next))
        return next
      })
      showSuccess(`Question ${updated.is_active ? "activated" : "deactivated"}.`)
    } catch (requestError) {
      // rollback on failure
      setQuestionList((current) => current.map((q) => (q.id === question.id ? question : q)))
      const message = getErrorMessage(requestError) || "Unable to update question status on server."
      showError(message)
    }
  }

  const loadConfigOptions = async () => {
    const adminToken = getAdminToken()
    try {
    const [sectionsRes, subsectionsRes, categoriesRes] = await Promise.all([
      api.get("/admin/config/sections", { headers: { Authorization: `Bearer ${adminToken}` } }),
      api.get("/admin/config/element", { headers: { Authorization: `Bearer ${adminToken}` } }),
      api.get("/admin/config/categories", { headers: { Authorization: `Bearer ${adminToken}` } }),
    ])
    const energyRes = await api
      .get("/admin/config/energy", { headers: { Authorization: `Bearer ${adminToken}` } })
      .catch(() => ({ data: { energy: [] } }))
      const sections = sectionsRes.data?.sections || []
      const subsections = subsectionsRes.data?.subsections || []
      const categories = categoriesRes.data?.categories || []
      const energy = energyRes.data?.energy || []
      setSectionOptions(sections)
      setSubsectionOptions(subsections)
      setCategoryOptions(categories)
      setEnergyOptions(energy)
      setQuestionForm((curr) => ({
        ...curr,
        section: curr.section || sections[0]?.name || "",
        subsection: curr.subsection || subsections[0]?.name || "",
        category: curr.category || categories[0]?.name || "",
        energy: curr.energy || energy[0]?.name || "",
      }))
    } catch (error) {
      console.warn("Config load failed, using defaults", error)
    }
  }

  const handleAddSection = async () => {
    if (!newSection.trim()) return
    const adminToken = getAdminToken()
    try {
      const res = await api.post(
        "/admin/config/sections",
        { name: newSection.trim(), display_order: sectionOptions.length + 1, is_active: true },
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )
      const created = res.data?.section
      setSectionOptions((current) => [...current, created])
      setNewSection("")
      showSuccess("Section added.")
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  const handleAddSubsection = async () => {
    if (!newElement.trim()) return
    const adminToken = getAdminToken()
    try {
      const res = await api.post(
        "/admin/config/element",
        { name: newElement.trim(), display_order: subsectionOptions.length + 1, is_active: true },
        { headers: { Authorization: `Bearer ${adminToken}` } },
      )
      const created = res.data?.subsection
      setSubsectionOptions((current) => [...current, created])
      setNewElement("")
      showSuccess("Element added.")
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  const handleDeleteSection = async (sectionId) => {
    const adminToken = getAdminToken()
    try {
      await api.delete(`/admin/config/sections/${sectionId}`, { headers: { Authorization: `Bearer ${adminToken}` } })
      setSectionOptions((current) => current.filter((s) => s.id !== sectionId))
      showSuccess("Section removed.")
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  const handleDeleteSubsection = async (subId) => {
    const adminToken = getAdminToken()
    try {
      await api.delete(`/admin/config/element/${subId}`, { headers: { Authorization: `Bearer ${adminToken}` } })
      setSubsectionOptions((current) => current.filter((s) => s.id !== subId))
      showSuccess("Element removed.")
    } catch (error) {
      showError(getErrorMessage(error))
    }
  }

  const handleQuestionDelete = async (question) => {
    const confirmed = window.confirm("Delete this question permanently?")
    if (!confirmed) return

    const isLocalOnly = !question.id || `${question.id}`.startsWith("seed") || `${question.id}`.startsWith("local-")

    // Optimistic remove
    setQuestionList((current) => {
      const next = current.filter((q) => (q.id || q.question_id) !== (question.id || question.question_id))
      localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(next))
      return next
    })

    if (isLocalOnly) return

    try {
      const adminToken = getAdminToken()
      await api.delete(`/admin/questions/${question.id || question.question_id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      showSuccess("Question deleted.")
    } catch (requestError) {
      const message = getErrorMessage(requestError) || "Unable to delete question on server."
      showError(message)
      // rollback if server failed
      setQuestionList((current) => {
        const next = [...current, question]
        localStorage.setItem(LOCAL_QUESTION_CACHE_KEY, JSON.stringify(next))
        return next
      })
    }
  }

  const filteredQuestions = questionList
    .map((q) => ({
      ...q,
      score: Number(q.score ?? 0),
      display_order: Number(q.display_order ?? 0),
    }))
    .filter((q) => (questionFilter === "all" ? true : q.user_type_code === questionFilter))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
  const visibleQuestions = showAllQuestions ? filteredQuestions : filteredQuestions.slice(0, 4)

  const stats = data?.stats || {}
  const users = useMemo(() => data?.users ?? [], [data])
  const recentUsers = data?.recent_users || []
  const systemOverview = data?.system_overview || {}
  const recentActivityLogs = data?.recent_activity_logs || []

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const normalizedTerm = searchTerm.trim().toLowerCase()
      const matchesSearch =
        !normalizedTerm ||
        user.name.toLowerCase().includes(normalizedTerm) ||
        user.email.toLowerCase().includes(normalizedTerm) ||
        user.current_role.toLowerCase().includes(normalizedTerm) ||
        user.nationality.toLowerCase().includes(normalizedTerm)

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "complete" && user.profile_completed) ||
        (statusFilter === "pending" && !user.profile_completed)

      return matchesSearch && matchesStatus
    })
  }, [users, searchTerm, statusFilter])

  const recentUsersOnly = recentUsers.slice(0, 5)
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE))
  const visibleUsers = showAllUsers
    ? filteredUsers.slice((currentUserPage - 1) * USER_PAGE_SIZE, currentUserPage * USER_PAGE_SIZE)
    : filteredUsers.slice(0, 5)

  const totalActivityPages = Math.max(1, Math.ceil(allActivityLogs.length / ACTIVITY_PAGE_SIZE))
  const paginatedActivityLogs = allActivityLogs.slice(
    (currentActivityPage - 1) * ACTIVITY_PAGE_SIZE,
    currentActivityPage * ACTIVITY_PAGE_SIZE,
  )

  const topRoles = Object.entries(stats.top_roles || {})
  const nationalityChartData = Object.entries(stats.top_nationalities || {}).map(([name, value]) => ({ name, value }))
  const languageChartData = Object.entries(stats.top_languages || {}).map(([name, value]) => ({ name, value }))
  const suggestionBadgeCount = suggestionList.length
  const visibleSuggestions = showAllSuggestions ? suggestionList : suggestionList.slice(0, SUGGESTION_PREVIEW_COUNT)
  const visibleRules = showAllRules ? ruleList : ruleList.slice(0, RULE_PREVIEW_COUNT)

  useEffect(() => {
    setCurrentUserPage(1)
  }, [searchTerm, statusFilter, showAllUsers])

  useEffect(() => {
    setShowAllQuestions(false)
  }, [questionFilter])

  useEffect(() => {
    if (!questionForm.energy && activeEnergyNames.length) {
    setQuestionForm((curr) => ({ ...curr, energy: activeEnergyNames[0] }))
  }
  }, [activeEnergyNames, questionForm.energy])

  const [activeSection, setActiveSection] = useState("dashboard")

  const scrollToSection = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleSectionSelect = (id) => {
    setActiveSection(id)
    setShowMenu(false)
    if (id === "rules" && ruleList.length === 0 && !ruleLoading) {
      loadRules()
    }
    if (id === "suggestions" && suggestionList.length === 0 && !suggestionLoading) {
      loadAdminSuggestions(suggestionStatusFilter)
    }
    setTimeout(() => scrollToSection(id), 40)
  }

  if (loading) {
    return (
      <div className="admin-panel-page">
        <div className="admin-panel-shell">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <FaArrowLeft />
          </button>
          <div className="admin-stats-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton-card">
                <div className="skeleton-line short" />
                <div className="skeleton-line" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-panel-page">
        <div className="admin-panel-shell">
          <div className="admin-panel-card empty-state-card">
            <h1>Admin Panel</h1>
            <p className="error-message">{error}</p>
            <button className="auth-button" onClick={() => navigate("/admin", { replace: true })}>
              Admin Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel-page">
      <div className="admin-panel-shell">
        <div className="admin-topbar">
          <button type="button" className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <FaArrowLeft />
          </button>
          <button className="admin-menu-toggle" aria-expanded={showMenu} onClick={() => setShowMenu((v) => !v)}>
            {showMenu ? (
              <>
                <FaTimes /> Close Menu
              </>
            ) : (
              <>
                <FaBars /> Menu
              </>
            )}
          </button>
        </div>

        <div className="admin-layout">
          <nav className={`admin-sidebar ${showMenu ? "open" : ""}`}>
            <div className="admin-brand">
              <div className="admin-brand-mark">V</div>
              <div>
                <p className="admin-brand-label">Vedastro</p>
                <span className="admin-brand-sub">Admin Console</span>
              </div>
            </div>

            <div className="admin-profile-chip">
              <span className="chip-dot live" />
              <div>
                <p className="chip-title">Vedastro Group</p>
                <span className="chip-sub">Admin</span>
              </div>
            </div>

            <div className="admin-menu-section">
              <p className="admin-menu-heading">Overview</p>
              <button className="admin-menu-item" onClick={() => handleSectionSelect("dashboard")}>
                <span className="admin-menu-icon" aria-hidden="true">
                  <FaHome />
                </span>
                <span>Dashboard</span>
                <span className="admin-menu-badge">{stats.total_users || 0}</span>
              </button>
              <button className="admin-menu-item" onClick={() => handleSectionSelect("users")}>
                <span className="admin-menu-icon" aria-hidden="true">
                  <FaUsers />
                </span>
                <span>User Management</span>
                <span className="admin-menu-badge">{users.length}</span>
              </button>
              <button className="admin-menu-item" onClick={() => handleSectionSelect("suggestions")}>
                <span className="admin-menu-icon" aria-hidden="true">
                  <FaLightbulb />
                </span>
                <span>Suggestions</span>
                <span className="admin-menu-badge">{suggestionBadgeCount}</span>
              </button>
              <button className="admin-menu-item" onClick={() => handleSectionSelect("activity")}>
                <span className="admin-menu-icon" aria-hidden="true">
                  <FaClipboardList />
                </span>
                <span>Activity Logs</span>
              </button>
              <button className="admin-menu-item" onClick={() => handleSectionSelect("config")}>
                <span className="admin-menu-icon" aria-hidden="true">
                  <FaCogs />
                </span>
                <span>Config</span>
              </button>
              <button className="admin-menu-item" onClick={() => handleSectionSelect("questions")}>
                <span className="admin-menu-icon" aria-hidden="true">
                  <FaQuestionCircle />
                </span>
                <span>Question Bank</span>
                <span className="admin-menu-pill">Updated</span>
              </button>
              <button className="admin-menu-item" onClick={() => handleSectionSelect("rules")}>
                <span className="admin-menu-icon" aria-hidden="true">
                  <FaClipboardList />
                </span>
                <span>Rules</span>
              </button>
            </div>

            <div className="admin-sidebar-footer">
              <p className="footer-title">Export Report</p>
              <p className="footer-copy">Unlock bulk exports and advanced analytics for your team.</p>
              <button className="footer-button" onClick={handleExportCsv}>
                Download Report
              </button>
            </div>
          </nav>

          <div className="admin-main">
        <div className="admin-panel-header">
          <div>
            <h1>Admin Panel</h1>
          
          </div>
          <div className="admin-header-actions">
            <button className="auth-button admin-export-btn" onClick={handleExportCsv}>
              Export CSV
            </button>
            <button className="auth-button admin-logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {activeSection === "dashboard" && (
          <>
        <div className="admin-stats-grid" id="dashboard">
          <div className="admin-stat-card">
            <span>Total Users</span>
            <strong>{stats.total_users || 0}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Completed Profiles</span>
            <strong>{stats.completed_profiles || 0}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Pending Profiles</span>
            <strong>{stats.pending_profiles || 0}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Dashboard Ready</span>
            <strong>{stats.dashboard_ready_users || 0}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Completion Rate</span>
            <strong>{stats.completion_rate || 0}%</strong>
          </div>
          <div className="admin-stat-card">
            <span>Active Last 7 Days</span>
            <strong>{stats.active_last_7_days || 0}</strong>
          </div>
        </div>

        <div className="admin-meta-grid">
          <div className="admin-panel-card">
            <div className="admin-table-header">
              <h3>Nationality Breakdown</h3>
              <span>{nationalityChartData.length} groups</span>
            </div>
            {nationalityChartData.length ? (
              <div className="admin-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={nationalityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" stroke="#a5b4fc" />
                    <YAxis stroke="#a5b4fc" />
                    <Tooltip />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {nationalityChartData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state-card compact">
                <p>No nationality data available yet.</p>
              </div>
            )}
          </div>

          <div className="admin-panel-card">
            <div className="admin-table-header">
              <h3>Language Breakdown</h3>
              <span>{languageChartData.length} groups</span>
            </div>
            {languageChartData.length ? (
              <div className="admin-chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={languageChartData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={50}>
                      {languageChartData.map((entry, index) => (
                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state-card compact">
                <p>No language data available yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="admin-meta-grid">
          <div className="admin-panel-card">
            <h3>System Overview</h3>
            <ul className="admin-meta-list">
              <li>
                <span>API Status</span>
                <strong>{systemOverview.api_status || "unknown"}</strong>
              </li>
              <li>
                <span>Average Experience</span>
                <strong>{stats.avg_experience || 0} yrs</strong>
              </li>
              <li>
                <span>Generated At</span>
                <strong>{systemOverview.generated_at ? new Date(systemOverview.generated_at).toLocaleString() : "-"}</strong>
              </li>
            </ul>
            <p className="admin-helper-text">{systemOverview.admin_message}</p>
          </div>

          <div className="admin-panel-card">
            <h3>Top Roles</h3>
            <ul className="admin-meta-list">
              {topRoles.length === 0 && (
                <li>
                  <span>No role data</span>
                  <strong>0</strong>
                </li>
              )}
              {topRoles
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([key, value]) => (
                  <li key={key}>
                    <span>{key}</span>
                    <strong>{value}</strong>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="admin-panel-card">
          <div className="admin-table-header">
            <h3>Recent Signups</h3>
            <span>{recentUsersOnly.length} recent records</span>
          </div>
          <div className="admin-recent-grid">
            {recentUsersOnly.length ? recentUsersOnly.map((user) => (
              <div key={user.user_id} className="admin-recent-card">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <small>{user.current_role}</small>
                <em>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</em>
              </div>
            )) : (
              <div className="empty-state-card compact">
                <p>No recent signups yet.</p>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {activeSection === "questions" && (
        <div className="admin-panel-card admin-questions-card" id="section-questions">
          <div className="admin-table-header">
            <div>
              <h3>Question Bank (Admin only)</h3>
              <p className="admin-helper-text">
                {/* 20-question model preloaded from Vedastro doc. Save calls /admin/questions; falls back to local seed when API is unavailable. */}
              </p>
            </div>
            <div className="admin-question-toolbar">
              <select value={questionFilter} onChange={(event) => setQuestionFilter(event.target.value)} className="admin-filter">
                <option value="all">All user types</option>
                {USER_TYPE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="admin-count-pill">{filteredQuestions.length} total</span>
              <button className="admin-action-btn ghost" onClick={resetQuestionForm}>
                New Question
              </button>
            </div>
          </div>

          <form className="admin-question-form" onSubmit={handleQuestionSubmit}>
            <div className="admin-question-grid">
              <label>
                <span>Question Text</span>
                <textarea
                  required
                  value={questionForm.question_text}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, question_text: event.target.value }))}
                  placeholder="Enter the question exactly as you want users to see it"
                />
              </label>
              <label>
                <span>Section / Bucket</span>
                <select
                  value={questionForm.section}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, section: event.target.value }))}
                >
                  {activeSectionNames.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Element</span>
                <select
                  value={questionForm.subsection}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, subsection: event.target.value }))}
                >
                  {activeSubsectionNames.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Energy</span>
                <select
                  value={questionForm.energy}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, energy: event.target.value }))}
                >
                  {activeEnergyNames.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Category</span>
                <select
                  value={questionForm.category}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, category: event.target.value }))}
                >
                  {(categoryOptions.length
                    ? categoryOptions
                    : [
                        { id: 1, name: "Awareness" },
                        { id: 2, name: "Time" },
                        { id: 3, name: "Action" },
                      ]).map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>User Type</span>
                <select
                  value={questionForm.user_type_code}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, user_type_code: event.target.value }))}
                >
                  {USER_TYPE_OPTIONS.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Answer Type</span>
                <select
                  value={questionForm.answer_type}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, answer_type: event.target.value }))}
                >
                  <option value="radio">Likert (1-5)</option>
                  <option value="slider">Slider</option>
                  <option value="text">Short Text</option>
                  <option value="checkbox">Checkbox</option>
                </select>
              </label>
              <label>
                <span>Score (default)</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={questionForm.score}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, score: Number(event.target.value) }))}
                />
              </label>
              <label>
                <span>Display Order</span>
                <input
                  type="number"
                  min="1"
                  value={questionForm.display_order}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, display_order: Number(event.target.value) }))}
                />
              </label>
            </div>
            <div className="admin-toggle-row">
              <label className="admin-toggle-chip">
                <input
                  type="checkbox"
                  checked={questionForm.is_required}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, is_required: event.target.checked }))}
                />
                <span>Required</span>
              </label>
              <label className="admin-toggle-chip">
                <input
                  type="checkbox"
                  checked={questionForm.is_active}
                  onChange={(event) => setQuestionForm((current) => ({ ...current, is_active: event.target.checked }))}
                />
                <span>Active</span>
              </label>
            </div>
            <div className="admin-question-actions center">
              <button type="submit" className="admin-primary-btn">
                {editingQuestionId ? "Update Question" : "Add Question"}
              </button>
              {editingQuestionId && (
                <button type="button" className="admin-action-btn ghost" onClick={resetQuestionForm}>
                  Cancel Edit
                </button>
              )}
            </div>
            {questionError && <p className="error-message compact">{questionError}</p>}
          </form>

          <div className="admin-question-list">
            {questionLoading ? (
              <div className="skeleton-card">
                <div className="skeleton-line" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="empty-state-card compact">
                <p>No questions for this user type yet.</p>
              </div>
            ) : (
              visibleQuestions.map((question) => (
                <div key={question.id || question.question_id} className={`admin-question-item ${!question.is_active ? "inactive" : ""}`}>
                  <div>
                    <p className="admin-question-text">{question.question_text}</p>
                    <div className="admin-question-meta">
                      <span>{question.section || "Unsectioned"}</span>
                      <span>Type: {question.answer_type}</span>
                      <span>Order: {question.display_order}</span>
                      <span>User: {question.user_type_code || "GENERAL"}</span>
                      <span>Element: {question.subsection || "-"}</span>
                      <span>Category: {question.category || "-"}</span>
                      <span>Energy: {question.energy || "-"}</span>
                      <span>{question.is_required ? "Required" : "Optional"}</span>
                    </div>
                  </div>
                  <div className="admin-question-actions">
                    <button className="admin-action-btn" onClick={() => handleQuestionEdit(question)}>
                      Edit
                    </button>
                    <button className="admin-action-btn warn" onClick={() => handleQuestionToggle(question)}>
                      {question.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button className="admin-action-btn danger" onClick={() => handleQuestionDelete(question)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {filteredQuestions.length > 4 && (
            <div className="admin-log-actions admin-log-actions-split">
              <button className="admin-action-btn" onClick={() => setShowAllQuestions((current) => !current)}>
                {showAllQuestions ? "Show Top 4 Questions" : `Show All Questions (${filteredQuestions.length})`}
              </button>
            </div>
          )}
        </div>
        )}

        {activeSection === "rules" && (
  <div className="admin-panel-card" id="section-rules">
    <div className="admin-table-header">
      <div>
        <h3>Rules</h3>
        <p className="admin-helper-text">Create & update Rules entries.</p>
      </div>
      {ruleError && <span className="admin-helper-text danger">{ruleError}</span>}
    </div>

    <form className="admin-question-form" onSubmit={handleRuleSubmit}>
      <div className="rules-grid">
        <div className="rules-row">
          <label>Rule Name</label>
          <input required value={ruleForm.rule_name} onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })} />
        </div>
        <div className="rules-row">
          <label>Type</label>
          <input value={ruleForm.rule_type} onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })} />
        </div>
        <div className="rules-row">
          <label>Insight</label>
          <textarea value={ruleForm.insight} onChange={(e) => setRuleForm({ ...ruleForm, insight: e.target.value })} />
        </div>
        <div className="rules-row">
          <label>Why</label>
          <textarea value={ruleForm.why} onChange={(e) => setRuleForm({ ...ruleForm, why: e.target.value })} />
        </div>

        <div className="rules-row split">
          <label>Action Energy</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.action_energy_low} onChange={(e) => setRuleForm({ ...ruleForm, action_energy_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.action_energy_high} onChange={(e) => setRuleForm({ ...ruleForm, action_energy_high: e.target.value })} />
              </div>
              <div className="rules-row split">
                <label>Clarity Energy</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.clarity_energy_low} onChange={(e) => setRuleForm({ ...ruleForm, clarity_energy_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.clarity_energy_high} onChange={(e) => setRuleForm({ ...ruleForm, clarity_energy_high: e.target.value })} />
              </div>
              <div className="rules-row split">
                <label>Emotional Energy</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.emotional_energy_low} onChange={(e) => setRuleForm({ ...ruleForm, emotional_energy_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.emotional_energy_high} onChange={(e) => setRuleForm({ ...ruleForm, emotional_energy_high: e.target.value })} />
              </div>
              <div className="rules-row split">
                <label>Opportunity Energy</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.opportunity_energy_low} onChange={(e) => setRuleForm({ ...ruleForm, opportunity_energy_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.opportunity_energy_high} onChange={(e) => setRuleForm({ ...ruleForm, opportunity_energy_high: e.target.value })} />
              </div>

        <div className="rules-row split">
          <label>Fire</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.fire_element_low} onChange={(e) => setRuleForm({ ...ruleForm, fire_element_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.fire_element_high} onChange={(e) => setRuleForm({ ...ruleForm, fire_element_high: e.target.value })} />
              </div>
              <div className="rules-row split">
                <label>Earth</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.earth_element_low} onChange={(e) => setRuleForm({ ...ruleForm, earth_element_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.earth_element_high} onChange={(e) => setRuleForm({ ...ruleForm, earth_element_high: e.target.value })} />
              </div>
              <div className="rules-row split">
                <label>Air</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.air_element_low} onChange={(e) => setRuleForm({ ...ruleForm, air_element_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.air_element_high} onChange={(e) => setRuleForm({ ...ruleForm, air_element_high: e.target.value })} />
              </div>
              <div className="rules-row split">
                <label>Water</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.water_element_low} onChange={(e) => setRuleForm({ ...ruleForm, water_element_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.water_element_high} onChange={(e) => setRuleForm({ ...ruleForm, water_element_high: e.target.value })} />
              </div>
              <div className="rules-row split">
                <label>Space</label>
                <input required type="number" min="0" max="500" placeholder="min" value={ruleForm.space_element_low} onChange={(e) => setRuleForm({ ...ruleForm, space_element_low: e.target.value })} />
                <input required type="number" min="0" max="500" placeholder="max" value={ruleForm.space_element_high} onChange={(e) => setRuleForm({ ...ruleForm, space_element_high: e.target.value })} />
              </div>

              <div className="rules-row">
                <label>Section</label>
                <input type="number" min="0" max="500" placeholder="Section" value={ruleForm.section} onChange={(e) => setRuleForm({ ...ruleForm, section: e.target.value })} />
              </div>
        <div className="rules-row"><label>Next move</label><textarea value={ruleForm.next_move} onChange={(e) => setRuleForm({ ...ruleForm, next_move: e.target.value })} /></div>
        <div className="rules-row"><label>Alternative</label><textarea value={ruleForm.alternative} onChange={(e) => setRuleForm({ ...ruleForm, alternative: e.target.value })} /></div>
        <div className="rules-row"><label>Risk</label><textarea value={ruleForm.risk} onChange={(e) => setRuleForm({ ...ruleForm, risk: e.target.value })} /></div>
        <div className="rules-row"><label>Mistake</label><textarea value={ruleForm.mistake} onChange={(e) => setRuleForm({ ...ruleForm, mistake: e.target.value })} /></div>
        <div className="rules-row"><label>Priority</label><textarea value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: e.target.value })} /></div>
        <div className="rules-row"><label>Customer message</label><textarea value={ruleForm.customer_message} onChange={(e) => setRuleForm({ ...ruleForm, customer_message: e.target.value })} /></div>
      </div>
      <div className="admin-question-actions center">
        <button type="submit" className="admin-primary-btn" disabled={ruleLoading}>
          {ruleLoading ? "Saving..." : "Save Rule"}
        </button>
        <button type="button" className="admin-action-btn ghost" onClick={resetRuleForm}>
          Clear
        </button>
      </div>
    </form>

    <div className="admin-question-list">
      {ruleLoading && ruleList.length === 0 && (
        <div className="skeleton-card">
          <div className="skeleton-line" />
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      )}
      {visibleRules.map((rule) => (
        <div key={rule.id} className="admin-question-item">
          <p className="admin-question-text">{rule.rule_name}</p>
          <div className="admin-question-meta">
            <span className="pill dark">{rule.rule_type || "rule"}</span>
            <span className="pill">{rule.section ?? "-"}</span>
          </div>
          {rule.insight && <p className="admin-helper-text">{rule.insight}</p>}
          <div className="admin-question-actions">
            <button
              className="admin-action-btn"
              onClick={() => {
                setRuleForm({
                  ...rule,
                  action_energy_low: rule.action_energy_low ?? "",
                  action_energy_high: rule.action_energy_high ?? "",
                  clarity_energy_low: rule.clarity_energy_low ?? "",
                  clarity_energy_high: rule.clarity_energy_high ?? "",
                  emotional_energy_low: rule.emotional_energy_low ?? "",
                  emotional_energy_high: rule.emotional_energy_high ?? "",
                  opportunity_energy_low: rule.opportunity_energy_low ?? "",
                  opportunity_energy_high: rule.opportunity_energy_high ?? "",
                  fire_element_low: rule.fire_element_low ?? "",
                  fire_element_high: rule.fire_element_high ?? "",
                  earth_element_low: rule.earth_element_low ?? "",
                  earth_element_high: rule.earth_element_high ?? "",
                  air_element_low: rule.air_element_low ?? "",
                  air_element_high: rule.air_element_high ?? "",
                  water_element_low: rule.water_element_low ?? "",
                  water_element_high: rule.water_element_high ?? "",
                  space_element_low: rule.space_element_low ?? "",
                  space_element_high: rule.space_element_high ?? "",
                  section: rule.section ?? "",
                  next_move: rule.next_move ?? "",
                  alternative: rule.alternative ?? "",
                  risk: rule.risk ?? "",
                  mistake: rule.mistake ?? "",
                  priority: rule.priority ?? "",
                  customer_message: rule.customer_message ?? "",
                })
                setEditingRuleId(rule.id)
                scrollToSection("section-rules")
              }}
            >
              Edit
            </button>
            <button
              className="admin-action-btn danger"
              onClick={async () => {
                try {
                  const adminToken = getAdminToken()
                  await api.delete(`/admin/rules/${rule.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })
                  setRuleList((prev) => prev.filter((r) => r.id !== rule.id))
                  showSuccess("Rule deleted")
                  if (editingRuleId === rule.id) resetRuleForm()
                } catch (err) {
                  showError(getErrorMessage(err))
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
      {ruleList.length === 0 && !ruleLoading && <p className="admin-helper-text">No rules yet.</p>}
    </div>

    {ruleList.length > RULE_PREVIEW_COUNT && (
      <div className="admin-log-actions admin-log-actions-split">
        <button className="admin-action-btn" onClick={() => setShowAllRules((current) => !current)}>
          {showAllRules ? "Show Top 4 Rules" : `Show All Rules (${ruleList.length})`}
        </button>
      </div>
    )}
  </div>
  )}


        {activeSection === "config" && (
        <div className="admin-panel-card" id="section-config">
          <div className="admin-table-header">
            <h3>Config: Sections & Elements</h3>
          </div>
          <div className="admin-config-grid">
            <div className="admin-config-block">
              <h4>Sections</h4>
              <ul className="admin-config-list">
                {sectionOptions.map((s) => (
                  <li key={s.id}>
                    {s.name} {s.is_active ? "" : "(inactive)"}
                    <button className="admin-inline-remove" onClick={() => handleDeleteSection(s.id)} aria-label="Remove section">
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="admin-config-add">
                <input
                  className="admin-search"
                  placeholder="Add new section"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                />
                <button className="auth-button" onClick={handleAddSection}>
                  Add
                </button>
              </div>
            </div>
            <div className="admin-config-block">
              <h4>Elements</h4>
              <ul className="admin-config-list">
                {subsectionOptions.map((s) => (
                  <li key={s.id}>
                    {s.name} {s.is_active ? "" : "(inactive)"}
                    <button className="admin-inline-remove" onClick={() => handleDeleteSubsection(s.id)} aria-label="Remove subsection">
                      <FaTimes />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="admin-config-add">
                <input
                  className="admin-search"
                  placeholder="Add new element"
                  value={newElement}
                  onChange={(e) => setNewElement(e.target.value)}
                />
                <button className="auth-button" onClick={handleAddSubsection}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeSection === "activity" && (
        <div className="admin-panel-card" id="section-logs">
          <div className="admin-table-header">
            <h3>Recent Activity Logs</h3>
            <span>{recentActivityLogs.length} events</span>
          </div>
          <div className="admin-log-list">
            {recentActivityLogs.length ? recentActivityLogs.map((log) => (
              <div key={log.id} className="admin-log-item">
                <div>
                  <strong>{log.activity_type}</strong>
                  <p>{log.description}</p>
                </div>
                <span>{log.created_at ? new Date(log.created_at).toLocaleString() : "-"}</span>
              </div>
            )) : (
              <div className="empty-state-card compact">
                <p>No activity logs yet.</p>
              </div>
            )}
          </div>
          <div className="admin-log-actions">
            <button className="admin-action-btn" onClick={handleOpenAllActivities}>
              Show All Activity
            </button>
          </div>
        </div>
        )}

        {activeSection === "suggestions" && (
        <div className="admin-panel-card" id="suggestions">
          <div className="admin-table-header">
            <h3>User Suggestions</h3>
            <span>{showAllSuggestions ? suggestionList.length : Math.min(suggestionList.length, SUGGESTION_PREVIEW_COUNT)} records</span>
          </div>

          <div className="admin-toolbar">
            <select
              className="admin-filter"
              value={suggestionStatusFilter}
              onChange={(event) => {
                const next = event.target.value
                setSuggestionStatusFilter(next)
                loadAdminSuggestions(next)
              }}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="resolved">Done</option>
            </select>
            <button
              className="admin-action-btn"
              disabled={suggestionLoading}
              onClick={() => loadAdminSuggestions(suggestionStatusFilter)}
            >
              Refresh
            </button>
            {suggestionList.length > SUGGESTION_PREVIEW_COUNT && (
              <button className="admin-action-btn" onClick={() => setShowAllSuggestions((current) => !current)}>
                {showAllSuggestions ? "Show Top 4" : `Show All (${suggestionList.length})`}
              </button>
            )}
          </div>

          {suggestionLoading ? (
            <div className="skeleton-card">
              <div className="skeleton-line short" />
              <div className="skeleton-line" />
              <div className="skeleton-line" />
            </div>
          ) : suggestionError ? (
            <div className="empty-state-card compact">
              <p>{suggestionError}</p>
            </div>
          ) : (
            <>
              {isMobile ? (
                <div className="admin-mobile-list">
                  {visibleSuggestions.map((item) => {
                    const draft = suggestionDrafts[item.id] || {}
                    const statusValue = draft.status ?? item.status ?? "pending"
                    const responseValue = draft.admin_response ?? item.admin_response ?? ""
                    const hasDraft = Boolean(suggestionDrafts[item.id])

                    return (
                      <div key={item.id} className="admin-mobile-card">
                        <div className="admin-mobile-head">
                          <div>
                            <strong>Suggestion #{item.id}</strong>
                            <div className="admin-mobile-sub">
                              {item.user_name || "User"} Â· {item.user_email || "-"}
                            </div>
                          </div>
                          <span className={`admin-status ${statusValue === "resolved" ? "done" : "pending"}`}>
                            {statusValue === "resolved" ? "Done" : "Pending"}
                          </span>
                        </div>

                        <div className="admin-mobile-block">
                          <div className="admin-mobile-label">Message</div>
                          <div className="admin-mobile-value wrap">{item.message}</div>
                          {item.image_url && (
                            <a className="admin-link" href={item.image_url} target="_blank" rel="noreferrer">
                              View image
                            </a>
                          )}
                        </div>

                        <div className="admin-mobile-grid">
                          <div className="admin-mobile-block">
                            <div className="admin-mobile-label">Status</div>
                            <select
                              className="admin-filter admin-mobile-select"
                              value={statusValue}
                              onChange={(event) => {
                                const next = event.target.value
                                setSuggestionDrafts((current) => ({
                                  ...current,
                                  [item.id]: { ...(current[item.id] || {}), status: next },
                                }))
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="resolved">Done</option>
                            </select>
                          </div>

                          <div className="admin-mobile-block">
                            <div className="admin-mobile-label">Created</div>
                            <div className="admin-mobile-value">
                              {item.created_at ? new Date(item.created_at).toLocaleString() : "-"}
                            </div>
                          </div>
                        </div>

                        <div className="admin-mobile-block">
                          <div className="admin-mobile-label">Admin Reply</div>
                          <textarea
                            className="admin-suggestion-textarea admin-mobile-textarea"
                            rows={4}
                            placeholder="Write an update for the user..."
                            value={responseValue}
                            onChange={(event) => {
                              const next = event.target.value
                              setSuggestionDrafts((current) => ({
                                ...current,
                                [item.id]: { ...(current[item.id] || {}), admin_response: next },
                              }))
                            }}
                          />
                        </div>

                        <div className="admin-mobile-actions">
                          <button className="admin-action-btn" disabled={!hasDraft} onClick={() => saveSuggestionDraft(item.id)}>
                            Save
                          </button>
                          <button
                            className="admin-action-btn"
                            onClick={() => saveSuggestionDraft(item.id, { status: "resolved", admin_response: responseValue })}
                          >
                            Mark Done
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  {visibleSuggestions.length === 0 && (
                    <div className="empty-state-card compact">
                      <p>No suggestions found.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Suggestion</th>
                        <th>Status</th>
                        <th>Admin Reply</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSuggestions.map((item) => {
                        const draft = suggestionDrafts[item.id] || {}
                        const statusValue = draft.status ?? item.status ?? "pending"
                        const responseValue = draft.admin_response ?? item.admin_response ?? ""
                        const hasDraft = Boolean(suggestionDrafts[item.id])

                        return (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>
                              <div className="admin-suggestion-user">
                                <strong>{item.user_name || "User"}</strong>
                                <small>{item.user_email || "-"}</small>
                              </div>
                            </td>
                        <td className="admin-suggestion-message">
                          <div>{item.message}</div>
                          {item.image_url && (
                            <a className="admin-link" href={item.image_url} target="_blank" rel="noreferrer">
                              View image
                            </a>
                          )}
                        </td>
                            <td>
                              <select
                                className="admin-filter admin-suggestion-select"
                                value={statusValue}
                                onChange={(event) => {
                                  const next = event.target.value
                                  setSuggestionDrafts((current) => ({
                                    ...current,
                                    [item.id]: { ...(current[item.id] || {}), status: next },
                                  }))
                                }}
                              >
                                <option value="pending">Pending</option>
                                <option value="resolved">Done</option>
                              </select>
                            </td>
                            <td>
                              <textarea
                                className="admin-suggestion-textarea"
                                rows={3}
                                placeholder="Write an update for the user..."
                                value={responseValue}
                                onChange={(event) => {
                                  const next = event.target.value
                                  setSuggestionDrafts((current) => ({
                                    ...current,
                                    [item.id]: { ...(current[item.id] || {}), admin_response: next },
                                  }))
                                }}
                              />
                            </td>
                            <td>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</td>
                            <td>
                              <div className="admin-row-actions">
                                <button className="admin-action-btn" disabled={!hasDraft} onClick={() => saveSuggestionDraft(item.id)}>
                                  Save
                                </button>
                                <button
                                  className="admin-action-btn"
                                  onClick={() => saveSuggestionDraft(item.id, { status: "resolved", admin_response: responseValue })}
                                >
                                  Mark Done
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}

                      {visibleSuggestions.length === 0 && (
                        <tr>
                          <td colSpan="7" className="admin-empty-state">
                            No suggestions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        )}

        {activeSection === "users" && (
        <div className="admin-panel-card" id="section-users-list">
          <div className="admin-table-header">
            <h3>Registered Users</h3>
            <span>{showAllUsers ? filteredUsers.length : Math.min(filteredUsers.length, 5)} records</span>
          </div>

          <div className="admin-toolbar">
            <input
              className="admin-search"
              placeholder="Search by name, email, role, or nationality"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <select
              className="admin-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Users</option>
              <option value="complete">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {isMobile ? (
            <div className="admin-mobile-list">
              {visibleUsers.map((user) => (
                <div key={user.user_id} className="admin-mobile-card">
                  <div className="admin-mobile-head">
                    <div>
                      <strong>
                        #{user.user_id} Â· {user.name || "User"}
                      </strong>
                      <div className="admin-mobile-sub">{user.email}</div>
                    </div>
                    <div className="admin-status-stack">
                      <span className={`admin-status ${user.profile_completed ? "done" : "pending"}`}>
                        {user.profile_completed ? "Complete" : "Pending"}
                      </span>
                      {user.suspended && <span className="admin-status suspended">Suspended</span>}
                    </div>
                  </div>

                  <div className="admin-mobile-grid">
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Phone</div>
                      <div className="admin-mobile-value wrap">{user.phone || "-"}</div>
                    </div>
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Role</div>
                      <select
                        className="admin-role-select admin-mobile-select"
                        value={user.role || "user"}
                        onChange={(event) => handleRoleChange(user.user_id, event.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="support">support</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Nationality</div>
                      <div className="admin-mobile-value wrap">{user.nationality || "-"}</div>
                    </div>
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Language</div>
                      <div className="admin-mobile-value wrap">{user.language || "-"}</div>
                    </div>
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Career</div>
                      <div className="admin-mobile-value wrap">{user.current_role || "-"}</div>
                    </div>
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Experience</div>
                      <div className="admin-mobile-value">{user.years_experience || 0} yrs</div>
                    </div>
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Goals</div>
                      <div className="admin-mobile-value wrap">{user.goals || "-"}</div>
                    </div>
                    <div className="admin-mobile-block">
                      <div className="admin-mobile-label">Joined</div>
                      <div className="admin-mobile-value">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="admin-mobile-actions">
                    <button className="admin-action-btn" onClick={() => handleViewUser(user.user_id)}>
                      View
                    </button>
                    <button className="admin-action-btn warn" onClick={() => handleSuspendToggle(user)}>
                      {user.suspended ? "Unsuspend" : "Suspend"}
                    </button>
                    <button className="admin-action-btn danger" onClick={() => handleDeleteUser(user)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {visibleUsers.length === 0 && (
                <div className="empty-state-card compact">
                  <p>No users match the current search or filter.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Nationality</th>
                    <th>Language</th>
                    <th>Role</th>
                    <th>Career Role</th>
                    <th>Experience</th>
                    <th>Goals</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td>{user.user_id}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.nationality}</td>
                      <td>{user.language}</td>
                      <td>
                        <select
                          className="admin-role-select"
                          value={user.role || "user"}
                          onChange={(event) => handleRoleChange(user.user_id, event.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="support">support</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td>{user.current_role}</td>
                      <td>{user.years_experience} yrs</td>
                      <td>{user.goals}</td>
                      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</td>
                      <td>
                        <div className="admin-status-stack">
                          <span className={`admin-status ${user.profile_completed ? "done" : "pending"}`}>
                            {user.profile_completed ? "Complete" : "Pending"}
                          </span>
                          {user.suspended && <span className="admin-status suspended">Suspended</span>}
                        </div>
                      </td>
                      <td>
                        <div className="admin-row-actions">
                          <button className="admin-action-btn" onClick={() => handleViewUser(user.user_id)}>
                            View
                          </button>
                          <button className="admin-action-btn warn" onClick={() => handleSuspendToggle(user)}>
                            {user.suspended ? "Unsuspend" : "Suspend"}
                          </button>
                          <button className="admin-action-btn danger" onClick={() => handleDeleteUser(user)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleUsers.length === 0 && (
                    <tr>
                      <td colSpan="13" className="admin-empty-state">
                        No users match the current search or filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {filteredUsers.length > 5 && (
            <div className="admin-log-actions admin-log-actions-split">
              <button className="admin-action-btn" onClick={() => setShowAllUsers((current) => !current)}>
                {showAllUsers ? "Show Recent 5 Users" : "Show All Users"}
              </button>
              {showAllUsers && (
                <div className="admin-pagination">
                  <button className="admin-action-btn" disabled={currentUserPage === 1} onClick={() => setCurrentUserPage((current) => Math.max(1, current - 1))}>
                    Prev
                  </button>
                  <span>Page {currentUserPage} / {totalUserPages}</span>
                  <button className="admin-action-btn" disabled={currentUserPage === totalUserPages} onClick={() => setCurrentUserPage((current) => Math.min(totalUserPages, current + 1))}>
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {(selectedUser || profileLoading) && (
          <div className="admin-profile-overlay" onClick={() => setSelectedUser(null)}>
            <div className="admin-profile-drawer" onClick={(event) => event.stopPropagation()}>
              {profileLoading && <p>Loading user profile...</p>}
              {selectedUser && (
                <>
                  <div className="admin-table-header">
                    <h3>User Profile</h3>
                    <button className="admin-action-btn" onClick={() => setSelectedUser(null)}>
                      Close
                    </button>
                  </div>

                  <div className="admin-detail-grid">
                    <div><span>Name</span><strong>{selectedUser.name || "-"}</strong></div>
                    <div><span>Email</span><strong>{selectedUser.email || "-"}</strong></div>
                    <div><span>Phone</span><strong>{selectedUser.phone || "-"}</strong></div>
                    <div><span>Nationality</span><strong>{selectedUser.nationality || "-"}</strong></div>
                    <div><span>Language</span><strong>{selectedUser.language || "-"}</strong></div>
                    <div>
                      <span>Account Role</span>
                      <strong>
                        <select
                          className="admin-role-select admin-role-select-drawer"
                          value={selectedUser.role || "user"}
                          onChange={(event) => handleRoleChange(selectedUser.user_id, event.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="support">support</option>
                          <option value="admin">admin</option>
                        </select>
                      </strong>
                    </div>
                    <div><span>Current Role</span><strong>{selectedUser.current_role || "-"}</strong></div>
                    <div><span>Experience</span><strong>{selectedUser.years_experience || 0} yrs</strong></div>
                    <div><span>Status</span><strong>{selectedUser.suspended ? "Suspended" : "Active"}</strong></div>
                    <div><span>Date of Birth</span><strong>{selectedUser.dob || "-"}</strong></div>
                    <div><span>Birth Time</span><strong>{selectedUser.birth_time || "-"}</strong></div>
                    <div><span>Birth Place</span><strong>{selectedUser.birth_place || "-"}</strong></div>
                    <div><span>Education</span><strong>{selectedUser.education || "-"}</strong></div>
                    <div className="full"><span>Interests</span><strong>{selectedUser.interests || "-"}</strong></div>
                    <div className="full"><span>Goals</span><strong>{selectedUser.goals || "-"}</strong></div>
                    <div className="full"><span>Address</span><strong>{selectedUser.address || "-"}</strong></div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {showAllActivities && (
          <div className="admin-profile-overlay" onClick={() => setShowAllActivities(false)}>
            <div className="admin-profile-drawer admin-activity-drawer" onClick={(event) => event.stopPropagation()}>
              <div className="admin-table-header">
                <h3>All Activity Logs</h3>
                <div className="admin-header-actions">
                  <button className="admin-action-btn danger" onClick={handleDeleteAllActivityLogs}>
                    Delete All History
                  </button>
                  <button className="admin-action-btn" onClick={() => setShowAllActivities(false)}>
                    Close
                  </button>
                </div>
              </div>

              {activityLoading ? (
                <div className="skeleton-card">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </div>
              ) : (
                <>
                  <div className="admin-log-list">
                    {paginatedActivityLogs.map((log) => (
                      <div key={log.id} className="admin-log-item admin-log-item-extended">
                        <div>
                          <strong>{log.activity_type}</strong>
                          <p>{log.description}</p>
                          <small>User ID: {log.user_id ?? "-"}</small>
                        </div>
                        <div className="admin-log-item-actions">
                          <span>{log.created_at ? new Date(log.created_at).toLocaleString() : "-"}</span>
                          <button className="admin-action-btn danger" onClick={() => handleDeleteActivityLog(log.id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {allActivityLogs.length === 0 && (
                      <div className="empty-state-card compact">
                        <p>No activity logs available.</p>
                      </div>
                    )}
                  </div>

                  {allActivityLogs.length > ACTIVITY_PAGE_SIZE && (
                    <div className="admin-pagination">
                      <button className="admin-action-btn" disabled={currentActivityPage === 1} onClick={() => setCurrentActivityPage((current) => Math.max(1, current - 1))}>
                        Prev
                      </button>
                      <span>Page {currentActivityPage} / {totalActivityPages}</span>
                      <button className="admin-action-btn" disabled={currentActivityPage === totalActivityPages} onClick={() => setCurrentActivityPage((current) => Math.min(totalActivityPages, current + 1))}>
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
