import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
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

function AdminPanel() {
  const navigate = useNavigate()
  const { showError, showInfo, showSuccess } = useToast()
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

  const getAdminToken = () => localStorage.getItem("admin_token")

  const loadAdminData = async () => {
    const adminToken = getAdminToken()
    const response = await api.get("/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })
    setData(response.data)
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

    // The dashboard bootstrap intentionally runs once on page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadAdminDashboard()
  }, [navigate])

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

  const stats = data?.stats || {}
  const users = data?.users ?? []
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

  useEffect(() => {
    setCurrentUserPage(1)
  }, [searchTerm, statusFilter, showAllUsers])

  if (loading) {
    return (
      <div className="admin-panel-page">
        <div className="admin-panel-shell">
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
              Back to Admin Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-panel-page">
      <div className="admin-panel-shell">
        <div className="admin-panel-header">
          <div>
            <h1>Admin Panel</h1>
            <p>Project users, profile progress, activity logs, and dashboard-ready records.</p>
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

        <div className="admin-stats-grid">
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

        <div className="admin-panel-card">
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

        <div className="admin-panel-card">
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
  )
}

export default AdminPanel
