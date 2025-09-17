import React, { useState } from "react";
import type { ChangeEvent } from "react";
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
} from "react-icons/fa";
import "../assets/SuperAdmin_UserRequests.css";
import logo from "/logo.png";

interface Notification {
  text: string;
  unread: boolean;
}

interface UserRequest {
  id: number;
  name: string;
  email: string;
  department: string;
  status: "Pending" | "Approved" | "Rejected";
}

const SuperAdmin_UserRequests: React.FC = () => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showAll, setShowAll] = useState<boolean>(false);

  const [userRequests, setUserRequests] = useState<UserRequest[]>([
    {
      id: 1,
      name: "Juan Dela Cruz",
      email: "juan.cruz@example.com",
      department: "Dental",
      status: "Pending",
    },
    {
      id: 2,
      name: "Maria Santos",
      email: "maria.santos@example.com",
      department: "Radiology",
      status: "Approved",
    },
    {
      id: 3,
      name: "Jose Rizal",
      email: "jose.rizal@example.com",
      department: "Clinical",
      status: "Rejected",
    },
    {
      id: 4,
      name: "Ana Reyes",
      email: "ana.reyes@example.com",
      department: "DDE",
      status: "Pending",
    },
    {
      id: 5,
      name: "Pedro Pascual",
      email: "pedro.pascual@example.com",
      department: "Dental",
      status: "Pending",
    },
    {
      id: 6,
      name: "Liza Villanueva",
      email: "liza.v@example.com",
      department: "Radiology",
      status: "Approved",
    },
  ]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new user access requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Action handlers
  const handleApprove = (id: number) => {
    setUserRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, status: "Approved" } : req
      )
    );
  };

  const handleReject = (id: number) => {
    setUserRequests((prev) =>
      prev.map((req) =>
        req.id === id ? { ...req, status: "Rejected" } : req
      )
    );
  };

    // inside SuperAdmin_ManageAdmins
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  // Filter + Search
  const filteredRequests = userRequests.filter((req) => {
    const matchesSearch =
      req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "All" ? true : req.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Limit requests shown
  const displayedRequests = showAll
    ? filteredRequests
    : filteredRequests.slice(0, 5);

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
            <div className="nav-item active">
              <FaCalendarAlt className="nav-icon" />
              <span>User Requests</span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span
                onClick={() => handleNavigation("/superadmin_manageadmins")}
              >
                Manage Admins
              </span>
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

      {/* Main content */}
      <main className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar-dental">
          <h2 className="navbar-title">User Access Requests</h2>
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

        {/* Filters */}
        <div className="content-wrapper-request">
          <div className="filter-bar">
            <div className="searchbar-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by Name or Email..."
                className="search-input"
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
              />
            </div>
            <div className="filter-request">
              <label>Status:</label>
              <select
                className="status-dropdown"
                value={statusFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(e.target.value)
                }
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

  <div className="filter-request">
    <label>Date:</label>
    <select className="date-dropdown"
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

  <div className="filter-request">
    <select className="date-dropdown"
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

  <div className="filter-request">
    <select className="date-dropdown"
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

          <p className="user-request-header">All User Access Requests</p>

          {/* Table */}
          <table className="requests-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedRequests.length > 0 ? (
                displayedRequests.map((req) => (
                  <tr key={req.id}>
                    <td>{req.id}</td>
                    <td>{req.name}</td>
                    <td>{req.email}</td>
                    <td>{req.department}</td>
                    <td
                      className={`status-cell ${req.status.toLowerCase()}`}
                    >
                      {req.status}
                    </td>
                    <td>
                      {req.status === "Pending" && (
                        <div className="buttons">
                          <button
                            className="approve-btn"
                            onClick={() => handleApprove(req.id)}
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleReject(req.id)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === "Approved" && (
                        <span className="approved-label">✔ Approved</span>
                      )}
                      {req.status === "Rejected" && (
                        <span className="rejected-label">✘ Rejected</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="no-data">
                    No requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* View More Button */}
          {filteredRequests.length > 5 && (
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

export default SuperAdmin_UserRequests;
