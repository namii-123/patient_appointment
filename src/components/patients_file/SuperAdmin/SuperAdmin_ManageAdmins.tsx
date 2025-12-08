
import React, { useState, useEffect, useCallback } from "react";
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
  FaUserPlus,
  FaUserTimes,
} from "react-icons/fa";
import "../../../assets/SuperAdmin_ManageAdmins.css";
import logo from "/logo.png";
import { getFirestore, collection, onSnapshot, updateDoc, doc, query, orderBy, writeBatch, deleteDoc } from "firebase/firestore";
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
  isActive?: boolean; 
};

const SuperAdmin_ManageAdmins: React.FC = () => {
  const navigate = useNavigate();
  const db = getFirestore();

  const [searchTerm, setSearchTerm] = useState<string>("");

  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, ] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [availableYears, setAvailableYears] = useState<number[]>(
    Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i)
  );
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");

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
          status: data.status || "Active",
          createdAt: data.createdAt
            ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt))
            : null,
          reason: data.reason || "",
          isActive: data.isActive !== undefined ? data.isActive : true, 
        } as Admin;
      });
      setAdmins(adminsList);
    });
    return () => unsubscribe();
  }, []);


  
useEffect(() => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = now.toLocaleString("default", { month: "long" }); 

  setSelectedYear(currentYear);
  setSelectedMonth(currentMonth);
}, []); 



  const filteredAdmins = admins.filter((admin) => {
  const matchesSearch =
    admin.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.adminId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus =
    !selectedStatus || 
    admin.status.toLowerCase() === selectedStatus.toLowerCase(); // case-insensitive

  const matchesDept =
    !selectedDept || admin.department.toLowerCase() === selectedDept.toLowerCase();


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
   
    if (selectedYear || selectedMonth || selectedDay) {
      matchesDate = false;
    }
  }

  return matchesSearch && matchesStatus && matchesDept && matchesDate;
});


const [currentPage, setCurrentPage] = useState<number>(1);
const [rowsPerPage, ] = useState<number>(5); 
  

const indexOfLastRecord = currentPage * rowsPerPage;
const indexOfFirstRecord = indexOfLastRecord - rowsPerPage;
const currentAdmins = rowsPerPage === -1 
  ? filteredAdmins 
  : filteredAdmins.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredAdmins.length / rowsPerPage);


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
        <div className="top-navbar-dental">
          <h5 className="navbar-title">Manage Admins</h5>
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
    <option value="Active">Active</option>        
    <option value="Rejected">Rejected</option>
    <option value="Not Active">Not Active</option>
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
  <option value="">All</option>
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