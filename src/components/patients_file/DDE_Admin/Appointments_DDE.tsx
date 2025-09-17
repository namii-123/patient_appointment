import React, { useState } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, } from "react-icons/fa";
import "../../../assets/Appointments_DDE.css";
import logo from "/logo.png";

// Types
interface Appointment {
  no: number;
  name: string;
  age: string;
  gender: string;
  date: string;
  status: "Pending" | "Approved" | "Rejected";
}

interface Notification {
  text: string;
  unread: boolean;
}

const Appointments_DDE: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const dummyAppointments: Appointment[] = [
    { no: 1, name: "Donna May Magsucang", age: "22", gender: "Female", date: "2025-05-01", status: "Pending" },
    { no: 2, name: "Ronzel Go", age: "20", gender: "Male", date: "2025-05-02", status: "Approved" },
    { no: 3, name: "Shelonie Datuin", age: "20", gender: "Female", date: "2025-05-03", status: "Rejected" },
  ];

  const filteredAppointments = dummyAppointments.filter((appointment) => {
    const matchesSearch =
      appointment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.no.toString().includes(searchTerm);

    const matchesStatus =
      statusFilter === "All" || appointment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Reject modal states
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Accept modal states
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);

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
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/dashboard_dde")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item active">
              <FaCalendarAlt className="nav-icon" />
              <span>Appointments</span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_dde")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span
                onClick={() => handleNavigation("/reports&analytics_dde")}
              >
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
          <h2 className="navbar-title">Appointments</h2>
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
                    <button
                      className="mark-read-btn"
                      onClick={markAllAsRead}
                    >
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
                      {notif.unread && <span className="notification-badge">New</span>}
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
        <div className="filter-bar">
          <div className="searchbar-containerss">
            <div className="searchss">
            <FaSearch className="search-icons" />
            <input
              type="text"
              placeholder="Search by Name or Number..."
              className="search-input"
              value={searchTerm}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
          </div>
          <div className="filter">
            <label>Status:</label>
            <select
              className="status-dropdown"
              value={statusFilter}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <p className="appointments-header">All Patient Appointment Requests</p>

        <table className="appointments-table">
          <thead>
            <tr>
              <th>Patient ID</th>
              <th>Patient Name</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.length > 0 ? (
              filteredAppointments.map((appointment) => (
                <tr key={appointment.no}>
                  <td>{appointment.no}</td>
                  <td>{appointment.name}</td>
                  <td>{appointment.age}</td>
                  <td>{appointment.gender}</td>
                  <td>{appointment.date}</td>
                  <td>
                    <span className={`status-text ${appointment.status.toLowerCase()}`}>
                      {appointment.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        setSelectedAppointment(appointment);
                        setShowAcceptModal(true);
                      }}
                      className="action-btn accept"
                    >
                      Accept
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
              ))
            ) : (
              <tr>
                <td colSpan={7} className="no-records">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Reject Appointment</h3>
              <p>Please enter the reason for rejection:</p>
              <textarea
                value={rejectReason}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
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
                    console.log("Rejected appointment:", selectedAppointment);
                    console.log("Reason:", rejectReason);
                    alert(`Appointment rejected.\nReason: ${rejectReason}`);
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

        {/* Accept Modal */}
        {showAcceptModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Accept Appointment</h3>
              <p>
                Are you sure you want to accept <strong>{selectedAppointment?.name}</strong>?
              </p>
              <div className="modal-buttons">
                <button className="modal-cancel" onClick={() => setShowAcceptModal(false)}>
                  Cancel
                </button>
                <button
                  className="modal-confirm"
                  onClick={() => {
                    console.log("Accepted appointment:", selectedAppointment);
                    alert(`Appointment for ${selectedAppointment?.name} accepted.`);
                    setShowAcceptModal(false);
                    setSelectedAppointment(null);
                  }}
                >
                  Confirm Accept
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

export default Appointments_DDE;
