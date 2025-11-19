import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaArrowLeft } from "react-icons/fa";
import "../../../assets/SuperAdmin_Clinical.css"; 
import logo from "/logo.png";
import { db } from "../firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 


// Types
interface Admin {
  id: string;
  adminId: string;
  lastname: string;
  firstname: string;
  middleInitial?: string;
  email: string;
  role: string;
  status: "Approved" | "Rejected" | "Pending";
  contact?: string;
  department?: string;
  date?: string;
  username?: string;
  source?: "ManageAdmins" | "UserAdmin";
  createdAt?: string | Date;
}

const SuperAdmin_DentalAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);

  const notifications = [
    { id: 1, text: "New admin registered in Dental", unread: true },
    { id: 2, text: "2 Admin requests pending approval", unread: true },
    { id: 3, text: "Report submitted by Dental Admin", unread: false },
    { id: 4, text: "Admin status updated", unread: false },
  ];

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
    const manageAdminsQuery = query(collection(db, "ManageAdmins"), where("department", "==", "Dental"));
    const userAdminQuery = query(collection(db, "UserAdmin"), where("department", "==", "Dental"));

    const unsubscribeManage = onSnapshot(manageAdminsQuery, (manageSnap) => {
      const manageAdmins = manageSnap.docs.map((a) => {
        const data = a.data();
        const createdAtValue = data.createdAt
          ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
          : null;

        return {
          id: a.id,
          adminId: data.adminId || "",
          lastname: data.lastname || "Unknown",
          firstname: data.firstname || "Unknown",
          middleInitial: data.middleInitial || "",
          email: data.email || "",
          role: data.role || "Admin",
          status:
  data.status?.toLowerCase() === "approved"
    ? "Approved"
    : data.status?.toLowerCase() === "rejected"
    ? "Rejected"
    : data.status?.toLowerCase() === "not active"
    ? "Not Active"
    : "Pending",

          contact: data.contact || "",
          department: data.department || "",
          username: data.username || "",
          date: createdAtValue ? createdAtValue.toISOString().split("T")[0] : "",
          createdAt: createdAtValue,
          source: "ManageAdmins" as const,
        } as Admin;
      });
      updateAdmins(manageAdmins);
    });

    const unsubscribeUser = onSnapshot(userAdminQuery, (userSnap) => {
      const userAdmins = userSnap.docs.map((a) => {
        const data = a.data();
        const createdAtValue = data.createdAt
          ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
          : null;

        return {
          id: a.id,
          adminId: data.adminId || "",
          lastname: data.lastname || "Unknown",
          firstname: data.firstname || "Unknown",
          middleInitial: data.middleInitial || "",
          email: data.email || "",
          role: data.role || "Admin",
          status:
  data.status?.toLowerCase() === "approved"
    ? "Approved"
    : data.status?.toLowerCase() === "rejected"
    ? "Rejected"
    : data.status?.toLowerCase() === "not active"
    ? "Not Active"
    : "Pending",

          contact: data.contact || "",
          department: data.department || "",
          username: data.username || "",
          date: createdAtValue ? createdAtValue.toISOString().split("T")[0] : "",
          createdAt: createdAtValue,
          source: "UserAdmin" as const,
        } as Admin;
      });
      updateAdmins(userAdmins);
    });

    const updateAdmins = (newAdmins: Admin[]) => {
      setAdmins((prev) => {
        const allAdmins = [...prev, ...newAdmins];
        const uniqueAdmins = Array.from(new Set(allAdmins.map(a => a.id))).map(id => {
          return allAdmins.find(a => a.id === id)!;
        });
        return uniqueAdmins;
      });
      setLoading(false);
    };

    return () => {
      unsubscribeManage();
      unsubscribeUser();
    };
  }, []);

const approvedCount = admins.filter((a) => a.status.toLowerCase() === "approved").length;
const notActiveCount = admins.filter((a) => a.status.toLowerCase() === "not active").length;


  const filteredAdmins = admins.filter((a) => {
    if (filter !== "all" && a.status.toLowerCase() !== filter.toLowerCase()) return false;

    if (a.createdAt instanceof Date) {
      const yearVal = a.createdAt.getFullYear().toString();
      const monthVal = (a.createdAt.getMonth() + 1).toString().padStart(2, "0");
      const dayVal = a.createdAt.getDate().toString().padStart(2, "0");

      if (selectedYear && yearVal !== selectedYear) return false;
      if (selectedMonth && monthVal !== selectedMonth) return false;
      if (selectedDay && dayVal !== selectedDay) return false;
    }

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
          <div className="logo-boxss">
            <img src={logo} alt="logo" className="logosss" />
            <span className="logo-textss">HealthSys</span>
          </div>
          <div className="nav-linkss">
            <div className="nav-item active">
              <FaTachometerAlt className="nav-icon" /> Dashboard
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
                                 onClick={async () => {
                                   const isConfirmed = window.confirm("Are you sure you want to sign out?");
                                   if (isConfirmed) {
                                     try {
                                       await signOut(auth);
                                       navigate("/loginadmin", { replace: true });
                                     } catch (error) {
                                       console.error("Error signing out:", error);
                                       alert("Failed to sign out. Please try again.");
                                     }
                                   }
                                 }}
                                 className="signout-label"
                                 style={{ cursor: "pointer" }}
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
          <h5 className="navbar-title">Dental Admins</h5>
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
          </div>
        </div>

        <button className="back-btn" onClick={() => handleNavigation("/superadmin_dashboard")}>
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

        <div className="summary-cards">
          <div
            className={`summary-card all ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <h5>{admins.length}</h5>
            <p>All</p>
          </div>
          <div
            className={`summary-card approved ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <h5>{approvedCount}</h5>
            <p>Approved</p>
          </div>


<div
  className={`summary-card not-active ${filter === "not active" ? "active" : ""}`}
  onClick={() => setFilter("not active")}
>
  <h5>{notActiveCount}</h5>
  <p>Not Active</p>
</div>

        </div>

        <div className="appointments-section">
          <h5 className="section-title">
            {filter === "all"
              ? "All"
              : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
            Dental Admins
          </h5>
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Lastname</th>
                <th>Firstname</th>
                <th>Department</th>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
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
                    <td>
                      <span className={`status-badge ${a.status.toLowerCase()}`}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
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
                    {loading ? "Loading..." : "No Dental admins found."}
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

export default SuperAdmin_DentalAdmin;