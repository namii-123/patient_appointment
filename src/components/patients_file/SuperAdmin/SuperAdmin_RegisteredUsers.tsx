import React, { useState, useEffect, type ChangeEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaUsers,
  FaSignOutAlt,
  FaCalendarAlt,
  FaChartBar,
  FaSearch,
  FaEnvelope,
  FaUserTimes,
  FaUserPlus,
} from "react-icons/fa";
import { X } from "lucide-react";
import "../../../assets/SuperAdmin_RegisteredUsers.css";
import logo from "/logo.png";
import { db, auth } from "../firebase";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from "firebase/firestore";
import { signOut } from "firebase/auth";
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

  
  const [monthFilter, setMonthFilter] = useState<string>("");
  
  const [yearFilter, setYearFilter] = useState<string>("");

  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage] = useState<number>(10); 

 
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalMessage, setCustomModalMessage] = useState("");
  const [customModalType, setCustomModalType] = useState<"success" | "error" | "confirm">("success");
  const [onCustomModalConfirm, setOnCustomModalConfirm] = useState<() => void>(() => {});

 

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
    const now = new Date();
    setYearFilter(now.getFullYear().toString());
    setMonthFilter(now.toLocaleString("en-US", { month: "long" }));
  }, []);

 
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 26 }, (_, i) => currentYear - 5 + i);


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
          <h5 className="navbar-title">Registered Users</h5>
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