import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import "../assets/SuperAdmin_ManageAdmins.css";
import logo from "/logo.png";

type Notification = {
  text: string;
  unread: boolean;
};

type Admin = {
  id: number;
  name: string;
  department: string;
  contact: string;
};

const SuperAdmin_ManageAdmins: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false); // NEW state for view more/less

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

  // Dummy admin data
  const [admins, setAdmins] = useState<Admin[]>([
    { id: 1, name: "Dr. John Smith", department: "Dental", contact: "0917-123-4567" },
    { id: 2, name: "Nurse Maria Lopez", department: "Clinical", contact: "0917-234-5678" },
    { id: 3, name: "Dr. Alex Tan", department: "Radiology", contact: "0917-345-6789" },
    { id: 4, name: "Engr. Carla Reyes", department: "DDE", contact: "0917-456-7890" },
    { id: 5, name: "Dr. Sophia Martinez", department: "Dental", contact: "0917-567-8901" },
    { id: 6, name: "Nurse Paolo Cruz", department: "Clinical", contact: "0917-678-9012" },
  ]);

  const handleRemove = (id: number) => {
    if (window.confirm("Are you sure you want to remove this admin?")) {
      setAdmins((prev) => prev.filter((admin) => admin.id !== id));
    }
  };

  // inside SuperAdmin_ManageAdmins
const [selectedMonth, setSelectedMonth] = useState<string>("");
const [selectedDay, setSelectedDay] = useState<string>("");
const [selectedYear, setSelectedYear] = useState<string>("");


  // Filtered admins based on search term
  const filteredAdmins = admins.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.contact.includes(searchTerm)
  );

  // Show only 5 by default, more if showAll is true
  const displayedAdmins = showAll
    ? filteredAdmins
    : filteredAdmins.slice(0, 5);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div
            className="logo-box"
            onClick={() => handleNavigation("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logo" />
            <span className="logo-text">HealthSys</span>
          </div>

          {/* Nav Links */}
          <nav className="nav-links">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_dashboard")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_userrequests")}>
                User Requests
              </span>
            </div>
            <div className="nav-item active">
              <FaUsers className="nav-icon" />
              <span>Manage Admins</span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_reports")}>
                Reports & Analytics
              </span>
            </div>
          </nav>
        </div>

        {/* User Info and Sign Out */}
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Super Admin</span>
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

      {/* Main Content */}
      <main className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar-dental">
          <h2 className="navbar-title">Manage Admins</h2>
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

        {/* Date Filter */}
<div className="filters-container-manage">
  <div className="filter-manage">
    <label>Date:</label>
    <select
      id="month"
      value={selectedMonth}
      onChange={(e) => setSelectedMonth(e.target.value)}>
      <option value="">Month</option>
      <option value="01">January</option>
      <option value="02">February</option>
      <option value="03">March</option>
      <option value="04">April</option>
      <option value="05">May</option>
      <option value="06">June</option>
      <option value="07">July</option>
      <option value="08">August</option>
      <option value="09">September</option>
      <option value="10">October</option>
      <option value="11">November</option>
      <option value="12">December</option>
    </select>
  </div>

  <div className="filter-manage">
    <select
      id="day"
      value={selectedDay}
      onChange={(e) => setSelectedDay(e.target.value)}
    >
      <option value="">Day</option>
      {Array.from({ length: 31 }, (_, i) => (
        <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
          {i + 1}
        </option>
      ))}
    </select>
  </div>

  <div className="filter-manage">
    <select
      id="year"
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
    >
      <option value="">Year</option>
      {Array.from({ length: 6 }, (_, i) => {
        const year = new Date().getFullYear() - i;
        return (
          <option key={year} value={year.toString()}>
            {year}
          </option>
        );
      })}
    </select>
  </div>
</div>

        {/* Search Bar */}
        <div className="content-wrapper">
          <div className="search-container">
            <div className="search-bar-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by Name..."
                className="search-bar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Admins Table */}
          <h2 className="admins-table-title">Manage Admins</h2>
          <table className="admins-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedAdmins.length > 0 ? (
                displayedAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.id}</td>
                    <td>{admin.name}</td>
                    <td>{admin.department}</td>
                    <td>{admin.contact}</td>
                    <td className="actions-cell">
                      <button
                        className="remove-btn"
                        onClick={() => handleRemove(admin.id)}
                      >
                        <FaTrash /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="no-results">
                    No admins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* View More / View Less Button */}
          {filteredAdmins.length > 5 && (
            <div className="view-more-container">
              <button
                className="view-more-btn"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? "View Less" : "View More"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin_ManageAdmins;
