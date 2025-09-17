import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, } from "react-icons/fa";
import "../../../assets/PatientRecords_DDE.css";
import logo from "/logo.png";

type Appointment = {
  no: number;
  name: string;
  address: string;
  age: string;
  gender: string;
  date: string;
  status: string;
};

type Notification = {
  text: string;
  unread: boolean;
};

const PatientRecords_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal States
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

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

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleAction = (action: string, appointment: Appointment) => {
    setSelectedAppointment(appointment);
    if (action === "Completed") {
      setShowCompletedModal(true);
    } else if (action === "View Record") {
      setShowRecordModal(true); 
    } else {
      console.log(`${action} appointment with ID: ${appointment.no}`);
    }
  };

  const confirmCompleted = () => {
    if (selectedAppointment) {
      console.log(`Marked as completed: ${selectedAppointment.no}`);
    }
    setShowCompletedModal(false);
    setSelectedAppointment(null);
  };

  const dummyAppointments: Appointment[] = [
    {
      no: 1,
      name: "Donna May Magsucang",
      address: "Oslob, Cebu",
      age: "22",
      gender: "Female",
      date: "2025-05-01",
      status: "Accepted",
    },
    {
      no: 2,
      name: "Shelonie Datuin",
      address: "Tulic Argao, Cebu",
      age: "20",
      gender: "Female",
      date: "2025-05-02",
      status: "Accepted",
    },
    {
      no: 3,
      name: "Alyssa Nicklyn",
      address: "Langtad Argao, Cebu",
      age: "20",
      gender: "Female",
      date: "2025-05-03",
      status: "Accepted",
    },
  ];

  const filteredAppointments = dummyAppointments.filter((appointment) => {
    const matchesSearch =
      appointment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.no.toString().includes(searchTerm);
    return matchesSearch;
  });

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
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_dde")}>
                Appointments
              </span>
            </div>
            <div className="nav-item active">
              <FaUsers className="nav-icon" />
              <span>Patient Records</span>
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
            <span onClick={() => handleNavigation("/")} className="signout-label">
              Sign Out
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar-dde">
          <h2 className="navbar-title">Patient Records</h2>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}

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

        {/* Search Bar */}
      <div className="content-wrapper">
        <div className="search-container">
          <div className="search-bar-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by Name or Number..."
              className="search-bar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Subheading */}
        <p className="appointments-heading">All Accepted Appointments</p>

        {/* Table */}
        <div className="table-container">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Patient ID</th>
                <th>Patient Name</th>
                <th>Address</th>
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
                    <td>{appointment.address}</td>
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
                        onClick={() => handleAction("Completed", appointment)}
                        className="action-btn completed"
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => handleAction("View Record", appointment)}
                        className="action-btn view"
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="no-records">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </main>

      {/* Completed Modal */}
      {showCompletedModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Mark as Completed</h3>
            <p>
              Are you sure you want to mark <strong>{selectedAppointment?.name}</strong> as
              completed?
            </p>
            <div className="modal-buttons">
              <button onClick={confirmCompleted} className="modal-confirm">
                Yes
              </button>
              <button onClick={() => setShowCompletedModal(false)} className="modal-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Record Modal */}
      {showRecordModal && selectedAppointment && (
        <div className="modal-overlay">
          <div className="modal-box record-modal">
          <h3>Patient Record</h3>

          <div className="patient-info">
            <div className="info-row">
              <span className="info-label">Patient ID:</span>
              <span className="info-value">{selectedAppointment.no}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{selectedAppointment.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Address:</span>
              <span className="info-value">{selectedAppointment.address}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Age:</span>
              <span className="info-value">{selectedAppointment.age}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Gender:</span>
              <span className="info-value">{selectedAppointment.gender}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Date of Appointment:</span>
              <span className="info-value">{selectedAppointment.date}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className="info-value">{selectedAppointment.status}</span>
            </div>
          </div>

        <div className="modal-buttons">
          <button 
            onClick={() => setShowRecordModal(false)} 
            className="modal-confirm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )}
      
    </div>
  );
};

export default PatientRecords_DDE;
