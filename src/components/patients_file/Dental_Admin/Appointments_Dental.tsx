import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { sendEmail } from "../emailService";
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
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaSearch,
  FaClock,
} from "react-icons/fa";
import "../../../assets/Appointments_Dental.css";
import logo from "/logo.png";

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

const Appointments_Dental: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState("All");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  

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
    where("purpose", "==", "Dental"),
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
        slotID: tData.slotID || " ",
        status: tData.status || "Pending",
         purpose: tData.purpose || "Unknown",
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
        console.warn(`No email address for appointment ${id}`);
        alert("⚠️ Cannot send email: No email address provided.");
        return;
      }

      const isValidEmail = /\S+@\S+\.\S+/.test(appointment.email);
      if (!isValidEmail) {
        console.error(`Invalid email format for appointment ${id}:`, appointment.email);
        alert("⚠️ Cannot send email: Invalid email format.");
        return;
      }

      console.log(`Sending email for appointment ${id} to: ${appointment.email}`);
      const message =
        newStatus === "Approved"
          ? `We are pleased to inform you that your appointment scheduled for ${appointment.date} at ${appointment.slotTime} has been approved. Please arrive on time and bring any necessary documents.\n\nThank you for choosing our services.\n\nBest regards,\nDental Team`
          : `We regret to inform you that your appointment scheduled for ${appointment.date} at ${appointment.slotTime} has been rejected.\nReason: ${rejectReason || "Not specified"}.\n\nPlease contact us if you have any questions or wish to reschedule.\n\nSincerely,\nDental Team`;

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

      alert(`Appointment ${newStatus} successfully!`);
    } catch (error) {
      console.error(`Error updating status for appointment ${id}:`, error);
      alert("❌ Error updating appointment status. Please try again.");
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
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const availableDays = Array.from({ length: 31 }, (_, index) => index + 1);

  const filteredAppointments = appointments.filter((appt) => {
  const matchesSearch =
    appt.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.UserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patientCode.toLowerCase().includes(searchTerm.toLowerCase());

  const appointmentDate = new Date(appt.date);
  const matchesYear =
    yearFilter === "All" || appointmentDate.getFullYear() === parseInt(yearFilter);
  const matchesMonth =
    monthFilter === "All" ||
    availableMonths[appointmentDate.getMonth()] === monthFilter;
  const matchesDay =
    dayFilter === "All" || appointmentDate.getDate() === parseInt(dayFilter);
  const matchesStatus =
    statusFilter === "All" || appt.status === statusFilter;

  return (
    matchesSearch &&
    matchesYear &&
    matchesMonth &&
    matchesDay &&
    matchesStatus
  );
});

  return (
    <div className="dashboards">
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => navigate("/dashboard_dental")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Dental</span>
          </div>
          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => navigate("/dashboard_dental")}>Dashboard</span>
            </div>
            <div className="nav-item active">
              <FaCalendarAlt className="nav-icon" />
              <span>Appointments</span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => navigate("/patientrecords_dental")}>Patient Records</span>
            </div>
            <div className="nav-item">
                          <FaClock className="nav-icon" />
                         <span onClick={() => navigate("/manageslots_dental")}>Manage Slots</span>
                        </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => navigate("/reports&analytics_dental")}>Reports & Analytics</span>
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

      <main className="main-content">
        <div className="top-navbar-dental">
          <h2 className="navbar-title">Appointments</h2>
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
                           value={yearFilter}
                           onChange={(e) => setYearFilter(e.target.value)}
                           onClick={handleYearClick} 
                         >
                           <option value="All Years">All Years</option>
                           {availableYears.map((year) => (
                             <option key={year} value={year}>
                               {year}
                             </option>
                           ))}
                         </select>
                       </div>
                               
                                 <div className="filter">
                                    <label>Month:</label>
                                 <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="status-dropdown">
                                   <option value="All">All Months</option>
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
                   
                                <div className="filter">
                                 <label>Day:</label>
                   
                                 <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="status-dropdown">
                                   
                                   <option value="All">All Days</option>
                                   {Array.from({ length: 31 }, (_, i) => (
                                     <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                                       {i + 1}
                                     </option>
                                   ))}
                                 </select>
                               </div>
                               </div>

          <p className="appointments-header">All Patient Appointment Requests</p>

          {loading ? (
            <p>Loading appointments...</p>
          ) : (
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
  {filteredAppointments.length > 0 ? (
    filteredAppointments.map((appt) => (
      <tr key={appt.id}>
        <td>{appt.UserId}</td> {/* Display UserId */}
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
                      console.log("Patient data for accept:", patientData);
                      if (!patientData.email) {
                        alert("⚠️ No email address found for this patient.");
                        return;
                      }
                      setSelectedAppointment({
                        ...appt,
                        ...patientData,
                      });
                      setShowAcceptModal(true);
                    } else {
                      console.warn("No patient data for patientId:", appt.patientId);
                      alert("⚠️ No patient data found.");
                    }
                  } else {
                    alert("⚠️ No patientId found for this appointment.");
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
                      console.log("Patient data for reject:", patientData);
                      if (!patientData.email) {
                        alert("⚠️ No email address found for this patient.");
                        return;
                      }
                      setSelectedAppointment({
                        ...appt,
                        ...patientData,
                      });
                      setShowRejectModal(true);
                    } else {
                      console.warn("No patient data for patientId:", appt.patientId);
                      alert("⚠️ No patient data found.");
                    }
                  } else {
                    alert("⚠️ No patientId found for this appointment.");
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
        ...patientData,
        
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
        No records found.
      </td>
    </tr>
  )}
</tbody>
            </table>
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
                      <tr>
                        <th>Status</th>
                        <td>
                          <span className={`status-text ${selectedPatient.status.toLowerCase()}`}>
                            {selectedPatient.status}
                          </span>
                        </td>
                      </tr>
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
                        alert(`Appointment rejected.\nReason: ${rejectReason}`);
                      } else {
                        alert("⚠️ Cannot reject appointment: No valid email address.");
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
                        alert(`Appointment for ${selectedAppointment.lastName}, ${selectedAppointment.firstName} accepted.`);
                      } else {
                        alert("⚠️ Cannot accept appointment: No valid email address.");
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

export default Appointments_Dental;