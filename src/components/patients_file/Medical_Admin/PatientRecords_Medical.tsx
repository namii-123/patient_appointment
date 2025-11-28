import React, { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import type { ChangeEvent } from "react";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, FaTimes, FaClock, FaStethoscope, FaCheckCircle, FaEye } from "react-icons/fa";
import "../../../assets/PatientRecords_Radiology.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 

import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
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
  status: "Approved" | "Rejected" | "Completed";
  rescheduled?: boolean;
  originalDate?: string;
  originalSlot?: string;
  endTime?: string;        
  endTime24?: string;     
  time24?: string;
}


type Notification = {
  text: string;
  unread: boolean;
};

const PatientRecords_Medical: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");
   const [loading, setLoading] = useState(false);
   const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  // Modal States
    const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
    const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
    const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);
  

    
      const [statusFilter, setStatusFilter] = useState<string>("All");
    const [yearFilter, setYearFilter] = useState<string>("All");
    const [monthFilter, setMonthFilter] = useState<string>("All");
 
    

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

  const handleNavigation = (path: string) => {
    navigate(path);
  };

        useEffect(() => {
                const fetchPatientRecords = async () => {
                  setLoading(true);
                  try {
                    const transQuery = query(
                      collection(db, "Transactions"),
                      where("purpose", "==", "Medical"),
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
                        purpose: tData.purpose || "Medical",
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
        
    
  

  const handleAction = (action: string, patientRecord: PatientRecord) => {
    setSelectedPatientRecord(patientRecord);
    if (action === "Completed" && patientRecord.status === "Approved") {
      setShowCompletedModal(true);
    } else if (action === "View Record") {
      setShowRecordModal(true);
    } else {
      console.log(`${action} patient record with ID: ${patientRecord.id}`);
    }
  };

   const confirmCompleted = async () => {
       if (selectedPatientRecord) {
         try {
           const ref = doc(db, "Transactions", selectedPatientRecord.id);
           await updateDoc(ref, { status: "Completed" });
   
           // Update the local state to reflect the "Completed" status
           setPatientRecords((prev) =>
             prev.map((rec) =>
               rec.id === selectedPatientRecord.id
                 ? { ...rec, status: "Completed" }
                 : rec
             )
           );
   
           console.log(`Marked as completed: ${selectedPatientRecord.id}`);
         } catch (error) {
           console.error("Error marking as completed:", error);
           alert("❌ Error marking as completed. Please try again.");
         }
       }
       setShowCompletedModal(false);
       setSelectedPatientRecord(null);
     };

  

       
   useEffect(() => {
     const today = new Date();
     setYearFilter(today.getFullYear().toString());
     setMonthFilter(String(today.getMonth() + 1).padStart(2, "0")); // e.g., "11" for November
   }, []);
   
   
   // 1. Human sa imong existing filter (kini naa nimo na)
   const filteredPatientRecords = patientRecords.filter((rec) => {
     const fullName = `${rec.firstName} ${rec.lastName} ${rec.middleInitial || ""}`.trim().toLowerCase();
     const searchLower = searchTerm.toLowerCase();
   
     const matchesSearch =
       fullName.includes(searchLower) ||
       rec.patientCode.toLowerCase().includes(searchLower) ||
       rec.UserId.toLowerCase().includes(searchLower) ||
       rec.patientId.toLowerCase().includes(searchLower);
   
     const [year, month] = rec.date.split("-");
   
     const matchesStatus = statusFilter === "All" || rec.status === statusFilter;
     const matchesYear = yearFilter === "All" || year === yearFilter;
     const matchesMonth = monthFilter === "All" || month === monthFilter;
   
     return matchesSearch && matchesStatus && matchesYear && matchesMonth;
   });
   


 


    
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


      

      
      const sortedAndFilteredRecords = [...filteredPatientRecords].sort((a, b) => {
        // Sort by date: newest first (2025-11-19 comes before 2025-10-01)
        return b.date.localeCompare(a.date);
      });
      
      
      
        
          
      
      
          const [currentPage, setCurrentPage] = useState<number>(1);
      const recordsPerPage = 5;
      // PAGINATION LOGIC - Ibutang human sa sortedAndFilteredRecords
      const indexOfLastRecord = currentPage * recordsPerPage;
      const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
      const currentRecords = sortedAndFilteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
      
      // Calculate total pages
      const totalPages = Math.ceil(sortedAndFilteredRecords.length / recordsPerPage);
      
      // Generate page numbers (max 5 visible, with ellipsis if needed)
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


  return (
    <div className="dashboards">
      {/* Sidebar */}
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/dashboard_medical")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">MEDICAL</span>
          </div>

          {/* Nav Links */}
          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/dashboard_medical")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_medical")}>
                Appointments
              </span>
            </div>
            <div className="nav-item active">
              <FaUsers className="nav-icon" />
              <span>Patient Records</span>
            </div>
              <div className="nav-item">
                                      <FaClock className="nav-icon" />
                                     <span onClick={() => navigate("/manageslots_medical")}>Manage Slots</span>
                                    </div>
                 <div className="nav-item">
                                              <FaStethoscope className="nav-icon" />
                                              <span onClick={() => handleNavigation("/services_medical")}>
                                                Services
                                              </span>
                                            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/reports&analytics_medical")}>
                Reports & Analytics
              </span>
            </div>
            
          </nav>
        </div>

        {/* User Info and Sign Out */}
        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label">Admin</span>
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
      <main className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar-radiology">
          <h5 className="navbar-title">Patient Records</h5>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}

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
                      {notif.unread && <span className="notification-badge">New</span>}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No new notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search Bar */}
      <div className="content-wrapper">
        <div className="filter-barr">
               <div className="search-containerrr">
                   <div className="search-bar-wrapper">
                     <FaSearch className="search-icon" />
                     <input
                       type="text"
                       placeholder="Search by Name or Number..."
                       className="search-bar"
                       value={searchTerm}
                       onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                     />
                   </div>
       </div>
                   <div className="filter">
                     <label>Status:</label>
                     <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-dropdown">
                       <option value="All">All Status</option>
                       <option value="Approved">Approved</option>
                       <option value="Rejected">Rejected</option>
                       <option value="Completed">Completed</option>
                     </select>
                    </div>
                        <div className="filter">
  <label>Year:</label>
  <select
    className="status-dropdown"
    value={yearFilter}
    onChange={(e) => setYearFilter(e.target.value)}
  >
    {(() => {
      const currentYear = new Date().getFullYear();
      const startYear = 2025;
      const endYear = currentYear + 20;

      const years = [];
      for (let y = endYear; y >= startYear; y--) {
        years.push(y);
      }

      return (
        <>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
          <option value="All">All</option>
        </>
      );
    })()}
  </select>
</div>
                   
                    <div className="filter">
  <label>Month:</label>
  <select
    className="status-dropdown"
    value={monthFilter}
    onChange={(e) => setMonthFilter(e.target.value)}
  >
    {(() => {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const currentMonthIdx = new Date().getMonth();
      const recent: { name: string; value: string }[] = [];

      // Current month + last 2 months una (priority)
      for (let i = 0; i < 3; i++) {
        const idx = (currentMonthIdx - i + 12) % 12;
        const monthNum = String(idx + 1).padStart(2, "0");
        recent.push({ name: monthNames[idx], value: monthNum });
      }

      return (
        <>
          {/* Current + last 2 months una */}
          {recent.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name} 
            </option>
          ))}
          {/* Uban nga months */}
          {monthNames.map((name, i) => {
            const val = String(i + 1).padStart(2, "0");
            if (recent.some((r) => r.value === val)) return null;
            return (
              <option key={val} value={val}>
                {name}
              </option>
            );
          })}
          <option value="All">All</option>
        </>
      );
    })()}
  </select>
</div>
       
       
                  
                   </div>
                 
        {/* Subheading */}
        <p className="appointments-heading">All Accepted Appointments</p>

        {/* Table */}
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
                {filteredPatientRecords.length > 0 ? (
                  filteredPatientRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>{rec.UserId}</td>
                      <td>{rec.patientCode}</td>
                      <td>{rec.lastName}</td> 
                      <td>{rec.firstName}</td> 
                     
                      <td>{rec.services.join(", ")}</td>
                         <td>
  {rec.date}
  {rec.rescheduled && (
    <div style={{ marginTop: "4px" }}>
      <small style={{ 
        color: "#e67e22", 
        fontStyle: "italic", 
        fontSize: "11px",
        backgroundColor: "#fff3e0",
        padding: "2px 6px",
        borderRadius: "4px",
        display: "inline-block"
      }}>
        Rescheduled from {rec.originalDate} {rec.originalSlot && `at ${rec.originalSlot}`}
      </small>
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
                        {/* Mobile: Icons only, Desktop: Text + Icon */}
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        {rec.status === "Approved" && (
                          <button
                            onClick={() => handleAction("Completed", rec)}
                            className="action-btnssss completed"
                            title="Mark as Completed"
                          >
                            <FaCheckCircle size={20} />
                            <span className="btn-text desktop-only"> </span>
                          </button>
                        )}
                      
                        <button
                          onClick={() => handleAction("View Record", rec)}
                          className="action-btnssss view"
                          title="View Details"
                        >
                          <FaEye size={20} />
                          <span className="btn-text desktop-only"> </span>
                        </button>
                      </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="no-records">
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>


               {/* PAGINATION - Ibutang after </table> pero inside .table-container */}
<div className="pagination-wrapper">
  <div className="pagination-info">
    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, sortedAndFilteredRecords.length)} of {sortedAndFilteredRecords.length} records
  </div>
  
  <div className="pagination-controls">
    <button
      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      className="pagination-btn prev-btn"
    >
      Previous
    </button>

    {getPageNumbers().map((page, index) => (
      <button
        key={index}
        onClick={() => typeof page === "number" && setCurrentPage(page)}
        className={`pagination-btn page-num ${
          page === currentPage ? "active" : ""
        } ${page === "..." ? "ellipsis" : ""}`}
        disabled={page === "..."}
      >
        {page}
      </button>
    ))}

    <button
      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages || totalPages === 0}
      className="pagination-btn next-btn"
    >
      Next
    </button>
  </div>
</div>
        </div>
      </div>
      </main>




    {/* CUSTOM UNIFIED MODAL - SAME STYLE SA TRANSACTION PAGE */}
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

      {/* Completed Modal */}
     {showCompletedModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Mark as Completed</h3>
            <p>
              Are you sure you want to mark{" "}
              <strong>{`${selectedPatientRecord?.lastName}, ${selectedPatientRecord?.firstName}`}</strong>{" "}
              as completed?
            </p>
            <div className="modal-buttons">
              <button onClick={confirmCompleted} className="modal-confirm">
                Yes
              </button>
              <button onClick={() => setShowCompletedModal(false)} className="modal-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Record Modal */}
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
                        <tr><th>Services</th><td>{selectedPatientRecord.services.join(", ")}</td></tr>
                        <tr><th>Appointment Date</th><td>{selectedPatientRecord.date}</td></tr>
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

    </div>
  );
};

export default PatientRecords_Medical;
