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
  FaArrowLeft,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "../../../assets/SuperAdmin_Clinical.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";

// Types
interface Admin {
  id: string;
  adminId: string;
  lastname: string;
  firstname: string;
  middleInitial?: string;
  email: string;
  role: string;
  status: "Rejected";
  contact?: string;
  department?: string;
  username?: string;
  rejectReason?: string;
  createdAt?: string | Date;
}

interface Notification {
  id: number;
  text: string;
  unread: boolean;
}

const SuperAdmin_RejectedAdmins: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, text: "New admin registered in Dental", unread: true },
    { id: 2, text: "2 Admin requests pending approval", unread: true },
    { id: 3, text: "Report submitted by Dental Admin", unread: false },
    { id: 4, text: "Admin status updated", unread: false },
  ]);

  const [yearOptions, setYearOptions] = useState<number[]>(() => {
    return Array.from({ length: 11 }, (_, i) => 2025 + i);
  });

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedYear(value);

    const lastYear = yearOptions[yearOptions.length - 1];
    if (value === lastYear.toString()) {
      const newYears = Array.from({ length: 10 }, (_, i) => lastYear + i + 1);
      setYearOptions((prev) => [...prev, ...newYears]);
    }
  };

  useEffect(() => {
    setLoading(true);
    // Query the "ManageAdmins" collection for rejected admins
    const q = query(collection(db, "ManageAdmins"), where("status", "==", "rejected"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rejectedAdmins = snapshot.docs.map((doc) => {
          const data = doc.data();
          const createdAtValue = data.createdAt
            ? data.createdAt.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt)
            : null;

          return {
            id: doc.id,
            adminId: data.adminId || "",
            lastname: data.lastname || "Unknown",
            firstname: data.firstname || "Unknown",
            middleInitial: data.middleInitial || "",
            email: data.email || "",
            role: data.role || "N/A",
            status: "Rejected" as const,
            contact: data.contact || "",
            department: data.department || "N/A",
            username: data.username || "N/A",
            rejectReason: data.reason || "N/A", // Use 'reason' as per UserRequests
            createdAt: createdAtValue,
          } as Admin;
        });
        console.log("[DEBUG] Rejected admins fetched from ManageAdmins:", rejectedAdmins);
        setAdmins(rejectedAdmins);
        setLoading(false);
      },
      (error) => {
        console.error("[ERROR] Failed to fetch rejected admins:", error);
        toast.error(`Failed to fetch rejected admins: ${error.message}`, {
          position: "top-center",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredAdmins = admins.filter((a) => {
    if (!(a.createdAt instanceof Date)) return true;

    const yearVal = a.createdAt.getFullYear().toString();
    const monthVal = (a.createdAt.getMonth() + 1).toString().padStart(2, "0");
    const dayVal = a.createdAt.getDate().toString().padStart(2, "0");

    if (selectedYear && yearVal !== selectedYear) return false;
    if (selectedMonth && monthVal !== selectedMonth) return false;
    if (selectedDay && dayVal !== selectedDay) return false;

    return true;
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
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
          <div className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_dashboard")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_userrequests")}>
                User Requests
              </span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_reports")}>
                Reports & Analytics
              </span>
            </div>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="nav-icon" />
            <span className="user-label">Super Admin</span>
          </div>
          <div className="signout-box">
            <FaSignOutAlt className="signout-icon" />
            <span
              onClick={() => {
                const isConfirmed = window.confirm(
                  "Are you sure you want to sign out?"
                );
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
        <div className="top-navbar-superadmin">
          <h2 className="navbar-title">Rejected Admins</h2>
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
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, unread: false }))
                      )
                    }
                  >
                    Mark all as read
                  </button>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notification-item ${n.unread ? "unread" : ""}`}
                  >
                    <span>{n.text}</span>
                    {n.unread && <span className="notification-badge">New</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          className="back-btn"
          onClick={() => handleNavigation("/superadmin_dashboard")}
        >
          <FaArrowLeft /> Back
        </button>

        <div className="filters-container-clinical">
          <div className="filter-clinical">
            <label>Date:</label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Month</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-clinical">
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
          <div className="filter-clinical">
            <select id="year" value={selectedYear} onChange={handleYearChange}>
              <option value="">Year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="appointments-section">
          <h3 className="section-title">Rejected Admins</h3>
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Lastname</th>
                <th>Firstname</th>
                <th>Department</th>
                <th>Username</th>
                <th>Email</th>
                <th>Reason</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.length > 0 ? (
                filteredAdmins.map((a) => (
                  <tr key={a.id}>
                    <td>{a.adminId}</td>
                    <td>{a.lastname}</td>
                    <td>{a.firstname}</td>
                    <td>{a.department || "N/A"}</td>
                    <td>{a.username || "N/A"}</td>
                    <td>{a.email}</td>
                    <td>{a.rejectReason || "N/A"}</td>
                    <td>
                      {a.createdAt instanceof Date
                        ? a.createdAt.toLocaleString()
                        : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "12px" }}>
                    {loading ? "Loading..." : "No rejected admins found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin_RejectedAdmins;