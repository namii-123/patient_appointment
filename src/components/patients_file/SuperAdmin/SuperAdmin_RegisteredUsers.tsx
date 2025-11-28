import React, { useState, useEffect, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaUsers,
  FaSignOutAlt,
  FaArrowLeft,
  FaCalendarAlt,
  FaChartBar,
  FaSearch,
  FaEnvelope,
} from "react-icons/fa";
import { X } from "lucide-react";
import "../../../assets/SuperAdmin_RegisteredUsers.css";
import logo from "/logo.png";
import { db, auth } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";

// Types
interface User {
  id: string;
  UserId: string;
  lastname: string;
  firstname: string;
  middleInitial?: string;
  email?: string;
  contact?: string;
  role?: string;
  gender?: string;
  birthdate?: string;
  age?: string;
  houseNo?: string;
  street?: string;
  province?: string;
  provinceCode?: string;
  municipality?: string;
  municipalityCode?: string;
  barangay?: string;
  zipcode?: string;
  photoBase64?: string;
  createdAt: Date | null;
  createdAtDisplay: string;
}

const SuperAdmin_RegisteredUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [monthFilter, setMonthFilter] = useState<string>("");
  
  const [yearFilter, setYearFilter] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10); // Change to 5, 10, 20 as needed

  // Custom Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalMessage, setCustomModalMessage] = useState("");
  const [customModalType, setCustomModalType] = useState<"success" | "error" | "confirm">("success");
  const [onCustomModalConfirm, setOnCustomModalConfirm] = useState<() => void>(() => {});

  // Default to current month/year
  useEffect(() => {
    const now = new Date();
    setYearFilter(now.getFullYear().toString());
    setMonthFilter(now.toLocaleString("en-US", { month: "long" }));
  }, []);

  // Year options: 5 years past → 20 years future
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 26 }, (_, i) => currentYear - 5 + i);

  // Fetch users
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Users"),
      (snapshot) => {
        const loadedUsers: User[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          let createdDate: Date | null = null;
          let displayDate = "Not set";

          if (data.createdAt) {
            if (typeof (data.createdAt as any).toDate === "function") {
              createdDate = (data.createdAt as any).toDate();
            } else if (data.createdAt instanceof Date) {
              createdDate = data.createdAt;
            } else if (typeof data.createdAt === "string") {
              createdDate = new Date(data.createdAt);
            }

            if (createdDate && !isNaN(createdDate.getTime())) {
              displayDate = createdDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
            }
          }

          return {
            id: doc.id,
            UserId: data.UserId || "N/A",
            lastname: data.lastName || "Unknown",
            firstname: data.firstName || "Unknown",
            middleInitial: data.middleName?.charAt(0).toUpperCase() || "",
            email: data.email || "N/A",
            contact: data.contactNumber || "N/A",
            role: data.role || "User",
            gender: data.gender || "Not set",
            birthdate: data.birthdate || "Not set",
            age: data.age || "Not set",
            houseNo: data.houseNo || "Not set",
            street: data.street || "Not set",
            barangay: data.barangay || "Not set",
            municipality: data.municipality || "Not set",
            province: data.province || "Not set",
            zipcode: data.zipcode || "Not set",
            photoBase64: data.photoBase64 || "",
            createdAt: createdDate,
            createdAtDisplay: displayDate,
          };
        });

        setUsers(loadedUsers);
        setLoading(false);
      },
      (error) => {
        console.error("Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const closeModal = () => {
  setShowModal(false);
  setSelectedUser(null);
};

  // Filter users
  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstname} ${user.lastname}`.toLowerCase();
    const searchMatch =
      user.UserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    if (!monthFilter && !yearFilter) return true;
    if (!user.createdAt) return false;

    const userMonth = user.createdAt.toLocaleString("en-US", { month: "long" });
    const userYear = user.createdAt.getFullYear().toString();

    const monthMatch = !monthFilter || userMonth === monthFilter;
    const yearMatch = !yearFilter || userYear === yearFilter;

    return monthMatch && yearMatch;
  });

  // PAGINATION LOGIC (same sa Clinical)
  const indexOfLastRecord = currentPage * rowsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

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
  }, [searchTerm, monthFilter, yearFilter]);

  const handleViewMore = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const openCustomModal = (msg: string, type: "success" | "error" | "confirm" = "success", onConfirm?: () => void) => {
    setCustomModalMessage(msg);
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
            <div className="nav-item" onClick={() => navigate("/superadmin_userrequests")}>
              <FaUsers className="nav-icon" /> User Requests
            </div>
            <div className="nav-items" onClick={() => navigate("/superadmin_messages")}>
              <FaEnvelope className="nav-icon" /> Messages
            </div>
            <div className="nav-item" onClick={() => navigate("/superadmin_manageadmins")}>
              <FaCalendarAlt className="nav-icon" /> Manage Admins
            </div>
            <div className="nav-item" onClick={() => navigate("/superadmin_reports")}>
              <FaChartBar className="nav-icon" /> Reports & Analytics
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
              onClick={() =>
                openCustomModal("Are you sure you want to sign out?", "confirm", async () => {
                  try {
                    await signOut(auth);
                    navigate("/loginadmin", { replace: true });
                  } catch (err) {
                    openCustomModal("Sign out failed. Try again.", "error");
                  }
                })
              }
              className="signout-label"
              style={{ cursor: "pointer" }}
            >
              Sign Out
            </span>
          </div>
        </div>
      </aside>

      <main className="main-content-superadmin">
        <div className="top-navbar-superadmin">
          <h5 className="navbar-title">Registered Users</h5>
          <div className="notification-wrapper">
            <FaBell className="notification-bell" />
          </div>
        </div>

        {/* Filters */}
        <div className="filters-container-clinicals">
          <button className="back-btns" onClick={() => navigate("/superadmin_dashboard")}>
            Back
          </button>

          <div className="searchbar-containersss">
            <div className="searchsss">
              <FaSearch className="search-iconsss" />
              <input
                type="text"
                placeholder="Search by Name or ID..."
                className="search-inputss"
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

               <div className="center-filterss">
          <div className="filter-clinicals">
            <label>Year:</label>
            <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="">All </option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="filter-clinicals">
            <label>Month:</label>
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="">All </option>
              {["January","February","March","April","May","June","July","August","September","October","November","December"].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        </div>

        {/* Table */}
        <div className="appointments-sections">
          <h5 className="section-titless">
            All Registered Users ({filteredUsers.length})
          </h5>

          <table className="appointments-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>M.I.</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Registered On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{textAlign:"center", padding:"20px"}}>Loading...</td></tr>
              ) : currentUsers.length === 0 ? (
                <tr><td colSpan={8} style={{textAlign:"center", padding:"20px"}}>No users found.</td></tr>
              ) : (
                currentUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.UserId}</td>
                    <td>{u.lastname}</td>
                    <td>{u.firstname}</td>
                    <td>{u.middleInitial || "—"}</td>
                    <td>{u.email}</td>
                    <td>{u.contact}</td>
                    <td>{u.createdAtDisplay}</td>
                    <td>
                      <button className="action-button view-mores" onClick={() => handleViewMore(u)}>
                        View More
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION - Same as Clinical */}
        <div className="pagination-wrapper" style={{ margin: "30px 0" }}>
          <div className="pagination-info">
            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredUsers.length)} of {filteredUsers.length} users
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

          {/* View More Modal */}
        {showModal && selectedUser && (
          <div className="modal-overlayd">
            <div className="modal-contentd">
              <div className="modal-headerd">
                <h3>User Details</h3>
                <button className="close-btnd" onClick={closeModal}>×</button>
              </div>
              <div className="modal-bodyd">
                <div style={{ textAlign: "center", marginBottom: "15px" }}>
                  <img
                    src={selectedUser.photoBase64 || "/default-img.jpg"}
                    alt="Profile"
                    style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover" }}
                  />
                </div>
                <table className="patient-info-tabled">
                  <tbody>
                    <tr><th>User ID</th><td>{selectedUser.UserId}</td></tr>
                    <tr><th>Name</th><td>{selectedUser.firstname} {selectedUser.middleInitial && `${selectedUser.middleInitial}. `}{selectedUser.lastname}</td></tr>
                    <tr><th>Email</th><td>{selectedUser.email}</td></tr>
                    <tr><th>Contact</th><td>{selectedUser.contact}</td></tr>
                    <tr><th>Role</th><td>{selectedUser.role}</td></tr>
                    <tr><th>Gender</th><td>{selectedUser.gender}</td></tr>
                    <tr><th>Birthdate</th><td>{selectedUser.birthdate}</td></tr>
                    <tr><th>Age</th><td>{selectedUser.age}</td></tr>
                    <tr><th>Address</th><td>
                      {selectedUser.houseNo} {selectedUser.street}, {selectedUser.barangay},<br />
                      {selectedUser.municipality}, {selectedUser.province} {selectedUser.zipcode}
                    </td></tr>
                    <tr><th>Registered On</th><td>{selectedUser.createdAtDisplay}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Custom Modal */}
        {showCustomModal && (
          <>
            <audio autoPlay>
              <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
            </audio>
            <div className="radiology-modal-overlay" onClick={closeCustomModal}>
              <div className="radiology-modal-content" onClick={e => e.stopPropagation()}>
                <div className="radiology-modal-header">
                  <img src={logo} alt="Logo" className="radiology-modal-logo" />
                  <h3 className="radiology-modal-title">
                    {customModalType.toUpperCase()} </h3>
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
                  {customModalType === "confirm" ? (
                    <>
                      <button className="radiology-modal-btn cancel" onClick={closeCustomModal}>Cancel</button>
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
                  ) : (
                    <button className="radiology-modal-btn ok" onClick={closeCustomModal}>
                      OK
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

export default SuperAdmin_RegisteredUsers;