import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, FaClock, FaStethoscope, } from "react-icons/fa";
import "../../../assets/Appointments_Dental.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { sendEmail } from "../emailService";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { X } from "lucide-react";

// Types
interface Appointment {
  id: string;
  uid: string;
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
  status: "Pending" | "Approved" | "Rejected" | "Cancelled"; // Include Cancelled
}

interface Notification {
  text: string;
  unread: boolean;
}

const Appointments_Radiology: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(false);
 const [filterYear, setFilterYear] = useState<string>("All");
const [filterMonth, setFilterMonth] = useState<string>("All");
  const [dayFilter, setDayFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
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

    useEffect(() => {
      setLoading(true);
      const transQuery = query(
        collection(db, "Transactions"),
        where("purpose", "==", "Radiographic"),
        where("status", "in", ["Pending", "Cancelled"])
      );
    
      const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
        const loaded: Appointment[] = [];
    
        for (const t of transSnap.docs) {
          const tData = t.data();
    
          let patientData: any = {
            UserId: " ",
            lastName: "Unknown",
            firstName: "Unknown",
            middleInitial: "Unknown",
            age: 0,
            gender: "",
            patientCode: "",
            controlNo: "",
            birthdate: "",
            citizenship: "",
            houseNo: "",
            street: "",
            barangay: "",
            municipality: "",
            province: "",
            email: "",
            contact: "",
          };
    
          let userId = " ";
          if (tData.uid) {
            const userRef = doc(db, "Users", tData.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              userId = userSnap.data().UserId || " ";
            }
          }
    
          if (tData.patientId) {
            const pRef = doc(db, "Patients", tData.patientId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              patientData = pSnap.data();
              console.log(`Fetched patient data for ID ${tData.patientId}:`, patientData);
            } else {
              console.warn(`No patient document found for patientId: ${tData.patientId}`);
            }
          } else {
            console.warn(`No patientId in transaction: ${t.id}`);
          }
    
          loaded.push({
            id: t.id,
            uid: tData.uid || "",
            UserId: userId,
            patientId: tData.patientId || "",
            patientCode: patientData.patientCode || "",
            lastName: patientData.lastName || "Unknown",
            firstName: patientData.firstName || "Unknown",
            middleInitial: patientData.middleInitial || "Unknown",
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
            purpose: tData.purpose || "",
            status: tData.status || "Pending",
          });
        }
    
        console.log("Loaded appointments:", loaded);
        setAppointments(loaded);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching appointments:", error);
        setLoading(false);
      });
    
      return () => unsubscribe();
    }, []);


    const handleStatusUpdate = async (
      id: string,
      newStatus: "Approved" | "Rejected",
      appointment: Appointment,
      rejectReason?: string
    ) => {
      setLoading(true);
      try {
        const ref = doc(db, "Transactions", id);
        await updateDoc(ref, { status: newStatus });
  
        
        setAppointments((prev) => prev.filter((appt) => appt.id !== id));
  
        if (!appointment.email) {
  openCustomModal("Cannot send email: No email address provided.", "error");
  return;
}
  
       const isValidEmail = /\S+@\S+\.\S+/.test(appointment.email);
if (!isValidEmail) {
  openCustomModal("Cannot send email: Invalid email format.", "error");
  return;
}
  
        console.log(`Sending email for appointment ${id} to: ${appointment.email}`);
        const message =
          newStatus === "Approved"
            ? `We are pleased to inform you that your appointment scheduled for ${appointment.date} at ${appointment.slotTime} has been approved. Please arrive on time and bring any necessary documents.\n\nThank you for choosing our services.\n\nBest regards,\nRadiology Team`
            : `We regret to inform you that your appointment scheduled for ${appointment.date} at ${appointment.slotTime} has been rejected.\nReason: ${rejectReason || "Not specified"}.\n\nPlease contact us if you have any questions or wish to reschedule.\n\nSincerely,\nRadiology Team`;
  
        await sendEmail(
          appointment.email,
          `${appointment.firstName} ${appointment.lastName}`,
          message,
          appointment.date,
          appointment.slotTime
        );

        if (appointment.uid) {
          const notifCollection = collection(db, "Users", appointment.uid, "notifications");
          await addDoc(notifCollection, {
            text: newStatus === "Approved" 
              ? `Your appointment for ${appointment.date} at ${appointment.slotTime} has been approved.` 
              : `Your appointment for ${appointment.date} at ${appointment.slotTime} has been rejected. Reason: ${rejectReason || "Not specified"}`,
            read: false,
            timestamp: serverTimestamp(),
            type: newStatus === "Approved" ? "approved" : "rejected",
          });
        }
  
        openCustomModal(`Appointment ${newStatus} successfully!`);
      } catch (error) {
        console.error(`Error updating status for appointment ${id}:`, error);
        openCustomModal("❌ Error updating appointment status. Please try again.");
      } finally {
        setLoading(false);
      }
    };

     const [availableYears, setAvailableYears] = useState(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i);
      });
    
      const handleYearClick = () => {
        const maxYear = Math.max(...availableYears);
        const currentYear = new Date().getFullYear();
        if (maxYear < currentYear + 50) {
         
          const newYears = Array.from({ length: 10 }, (_, i) => maxYear + i + 1);
          setAvailableYears((prev) => [...prev, ...newYears]);
        }
      };

 
  const availableMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
  const today = new Date();
  setFilterYear(today.getFullYear().toString());
  setFilterMonth(String(today.getMonth() + 1).padStart(2, "0")); // e.g., "06" for June
}, []);



 const filteredAppointments = appointments
  .filter((appt) => {
    const matchesSearch =
      appt.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.patientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.UserId.toLowerCase().includes(searchTerm.toLowerCase());

    const [year, month] = appt.date.split("-"); // assuming date is "2025-06-15"

    const matchesYear = filterYear === "All" || year === filterYear;
    const matchesMonth = filterMonth === "All" || month === filterMonth;
    const matchesStatus = statusFilter === "All" || appt.status === statusFilter;

    return matchesSearch && matchesYear && matchesMonth && matchesStatus;
  })
  // Sort: Pending first, then by date (latest first)
  .sort((a, b) => {
    if (a.status === "Pending" && b.status !== "Pending") return -1;
    if (b.status === "Pending" && a.status !== "Pending") return 1;
    return b.date.localeCompare(a.date); // Latest date first
  });

  
const [currentPage, setCurrentPage] = useState<number>(1);
const recordsPerPage = 5;

// PAGINATION LOGIC - Ibutang dire human sa filteredAppointments
const indexOfLastRecord = currentPage * recordsPerPage;
const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
const currentAppointments = filteredAppointments.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredAppointments.length / recordsPerPage);

// Page numbers with ellipsis (same sa Patient Records)
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


  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);

  return (
    <div className="dashboards">
      
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/dashboard_radiology")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Radiology</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/dashboard_radiology")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item active">
              <FaCalendarAlt className="nav-icon" />
              <span>Appointments</span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_radiology")}>
                Patient Records
              </span>
            </div>
              <div className="nav-item">
                          <FaClock className="nav-icon" />
                         <span onClick={() => navigate("/manageslots_radiology")}>Manage Slots</span>
                        </div>
                        <div className="nav-item">
                            <FaStethoscope className="nav-icon" />
                            <span onClick={() => handleNavigation("/services_radiology")}>
                              Services
                            </span>
                          </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/reports&analytics_radiology")}>
                Reports & Analytics
              </span>
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
        <div className="top-navbar-radiology">
          <h5 className="navbar-title">Appointments</h5>
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
                                                   <select
                                                     className="status-dropdown"
                                                     value={statusFilter}
                                                     onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                                                   >
                                                     <option value="All">All</option>
                                                     <option value="Pending">Pending</option>
                                                     <option value="Cancelled">Cancelled</option>
                                                   </select>
                                                 </div>
                     <div className="filter">
  <label>Year:</label>
  <select
    className="status-dropdown"
    value={filterYear}
    onChange={(e) => setFilterYear(e.target.value)}
  >
    {(() => {
      const currentYear = new Date().getFullYear();
      const startYear = 2025;
      const endYear = currentYear + 20; // +20 years into the future

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
          <option value="All">All Years</option>
        </>
      );
    })()}
  </select>
</div>
                         <div className="filter">
  <label>Month:</label>
  <select
    className="status-dropdown"
    value={filterMonth}
    onChange={(e) => setFilterMonth(e.target.value)}
  >
    {(() => {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const currentMonthIdx = new Date().getMonth();
      const recent: { name: string; value: string; }[] = [];

      // Show current + last 2 months first
      for (let i = 0; i < 3; i++) {
        const idx = (currentMonthIdx - i + 12) % 12;
        const monthNum = String(idx + 1).padStart(2, "0");
        recent.push({ name: monthNames[idx], value: monthNum });
      }

      return (
        <>
          {recent.map(m => (
            <option key={m.value} value={m.value}>{m.name}</option>
          ))}
          {monthNames.map((name, i) => {
            const val = String(i + 1).padStart(2, "0");
            if (recent.some(r => r.value === val)) return null;
            return <option key={val} value={val}>{name}</option>;
          })}
          <option value="All">All</option>
        </>
      );
    })()}
  </select>
</div>
                        
                       </div>
                     
          <p className="appointments-header">All Patient Appointment Requests</p>

          <table className="appointments-tabless">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Patient ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Services</th>
                <th>Appointment Date</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Action</th>
                <th>More</th>
              </tr>
            </thead>
            <tbody>
  {currentAppointments.length > 0 ? (
    currentAppointments.map((appt) => (
      <tr key={appt.id}>
        <td>{appt.UserId}</td>
        <td>{appt.patientCode}</td>
        <td>{appt.lastName}</td>
        <td>{appt.firstName}</td>
        <td>{appt.services.join(", ")}</td>
        <td>{appt.date}</td>
        <td>{appt.slotTime}</td>
        <td>
          <span className={`status-text ${appt.status.toLowerCase()}`}>
            {appt.status}
          </span>
        </td>
        <td>
          {appt.status === "Pending" && (
            <>
              <button
                className="action-btn accept"
                onClick={async () => {
                  if (appt.patientId) {
                    const pRef = doc(db, "Patients", appt.patientId);
                    const pSnap = await getDoc(pRef);
                    if (pSnap.exists()) {
                      const patientData = pSnap.data();
                      if (!patientData.email) {
                        openCustomModal("No email address found for this patient.");
                        return;
                      }
                      setSelectedAppointment({
                        ...appt,
                        ...patientData,
                      });
                      setShowAcceptModal(true);
                    } else {
                      openCustomModal("No patient data found.");
                    }
                  } else {
                    openCustomModal("No patientId found for this appointment.");
                  }
                }}
              >
                Accept
              </button>
              <button
                className="action-btn reject"
                onClick={async () => {
                  if (appt.patientId) {
                    const pRef = doc(db, "Patients", appt.patientId);
                    const pSnap = await getDoc(pRef);
                    if (pSnap.exists()) {
                      const patientData = pSnap.data();
                      if (!patientData.email) {
                        openCustomModal("No email address found for this patient.");
                        return;
                      }
                      setSelectedAppointment({
                        ...appt,
                        ...patientData,
                      });
                      setShowRejectModal(true);
                    } else {
                      openCustomModal("No patient data found.");
                    }
                  } else {
                    openCustomModal("No patientId found for this appointment.");
                  }
                }}
              >
                Reject
              </button>
            </>
          )}
        </td>
        <td>
          <button
            className="view-more-btn"
            onClick={async () => {
              if (appt.patientId) {
                const pRef = doc(db, "Patients", appt.patientId);
                const pSnap = await getDoc(pRef);
                if (pSnap.exists()) {
                  const patientData = pSnap.data();
                  setSelectedPatient({
                    ...appt,
                    ...patientData
                  });
                  setShowInfoModal(true);
                }
              }
            }}
          >
            View More
          </button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={10} className="no-records">
        No appointment requests found.
      </td>
    </tr>
  )}
</tbody>
          </table>

          {/* PAGINATION */}
<div className="pagination-wrapper">
  <div className="pagination-info">
    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredAppointments.length)} of {filteredAppointments.length} appointments
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
        className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
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

          {showInfoModal && selectedPatient && (
            <div className="modal-overlayss">
              <div className="modal-boxss">
                <h3>Patient Information</h3>
                <div className="modal-contentss">
                  <table className="info-table">
                    <tbody>
                       <tr><th>User ID</th><td>{selectedPatient.UserId}</td></tr>
                      <tr><th>Patient ID</th><td>{selectedPatient.patientCode}</td></tr>
                      <tr><th>Control No.</th><td>{selectedPatient.controlNo}</td></tr>
                      <tr><th>Last Name</th><td>{selectedPatient.lastName}</td></tr>
                      <tr><th>First Name</th><td>{selectedPatient.firstName}</td></tr>
                      <tr><th>Middle Initial</th><td>{selectedPatient.middleInitial || "N/A"}</td></tr>
                      <tr><th>Birthdate</th><td>{selectedPatient.birthdate}</td></tr>
                      <tr><th>Age</th><td>{selectedPatient.age}</td></tr>
                      <tr><th>Gender</th><td>{selectedPatient.gender}</td></tr>
                      <tr><th>Citizenship</th><td>{selectedPatient.citizenship}</td></tr>
                      <tr className="section-header">
                        <th colSpan={2}>Address</th>
                      </tr>
                      <tr><th>House No.</th><td>{selectedPatient.houseNo}</td></tr>
                      <tr><th>Street</th><td>{selectedPatient.street}</td></tr>
                      <tr><th>Barangay</th><td>{selectedPatient.barangay}</td></tr>
                      <tr><th>Municipality</th><td>{selectedPatient.municipality}</td></tr>
                      <tr><th>Province</th><td>{selectedPatient.province}</td></tr>
                      <tr><th>Email</th><td>{selectedPatient.email}</td></tr>
                      <tr><th>Contact</th><td>{selectedPatient.contact}</td></tr>
                       <tr><th>Department</th><td>{selectedPatient.purpose}</td></tr>
                      <tr><th>Services</th><td>{selectedPatient.services.join(", ")}</td></tr>
                      <tr><th>Appointment Date</th><td>{selectedPatient.date}</td></tr>
                       <tr><th>Slot ID</th><td>{selectedPatient.slotID}</td></tr>
                      <tr><th>Slot</th><td>{selectedPatient.slotTime}</td></tr>
                      <tr><th>Status</th><td>{selectedPatient.status}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="modal-buttonss">
                  <button
                    className="modal-closes"
                    onClick={() => {
                      setShowInfoModal(false);
                      setSelectedPatient(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}



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

          {showRejectModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h3>Reject Appointment</h3>
                <p>Please enter the reason for rejection:</p>
                <textarea
                  value={rejectReason}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                  placeholder="Type reason here..."
                />
                <div className="modal-buttons">
                  <button
                    className="modal-cancel"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason("");
                      setSelectedAppointment(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="modal-confirm"
                    onClick={async () => {
                      if (selectedAppointment && selectedAppointment.email) {
                        await handleStatusUpdate(
                          selectedAppointment.id,
                          "Rejected",
                          selectedAppointment,
                          rejectReason
                        );
                        openCustomModal(`Appointment rejected.\nReason: ${rejectReason}`);
                      } else {
                        openCustomModal("⚠️ Cannot reject appointment: No valid email address.");
                      }
                      setShowRejectModal(false);
                      setRejectReason("");
                      setSelectedAppointment(null);
                    }}
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAcceptModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h3>Accept Appointment</h3>
                <p>
                  Are you sure you want to accept{" "}
                  <strong>
                    {selectedAppointment
                      ? `${selectedAppointment.lastName}, ${selectedAppointment.firstName}${
                          selectedAppointment.middleInitial
                            ? " " + selectedAppointment.middleInitial + "."
                            : ""
                        }`
                      : ""}
                  </strong>
                  ?
                </p>
                <div className="modal-buttons">
                  <button
                    className="modal-cancel"
                    onClick={() => {
                      setShowAcceptModal(false);
                      setSelectedAppointment(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="modal-confirm"
                    onClick={async () => {
                      if (selectedAppointment && selectedAppointment.email) {
                        await handleStatusUpdate(
                          selectedAppointment.id,
                          "Approved",
                          selectedAppointment
                        );
                        openCustomModal(`Appointment for ${selectedAppointment.lastName}, ${selectedAppointment.firstName} accepted.`);
                      } else {
                        openCustomModal("⚠️ Cannot accept appointment: No valid email address.");
                      }
                      setShowAcceptModal(false);
                      setSelectedAppointment(null);
                    }}
                  >
                    Confirm Accept
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Appointments_Radiology;