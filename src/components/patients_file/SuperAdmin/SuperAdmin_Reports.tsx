import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, } from "recharts";
import "../../../assets/SuperAdmin_Reports.css";
import logo from "/logo.png";

interface ChartData {
  date: string;
  patientsServed: number;
  newRegistrations: number;
  followUps: number;
  referrals: number;
}

interface Notification {
  text: string;
  unread: boolean;
}

const SuperAdmin_Reports: React.FC = () => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState<string>("dental");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new registration requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  //Date filter
  const [filterDate, setFilterDate] = useState<string>("");

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  //Sample Data Per Department
  const departmentData: Record<string, ChartData[]> = {
    dental: [
      { date: "2025-04-25", patientsServed: 45, newRegistrations: 10, followUps: 5, referrals: 2 },
      { date: "2025-04-26", patientsServed: 50, newRegistrations: 12, followUps: 7, referrals: 3 },
      { date: "2025-04-27", patientsServed: 60, newRegistrations: 15, followUps: 8, referrals: 4 },
      { date: "2025-04-28", patientsServed: 48, newRegistrations: 9, followUps: 6, referrals: 2 },
      { date: "2025-04-29", patientsServed: 55, newRegistrations: 13, followUps: 10, referrals: 5 },
      { date: "2025-04-30", patientsServed: 52, newRegistrations: 11, followUps: 7, referrals: 3 },
      { date: "2025-05-01", patientsServed: 58, newRegistrations: 14, followUps: 9, referrals: 4 },
    ],
    clinical: [
      { date: "2025-04-25", patientsServed: 70, newRegistrations: 20, followUps: 15, referrals: 6 },
      { date: "2025-04-26", patientsServed: 80, newRegistrations: 25, followUps: 18, referrals: 5 },
      { date: "2025-04-27", patientsServed: 90, newRegistrations: 30, followUps: 20, referrals: 7 },
      { date: "2025-04-28", patientsServed: 75, newRegistrations: 22, followUps: 17, referrals: 4 },
      { date: "2025-04-29", patientsServed: 85, newRegistrations: 28, followUps: 19, referrals: 6 },
      { date: "2025-04-30", patientsServed: 78, newRegistrations: 24, followUps: 16, referrals: 5 },
      { date: "2025-05-01", patientsServed: 88, newRegistrations: 29, followUps: 21, referrals: 6 },
    ],
    radiology: [
      { date: "2025-04-25", patientsServed: 30, newRegistrations: 8, followUps: 4, referrals: 1 },
      { date: "2025-04-26", patientsServed: 35, newRegistrations: 10, followUps: 5, referrals: 2 },
      { date: "2025-04-27", patientsServed: 40, newRegistrations: 12, followUps: 6, referrals: 2 },
      { date: "2025-04-28", patientsServed: 32, newRegistrations: 9, followUps: 4, referrals: 1 },
      { date: "2025-04-29", patientsServed: 38, newRegistrations: 11, followUps: 5, referrals: 2 },
      { date: "2025-04-30", patientsServed: 34, newRegistrations: 10, followUps: 6, referrals: 1 },
      { date: "2025-05-01", patientsServed: 42, newRegistrations: 13, followUps: 7, referrals: 2 },
    ],
    dde: [
      { date: "2025-04-25", patientsServed: 20, newRegistrations: 5, followUps: 2, referrals: 1 },
      { date: "2025-04-26", patientsServed: 22, newRegistrations: 6, followUps: 3, referrals: 1 },
      { date: "2025-04-27", patientsServed: 25, newRegistrations: 7, followUps: 3, referrals: 2 },
      { date: "2025-04-28", patientsServed: 23, newRegistrations: 6, followUps: 2, referrals: 1 },
      { date: "2025-04-29", patientsServed: 26, newRegistrations: 7, followUps: 4, referrals: 1 },
      { date: "2025-04-30", patientsServed: 24, newRegistrations: 6, followUps: 3, referrals: 1 },
      { date: "2025-05-01", patientsServed: 28, newRegistrations: 8, followUps: 4, referrals: 2 },
    ],
  };

  //Filter data by department + date range
  let chartData = departmentData[department];
  if (filterDate) {
  chartData = chartData.filter((row) => row.date === filterDate);
}

  const unreadCount: number = notifications.filter((n) => n.unread).length;

  const markAllAsRead = (): void => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  //Summary (auto-calculated based on filtered data)
  const totals = chartData.reduce(
    (acc, curr) => {
      acc.patientsServed += curr.patientsServed;
      acc.newRegistrations += curr.newRegistrations;
      acc.followUps += curr.followUps;
      acc.referrals += curr.referrals;
      return acc;
    },
    { patientsServed: 0, newRegistrations: 0, followUps: 0, referrals: 0 }
  );

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logos" />
            <span className="logo-texts">HealthSys</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-items">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_dashboard")}>
                Dashboard
              </span>
            </div>
            <div className="nav-items">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_userrequests")}>
                User Requests
              </span>
            </div>
            <div className="nav-items">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-items active">
              <FaChartBar className="nav-icon" />
              <span>Reports & Analytics</span>
            </div>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Super Admin</span>
          </div>
          <div className="signout-box">
            <FaSignOutAlt className="signout-icon" />
            <span onClick={() => handleNavigation("/")} className="signout-label">
              Sign Out
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="top-navbar-dental">
          <h2 className="navbar-title">Reports and Analytics</h2>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && (
              <span className="notification-count">{unreadCount}</span>
            )}

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="mark-read-btn" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length > 0 ? (
                  notifications.map((notif, index) => (
                    <div
                      key={index}
                      className={`notification-item ${notif.unread ? "unread" : ""}`}
                    >
                      <span>{notif.text}</span>
                      {notif.unread && (
                        <span className="notification-badge">New</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No new notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="content-wrapper-reports">
          <div className="filters-container-reports">
            <div className="filter-reports">
              <label>Department:</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="dental">Dental</option>
                <option value="clinical">Clinical</option>
                <option value="radiology">Radiology</option>
                <option value="medical">Medical</option>
                <option value="dde">DDE</option>
              </select>
            </div>

            {/* From Date */}
            <div className="filter-reports">
              <label>Date:</label>
              <div className="date-select-group">
                <select
                  value={filterDate.split("-")[1] || ""}
                  onChange={(e) => {
                    const [y, m, d] = filterDate.split("-");
                    setFilterDate(`${y || ""}-${e.target.value}-${d || ""}`);
                  }}
                >
                  <option value="">Month</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      {new Date(0, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>

                <select
                  value={filterDate.split("-")[2] || ""}
                  onChange={(e) => {
                    const [y, m, d] = filterDate.split("-");
                    setFilterDate(`${y || ""}-${m || ""}-${e.target.value}`);
                  }}
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      {i + 1}
                    </option>
                  ))}
                </select>

                <select
                  value={filterDate.split("-")[0] || ""}
                  onChange={(e) => {
                    const [y, m, d] = filterDate.split("-");
                    setFilterDate(`${e.target.value}-${m || ""}-${d || ""}`);
                  }}
                >
                  <option value="">Year</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = 2020 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>


          {/* Department Trends Graph */}
          <h3 className="section-title center">Department Trends</h3>
          <div className="line graph">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="patientsServed"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="newRegistrations"
                  stroke="#f4a261"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="followUps"
                  stroke="#e76f51"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="referrals"
                  stroke="#264653"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Patients Served</th>
                <th>New Registrations</th>
                <th>Follow-ups</th>
                <th>Referrals</th>
              </tr>
            </thead>
            <tbody>
              {chartData.length > 0 ? (
                chartData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{row.patientsServed}</td>
                    <td>{row.newRegistrations}</td>
                    <td>{row.followUps}</td>
                    <td>{row.referrals}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center" }}>
                    No data in this range
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Summary Section */}
          <div className="summary-section">
            <div className="summary-card">
              <span>Total Patients Served</span>
              <strong>{totals.patientsServed}</strong>
            </div>
            <div className="summary-card">
              <span>New Registrations</span>
              <strong>{totals.newRegistrations}</strong>
            </div>
            <div className="summary-card">
              <span>Follow-ups</span>
              <strong>{totals.followUps}</strong>
            </div>
            <div className="summary-card">
              <span>Referrals</span>
              <strong>{totals.referrals}</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin_Reports;
