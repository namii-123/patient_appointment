import React, { useState, useEffect } from "react";
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
import "../../../assets/SuperAdmin_ManageAdmins.css";
import logo from "/logo.png";
import { getFirestore, collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";

type Notification = {
  text: string;
  unread: boolean;
};

type Admin = {
  id: string;
  uid?: string;  
  adminId: string;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  department: string;
  role: string;
  status: "Approved" | "Rejected";
  createdAt?: string | Date;
  reason?: string;
};

const SuperAdmin_ManageAdmins: React.FC = () => {
  const navigate = useNavigate();
  const db = getFirestore();

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>(
    Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i)
  );
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
const [selectedDept, setSelectedDept] = useState<string>("");




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

  const handleRemove = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this admin?")) {
      await deleteDoc(doc(db, "ManageAdmins", id));
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedYear(selected);

    if (selected && parseInt(selected) === availableYears[availableYears.length - 1]) {
      const lastYear = availableYears[availableYears.length - 1];
      const newYears = Array.from({ length: 20 }, (_, i) => lastYear + 1 + i);
      setAvailableYears((prev) => [...prev, ...newYears]);
    }
  };

  useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "ManageAdmins"), (snapshot) => {
    const adminsList = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
         uid: data.uid || "",
        adminId: data.adminId || "",
        firstname: data.firstname || "",
        lastname: data.lastname || "",
        username: data.username || "",
        email: data.email || "",
        department: data.department || "",
        role: data.role || "",
        status: data.status || "Approved",
        createdAt: data.createdAt
          ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
          : null,
        reason: data.reason || "",
      } as Admin;
    });
    setAdmins(adminsList);
  });
  return () => unsubscribe();
}, []);



  const filteredAdmins = admins.filter((admin) => {
  const matchesSearch =
    admin.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.adminId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase());

  let matchesDate = true;
  if (admin.createdAt) {
    const dateObj =
      admin.createdAt instanceof Date
        ? admin.createdAt
        : new Date(admin.createdAt);
    const year = dateObj.getFullYear().toString();
    const month = dateObj.toLocaleString("default", { month: "long" });
    const day = dateObj.getDate().toString().padStart(2, "0");

    if (selectedYear && year !== selectedYear) matchesDate = false;
    if (selectedMonth && month !== selectedMonth) matchesDate = false;
    if (selectedDay && day !== selectedDay) matchesDate = false;
  }

  const matchesStatus =
    !selectedStatus || admin.status.toLowerCase() === selectedStatus.toLowerCase();

  const matchesDept =
    !selectedDept || admin.department.toLowerCase() === selectedDept.toLowerCase();

  return matchesSearch && matchesDate && matchesStatus && matchesDept;
});


  const [rowsPerPage, setRowsPerPage] = useState<number>(100);

const displayedAdmins =
  rowsPerPage === -1 ? filteredAdmins : filteredAdmins.slice(0, rowsPerPage);


  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div>
          <div
            className="logo-boxss"
            onClick={() => handleNavigation("/superadmin_dashboard")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logosss" />
            <span className="logo-textss">HealthSys</span>
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
            <div className="nav-items active">
              <FaUsers className="nav-icon" />
              <span>Manage Admins</span>
            </div>
            <div className="nav-items">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_reports")}>
                Reports & Analytics
              </span>
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

      <main className="main-content">
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
                      className={`notification-item ${notif.unread ? "unread" : ""}`}
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

        <div className="content-wrapper">
          <div className="filter-search-row">
            <div className="search-section">
              <div className="search-container">
                <div className="search-bar-wrapper">
                  <FaSearch className="search-icons" />
                  <input
                    type="text"
                    placeholder="Search by Name or ID..."
                    className="search-bar"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="filters-container-manage">
              <div className="filter-manage">
  <label>Status:</label>
  <select
    value={selectedStatus}
    onChange={(e) => setSelectedStatus(e.target.value)}
  >
    <option value="">All</option>
    <option value="Approved">Approved</option>
    <option value="Rejected">Rejected</option>
  </select>
</div>

<div className="filter-manage">
  <label>Department:</label>
  <select
    value={selectedDept}
    onChange={(e) => setSelectedDept(e.target.value)}
  >
    <option value="">All</option>
    <option value="Dental">Dental</option>
    <option value="Medical">Medical</option>
    <option value="Clinical Laboratory">Clinical</option>
    <option value="Radiographic">Radiographic</option>
    <option value="DDE">DDE</option>
  </select>
</div>

              <div className="filter-manage">
                <label>Date:</label>
                <select
                  id="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">Month</option>
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                  <option value="June">June</option>
                  <option value="July">July</option>
                  <option value="August">August</option>
                  <option value="September">September</option>
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
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
                    <option key={i + 1} value={(i + 1).toString()}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-manage">
                <select
                  id="year"
                  value={selectedYear}
                  onChange={handleYearChange}
                >
                  <option value="">Year</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <h2 className="admins-table-title">Manage Admins</h2>
          <table className="admins-table">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                 <th>Department</th>
                <th>Username</th>
                <th>Email</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedAdmins.length > 0 ? (
                displayedAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td>{admin.adminId}</td>
                    <td>{admin.lastname}</td>
                    <td>{admin.firstname}</td>
                    <td>{admin.department}</td>
                    <td>{admin.username}</td>
                    <td>{admin.email}</td>
                    <td>
                      {admin.createdAt
                        ? admin.createdAt instanceof Date
                          ? admin.createdAt.toLocaleString()
                          : new Date(admin.createdAt).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className={`status-cell ${(admin.status || "").toLowerCase()}`}>
                      {admin.status}
                    </td>
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
                  <td colSpan={8} className="no-results">
                    No admins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

       <div className="table-controls">
  <div className="rows-per-page-container">
  <label htmlFor="rowsPerPage">SHOW</label>
  <select
    id="rowsPerPage"
    value={rowsPerPage}
    onChange={(e) => setRowsPerPage(Number(e.target.value))}
  >
    <option value={1}>1</option>
    <option value={5}>5</option>
    <option value={10}>10</option>
    <option value={25}>25</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
    <option value={-1}>All</option>
  </select>
</div>

</div>



        </div>
      </main>
    </div>
  );
};

export default SuperAdmin_ManageAdmins;