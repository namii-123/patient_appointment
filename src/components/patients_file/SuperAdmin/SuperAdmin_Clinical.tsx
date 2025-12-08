import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaArrowLeft, FaEnvelope, FaUserPlus, FaUserTimes } from "react-icons/fa";
import "../../../assets/SuperAdmin_Clinical.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { collection, query, onSnapshot, where, doc, getDoc, orderBy, writeBatch, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { X } from "lucide-react";
import { Toaster } from 'react-hot-toast';
import { toast } from "react-toastify";

interface Notification {
  id?: string;
  text: string;
  unread: boolean;
  timestamp: Date | null; 
}


interface AdminNotification {
  id: string;
  type: "new_appointment" | "appointment_cancelled" | "info" | "contact_message";
  message: string;
  patientName: string;
  date: string;
  slotTime: string;
  timestamp: any;
  read: boolean;
  purpose?: string;
}



// Types
interface Appointment {
  id: string;
  UserId: string;
  patientId: string;
  patientCode: string;
  lastname: string;
  firstname: string;
  middleInitial?: string;
  age: number;
  gender: string;
  services: string[];
  appointmentDate: string;
  slot: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Canceled";
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
  purpose?: string;
  slotID?: string;
}

const SuperAdmin_Clinical: React.FC = () => {
  const navigate = useNavigate();

  const [filter, setFilter] = useState<string>("all");

  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Appointment | null>(null);

  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
         const [unreadCount, setUnreadCount] = useState(0);
         const [showNotifications, setShowNotifications] = useState(false);
         
         
         
         const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2584.mp3"; 
         
         
         const [audioContextUnlocked, setAudioContextUnlocked] = useState(false);
         
         
         const unlockAudioContext = () => {
           if (audioContextUnlocked) return;
         
         
           const audio = new Audio();
           audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="; 
           audio.volume = 0;
           audio.play().then(() => {
             console.log("Audio context unlocked!");
             setAudioContextUnlocked(true);
           }).catch(() => {});
         };
         
         const playNotificationSound = useCallback(() => {
           if (!audioContextUnlocked) {
             console.warn("Audio not yet unlocked. Click the bell first!");
             return;
           }
         
           const audio = new Audio(NOTIFICATION_SOUND_URL);
           audio.volume = 0.7;
           audio.play().catch(err => {
             console.warn("Failed to play sound:", err);
           });
         }, [audioContextUnlocked]);
         
         
         
         
        useEffect(() => {
       
       const notifQuery = query(
         collection(db, "admin_notifications"),
         orderBy("timestamp", "desc") 
       );
     
       const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
         const notificationsToProcess: AdminNotification[] = [];
     
         snapshot.docChanges().forEach((change) => {
           const data = change.doc.data();
     
           if (change.type === "added" || change.type === "modified") {
             const notif: AdminNotification = {
               id: change.doc.id,
               type: data.type || "info",
               message: data.message || "",
               patientName: data.patientName || "Unknown Patient",
               date: data.date || "",
               slotTime: data.slotTime || "",
               timestamp: data.timestamp,
               read: data.read === true,
               purpose: data.purpose || "general",
             };
             notificationsToProcess.push(notif);
     
           
             if (change.type === "added" && !data.read) {
               playNotificationSound();
             }
           }
     
           if (change.type === "removed") {
             setAdminNotifications(prev => prev.filter(n => n.id !== change.doc.id));
           }
         });
     
         if (notificationsToProcess.length > 0) {
           setAdminNotifications(prev => {
             const map = new Map<string, AdminNotification>();
             prev.forEach(n => map.set(n.id, n));
             notificationsToProcess.forEach(n => map.set(n.id, n));
             return Array.from(map.values()).sort((a, b) =>
               (b.timestamp?.toDate?.()?.getTime() || 0) - (a.timestamp?.toDate?.()?.getTime() || 0)
             );
           });
     
           setUnreadCount(snapshot.docs.filter(doc => !doc.data().read).length);
         }
       }, (error) => {
         console.error("Notification listener error:", error);
       });
     
       return () => unsubscribe();
     }, [playNotificationSound]);
           
         
         
         
           const [, setNotifications] = useState<Notification[]>([
           { text: "3 new appointment requests", unread: true, timestamp: new Date() },
           { text: "Reminder: Meeting at 2PM", unread: true, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }, 
           { text: "System update completed", unread: false, timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) }, 
         ]);
         
           
         
         
          const formatTimeAgo = (timestamp: any): string => {
           if (!timestamp) return "Just now";
         
           let date: Date;
           if (timestamp.toDate) {
             date = timestamp.toDate(); // Firestore Timestamp
           } else if (timestamp.seconds) {
             date = new Date(timestamp.seconds * 1000);
           } else {
             date = new Date(timestamp);
           }
         
           const now = new Date();
           const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
         
           if (diffInSeconds < 60) return "Just now";
           if (diffInSeconds < 120) return "1 minute ago";
           if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
           if (diffInSeconds < 7200) return "1 hour ago";
           if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
           if (diffInSeconds < 172800) return "Yesterday";
           if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
           
           // Older than a week? Show date
           return date.toLocaleDateString("en-US", {
             month: "short",
             day: "numeric",
             year: "numeric"
           });
         };
         
         
         useEffect(() => {
           const unlockOnAnyClick = () => {
             unlockAudioContext();
             document.removeEventListener("click", unlockOnAnyClick);
             document.removeEventListener("touchstart", unlockOnAnyClick);
           };
         
           document.addEventListener("click", unlockOnAnyClick);
           document.addEventListener("touchstart", unlockOnAnyClick);
         
           return () => {
             document.removeEventListener("click", unlockOnAnyClick);
             document.removeEventListener("touchstart", unlockOnAnyClick);
           };
         }, []);
         
         useEffect(() => {
           const interval = setInterval(() => {
             setNotifications(prev => [...prev]); 
           }, 60000);
           return () => clearInterval(interval);
         }, []);
  


  useEffect(() => {
    setShowModal(false);
    setSelectedPatientRecord(null);
  }, []);

  
  useEffect(() => {
    console.log("showModal:", showModal, "selectedPatientRecord:", selectedPatientRecord);
  }, [showModal, selectedPatientRecord]);


 
 
  useEffect(() => {
    setLoading(true);
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "Clinical Laboratory")
    );

    const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
      const loaded: Appointment[] = [];

      for (const t of transSnap.docs) {
        const tData = t.data();

        let patientData: any = {
          UserId: "",
          lastname: "Unknown",
          firstname: "Unknown",
          middleInitial: "",
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

        let userId = "";
        if (tData.uid) {
          const userRef = doc(db, "Users", tData.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userId = userSnap.data().UserId || "";
          }
        }

        if (tData.patientId) {
          const pRef = doc(db, "Patients", tData.patientId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            patientData = pSnap.data();
          } else {
            console.warn(`No patient document found for patientId: ${tData.patientId}`);
          }
        } else {
          console.warn(`No patientId in transaction: ${t.id}`);
        }

        loaded.push({
          id: t.id,
          UserId: userId,
          patientId: tData.patientId || "",
          patientCode: patientData.patientCode || "",
          lastname: patientData.lastName || "Unknown",
          firstname: patientData.firstName || "Unknown",
          middleInitial: patientData.middleInitial || "",
          age: patientData.age || 0,
          gender: patientData.gender || "",
          services: Array.isArray(tData.services) ? tData.services : [],
          appointmentDate: tData.date || "",
          slot: tData.slotTime || "",
          status: tData.status || "Pending",
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
          purpose: tData.purpose || "",
          slotID: tData.slotID || "",
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

 
  const pendingCount = appointments.filter((a) => a.status.toLowerCase() === "pending").length;
  const approvedCount = appointments.filter((a) => a.status.toLowerCase() === "approved").length;
  const completedCount = appointments.filter((a) => a.status.toLowerCase() === "completed").length;
  const canceledCount = appointments.filter((a) => a.status.toLowerCase() === "cancelled").length;


const [monthFilter, setMonthFilter] = useState<string>("");
const [yearFilter, setYearFilter] = useState<string>("");


useEffect(() => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonthName = now.toLocaleString("en-US", { month: "long" }); // "November"

  setYearFilter(currentYear);
  setMonthFilter(currentMonthName);
}, []); // run once on mount


const currentYear = new Date().getFullYear();

const [yearOptions, ] = useState<number[]>(() => {
  const startYear = currentYear - 5;  
  const endYear = currentYear + 20;    
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
});


const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  setYearFilter(e.target.value);
};
 
 
const filteredAppointments = appointments
  .filter((a) => {
  
    if (filter !== "all" && a.status.toLowerCase() !== filter) return false;

   
    if (a.status.toLowerCase() === "rejected") return false;

    
    if (!a.appointmentDate) return true;

    const [yearStr, monthStr] = a.appointmentDate.split("-");
    const appointmentYear = yearStr;
    const appointmentMonthNum = parseInt(monthStr);

    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const appointmentMonthName = monthNames[appointmentMonthNum];

    if (yearFilter && yearFilter !== "" && appointmentYear !== yearFilter) {
      return false;
    }
    if (monthFilter && monthFilter !== "" && appointmentMonthName !== monthFilter) {
      return false;
    }

    return true;
  })

  .sort((a, b) => {
    if (!a.appointmentDate || !b.appointmentDate) return 0;
 
    return b.appointmentDate.localeCompare(a.appointmentDate);
  });


  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleViewMore = (record: Appointment) => {
    console.log("handleViewMore called with record:", record);
    setSelectedPatientRecord(record);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPatientRecord(null);
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
      
  


      const [currentPage, setCurrentPage] = useState<number>(1);
const [rowsPerPage] = useState<number>(5); 


// PAGINATION LOGIC
const indexOfLastRecord = currentPage * rowsPerPage;
const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
const currentAppointments = filteredAppointments.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredAppointments.length / rowsPerPage);

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

useEffect(() => {
  setCurrentPage(1);
}, [filter, monthFilter, yearFilter]);

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
             <div className="nav-items">
                          <FaEnvelope className="nav-icon" />
                          <span onClick={() => handleNavigation("/superadmin_messages")}>
                            Messages
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

      {/* Main Content */}
      <main className="main-content-superadmin">
         <Toaster
                                                 position="top-center"  
                                                 reverseOrder={false}
                                                 gutter={12}
                                                 containerStyle={{
                                                   top: "35%",                   
                                                   left: "50%",                   
                                                   transform: "translate(-50%, -50%)",  
                                                   zIndex: 9999,
                                                   pointerEvents: "none",         
                                                 }}
                                                 toastOptions={{
                                                  
                                                   style: {
                                                     background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", 
                                                     color: "#fff",
                                                     fontSize: "18px",
                                                     fontWeight: "600",
                                                     padding: "18px 28px",
                                                     borderRadius: "16px",
                                                     boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                                                     border: "2px solid rgba(255, 255, 255, 0.2)",
                                                     pointerEvents: "auto",      
                                                     maxWidth: "420px",
                                                     textAlign: "center",
                                                     backdropFilter: "blur(10px)",
                                                   },
                                                   duration: 5000,
                                                   success: {
                                                     icon: "Success",
                                                     style: {
                                                       background: "linear-gradient(135deg, #16a34a, #22c55e)",
                                                       border: "2px solid #86efac",
                                                     },
                                                   },
                                                   error: {
                                                     icon: "Failed",
                                                     style: {
                                                       background: "linear-gradient(135deg, #dc2626, #ef4444)",
                                                       border: "2px solid #fca5a5",
                                                     },
                                                   },
                                                 }}
                                               /> 
        <div className="top-navbar-superadmin">
          <h5 className="navbar-title">Clinical Appointments</h5>
          <div className="notification-wrapper">
                                         <FaBell
                                           className="notification-bell"
                                          onClick={() => {
                                           unlockAudioContext();          
                                           setShowNotifications(prev => !prev);
                                         }}
                                           style={{ position: "relative" }}
                                         />
                                         {unreadCount > 0 && (
                                           <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>
                                         )}
                                       
                                         {showNotifications && (
                                           <div className="notification-dropdown">
                                             <div className="notification-header">
                                               <span className="notification-title">Admin Notifications</span>
                                               <div className="notification-actions">
                                                 
                                                 {unreadCount > 0 && (
                                                    <button 
                                         className="mark-read-btn" 
                                         onClick={async () => {
                                           const unreadDocs = adminNotifications.filter(n => !n.read);
                                           if (unreadDocs.length === 0) return;
                                       
                                           const batch = writeBatch(db);
                                           unreadDocs.forEach(notif => {
                                             const ref = doc(db, "admin_notifications", notif.id);
                                             batch.update(ref, { read: true });
                                           });
                                       
                                           await batch.commit();
                                       
                                          
                                           setAdminNotifications(prev =>
                                             prev.map(n => ({ ...n, read: true }))
                                           );
                                           setUnreadCount(0);
                                       
                                           toast.success("All notifications marked as read");
                                         }}
                                       >
                                         Mark all as read
                                       </button>
                                                          )}
                                                          <button 
                                         className="clear-all-btn"
                                         onClick={() => openCustomModal("Clear all notifications?", "confirm", async () => {
                                           const batch = writeBatch(db);
                                           adminNotifications.forEach(n => {
                                             batch.delete(doc(db, "admin_notifications", n.id));
                                           });
                                           await batch.commit();
                                       
                                          
                                           setAdminNotifications([]);
                                           setUnreadCount(0);
                                           closeCustomModal();
                                           toast.success("All notifications cleared");
                                         })}
                                       >
                                         Clear all
                                       </button>
                                               </div>
                                             </div>
                                       
                                           <div className="notification-list">
                                         {adminNotifications.length > 0 ? (
                                           adminNotifications.map((notif) => (
                                             <div
                                               key={notif.id}
                                               className={`notification-item ${!notif.read ? "unread" : ""}`}
                                               style={{ cursor: "pointer" }}
                                          onClick={async (e) => {
                               if ((e.target as HTMLElement).closest(".notification-delete-btn")) return;
                             
                             
                               if (!notif.read) {
                                 await updateDoc(doc(db, "admin_notifications", notif.id), { read: true });
                                 setAdminNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                 setUnreadCount(prev => Math.max(0, prev - 1));
                               }
                             
                             
                               if (notif.purpose === "admin_registration") {
                                 navigate("/superadmin_userrequests");
                                 setShowNotifications(false);
                                 return;
                               }
                             
                             
                               if (notif.type === "new_appointment" || notif.type === "appointment_cancelled") {
                                 const purpose = notif.purpose?.trim();
                                 const departmentRoutes: Record<string, string> = {
                                   "Clinical Laboratory": "/superadmin_clinical",
                                   "Dental": "/superadmin_dental",
                                   "Radiographic": "/superadmin_radiology",
                                   "Medical": "/superadmin_medical",
                                   "DDE": "/superadmin_dde",
                                 };
                             
                                 if (purpose && departmentRoutes[purpose]) {
                                   navigate(departmentRoutes[purpose]);
                                 } else {
                                   toast.info("Appointment from unknown department");
                                 }
                                 setShowNotifications(false);
                                 return;
                               }
                             
                               
                               if (notif.type === "contact_message") {
                                 navigate("/superadmin_messages");
                               } else {
                                
                                 navigate("/superadmin_userrequests"); 
                               }
                             
                               setShowNotifications(false);
                             }}
                                             >
                                               <div className="notification-main">
                                              <div className="notification-message">
                                        
                                       
                             
                             
                                       
                             <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                             
                               {notif.purpose === "admin_registration" && (
                                 <FaUserPlus style={{ color: "#8b5cf6", fontSize: "40px" }} />
                               )}
                               
                                   {notif.type === "contact_message" && <FaEnvelope style={{ color: "#f59e0b", fontSize: "40px" }} />}
                                   {notif.type === "new_appointment" && <FaCalendarAlt style={{ color: "#3b82f6", fontSize: "40px" }} />}
                                   {notif.type === "appointment_cancelled" && <FaUserTimes style={{ color: "#ef4444", fontSize: "70px" }} />}
                                   {(notif.type === "info" && notif.purpose !== "admin_registration") && (
                                 <FaBell style={{ color: "#6366f1", fontSize: "40px" }} />
                               )}
                                    <p className="notification-text">
                                           <strong>{notif.patientName}</strong>: {notif.message}
                                         </p>
                                 </div>
                                       
                                         <div style={{ 
                                           fontSize: "14px", 
                                           fontWeight: "600", 
                                           color: "#333",
                                           marginTop: "6px"
                                         }}>
                                           {notif.date} at {notif.slotTime}
                                         </div>
                                       
                             
                             
                             
                             
                             
                              
                             {notif.purpose === "admin_registration" && (
                               <div style={{ marginTop: "8px" }}>
                                 <span style={{
                                   padding: "4px 10px",
                                   borderRadius: "12px",
                                   fontSize: "11px",
                                   color: "white",
                                   backgroundColor: "#e73d3dff",
                                   fontWeight: "600"
                                 }}>
                                   Pending Approval
                                 </span>
                               </div>
                             )}
                             
                             
                             {notif.purpose && 
                               notif.purpose !== "general" &&
                               notif.purpose !== "admin_registration" && (
                                 <div style={{ 
                                 marginTop: "8px", 
                                 display: "flex", 
                                 alignItems: "center", 
                                 gap: "8px",
                                 fontSize: "13px",
                                 fontWeight: "600"
                               }}>
                                 <span style={{
                                   padding: "4px 10px",
                                   borderRadius: "12px",
                                   fontSize: "11px",
                                   color: "white",
                                   backgroundColor: 
                                     notif.purpose === "Clinical Laboratory" ? "#10b981" :  
                                     notif.purpose === "Dental" ? "#3b82f6" :            
                                     notif.purpose === "Radiographic" ? "#f59e0b" :      
                                     notif.purpose === "Medical" ? "#8b5cf6" :          
                                     notif.purpose === "DDE" ? "#ec4899" : 
                                    
                                     "#6b7280"
                                 }}>
                                   {notif.purpose === "Clinical Laboratory" ? "Clinical" :
                                    notif.purpose === "Radiographic" ? "Radiology" :
                                    notif.purpose}
                                 </span>
                                 {notif.type === "new_appointment" && (
                                   <span style={{ color: "#10b981", fontSize: "11px" }}>New Appointment</span>
                                 )}
                                 {notif.type === "appointment_cancelled" && (
                                   <span style={{ color: "#ef4444", fontSize: "11px" }}>Cancelled</span>
                                 )}
                                
                               </div>
                             )}
                             
                             
                             
                                       
                                       
                                         <div style={{ 
                                           fontSize: "12px", 
                                           color: "#888", 
                                           marginTop: "4px",
                                           display: "flex",
                                           alignItems: "center",
                                           gap: "6px"
                                         }}>
                                           <span style={{ 
                                             color: "#10b981",
                                             background: "rgba(16, 185, 129, 0.12)",
                                             padding: "3px 9px",
                                             borderRadius: "8px",
                                             fontWeight: "600",
                                             fontSize: "11px"
                                           }}>
                                             {formatTimeAgo(notif.timestamp)}
                                           </span>
                                           {notif.timestamp && formatTimeAgo(notif.timestamp) !== "Just now" && (
                                             <span>• {new Date(notif.timestamp.toDate?.() || notif.timestamp).toLocaleTimeString([], { 
                                               hour: "2-digit", 
                                               minute: "2-digit" 
                                             })}</span>
                                           )}
                                         </div>
                                       </div>
                                       
                                                 {/* X BUTTON - DELETE ONE NOTIFICATION ONLY */}
                                                 <button
                                                   onClick={async (e) => {
                                                     e.stopPropagation(); // CRITICAL
                                                     try {
                                                       await deleteDoc(doc(db, "admin_notifications", notif.id));
                                                       setAdminNotifications(prev => prev.filter(n => n.id !== notif.id));
                                                       if (!notif.read) {
                                                         setUnreadCount(prev => Math.max(0, prev - 1));
                                                       }
                                                       toast.success("Notification deleted");
                                                     } catch (err) {
                                                       console.error("Delete failed:", err);
                                                       toast.error("Failed to delete");
                                                     }
                                                   }}
                                                   className="notification-delete-btn"
                                                   title="Delete this notification"
                                                 >
                                                   <X size={15} />
                                                 </button>
                                       
                                                 {!notif.read && <span className="notification-badge">NEW</span>}
                                               </div>
                                             </div>
                                           ))
                                         ) : (
                                           <div className="notification-empty">
                                             <p>No notifications</p>
                                           </div>
                                         )}
                                       </div>
                                           </div>
                                         )}
                                       </div>
                                                 
                                               </div>
                             
                    

     

        {/* Date Filter */}
        <div className="filters-container-clinical">



        
             {/* Back Button */}
              <button className="back-btn" onClick={() => handleNavigation("/superadmin_dashboard")}>
          <FaArrowLeft /> Back
        </button>

<div className="center-filters">
  <div className="filter-clinical">
  <label>Year:</label>
  <select value={yearFilter} onChange={handleYearChange}>
    <option value=""> Years</option>
    {yearOptions.map((year) => (
      <option key={year} value={year.toString()}>
        {year}
      </option>
    ))}
  </select>
</div>




          <div className="filter-clinical">
  <label>Month:</label>
  <select
    value={monthFilter}
    onChange={(e) => setMonthFilter(e.target.value)}
  >
    <option value="">All</option>
    {[
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ].map((m) => (
      <option key={m} value={m}>{m}</option>
    ))}
  </select>
</div>
</div>
  </div>
        

        {/* Summary Cards */}
        <div className="summary-cardss">
          
<div
  className={`summary-cardsss all ${filter === "all" ? "active" : ""}`}
  onClick={() => setFilter("all")}
>
  <h5>
    {pendingCount + approvedCount + completedCount + canceledCount}
  </h5>
  <p>All</p>
</div>
          <div
            className={`summary-cardsss pending ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            <h5>{pendingCount}</h5>
            <p>Pending</p>
          </div>
          <div
            className={`summary-cardsss approved ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <h5>{approvedCount}</h5>
            <p>Approved</p>
          </div>
          <div
            className={`summary-cardsss completed ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            <h5>{completedCount}</h5>
            <p>Completed</p>
          </div>
         

          <div
            className={`summary-cardsss canceled ${filter === "cancelled" ? "active" : ""}`}
            onClick={() => setFilter("cancelled")}
          >
            <h5>{canceledCount}</h5>
            <p>Canceled</p>
          </div>
        </div>

        {/* Table for appointments */}
        <div className="appointments-sectionssss">
          <h3 className="section-titlessss">
            {filter === "all"
              ? "All"
              : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
            Appointments
          </h3>
           <div style={{ position: "relative", minHeight: "400px" }}>
          {loading && (
    <div style={{
      position: "absolute",
      inset: 0,
      background: "rgba(255, 255, 255, 0.9)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      borderRadius: "12px",
      backdropFilter: "blur(4px)"
    }}>
      <div style={{
        width: "60px",
        height: "60px",
        border: "6px solid #e0e0e0",
        borderTop: "6px solid #2563eb",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "20px"
      }}></div>
      <p style={{
        fontSize: "18px",
        fontWeight: "600",
        color: "#1e40af",
        margin: 0
      }}>
        Loading appointments...
      </p>
    </div>
  )}
          <table className="appointments-tablessss">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Patient ID</th>
                <th>Lastname</th>
                <th>Firstname</th>
                <th>Middle Initial</th>
               
               
                <th>Services</th>
                <th>Appointment Date</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentAppointments.length > 0 ? (
               currentAppointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.UserId}</td>
                    <td>{a.patientCode}</td>
                    <td>{a.lastname}</td>
                    <td>{a.firstname}</td>
                    <td>{a.middleInitial || "N/A"}</td>
                   
                  
                    <td>{a.services.join(", ")}</td>
                    <td>{a.appointmentDate}</td>
                    <td>{a.slot}</td>
                    <td>
                      <span className={`status-badge ${a.status.toLowerCase()}`}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-button view-mores"
                        onClick={() => handleViewMore(a)}
                      >
                        View More
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "12px" }}>
                    {loading ? "Loading..." : "No appointments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>



{/* PAGINATION */}
<div className="pagination-wrapper" style={{ marginTop: "30px", marginBottom: "20px" }}>
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
        disabled={page === "..."}
        className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
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


        {/* View More Modal */}
        {showModal && selectedPatientRecord !== null && (
          <div className="modal-overlayd">
            <div className="modal-contentd">
              <div className="modal-inner">
                <div className="modal-headerd">
                  <h3>Patient Information</h3>
                  <button className="close-btnd" onClick={closeModal}>×</button>
                </div>
                <div className="modal-bodyd">
                  <table className="patient-info-tabled">
                    <tbody>
                      <tr><th>User ID</th><td>{selectedPatientRecord.UserId}</td></tr>
                      <tr><th>Patient ID</th><td>{selectedPatientRecord.patientCode}</td></tr>
                      <tr><th>Control No.</th><td>{selectedPatientRecord.controlNo || "N/A"}</td></tr>
                      <tr><th>Last Name</th><td>{selectedPatientRecord.lastname}</td></tr>
                      <tr><th>First Name</th><td>{selectedPatientRecord.firstname}</td></tr>
                      <tr><th>Middle Initial</th><td>{selectedPatientRecord.middleInitial || "N/A"}</td></tr>
                      <tr><th>Birthdate</th><td>{selectedPatientRecord.birthdate || "N/A"}</td></tr>
                      <tr><th>Age</th><td>{selectedPatientRecord.age}</td></tr>
                      <tr><th>Gender</th><td>{selectedPatientRecord.gender}</td></tr>
                      <tr><th>Citizenship</th><td>{selectedPatientRecord.citizenship || "N/A"}</td></tr>
                      <tr className="section-headerd">
                        <th colSpan={2}>Address</th>
                      </tr>
                      <tr><th>House No.</th><td>{selectedPatientRecord.houseNo || "N/A"}</td></tr>
                      <tr><th>Street</th><td>{selectedPatientRecord.street || "N/A"}</td></tr>
                      <tr><th>Barangay</th><td>{selectedPatientRecord.barangay || "N/A"}</td></tr>
                      <tr><th>Municipality</th><td>{selectedPatientRecord.municipality || "N/A"}</td></tr>
                      <tr><th>Province</th><td>{selectedPatientRecord.province || "N/A"}</td></tr>
                      <tr><th>Email</th><td>{selectedPatientRecord.email || "N/A"}</td></tr>
                      <tr><th>Contact</th><td>{selectedPatientRecord.contact || "N/A"}</td></tr>
                      <tr><th>Department</th><td>{selectedPatientRecord.purpose || "N/A"}</td></tr>
                      <tr><th>Services</th><td>{selectedPatientRecord.services.join(", ") || "N/A"}</td></tr>
                      <tr><th>Request Date</th><td>{selectedPatientRecord.appointmentDate || "N/A"}</td></tr>
                      <tr><th>Slot ID</th><td>{selectedPatientRecord.slotID || "N/A"}</td></tr>
                      <tr><th>Slot</th><td>{selectedPatientRecord.slot || "N/A"}</td></tr>
                      <tr><th>Status</th><td>{selectedPatientRecord.status}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}



        
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

export default SuperAdmin_Clinical;