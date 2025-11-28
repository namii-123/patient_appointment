
import React, { useState, useEffect } from "react";
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
  FaTrash,
  FaEnvelope,
} from "react-icons/fa";
import "../../../assets/SuperAdmin_ManageAdmins.css";
import logo from "/logo.png";
import { getFirestore, collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { X } from "lucide-react";

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
  status: "Approved" | "Rejected" | "Not Active";
  createdAt?: string | Date;
  reason?: string;
  isActive?: boolean; // New field to control login
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

 const handleRemove = (id: string, adminName: string) => {
  openCustomModal(
    `Are you sure you want to deactivate this admin?\n\n${adminName}\n\nThis action will prevent them from logging in.`,
    "confirm",
    async () => {
      try {
        const adminRef = doc(db, "ManageAdmins", id);
        await updateDoc(adminRef, {
          status: "Not Active",
          isActive: false,
        });

        // Optional: Show success message
        openCustomModal("Admin has been deactivated successfully.", "success");
      } catch (error) {
        console.error("Error deactivating admin:", error);
        openCustomModal("Failed to deactivate admin. Please try again.", "error");
      }
    }
  );
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
          isActive: data.isActive !== undefined ? data.isActive : true, // Default to true if not set
        } as Admin;
      });
      setAdmins(adminsList);
    });
    return () => unsubscribe();
  }, []);


  // Auto-select current month and year on first load
useEffect(() => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = now.toLocaleString("default", { month: "long" }); // e.g., "November"

  setSelectedYear(currentYear);
  setSelectedMonth(currentMonth);
}, []); // Runs only once when component mounts



  const filteredAdmins = admins.filter((admin) => {
  const matchesSearch =
    admin.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.adminId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus =
    !selectedStatus || admin.status.toLowerCase() === selectedStatus.toLowerCase();

  const matchesDept =
    !selectedDept || admin.department.toLowerCase() === selectedDept.toLowerCase();

  // Date filtering
  let matchesDate = true;
  if (admin.createdAt) {
    const dateObj =
      admin.createdAt instanceof Date
        ? admin.createdAt
        : new Date(admin.createdAt);

    const year = dateObj.getFullYear().toString();
    const month = dateObj.toLocaleString("default", { month: "long" });
    const day = dateObj.getDate().toString().padStart(2, "0");

    if (selectedYear && selectedYear !== "All" && year !== selectedYear) {
      matchesDate = false;
    }
    if (selectedMonth && selectedMonth !== "All" && month !== selectedMonth) {
      matchesDate = false;
    }
  if (selectedDay && selectedDay !== "" && day !== selectedDay) {
  matchesDate = false;
}
  } else {
    // If no createdAt, hide if any date filter is applied
    if (selectedYear || selectedMonth || selectedDay) {
      matchesDate = false;
    }
  }

  return matchesSearch && matchesStatus && matchesDept && matchesDate;
});


const [currentPage, setCurrentPage] = useState<number>(1);
const [rowsPerPage, setRowsPerPage] = useState<number>(5); 
  
 // Pagination Logic (same as User Requests)
const indexOfLastRecord = currentPage * rowsPerPage;
const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
const currentAdmins = rowsPerPage === -1 
  ? filteredAdmins 
  : filteredAdmins.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredAdmins.length / rowsPerPage);

// Smart page numbers with ellipsis (1 2 3 ... 98 99 100)
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
            <div className="nav-items">
                                                  <FaEnvelope className="nav-icon" />
                                                  <span onClick={() => handleNavigation("/superadmin_messages")}>
                                                    Messages
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

      <main className="main-content">
        <div className="top-navbar-dental">
          <h5 className="navbar-title">Manage Admins</h5>
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
         <div className="filter-barss">
                                        <div className="searchbar-containerss">
                                          <div className="searchss">
                                            <FaSearch className="search-iconss" />
                                            <input
                                              type="text"
                                              placeholder="Search by Name or ID..."
                                              className="search-input"
                                              value={searchTerm}
                                              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                            />
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
                  <option value="Not Active">Not Active</option> {/* Added new status */}
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
                  <label>Year:</label>
               <select
  value={selectedYear}
  onChange={handleYearChange}
>
  <option value="">All</option>
  {availableYears.map((year) => (
    <option key={year} value={year.toString()}>
      {year}
    </option>
  ))}
</select>


              </div>


              <div className="filter-manage">
                <label>Month:</label>
                <select
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
              
            
            </div>
          </div>

          <h5 className="admins-table-title">Manage Admins</h5>
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
              {currentAdmins.length > 0 ? (
                currentAdmins.map((admin) => (
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
  onClick={() => handleRemove(admin.id, `${admin.firstname} ${admin.lastname}`)}
  disabled={admin.status === "Not Active"}
  style={{
    opacity: admin.status === "Not Active" ? 0.5 : 1,
    cursor: admin.status === "Not Active" ? "not-allowed" : "pointer",
  }}
>
  <FaTrash /> 
  {admin.status === "Not Active" ? "Deactivated" : "Deactivate"}
</button>
</td>

                  </tr>
                ))
              ) : (
                <tr>
  <td colSpan={9} className="no-results">No admins found</td>
</tr>
              )}
            </tbody>
          </table>

          {/* PAGINATION - Same style as User Requests */}
<div className="pagination-wrapper" style={{ marginTop: "30px" }}>
  <div className="pagination-info">
    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredAdmins.length)} of {filteredAdmins.length} admins
  </div>

  <div className="pagination-controls">
    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1 || rowsPerPage === -1}
      className="pagination-btn prev-btn"
    >
      Previous
    </button>

    {getPageNumbers().map((page, index) => (
      <button
        key={index}
        onClick={() => typeof page === "number" && setCurrentPage(page)}
        disabled={page === "..." || rowsPerPage === -1}
        className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
      >
        {page}
      </button>
    ))}

    <button
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages || totalPages === 0 || rowsPerPage === -1}
      className="pagination-btn next-btn"
    >
      Next
    </button>
  </div>

  
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

export default SuperAdmin_ManageAdmins;