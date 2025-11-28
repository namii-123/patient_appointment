import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaArrowLeft } from "react-icons/fa";
import "../../../assets/SuperAdmin_Clinical.css"; 
import logo from "/logo.png";
import { db } from "../firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { X } from "lucide-react";


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


// Add this useEffect near your other useEffects
useEffect(() => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = (now.getMonth() + 1).toString().padStart(2, "0"); // "01" to "12"

  setSelectedYear(currentYear);
  setSelectedMonth(currentMonth);
}, []); // Runs once on mount



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


   // Add these states (same as UserRequests)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10); // or 5, 10, 25 — ikaw bahala
  
  
  // PAGINATION LOGIC (exact same sa UserRequests)
  const indexOfLastRecord = currentPage * rowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
  const currentAdmins = filteredAdmins.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredAdmins.length / rowsPerPage);
  
  // Ellipsis pagination (same sa UserRequests)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, selectedYear, selectedMonth, selectedDay]);
  
   const [showCustomModal, setShowCustomModal] = useState(false);
      const [customModalMessage, setCustomModalMessage] = useState("");
      const [customModalType, setCustomModalType] = useState<"success" | "error" | "confirm">("success");
      const [onCustomModalConfirm, setOnCustomModalConfirm] = useState<() => void>(() => {});
      
      const openCustomModal = (
        message: string,
        type: "success" | "error" | "confirm" = "success",
        onConfirm?: () => void
      ) => {
        setCustomModalMessage(message);
        setCustomModalType(type);
        if (onConfirm) setOnCustomModalConfirm(() => onConfirm);
        setShowCustomModal(true);
      };
      
      const closeCustomModal = () => {
        setShowCustomModal(false);
        setOnCustomModalConfirm(() => {});
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
                                  openCustomModal(
                                    "Are you sure you want to sign out?",
                                    "confirm",
                                    async () => {
                                      try {
                                        await signOut(auth);
                                        navigate("/loginadmin", { replace: true });
                                      } catch (error) {
                                        console.error("Error signing out:", error);
                                        openCustomModal("Failed to sign out. Please try again.", "error");
                                      }
                                    }
                                  );
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

          <div className="filters-container-clinical">
      
                 <button className="back-btn" onClick={() => handleNavigation("/superadmin_dashboard")}>
                <FaArrowLeft /> Back
              </button>
      
       <div className="center-filters">
      <div className="filter-clinical">
        <label>Year:</label>
        <select value={selectedYear} onChange={handleYearChange}>
          <option value="">All </option>
          {yearOptions.map(year => (
            <option key={year} value={year.toString()}>{year}</option>
          ))}
        </select>
      </div>
      
                <div className="filter-clinical">
        <label>Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          <option value="">All </option>
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
      
      </div>

      
        </div>

        <div className="summary-cardd">
          <div
            className={`summary-cardsss all ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <h5>{admins.length}</h5>
            <p>All</p>
          </div>
          <div
            className={`summary-cardsss approved ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <h5>{approvedCount}</h5>
            <p>Approved</p>
          </div>


<div
  className={`summary-cardsss not-active ${filter === "not active" ? "active" : ""}`}
  onClick={() => setFilter("not active")}
>
  <h5>{notActiveCount}</h5>
  <p>Not Active</p>
</div>

        </div>

        <div className="appointments-sectionssss">
          <h3 className="section-titlessss">
            {filter === "all"
              ? "All"
              : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
            Dental Admins
          </h3>
          <table className="appointments-tablessss">
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


     
{/* PAGINATION - Same as UserRequests */}
<div className="pagination-wrapper" style={{ margin: "30px 0" }}>
  <div className="pagination-info">
    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredAdmins.length)} of {filteredAdmins.length} admins
  </div>

  <div className="pagination-controls">
    <button
      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
      disabled={currentPage === 1}
      className="pagination-btn prev-btn"
    >
      Previous
    </button>

    {getPageNumbers().map((page, i) => (
      <button
        key={i}
        onClick={() => typeof page === "number" && setCurrentPage(page)}
        disabled={page === "..."}
        className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
      >
        {page}
      </button>
    ))}

    <button
      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
      disabled={currentPage === totalPages || totalPages === 0}
      className="pagination-btn next-btn"
    >
      Next
    </button>
  </div>
</div>
       


        {showCustomModal && (
                 <>
                   <audio autoPlay>
                     <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
                   </audio>
                   <div className="radiology-modal-overlay" onClick={closeCustomModal}>
                     <div className="radiology-modal-content" onClick={(e) => e.stopPropagation()}>
                       <div className="radiology-modal-header">
                         <img src={logo} alt="Logo" className="radiology-modal-logo" />
                         <h3 className="radiology-modal-title">
                           {customModalType === "success" && "SUCCESS"}
                           {customModalType === "error" && "ERROR"}
                           {customModalType === "confirm" && "CONFIRM ACTION"}
                         </h3>
                         <button className="radiology-modal-close" onClick={closeCustomModal}>
                           <X size={20} />
                         </button>
                       </div>
                       <div className="radiology-modal-body">
                         <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>
                           {customModalMessage}
                         </p>
                       </div>
                       <div className="radiology-modal-footer">
                         {customModalType === "confirm" && (
                           <>
                             <button className="radiology-modal-btn cancel" onClick={closeCustomModal}>
                               No, Cancel
                             </button>
                             <button
                               className="radiology-modal-btn confirm"
                               onClick={() => {
                                 closeCustomModal();
                                 onCustomModalConfirm();
                               }}
                             >
                               Yes, Proceed
                             </button>
                           </>
                         )}
                         {(customModalType === "success" || customModalType === "error") && (
                           <button className="radiology-modal-btn ok" onClick={closeCustomModal}>
                             {customModalType === "success" ? "Done" : "OK"}
                           </button>
                         )}
                       </div>
                     </div>
                   </div>
                 </>
               )}


    
      </main>
    </div>
  );
};

export default SuperAdmin_DentalAdmin;