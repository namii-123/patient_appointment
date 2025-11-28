import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaCheckCircle, FaEye, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, FaClock, FaStethoscope, } from "react-icons/fa";
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
  getDocs,
  writeBatch,
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
  endTime?: string;      
  endTime24?: string;    
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
        where("status", "in", ["Pending", "Cancelled", "Rescheduled"])
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


const [showRescheduleModal, setShowRescheduleModal] = useState(false);
const [rescheduleDate, setRescheduleDate] = useState<string>("");
const [rescheduleSlot, setRescheduleSlot] = useState<string>("");
const [availableSlots, setAvailableSlots] = useState<{ id: string; time: string; display: string }[]>([]);
const [loadingSlots, setLoadingSlots] = useState(false);


const fetchAvailableSlots = async (date: string) => {
  if (!date) {
    setAvailableSlots([]);
    setRescheduleSlot("");
    return;
  }
  setLoadingSlots(true);

  try {
    const slotsQuery = query(
      collection(db, "Slots_Radiology"),
      where("date", "==", date)
    );

    const unsubscribe = onSnapshot(slotsQuery, (snap) => {
      const allSlots = snap.docs.map(doc => ({
        id: doc.id,
        time: doc.data().time as string,
        isBooked: doc.data().isBooked as boolean,
      }));

      // Sort by time
      allSlots.sort((a, b) => a.time.localeCompare(b.time));

      // Filter slots na pwede ma-select (dapat ang current + next hour libre)
      const availableForTwoHours = allSlots.filter((slot, index) => {
        if (slot.isBooked) return false;

        const currentHour = parseInt(slot.time.split(":")[0]);
        const nextSlotTime = `${String(currentHour + 1).padStart(2, "0")}:00`;

        // Check if next hour exists and is free
        const nextSlot = allSlots.find(s => s.time === nextSlotTime);
        if (!nextSlot) return false; // walay sunod nga slot (e.g. 4PM → 5PM wala na)
        return !nextSlot.isBooked;
      });

      // Format display: 10:00 AM - 11:00 AM
      const formatted = availableForTwoHours.map(slot => {
        const [h, m] = slot.time.split(":");
        let hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        const start = `${hour}:${m} ${ampm}`;

        const endHour = (parseInt(h) + 1) % 24;
        const endAmpm = endHour >= 12 ? "PM" : "AM";
        const endHour12 = endHour % 12 || 12;
        const end = `${endHour12}:${m} ${endAmpm}`;

        return {
          id: slot.id,
          time: slot.time, // original time to save
          display: `${start} - ${end}`,
        };
      });

      setAvailableSlots(formatted);
      setLoadingSlots(false);

      if (formatted.length > 0) {
        setRescheduleSlot(formatted[0].time);
      } else {
        setRescheduleSlot("");
      }
    });

    return unsubscribe;
  } catch (err) {
    console.error("Error:", err);
    setAvailableSlots([]);
    setLoadingSlots(false);
  }
};




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
    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
      {/* Accept Button */}
      <button
        className="action-btnsss accept"
        title="Accept Appointment"
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
        <FaCheckCircle size={20} />
      </button>

      {/* Reschedule Button */}
      <button
        className="action-btnsss reschedule"
        title="Reschedule Appointment"
        onClick={async () => {
          if (appt.patientId) {
            const pRef = doc(db, "Patients", appt.patientId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              const patientData = pSnap.data();
              setSelectedAppointment({
                ...appt,
                ...patientData,
              });
              setShowRescheduleModal(true);
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const formatted = tomorrow.toISOString().split("T")[0];
              setRescheduleDate(formatted);
              fetchAvailableSlots(formatted);
            }
          }
        }}
      >
        <FaCalendarAlt size={20} />
      </button>
    </div>
  )}
</td>
        <td>
  <div style={{ display: "flex", justifyContent: "center" }}>
    <button
      className="action-btnsss view-more"
      title="View Patient Details"
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
      <FaEye size={20} />
    </button>
  </div>
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


{showRescheduleModal && selectedAppointment && (
  <div className="modal-overlay">
    <div className="modal-box" style={{ maxWidth: "550px" }}>
      <h3>Reschedule Appointment</h3>
      
      <div style={{ marginBottom: "20px", padding: "15px", background: "#f9f9f9", borderRadius: "8px" }}>
        <p style={{ margin: "0 0 8px 0", fontWeight: "600" }}>
          Patient: {selectedAppointment.lastName}, {selectedAppointment.firstName}
        </p>
        <p style={{ margin: 0, fontSize: "14px", color: "#555" }}>
          Original: {selectedAppointment.date} at {selectedAppointment.slotTime}
        </p>
      </div>

      {/* STEP 1: Choose Date */}
      <div style={{ margin: "20px 0" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
          Select New Date <span style={{ color: "red" }}>*</span>
        </label>
        <input
          type="date"
          value={rescheduleDate}
          min={new Date(Date.now() + 24*60*60*1000).toISOString().split("T")[0]} // tomorrow onwards
          onChange={(e) => {
            const newDate = e.target.value;
            setRescheduleDate(newDate);
            setRescheduleSlot(""); // reset time
            
              {
              setAvailableSlots([]);
            }
          }}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "16px"
          }}
        />
      </div>

   
    {/* STEP 2: MANUAL TIME INPUT WITH START - END DISPLAY (10:00 AM - 12:00 PM) */}
<div style={{ margin: "20px 0" }}>
  <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
    Enter Start Time <span style={{ color: "red" }}>*</span>
  </label>

  {/* Main Input Field */}
  <div style={{ marginBottom: "15px" }}>
    <input
      type="text"
      value={rescheduleSlot}
      onChange={(e) => {
        let input = e.target.value.toUpperCase().replace(/[^0-9:APM ]/gi, "");
        
        if (/^\d{1,2}$/.test(input)) input += ":00";
        if (/^\d{1,2}:$/.test(input)) input += "00";
        if (/^\d{1,2}:\d$/.test(input)) input = input.replace(/:(\d)$/, ":0$1");
        if (/^\d{1,2}:\d{2}$/.test(input)) {
          const hour = parseInt(input.split(":")[0]);
          if (!input.includes("AM") && !input.includes("PM") && hour <= 12) {
            input += " AM";
          }
        }
        
        setRescheduleSlot(input);
      }}
      placeholder="10:00 AM"
      style={{
        width: "100%",
        padding: "18px",
        fontSize: "22px",
        fontWeight: "600",
        textAlign: "center",
        borderRadius: "14px",
        border: "4px solid #28a745",
        backgroundColor: "#f8fff9",
        color: "#1a1a1a",
        letterSpacing: "2px",
        boxShadow: "0 6px 15px rgba(0,0,0,0.15)",
        outline: "none"
      }}
    />
  </div>

  {/* LIVE PREVIEW: Start - End Time */}
  {rescheduleSlot && /^(1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM)$/i.test(rescheduleSlot.trim()) && (
    <div style={{
      background: "linear-gradient(135deg, #28a745, #20c997)",
      color: "white",
      padding: "16px",
      borderRadius: "12px",
      textAlign: "center",
      fontSize: "20px",
      fontWeight: "700",
      margin: "15px 0",
      boxShadow: "0 4px 12px rgba(40,167,69,0.3)"
    }}>
      {(() => {
        const match = rescheduleSlot.trim().match(/^(1[0-2]|0?[1-9]):?([0-5][0-9])\s?(AM|PM)$/i);
        if (!match) return "";
        const [_, hourStr, minute, ampm] = match;
        const hour = parseInt(hourStr);
        const startTime = `${hour}:${minute} ${ampm.toUpperCase()}`;

        let endHour = hour + 2;
        let endAmpm = ampm.toUpperCase();
        if (endHour > 12) {
          endHour -= 12;
          endAmpm = endAmpm === "AM" ? "PM" : "AM";
        }
        if (endHour === 12) endAmpm = "PM";
        if (endHour === 0) endHour = 12;

        const endTime = `${endHour}:${minute} ${endAmpm}`;
        return `${startTime} - ${endTime}`;
      })()}
    </div>
  )}

  {/* Quick Buttons */}
  {/* Quick Buttons */}
<div style={{ 
  display: "grid", 
  gridTemplateColumns: "repeat(4, 1fr)", 
  gap: "12px", 
  marginTop: "10px" 
}}>
  {[
    "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
  ].map((time) => {
    // Simple display: just show the start time (1-hour label)
    const display = time; // e.g. "8:00 AM" lang, dili na "8:00 AM - 10:00 AM"

    return (
      <button
        key={time}
        onClick={() => setRescheduleSlot(time)}
        style={{
          padding: "14px 8px",
          fontSize: "15px",
          fontWeight: "700",
          backgroundColor: rescheduleSlot === time ? "#28a745" : "#f1f3f5",
          color: rescheduleSlot === time ? "white" : "#333",
          border: "none",
          borderRadius: "12px",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: rescheduleSlot === time ? "0 6px 16px rgba(40,167,69,0.5)" : "0 2px 6px rgba(0,0,0,0.1)",
          transform: rescheduleSlot === time ? "translateY(-2px)" : "none"
        }}
        onMouseOver={(e) => {
          if (rescheduleSlot !== time) {
            e.currentTarget.style.backgroundColor = "#e0e0e0";
            e.currentTarget.style.transform = "translateY(-4px)";
          }
        }}
        onMouseOut={(e) => {
          if (rescheduleSlot !== time) {
            e.currentTarget.style.backgroundColor = "#f1f3f5";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
      >
        {display}
      </button>
    );
  })}
</div>

  {/* Validation */}
  {/* LIVE PREVIEW: Start - End Time (2-hour block) */}
{rescheduleSlot && /^(1[0-2]|0?[1-9]):[0-5][0-9]\s?(AM|PM)$/i.test(rescheduleSlot.trim()) && (
  <div style={{
    
  }}>
    {(() => {
      const match = rescheduleSlot.trim().match(/^(1[0-2]|0?[1-9]):?([0-5][0-9])\s?(AM|PM)$/i);
      if (!match) return "";
      const [_, hourStr, minute, ampm] = match;
      const hour = parseInt(hourStr);
      const startTime = `${hour}:${minute.padStart(2, "0")} ${ampm.toUpperCase()}`;

      let endHour = hour + 2;
      let endAmpm = ampm.toUpperCase();
      if (endHour > 12) {
        endHour -= 12;
        endAmpm = endAmpm === "AM" ? "PM" : "AM";
      }
      if (endHour === 12) endAmpm = "PM";
      if (endHour === 0) endHour = 12;

      const endTime = `${endHour}:${minute.padStart(2, "0")} ${endAmpm}`;
      return `${startTime} → ${endTime} (2-Hour Slot)`;
    })()}
  </div>
)}
</div>

      {/* Confirm Button */}
      <div className="modal-buttons" style={{ marginTop: "25px" }}>
        <button
          className="modal-cancel"
          onClick={() => {
            setShowRescheduleModal(false);
            setRescheduleDate("");
            setRescheduleSlot("");
            setAvailableSlots([]);
            setSelectedAppointment(null);
          }}
        >
          Cancel
        </button>

        <button
          className="modal-confirm"
          disabled={!rescheduleDate || !rescheduleSlot || loadingSlots}
          style={{
            opacity: (!rescheduleDate || !rescheduleSlot) ? 0.6 : 1
          }}
       onClick={async () => {
  if (!selectedAppointment?.email) {
    openCustomModal("No email found for this patient.", "error");
    return;
  }

  const timeMatch = rescheduleSlot.trim().match(/^(1[0-2]|0?[1-9]):?([0-5][0-9])\s?(AM|PM)$/i);
  if (!timeMatch) {
    openCustomModal("Invalid time format. Please use: 10:00 AM or 2:30 PM", "error");
    return;
  }

  const [_, hourStr, minute, ampm] = timeMatch;
  let hour24 = parseInt(hourStr);
  if (ampm.toUpperCase() === "PM" && hour24 !== 12) hour24 += 12;
  if (ampm.toUpperCase() === "AM" && hour24 === 12) hour24 = 0;

  const startTime24 = `${String(hour24).padStart(2, "0")}:${minute}`;
  const endHour24 = (hour24 + 2) % 24;
  const endTime24 = `${String(endHour24).padStart(2, "0")}:${minute}`;

  // Format for display (12-hour)
  const start12 = rescheduleSlot.trim();
  const end12Hour = hour24 + 2 > 12 ? (hour24 + 2 - 12) : (hour24 + 2 === 12 ? 12 : hour24 + 2);
  const end12HourStr = end12Hour === 0 ? 12 : end12Hour;
  const endAmpm = (hour24 + 2) >= 12 ? "PM" : "AM";
  const endTimeDisplay = `${end12HourStr}:${minute} ${endAmpm}`;

  try {
    // 1. Update ang transaction with start & end times
    const transRef = doc(db, "Transactions", selectedAppointment.id);
    await updateDoc(transRef, {
      status: "Approved",
      date: rescheduleDate,
      slotTime: start12,                    // e.g., "10:00 AM"
      endTime: `${endTimeDisplay}`,         // NEW: "12:00 PM"
      time24: startTime24,                  // "10:00"
      endTime24: endTime24,                 // "12:00" (for querying)
      updatedAt: serverTimestamp(),
      rescheduled: true,
      originalDate: selectedAppointment.date,
      originalSlot: selectedAppointment.slotTime,
    });

    // 2. Book ang 2 ka slots (start + next hour)
    const timesToBook = [startTime24, endTime24];
    const slotsQuery = query(
      collection(db, "Slots_Radiology"),
      where("date", "==", rescheduleDate),
      where("time", "in", timesToBook)
    );

    const slotSnap = await getDocs(slotsQuery);
    const batch = writeBatch(db);

    slotSnap.forEach((slotDoc) => {
      batch.update(slotDoc.ref, { isBooked: true });
    });

    // Kung wala pa ang slots, i-create (optional)
    if (slotSnap.empty) {
      console.warn("Slots not found for booking, creating...");
      timesToBook.forEach(time => {
        const slotRef = doc(collection(db, "Slots_Radiology"));
        batch.set(slotRef, {
          date: rescheduleDate,
          time: time,
          isBooked: true,
          createdBy: "admin_reschedule"
        });
      });
    }

    await batch.commit();

    // 3. Send email with full time range
    const message = `Your appointment has been RESCHEDULED by the Radiology Department.\n\nNew Schedule:\nDate: ${rescheduleDate}\nTime: ${start12} - ${endTimeDisplay} (2-hour block)\n\nPlease arrive on time.\n\nThank you!\nRadiology Team`;

    await sendEmail(
      selectedAppointment.email,
      `${selectedAppointment.firstName} ${selectedAppointment.lastName}`,
      message,
      rescheduleDate,
      `${start12} - ${endTimeDisplay}`
    );

    // 4. Notification sa patient
    if (selectedAppointment.uid) {
      const notifCollection = collection(db, "Users", selectedAppointment.uid, "notifications");
      await addDoc(notifCollection, {
        text: `Your Radiology appointment has been RESCHEDULED!\nNew Schedule: ${rescheduleDate} at ${start12} - ${endTimeDisplay} (2 hours)`,
        read: false,
        timestamp: serverTimestamp(),
        type: "rescheduled",
      });
    }

    openCustomModal(`Appointment successfully rescheduled!\n${rescheduleDate}\n${start12} - ${endTimeDisplay}`, "success");

    // Close modal
    setShowRescheduleModal(false);
    setRescheduleDate("");
    setRescheduleSlot("");
    setSelectedAppointment(null);
  } catch (err: any) {
    console.error("Reschedule error:", err);
    openCustomModal("Failed to reschedule: " + err.message, "error");
  }
}}
        >
          {loadingSlots ? "Processing..." : "Confirm Reschedule"}
        </button>
      </div>
    </div>
  </div>
)}



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