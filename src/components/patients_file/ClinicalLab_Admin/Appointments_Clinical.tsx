import React, { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, 
  FaChartBar, FaSignOutAlt, FaSearch, FaClock, FaTrash 
} from "react-icons/fa";
import "../../../assets/Appointments_Dental.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { sendEmail } from "../emailService";
import { 
  collection, doc, getDoc, updateDoc, query, 
  onSnapshot, where, addDoc, serverTimestamp 
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 



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
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
}

interface Notification {
  id: string;
  text: string;
  unread: boolean;
  timestamp: number;
}


const NOTIFICATIONS_STORAGE_KEY = "clinical_appointments_notifications";


const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 120) return "1 minute ago";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 7200) return "1 hour ago";
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 172800) return "Yesterday";
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 1209600) return "1 week ago";
  if (diff < 2592000) return `${Math.floor(diff / 604800)} weeks ago`;

  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};


const Appointments_Clinical: React.FC = () => {
  const navigate = useNavigate();

 
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [loading, setLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState("All");

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const prevPendingIdsRef = useRef<string[]>([]);
  const prevCancelledIdsRef = useRef<string[]>([]);
  const unreadCount = notifications.filter(n => n.unread).length;

useEffect(() => {
  const adminNotifQuery = query(
    collection(db, "admin_notifications"),
    where("purpose", "==", "Clinical Laboratory"),
    where("type", "==", "appointment_cancelled"),
    where("read", "==", false)
  );

  const unsub = onSnapshot(adminNotifQuery, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === "added") {
        const data = change.doc.data();
        const notifId = change.doc.id;

        const text = `Appointment cancelled: ${data.patientName} on ${data.date} at ${data.slotTime}`;

      
        setNotifications(prev => {
          if (prev.some(n => n.id === notifId)) return prev;
          return [{
            id: notifId,
            text,
            unread: true,
            timestamp: Date.now(),
          }, ...prev];
        });

      
        updateDoc(doc(db, "admin_notifications", notifId), { read: true });
      }
    });
  });

  return () => unsub();
}, []);

  
  
useEffect(() => {
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
  
 
  window.dispatchEvent(new Event("clinical_notifications_updated"));
}, [notifications]);

  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  const deleteNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  const handleNavigation = (p: string) => navigate(p);

  // === NEW: Sync from other pages (e.g., Dashboard) ===
useEffect(() => {
  const syncNotifications = () => {
    const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(parsed);
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
  };

  // Initial load
  syncNotifications();

  // Listen to updates from other pages
  const handleStorage = (e: StorageEvent) => {
    if (e.key === NOTIFICATIONS_STORAGE_KEY) syncNotifications();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener("clinical_notifications_updated", syncNotifications);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("clinical_notifications_updated", syncNotifications);
  };
}, []);
 
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "Transactions"),
      where("purpose", "==", "Clinical Laboratory"),
      where("status", "in", ["Pending", "Cancelled"])
    );

    const unsub = onSnapshot(q, async snap => {
      const list: Appointment[] = [];

      for (const d of snap.docs) {
        const data = d.data();

       
        let userId = " ";
        if (data.uid) {
          const uSnap = await getDoc(doc(db, "Users", data.uid));
          if (uSnap.exists()) userId = uSnap.data().UserId ?? " ";
        }

      
        let pData: any = {
          UserId: " ", lastName: "Unknown", firstName: "Unknown", middleInitial: "Unknown",
          age: 0, gender: "", patientCode: "", controlNo: "", birthdate: "", citizenship: "",
          houseNo: "", street: "", barangay: "", municipality: "", province: "", email: "", contact: ""
        };
        if (data.patientId) {
          const pSnap = await getDoc(doc(db, "Patients", data.patientId));
          if (pSnap.exists()) pData = pSnap.data();
        }

        list.push({
          id: d.id,
          uid: data.uid ?? "",
          UserId: userId,
          patientId: data.patientId ?? "",
          patientCode: pData.patientCode ?? "",
          lastName: pData.lastName ?? "Unknown",
          firstName: pData.firstName ?? "Unknown",
          middleInitial: pData.middleInitial ?? "Unknown",
          age: pData.age ?? 0,
          gender: pData.gender ?? "",
          services: Array.isArray(data.services) ? data.services : [],
          controlNo: pData.controlNo ?? "",
          birthdate: pData.birthdate ?? "",
          citizenship: pData.citizenship ?? "",
          houseNo: pData.houseNo ?? "",
          street: pData.street ?? "",
          barangay: pData.barangay ?? "",
          municipality: pData.municipality ?? "",
          province: pData.province ?? "",
          email: pData.email ?? "",
          contact: pData.contact ?? "",
          date: data.date ?? "",
          slotTime: data.slotTime ?? "",
          slotID: data.slotID ?? "",
          purpose: data.purpose ?? "",
          status: data.status ?? "Pending",
        });
      }

      setAppointments(list);
      setLoading(false);
    }, err => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  
  useEffect(() => {
    const curIds = appointments
      .filter(a => a.status === "Pending")
      .map(a => a.id)
      .sort();

    const prev = prevPendingIdsRef.current;
    const newIds = curIds.filter(id => !prev.includes(id));

    if (newIds.length) {
      const now = Date.now();
      const notifs = newIds.map(id => {
        const a = appointments.find(x => x.id === id)!;
        return {
          id,
          text: `New appointment request from ${a.firstName} ${a.lastName} on ${a.date} at ${a.slotTime}`,
          unread: true,
          timestamp: now,
        };
      });

      setNotifications(p => {
        const existing = p.map(n => n.id);
        return [...notifs.filter(n => !existing.includes(n.id)), ...p];
      });
    }

    
    if (!prev.length && curIds.length && !notifications.length) {
      const now = Date.now();
      setNotifications(curIds.map(id => {
        const a = appointments.find(x => x.id === id)!;
        return {
          id,
          text: `Pending appointment from ${a.firstName} ${a.lastName} on ${a.date} at ${a.slotTime}`,
          unread: true,
          timestamp: now,
        };
      }));
    }

    prevPendingIdsRef.current = curIds;
  }, [appointments, notifications.length]);

 
  useEffect(() => {
    const curIds = appointments
      .filter(a => a.status === "Cancelled")
      .map(a => a.id)
      .sort();

    const prev = prevCancelledIdsRef.current;
    const newIds = curIds.filter(id => !prev.includes(id));

    if (newIds.length) {
      const now = Date.now();
      const notifs = newIds.map(id => {
        const a = appointments.find(x => x.id === id)!;
        return {
          id,
          text: `Appointment from ${a.firstName} ${a.lastName} has been cancelled on ${a.date} at ${a.slotTime}`,
          unread: true,
          timestamp: now,
        };
      });

      setNotifications(p => {
        const existing = p.map(n => n.id);
        return [...notifs.filter(n => !existing.includes(n.id)), ...p];
      });
    }

    
    if (!prev.length && curIds.length && !notifications.length) {
      const now = Date.now();
      setNotifications(curIds.map(id => {
        const a = appointments.find(x => x.id === id)!;
        return {
          id,
          text: `Cancelled appointment from ${a.firstName} ${a.lastName} on ${a.date} at ${a.slotTime}`,
          unread: true,
          timestamp: now,
        };
      }));
    }

    prevCancelledIdsRef.current = curIds;
  }, [appointments, notifications.length]);

  
  const handleStatusUpdate = async (
    id: string,
    newStatus: "Approved" | "Rejected",
    appt: Appointment,
    reason?: string
  ) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "Transactions", id), { status: newStatus });

      
      setAppointments(p => p.filter(a => a.id !== id));
      setNotifications(p => p.filter(n => n.id !== id));

      
      if (!appt.email) return alert("No email address – cannot notify patient.");
      if (!/\S+@\S+\.\S+/.test(appt.email)) return alert("Invalid email format.");

      const msg =
        newStatus === "Approved"
          ? `Your appointment on ${appt.date} at ${appt.slotTime} has been APPROVED.`
          : `Your appointment on ${appt.date} at ${appt.slotTime} has been REJECTED.\nReason: ${reason || "Not specified"}.`;

      await sendEmail(appt.email, `${appt.firstName} ${appt.lastName}`, msg, appt.date, appt.slotTime);

      
      if (appt.uid) {
        await addDoc(collection(db, "Users", appt.uid, "notifications"), {
          text: newStatus === "Approved"
            ? `Your appointment for ${appt.date} at ${appt.slotTime} has been approved.`
            : `Your appointment for ${appt.date} at ${appt.slotTime} has been rejected. Reason: ${reason || "Not specified"}`,
          read: false,
          timestamp: serverTimestamp(),
          type: newStatus === "Approved" ? "approved" : "rejected",
        });
      }

      alert(`Appointment ${newStatus.toLowerCase()} successfully!`);
    } catch (e) {
      console.error(e);
      alert("Failed to update status.");
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

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  
  const filteredAppointments = appointments.filter(a => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      a.lastName.toLowerCase().includes(s) ||
      a.firstName.toLowerCase().includes(s) ||
      a.patientId.toLowerCase().includes(s) ||
      a.UserId.toLowerCase().includes(s) ||
      a.patientCode.toLowerCase().includes(s);

    const d = new Date(a.date);
    const yOk = yearFilter === "All" || d.getFullYear() === +yearFilter;
    const mOk = monthFilter === "All" || months[d.getMonth()] === monthFilter;
    const dayOk = dayFilter === "All" || d.getDate() === +dayFilter;
    const statOk = statusFilter === "All" || a.status === statusFilter;

    return matchesSearch && yOk && mOk && dayOk && statOk;
  });

  
  return (
    <div className="dashboards">
      
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/dashboard_clinical")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Clinical</span>
          </div>

          {/* Nav Links */}
          <nav className="nav-linkss">
           
            <div className="nav-item ">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_clinical")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item active">
              <FaCalendarAlt className="nav-icon" />
              <span>Appointments</span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_clinical")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item">
              <FaClock className="nav-icon" />
              <span onClick={() => handleNavigation("/manageslots_clinical")}>
                Manage Slots
              </span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/reports&analytics_clinical")}>
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
        <div className="top-navbar-clinical">
          <h2 className="navbar-title">Appointments</h2>

         
          <div className="notification-wrapper">
            <div className="bell-container" onClick={()=>setShowNotifications(!showNotifications)}>
              <FaBell className="notification-bell" />
              {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            </div>

            {showNotifications && (
              <div className="notifs">
              <div className="notification-dropdowns">
                <div className="notification-header">
                  <span>Notifications ({unreadCount})</span>
                  {unreadCount > 0 && <button className="mark-read-btn" onClick={markAllAsRead}>Mark all as read</button>}
                </div>

                {notifications.length ? (
                  notifications.map(n => (
                    <div key={n.id} className={`notification-item ${n.unread?"unread":""}`}>
                      <div className="notification-content">
                        <div className="notification-message">
                          <FaCalendarAlt className="notif-calendar-icon" />
                          <span className="notification-text">{n.text}</span>
                        </div>
                        <span className="notification-time">{formatTimeAgo(n.timestamp)}</span>
                      </div>
                      <button className="delete-notif-btn" onClick={e=>{e.stopPropagation();deleteNotification(n.id);}} title="Delete"><FaTrash/></button>
                      {n.unread && <span className="notification-badge">New</span>}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No new notifications</div>
                )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Filters */}
        <div className="content-wrapper">
          <div className="filter-barr">
            <div className="search-containerrr">
              <div className="search-bar-wrapper">
                <FaSearch className="search-icon" />
                <input type="text" placeholder="Search by Name or Number..." className="search-bar"
                  value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
              </div>
            </div>

            <div className="filter">
              <label>Status:</label>
              <select className="status-dropdown" value={statusFilter}
                onChange={e=>setStatusFilter(e.target.value)}>
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
              <select className="status-dropdown" value={monthFilter}
                onChange={e=>setMonthFilter(e.target.value)}>
                <option value="All">All Months</option>
                {months.map((m,i)=>(
                  <option key={m} value={String(i+1).padStart(2,"0")}>{m}</option>
                ))}
              </select>
            </div>

            <div className="filter">
              <label>Day:</label>
              <select className="status-dropdown" value={dayFilter}
                onChange={e=>setDayFilter(e.target.value)}>
                <option value="All">All Days</option>
                {Array.from({length:31},(_,i)=>(
                  <option key={i+1} value={String(i+1).padStart(2,"0")}>{i+1}</option>
                ))}
              </select>
            </div>
          </div>

          <p className="appointments-header">All Patient Appointment Requests</p>

          {/* Table */}
          <table className="appointments-tabless">
            <thead>
              <tr>
                <th>User ID</th><th>Patient ID</th><th>Last Name</th><th>First Name</th>
                <th>Services</th><th>Appointment Date</th><th>Slot</th><th>Status</th>
                <th>Action</th><th>More</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length ? filteredAppointments.map(a=>(
                <tr key={a.id}>
                  <td>{a.UserId}</td>
                  <td>{a.patientCode}</td>
                  <td>{a.lastName}</td>
                  <td>{a.firstName}</td>
                  <td>{a.services.join(", ")}</td>
                  <td>{a.date}</td>
                  <td>{a.slotTime}</td>
                  <td><span className={`status-text ${a.status.toLowerCase()}`}>{a.status}</span></td>
                  <td>
                    {a.status==="Pending" && (
                      <>
                        <button className="action-btn accept"
                          onClick={async ()=>{
                            if(!a.patientId) return alert("Missing patientId");
                            const snap = await getDoc(doc(db,"Patients",a.patientId));
                            if(!snap.exists()) return alert("Patient not found");
                            const pd = snap.data();
                            if(!pd.email) return alert("No email for patient");
                            setSelectedAppointment({...a,...pd});
                            setShowAcceptModal(true);
                          }}>Accept</button>

                        <button className="action-btn reject"
                          onClick={async ()=>{
                            if(!a.patientId) return alert("Missing patientId");
                            const snap = await getDoc(doc(db,"Patients",a.patientId));
                            if(!snap.exists()) return alert("Patient not found");
                            const pd = snap.data();
                            if(!pd.email) return alert("No email for patient");
                            setSelectedAppointment({...a,...pd});
                            setShowRejectModal(true);
                          }}>Reject</button>
                      </>
                    )}
                  </td>
                  <td>
                    <button className="view-more-btn"
                      onClick={async ()=>{
                        if(!a.patientId) return;
                        const snap = await getDoc(doc(db,"Patients",a.patientId));
                        if(snap.exists()){
                          setSelectedPatient({...a,...snap.data()});
                          setShowInfoModal(true);
                        }
                      }}>View More</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={10} className="no-records">No records found.</td></tr>
              )}
            </tbody>
          </table>

          {/* Modals */}
          {showInfoModal && selectedPatient && (
            <div className="modal-overlayss">
              <div className="modal-boxss">
                <h3>Patient Information</h3>
                <div className="modal-contentss">
                  <table className="info-table"><tbody>
                    <tr><th>User ID</th><td>{selectedPatient.UserId}</td></tr>
                    <tr><th>Patient ID</th><td>{selectedPatient.patientCode}</td></tr>
                    <tr><th>Control No.</th><td>{selectedPatient.controlNo}</td></tr>
                    <tr><th>Last Name</th><td>{selectedPatient.lastName}</td></tr>
                    <tr><th>First Name</th><td>{selectedPatient.firstName}</td></tr>
                    <tr><th>Middle Initial</th><td>{selectedPatient.middleInitial||"N/A"}</td></tr>
                    <tr><th>Birthdate</th><td>{selectedPatient.birthdate}</td></tr>
                    <tr><th>Age</th><td>{selectedPatient.age}</td></tr>
                    <tr><th>Gender</th><td>{selectedPatient.gender}</td></tr>
                    <tr><th>Citizenship</th><td>{selectedPatient.citizenship}</td></tr>
                    <tr className="section-header"><th colSpan={2}>Address</th></tr>
                    <tr><th>House No.</th><td>{selectedPatient.houseNo}</td></tr>
                    <tr><th>Street</th><td>{selectedPatient.street}</td></tr>
                    <tr><th>Barangay</th><td>{selectedPatient.barangay}</td></tr>
                    <tr><th>Municipality</th><td>{selectedPatient.municipality}</td></tr>
                    <tr><th>Province</th><td>{selectedPatient.province}</td></tr>
                    <tr><th>Email</th><td>{selectedPatient.email}</td></tr>
                    <tr><th>Contact</th><td>{selectedPatient.contact}</td></tr>
                    <tr><th>Department</th><td>{selectedPatient.purpose}</td></tr>
                    <tr><th>Services</th><td>{selectedPatient.services?.join(", ")}</td></tr>
                    <tr><th>Appointment Date</th><td>{selectedPatient.date}</td></tr>
                    <tr><th>Slot ID</th><td>{selectedPatient.slotID}</td></tr>
                    <tr><th>Slot</th><td>{selectedPatient.slotTime}</td></tr>
                    <tr><th>Status</th><td><span className={`status-text ${selectedPatient.status?.toLowerCase()}`}>{selectedPatient.status}</span></td></tr>
                  </tbody></table>
                </div>
                <div className="modal-buttonss">
                  <button className="modal-closes" onClick={()=>{setShowInfoModal(false);setSelectedPatient(null);}}>Close</button>
                </div>
              </div>
            </div>
          )}

          {showRejectModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h3>Reject Appointment</h3>
                <p>Please enter the reason for rejection:</p>
                <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Type reason here..." />
                <div className="modal-buttons">
                  <button className="modal-cancel" onClick={()=>{setShowRejectModal(false);setRejectReason("");setSelectedAppointment(null);}}>Cancel</button>
                  <button className="modal-confirm" onClick={async()=>{
                    if(selectedAppointment?.email){
                      await handleStatusUpdate(selectedAppointment.id,"Rejected",selectedAppointment,rejectReason);
                      alert(`Appointment rejected.\nReason: ${rejectReason}`);
                    }else alert("No email – cannot reject.");
                    setShowRejectModal(false);setRejectReason("");setSelectedAppointment(null);
                  }}>Confirm Reject</button>
                </div>
              </div>
            </div>
          )}

          {showAcceptModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h3>Accept Appointment</h3>
                <p>Are you sure you want to accept <strong>
                  {selectedAppointment ? `${selectedAppointment.lastName}, ${selectedAppointment.firstName}${selectedAppointment.middleInitial? " "+selectedAppointment.middleInitial+".":""}` : ""}
                </strong>?</p>
                <div className="modal-buttons">
                  <button className="modal-cancel" onClick={()=>{setShowAcceptModal(false);setSelectedAppointment(null);}}>Cancel</button>
                  <button className="modal-confirm" onClick={async()=>{
                    if(selectedAppointment?.email){
                      await handleStatusUpdate(selectedAppointment.id,"Approved",selectedAppointment);
                      alert(`Appointment for ${selectedAppointment.lastName}, ${selectedAppointment.firstName} accepted.`);
                    }else alert("No email – cannot accept.");
                    setShowAcceptModal(false);setSelectedAppointment(null);
                  }}>Confirm Accept</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Appointments_Clinical;