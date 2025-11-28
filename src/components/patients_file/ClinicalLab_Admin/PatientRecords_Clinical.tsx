import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, FaTimes, FaClock, FaStethoscope, FaCheckCircle, FaEye } from "react-icons/fa";
import { FiCalendar } from "react-icons/fi";
import "../../../assets/PatientRecords_Radiology.css";
import logo from "/logo.png";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { X } from "lucide-react";

interface PatientRecord {
  id: string;
  UserId: string;
  patientId: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  age: number;
  gender: string;
  services: string[];
  controlNo?: string;
  birthdate?: string;
  citizenship?: string;
  houseNo?: string;
  street?: string;
  barangay?: string;
  municipality?: string;
  province?: string;
  email?: string;
  contact?: string;
  date: string;
  slotTime: string;
  slotID: string;
  purpose: string;
  status: "Approved" | "Rejected" | "Completed" | "Rescheduled";
  rescheduled?: boolean;
  originalDate?: string;
  originalSlot?: string;
  endTime?: string;
  endTime24?: string;
}

type Notification = {
  text: string;
  unread: boolean;
};

const PatientRecords_Clinical: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [yearFilter, setYearFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");

  // Modal States
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);

  // Notifications
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

  // Custom Modal
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

  // Fetch Patient Records
  useEffect(() => {
    const fetchPatientRecords = async () => {
      setLoading(true);
      try {
        const transQuery = query(
          collection(db, "Transactions"),
          where("purpose", "==", "Clinical Laboratory"),
          where("status", "in", ["Approved", "Rejected", "Completed", "Rescheduled"])
        );
        const transSnap = await getDocs(transQuery);
        const loaded: PatientRecord[] = [];

        for (const t of transSnap.docs) {
          const tData = t.data();

          let patientData: any = {};
          let userId = "N/A";

          if (tData.uid) {
            const userSnap = await getDoc(doc(db, "Users", tData.uid));
            if (userSnap.exists()) {
              userId = userSnap.data().UserId || "N/A";
            }
          }

          if (tData.patientId) {
            const pSnap = await getDoc(doc(db, "Patients", tData.patientId));
            if (pSnap.exists()) {
              patientData = pSnap.data();
            }
          }

          loaded.push({
            id: t.id,
            UserId: userId,
            patientId: tData.patientId || "",
            patientCode: patientData.patientCode || "N/A",
            lastName: patientData.lastName || "Unknown",
            firstName: patientData.firstName || "Unknown",
            middleInitial: patientData.middleInitial || "",
            age: patientData.age || 0,
            gender: patientData.gender || "",
            services: Array.isArray(tData.services) ? tData.services : [],
            controlNo: patientData.controlNo || "",
            birthdate: patientData.birthdate || "",
            citizenship: patientData.citizenship || "",
            houseNo: patientData.houseNo || "",
            street: patientData.street || "",
            barangay: patientData.barangay || "",
            municipality: patientData.municipality || "",
            province: patientData.province || "",
            email: patientData.email || "",
            contact: patientData.contact || "",
            date: tData.date || "",
            slotTime: tData.slotTime || "",
            slotID: tData.slotID || "",
            purpose: tData.purpose || "Clinical Laboratory",
            status: tData.status || "Approved",
            rescheduled: tData.rescheduled || false,
            originalDate: tData.originalDate || "",
            originalSlot: tData.originalSlot || "",
            endTime: tData.endTime || "",
          });
        }

        // Sort by date DESCENDING (latest first)
        loaded.sort((a, b) => b.date.localeCompare(a.date));

        setPatientRecords(loaded);
      } catch (error) {
        console.error("Error fetching records:", error);
        openCustomModal("Failed to load patient records.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientRecords();
  }, []);

  // Set default year/month filter
  useEffect(() => {
    const today = new Date();
    setYearFilter(today.getFullYear().toString());
    setMonthFilter(String(today.getMonth() + 1).padStart(2, "0"));
  }, []);

  // Filter + Sort Logic
  const filteredAndSortedRecords = patientRecords
    .filter((rec) => {
      const fullName = `${rec.firstName} ${rec.lastName} ${rec.middleInitial || ""}`.toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        fullName.includes(searchLower) ||
        rec.patientCode.toLowerCase().includes(searchLower) ||
        rec.UserId.toLowerCase().includes(searchLower);

      const [year, month] = rec.date.split("-");
      const matchesStatus = statusFilter === "All" || rec.status === statusFilter;
      const matchesYear = yearFilter === "All" || year === yearFilter;
      const matchesMonth = monthFilter === "All" || month === monthFilter;

      return matchesSearch && matchesStatus && matchesYear && matchesMonth;
    });

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const recordsPerPage = 5;
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredAndSortedRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredAndSortedRecords.length / recordsPerPage);

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

  // Handle Actions
  const handleAction = (action: string, record: PatientRecord) => {
    setSelectedPatientRecord(record);
    if (action === "Completed" && record.status === "Approved") {
      setShowCompletedModal(true);
    } else if (action === "View Record") {
      setShowRecordModal(true);
    }
  };

  const confirmCompleted = async () => {
    if (!selectedPatientRecord) return;

    try {
      await updateDoc(doc(db, "Transactions", selectedPatientRecord.id), {
        status: "Completed",
      });

      setPatientRecords((prev) =>
        prev.map((r) =>
          r.id === selectedPatientRecord.id ? { ...r, status: "Completed" } : r
        )
      );

      openCustomModal("Patient record marked as Completed!", "success");
    } catch (error) {
      console.error("Error updating status:", error);
      openCustomModal("Failed to update status.", "error");
    } finally {
      setShowCompletedModal(false);
      setSelectedPatientRecord(null);
    }
  };

  return (
    <div className="dashboards">
      {/* Sidebar */}
      <aside className="sidebars">
        <div>
          <div className="logo-boxs" onClick={() => navigate("/dashboard_clinical")} style={{ cursor: "pointer" }}>
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Clinical</span>
          </div>
          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => navigate("/dashboard_clinical")}>Dashboard</span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => navigate("/appointments_clinical")}>Appointments</span>
            </div>
            <div className="nav-item active">
              <FaUsers className="nav-icon" />
              <span>Patient Records</span>
            </div>
            <div className="nav-item">
              <FaClock className="nav-icon" />
              <span onClick={() => navigate("/manageslots_clinical")}>Manage Slots</span>
            </div>
            <div className="nav-item">
              <FaStethoscope className="nav-icon" />
              <span onClick={() => navigate("/services_clinical")}>Services</span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => navigate("/reports&analytics_clinical")}>Reports & Analytics</span>
            </div>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Admin</span>
          </div>
          <div className="signout-box">
            <FaSignOutAlt className="signout-icon" />
            <span
              onClick={() =>
                openCustomModal("Are you sure you want to sign out?", "confirm", async () => {
                  await signOut(auth);
                  navigate("/loginadmin", { replace: true });
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

      {/* Main Content */}
      <main className="main-content">
        <div className="top-navbar-clinical">
          <h5 className="navbar-title">Patient Records</h5>
          <div className="notification-wrapper">
            <FaBell className="notification-bell" onClick={() => setShowNotifications(!showNotifications)} />
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="mark-read-btn" onClick={markAllAsRead}>Mark all as read</button>
                  )}
                </div>
                {notifications.map((n, i) => (
                  <div key={i} className={`notification-item ${n.unread ? "unread" : ""}`}>
                    <span>{n.text}</span>
                    {n.unread && <span className="notification-badge">New</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="content-wrapper">
          <div className="filter-barr">
            <div className="search-containerrr">
              <div className="search-bar-wrapper">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by Name, Patient ID, User ID..."
                  className="search-bar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="filter">
              <label>Status:</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-dropdown">
                <option value="All">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="filter">
              <label>Year:</label>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="status-dropdown">
                {Array.from({ length: 26 }, (_, i) => {
                  const y = new Date().getFullYear() + 20 - i;
                  return y >= 2025 ? <option key={y} value={y}>{y}</option> : null;
                })}
                <option value="All">All Years</option>
              </select>
            </div>

            <div className="filter">
              <label>Month:</label>
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="status-dropdown">
                {["January","February","March","April","May","June","July","August","September","October","November","December"]
                  .map((m, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{m}</option>
                  ))}
                <option value="All">All Months</option>
              </select>
            </div>
          </div>

          <p className="appointments-heading">All Accepted Appointments</p>

          {loading ? (
            <p>Loading records...</p>
          ) : (
            <div className="table-container">
              <table className="appointments-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Patient ID</th>
                    <th>Lastname</th>
                    <th>Firstname</th>
                    <th>Services</th>
                    <th>Appointment Date</th>
                    <th>Slot</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.length > 0 ? (
                    currentRecords.map((rec) => (
                      <tr key={rec.id}>
                        <td>{rec.UserId}</td>
                        <td>{rec.patientCode}</td>
                        <td>{rec.lastName}</td>
                        <td>{rec.firstName}</td>
                        <td>{rec.services.join(", ")}</td>
                        <td>
                          {rec.date}
                          {rec.rescheduled && rec.originalDate && (
                            <div style={{ marginTop: "4px", fontSize: "11px", color: "#e67e22" }}>
                              <FiCalendar style={{ display: "inline", marginRight: "4px" }} />
                              Rescheduled from {rec.originalDate} {rec.originalSlot && `@ ${rec.originalSlot}`}
                            </div>
                          )}
                        </td>
                            <td>
  {rec.slotTime}
  {rec.endTime && (
    <span >
      {" - "}{rec.endTime}
    </span>
  )}
</td>
                        <td>
                          <span className={`status-text ${rec.status.toLowerCase()}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            {rec.status === "Approved" && (
                              <button
                                onClick={() => handleAction("Completed", rec)}
                                className="action-btnssss completed"
                                title="Mark as Completed"
                              >
                                <FaCheckCircle size={20} />
                              </button>
                            )}
                            <button
                              onClick={() => handleAction("View Record", rec)}
                              className="action-btnssss view"
                              title="View Details"
                            >
                              <FaEye size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="no-records">No records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredAndSortedRecords.length)} of {filteredAndSortedRecords.length} records
                </div>
                <div className="pagination-controls">
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="pagination-btn prev-btn">
                    Previous
                  </button>
                  {getPageNumbers().map((page, i) => (
                    <button
                      key={i}
                      onClick={() => typeof page === "number" && setCurrentPage(page)}
                      className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
                      disabled={page === "..."}
                    >
                      {page}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="pagination-btn next-btn">
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {showCompletedModal && selectedPatientRecord && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Mark as Completed</h3>
              <p>Mark <strong>{selectedPatientRecord.lastName}, {selectedPatientRecord.firstName}</strong> as completed?</p>
              <div className="modal-buttons">
                <button onClick={confirmCompleted} className="modal-confirm">Yes, Complete</button>
                <button onClick={() => { setShowCompletedModal(false); setSelectedPatientRecord(null); }} className="modal-cancel">Cancel</button>
              </div>
            </div>
          </div>
        )}

          {showRecordModal && selectedPatientRecord && (
                      <div className="modal-overlay">
                        <div className="modal-boxs record-modal">
                           <button
                            className="modal-close-icon"
                            onClick={() => setShowRecordModal(false)}
                          >
                            <FaTimes />
                          </button>
                          <h3>Patient Information</h3>
                          <div className="modal-contentss">
                            <table className="info-table">
                              <tbody>
                                <tr><th>User ID</th><td>{selectedPatientRecord.UserId}</td></tr>
                                <tr><th>Patient ID</th><td>{selectedPatientRecord.patientCode}</td></tr>
                                <tr><th>Control No.</th><td>{selectedPatientRecord.controlNo}</td></tr>
                                <tr><th>Last Name</th><td>{selectedPatientRecord.lastName}</td></tr>
                                <tr><th>First Name</th><td>{selectedPatientRecord.firstName}</td></tr>
                                <tr><th>Middle Initial</th><td>{selectedPatientRecord.middleInitial || "N/A"}</td></tr>
                                <tr><th>Birthdate</th><td>{selectedPatientRecord.birthdate}</td></tr>
                                <tr><th>Age</th><td>{selectedPatientRecord.age}</td></tr>
                                <tr><th>Gender</th><td>{selectedPatientRecord.gender}</td></tr>
                                <tr><th>Citizenship</th><td>{selectedPatientRecord.citizenship}</td></tr>
                                <tr className="section-header">
                                  <th colSpan={2}>Address</th>
                                </tr>
                                <tr><th>House No.</th><td>{selectedPatientRecord.houseNo}</td></tr>
                                <tr><th>Street</th><td>{selectedPatientRecord.street}</td></tr>
                                <tr><th>Barangay</th><td>{selectedPatientRecord.barangay}</td></tr>
                                <tr><th>Municipality</th><td>{selectedPatientRecord.municipality}</td></tr>
                                <tr><th>Province</th><td>{selectedPatientRecord.province}</td></tr>
                                <tr><th>Email</th><td>{selectedPatientRecord.email}</td></tr>
                                <tr><th>Contact</th><td>{selectedPatientRecord.contact}</td></tr>
                                <tr><th>Department</th><td>{selectedPatientRecord.purpose}</td></tr>
                                <tr><th>Services</th><td>{selectedPatientRecord.services.join(", ")}</td></tr>
                                <tr>
          <th>Appointment Date</th>
          <td>
            {selectedPatientRecord.date}
            {selectedPatientRecord.rescheduled && (
              <div style={{ marginTop: "4px" }}>
                <small style={{ 
                  color: "#e67e22", 
                  fontStyle: "italic", 
                  backgroundColor: "#fff3e0",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}>
                  Rescheduled from {selectedPatientRecord.originalDate}
                  {selectedPatientRecord.originalSlot && ` at ${selectedPatientRecord.originalSlot}`}
                </small>
              </div>
            )}
          </td>
        </tr>
                                <tr><th>Slot ID</th><td>{selectedPatientRecord.slotID}</td></tr>
                                <tr>
          <th>Time Slot</th>
          <td>
            {selectedPatientRecord.slotTime}
            {selectedPatientRecord.endTime ? (
              <span style={{ fontWeight: "bold", color: "#28a745" }}>
                {" "} - {selectedPatientRecord.endTime}
              </span>
            ) : (
              " (1-hour slot)" // or leave blank: ""
            )}
            {selectedPatientRecord.rescheduled && (
              <div style={{ marginTop: "4px" }}>
                <small style={{ 
                  color: "#e67e22", 
                  fontStyle: "italic", 
                  backgroundColor: "#fff3e0",
                  padding: "2px 6px",
                  borderRadius: "4px"
                }}>
                  Rescheduled from {selectedPatientRecord.originalDate} at {selectedPatientRecord.originalSlot}
                </small>
              </div>
            )}
          </td>
        </tr>
                                <tr><th>Status</th><td>{selectedPatientRecord.status}</td></tr>
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
              <div className="radiology-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="radiology-modal-header">
                  <img src={logo} alt="Logo" className="radiology-modal-logo" />
                  <h3 className="radiology-modal-title">
                    {customModalType === "success" ? "SUCCESS" : customModalType === "error" ? "ERROR" : "CONFIRM"}
                  </h3>
                  <button className="radiology-modal-close" onClick={closeCustomModal}><X size={20} /></button>
                </div>
                <div className="radiology-modal-body">
                  <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>{customModalMessage}</p>
                </div>
                <div className="radiology-modal-footer">
                  {customModalType === "confirm" ? (
                    <>
                      <button className="radiology-modal-btn cancel" onClick={closeCustomModal}>Cancel</button>
                      <button className="radiology-modal-btn confirm" onClick={() => { closeCustomModal(); onCustomModalConfirm(); }}>Proceed</button>
                    </>
                  ) : (
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

export default PatientRecords_Clinical;