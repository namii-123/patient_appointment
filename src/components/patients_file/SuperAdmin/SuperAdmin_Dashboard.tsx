import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaTooth,
   FaStethoscope, FaXRay, FaClinicMedical,  FaUserMd} from "react-icons/fa";
import "../../../assets/SuperAdmin_Dashboard.css";
import logo from "/logo.png";

const SuperAdmin_Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
  };
  const [showAllRequests, setShowAllRequests] = useState(false);

  const notifications = [
    { id: 1, text: "New patient registered in Dental", unread: true },
    { id: 2, text: "3 Appointment requests pending approval", unread: true },
    { id: 3, text: "Radiology report uploaded by Dr. Smith", unread: false },
    { id: 4, text: "Clinical department updated patient records", unread: false },
  ];

  const requests = [
    { id: 1, name: "John Doe", department: "Dental", status: "pending" },
    { id: 2, name: "Jane Smith", department: "Radiology", status: "pending" },
    { id: 3, name: "Michael Lee", department: "Clinical", status: "approved" },
    { id: 4, name: "Sarah Cruz", department: "Dental", status: "pending" },
    { id: 5, name: "David Tan", department: "DDE", status: "pending" },
    { id: 6, name: "Emily Wong", department: "Radiology", status: "pending" },
    { id: 7, name: "Carlos Reyes", department: "Clinical", status: "approved" },
  ];

  const displayedRequests = showAllRequests ? requests : requests.slice(0, 5);


  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="logo-boxss" onClick={() => handleNavigation("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}>
            <img src={logo} alt="logos" className="logosss" />
            <span className="logo-textss">HealthSys</span>
          </div>
          <div className="nav-linkss">
            <div className="nav-items active">
              <FaTachometerAlt className="nav-icon" /> Dashboard
            </div>
            <div className="nav-items">
              <FaUsers className="nav-icon" /> 
              <span onClick={() => handleNavigation("/superadmin_userrequests")}>User Requests</span>
            </div>
            <div className="nav-items">
              <FaCalendarAlt className="nav-icon" /> 
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>Manage Admins</span>
            </div>
            <div className="nav-items">
              <FaChartBar className="nav-icon" /> 
              <span onClick={() => handleNavigation("/superadmin_reports")}>Reports & Analytics</span>
            </div>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Super Admin</span>
          </div>
          <div className="signout-box">
                      <FaSignOutAlt className="signout-icon" />
                      <span
                        onClick={() => {
                          const isConfirmed = window.confirm("Are you sure you want to sign out?");
                          if (isConfirmed) {
                            navigate("/loginadmin"); 
                          }
                        }}
                        className="signout-label"
                      >
                        Sign Out
                      </span>
                    </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content-superadmin">
        {/* Top Navbar */}
        <div className="top-navbar-superadmins">
          <h2 className="navbar-title">Dashboard</h2>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {notifications.filter((n) => n.unread).length > 0 && (
              <span className="notification-count">
                {notifications.filter((n) => n.unread).length}
              </span>
            )}
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span>Notifications</span>
                  <button
                    className="mark-read-btn"
                    onClick={() =>
                      notifications.forEach((n) => (n.unread = false))
                    }
                  >
                    Mark all as read
                  </button>
                </div>
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${
                        n.unread ? "unread" : ""
                      }`}
                    >
                      <span>{n.text}</span>
                      {n.unread && <span className="notification-badge">New</span>}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ✅ Summary Cards */}
        <div className="summary-cards-content-wrapper">
          <div className="summary-cards-container">
            <div className="summary-cards-row">
              <div className="summary-cards-row single">
            <div className="card" onClick={() => handleNavigation("/superadmin_clinical")}>
              <FaClinicMedical className="card-icon" />
              <h3>150</h3>
              <p>Total Clinical Patients</p>
            </div>


              <div className="card" onClick={() => handleNavigation("/superadmin_dental")}>
                <FaTooth className="card-icon" />
                <h3>120</h3>
                <p>Total Dental Patients</p>
              </div>
               <div className="card" onClick={() => handleNavigation("/superadmin_radiology")}>
                <FaXRay className="card-icon" />
                <h3>60</h3>
                <p>Total Radiology Patients</p>
              </div>


              <div className="card" onClick={() => handleNavigation("/superadmin_medical")}>
                <FaUserMd className="card-icon" />
               <h3>150</h3>
               <p>Total Medical Patients</p>
                </div>

              <div className="card" onClick={() => handleNavigation("/superadmin_dde")}>
                <FaStethoscope className="card-icon" />
                  <h3>95</h3>
                  <p>Total DDE Patients</p>
              </div>
             
            </div>

          
          </div>
        </div>
      </div>

        {/* User Access Requests Table */}
        <h2 className="table-title">User Access Requests</h2>
        <table className="appointment-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Department</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
              {displayedRequests.map((req) => ( 
              <tr key={req.id}>
                <td>{req.id}</td>
                <td>{req.name}</td>
                <td>{req.department}</td>
                <td>
                  <span className={`status-text ${req.status}`}>
                    {req.status}
                  </span>
                </td>
                <td>
                  {req.status === "pending" ? (
                    <>
                      <button className="action-btn approve">Approve</button>
                      <button className="action-btn reject">Reject</button>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {requests.length > 5 && (
          <div className="view-more-container">
            <button className="view-more-btn" onClick={() => setShowAllRequests(!showAllRequests)}>
              {showAllRequests ? "Show Less" : "View More"}</button>
          </div>
        )}

        {/* Activity Section */}
        <div className="chart-activity-containers">
          <div className="activity-wrappers">
            <h3 className="chart-titles">Recent Activities</h3>
            <ul className="activity-lists">
              <li>Dentist added new patient record</li>
              <li>Radiology uploaded scan results</li>
              <li>Clinical updated prescriptions</li>
              <li>DDE scheduled new appointments</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin_Dashboard;
