import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar,FaSignOutAlt, } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, } from "recharts";
import "../../../assets/ReportsAnalytics_DDE.css";
import logo from "/logo.png";

interface ChartData {
  date: string;
  completed: number;
  pending: number;
  missed: number;
  cancelled: number;
}

interface Notification {
  text: string;
  unread: boolean;
}

const ReportsAnalytics_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>("daily");
  const [status, setStatus] = useState<string>("all");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const chartData: ChartData[] = [
    { date: "Apr 25", completed: 10, pending: 2, missed: 1, cancelled: 0 },
    { date: "Apr 26", completed: 8, pending: 3, missed: 0, cancelled: 1 },
    { date: "Apr 27", completed: 12, pending: 1, missed: 1, cancelled: 1 },
    { date: "Apr 28", completed: 7, pending: 4, missed: 2, cancelled: 0 },
    { date: "Apr 29", completed: 11, pending: 2, missed: 0, cancelled: 2 },
    { date: "Apr 30", completed: 9, pending: 3, missed: 1, cancelled: 1 },
    { date: "May 1", completed: 10, pending: 2, missed: 1, cancelled: 2 },
  ];

  const unreadCount: number = notifications.filter((n) => n.unread).length;

  const markAllAsRead = (): void => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <div className="dashboards">
      {/* Sidebar */}
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/dashboard_dde")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">DDE</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/dashboard_dde")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_dde")}>
                Appointments
              </span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_dde")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item active">
              <FaChartBar className="nav-icon" />
              <span>Reports & Analytics</span>
            </div>
            
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Admin</span>
          </div>
          <div className="signout-box">
            <FaSignOutAlt className="signout-icon" />
            <span
              onClick={() => handleNavigation("/")}
              className="signout-label"
            >
              Sign Out
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <div className="top-navbar-dde">
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
      <div className="content-wrapper">
        <div className="filters-containers">
          <div className="filterss">
            <label>Period:</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="filterss">
            <label>Status:</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>

        {/* Appointment Trends Graph */}
        <h3 className="section-title center">Appointment Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#2a9d8f"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="pending"
              stroke="#f4a261"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="missed"
              stroke="#e76f51"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="cancelled"
              stroke="#264653"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Appointment Table */}
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Total</th>
              <th>Completed</th>
              <th>Missed</th>
              <th>Pending</th>
              <th>Cancelled</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2025-05-01</td>
              <td>15</td>
              <td>10</td>
              <td>1</td>
              <td>2</td>
              <td>2</td>
            </tr>
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="summary-section">
          <div className="summary-card">
            <span>Total Appointments</span>
            <strong>150</strong>
          </div>
          <div className="summary-card">
            <span>Completed</span>
            <strong>120</strong>
          </div>
          <div className="summary-card">
            <span>Cancelled</span>
            <strong>10</strong>
          </div>
          <div className="summary-card">
            <span>Missed</span>
            <strong>5</strong>
          </div>
          <div className="summary-card">
            <span>Pending</span>
            <strong>15</strong>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsAnalytics_DDE;
