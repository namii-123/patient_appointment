import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, } from "react-icons/fa";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, } from "recharts";
import "../../../assets/Dashboard_DDE.css";
import logo from "/logo.png";

interface Notification {
  text: string;
  unread: boolean;
}

interface Appointment {
  no: number;
  name: string;
  date: string;
  status: string;
}

interface ChartData {
  name: string;
  value: number;
}

const Dashboard_DDE: React.FC = () => {
  const navigate = useNavigate();
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const data: ChartData[] = [
    { name: "Approved", value: 735 },
    { name: "Pending", value: 36 },
    { name: "Canceled", value: 76 },
  ];

  const COLORS: string[] = ["#4CAF50", "#FFC107", "#F44336"];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = (): void => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const appointments: Appointment[] = [
    { no: 1, name: "John Doe", date: "2025-05-01", status: "Pending" },
    { no: 2, name: "Jane Smith", date: "2025-05-02", status: "Pending" },
    { no: 3, name: "Michael Johnson", date: "2025-05-03", status: "Pending" },
    { no: 4, name: "Emily Davis", date: "2025-05-04", status: "Pending" },
    { no: 5, name: "David Wilson", date: "2025-05-05", status: "Pending" },
  ];

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

          {/* Nav Links */}
          <nav className="nav-linkss">
            <div className="nav-item active">
              <FaTachometerAlt className="nav-icon" />
              <span>Dashboard</span>
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
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/reports&analytics_dde")}>
                Reports & Analytics
              </span>
            </div>
          </nav>
        </div>

        {/* User Info and Sign Out */}
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
        {/* Top Navbar */}
        <div className="top-navbar-dde">
          <h2 className="navbar-title">Dashboard</h2>
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
                      className={`notification-item ${
                        notif.unread ? "unread" : ""
                      }`}
                    >
                      <span>{notif.text}</span>
                      {notif.unread && (
                        <span className="notification-badge">New</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">
                    No new notifications
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
      <div className="content-wrapper">
        <div className="cards-container">
          <div className="card-row">
            <div className="card">
              <FaUsers className="card-icon" />
              <h3>1245</h3>
              <p>Total Patients</p>
            </div>
            <div className="card">
              <FaCalendarAlt className="card-icon" />
              <h3>847</h3>
              <p>Total Appointments</p>
            </div>
            <div className="card">
              <FaChartBar className="card-icon" />
              <h3>36</h3>
              <p>Pending Appointments</p>
            </div>
          </div>

          <div className="card-row center">
            <div className="card">
              <FaCalendarAlt className="card-icon" />
              <h3>735</h3>
              <p>Approved Appointments</p>
            </div>
            <div className="card">
              <FaCalendarAlt className="card-icon" />
              <h3>76</h3>
              <p>Canceled Appointments</p>
            </div>
          </div>
        </div>

        {/* Charts and Activity */}
        <div className="chart-activity-container">
          <div className="chart-wrapper">
            <h3 className="chart-title">Appointment Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} (${(percent ? (percent * 100).toFixed(1) : 0)}%)`
                  }                  
                  dataKey="value"
                  paddingAngle={3}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  layout="horizontal"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="activity-wrapper">
            <h3 className="chart-title">Weekly Activity Status</h3>
            <ul className="activity-list">
              <li>
                <strong>Monday:</strong> 32 Appointments
              </li>
              <li>
                <strong>Tuesday:</strong> 45 Appointments
              </li>
              <li>
                <strong>Wednesday:</strong> 28 Appointments
              </li>
              <li>
                <strong>Thursday:</strong> 36 Appointments
              </li>
              <li>
                <strong>Friday:</strong> 40 Appointments
              </li>
              <li>
                <strong>Saturday:</strong> Closed
              </li>
              <li>
                <strong>Sunday:</strong> Closed
              </li>
            </ul>
          </div>
        </div>

        {/* Appointment Table */}
        <h3 className="table-titles">New Incoming Appointment Requests</h3>
        <table className="appointment-tables">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment, index) => (
              <tr key={index}>
                <td>{appointment.no}</td>
                <td>{appointment.name}</td>
                <td>{appointment.date}</td>
                <td>
                  <span
                    className={`status-text ${appointment.status.toLowerCase()}`}
                  >
                    {appointment.status}
                  </span>
                </td>
                <td>
                  <button
                    className="action-btn approve"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setShowApproveModal(true);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="action-btn reject"
                    onClick={() => {
                      setSelectedAppointment(appointment);
                      setShowRejectModal(true);
                    }}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Approve Modal */}
        {showApproveModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Approve Appointment</h3>
              <p>
                Are you sure you want to approve{" "}
                <strong>{selectedAppointment?.name}</strong>?
              </p>
              <div className="modal-buttons">
                <button
                  className="modal-cancel"
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="modal-confirm"
                  onClick={() => {
                    console.log("Accepted appointment:", selectedAppointment);
                    alert(
                      `Appointment for ${selectedAppointment?.name} accepted.`
                    );
                    setShowApproveModal(false);
                    setSelectedAppointment(null);
                  }}
                >
                  Confirm Approve
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Reason Modal */}
        {showRejectModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Reject Appointment</h3>
              <p>Please enter the reason for rejection:</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Type reason here..."
              />
              <div className="modal-buttons">
                <button
                  className="modal-cancel"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                    setSelectedAppointment(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="modal-confirm"
                  onClick={() => {
                    console.log("Rejected:", selectedAppointment);
                    console.log("Reason:", rejectReason);
                    alert(`Rejected appointment.\nReason: ${rejectReason}`);
                    setShowRejectModal(false);
                    setRejectReason("");
                    setSelectedAppointment(null);
                  }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard_DDE;
