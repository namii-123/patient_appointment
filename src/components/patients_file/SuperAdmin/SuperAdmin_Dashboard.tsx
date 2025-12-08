import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUserTimes,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaTooth,
  FaStethoscope,
  FaXRay,
  FaClinicMedical,
  FaUserMd,
  FaEnvelope,
  FaUserPlus,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "../../../assets/SuperAdmin_Dashboard.css";
import logo from "/logo.png";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { db } from "../firebase";
import { collection, query, onSnapshot, where, writeBatch, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { X } from "lucide-react";
import { Toaster } from 'react-hot-toast';

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





interface DepartmentQuery {
  collection: string;
  department?: string;
  patientPurpose?: string;
  status?: string;
}

const departmentQueries: Record<string, DepartmentQuery> = {
  Clinical: {
    collection: "ManageAdmins",
    department: "Clinical Laboratory",
    patientPurpose: "Clinical Laboratory",
  },
  Dental: {
    collection: "ManageAdmins",
    department: "Dental",
    patientPurpose: "Dental",
  },
  Radiology: {
    collection: "ManageAdmins",
    department: "Radiographic",
    patientPurpose: "Radiographic",
  },
  Medical: {
    collection: "ManageAdmins",
    department: "Medical",
    patientPurpose: "Medical",
  },
  DDE: {
    collection: "ManageAdmins",
    department: "DDE",
    patientPurpose: "DDE",
  },
  Rejected: {
    collection: "ManageAdmins",
    status: "rejected",
  },
};

const SuperAdmin_Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [adminCounts, setAdminCounts] = useState({
    Clinical: 0,
    Dental: 0,
    Radiology: 0,
    Medical: 0,
    DDE: 0,
    Rejected: 0,
  });
  const [patientCounts, setPatientCounts] = useState({
    Clinical: 0,
    Dental: 0,
    Radiology: 0,
    Medical: 0,
    DDE: 0,
  });
  const [totalRegisteredUsers, setTotalRegisteredUsers] = useState(0);



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

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA46BE", "#FF4560"];
  const REGISTERED_USER_COLOR = "#FF4560";

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, percent } = payload[0];
      return (
        <div
          style={{
            background: "#fff",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        >
          <p>{`${name}: ${value} (${percent ? (percent * 100).toFixed(0) : 0}%)`}</p>
        </div>
      );
    }
    return null;
  };

 

  // Fetch total registered users
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Users"),
      (snapshot) => {
        setTotalRegisteredUsers(snapshot.docs.length);
      },
      (error) => {
        console.error("Error fetching total registered users:", error);
        toast.error("Failed to fetch registered users: ${error.message}", {
          position: "top-center",
        });
      }
    );

    return () => unsubscribe();
  }, []);

 
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    Object.entries(departmentQueries).forEach(([dept, queryConfig]) => {
      const { collection: coll, department, status } = queryConfig;
      const adminQuery = status
        ? query(collection(db, coll), where("status", "==", status))
        : query(collection(db, coll), where("department", "==", department));
      const unsubscribe = onSnapshot(
        adminQuery,
        (snap) => {
          const count = snap.docs.length;
          console.log(
            `[DEBUG] ${dept} count: ${count}, Query: collection=${coll}, status=${status || "N/A"}, department=${
              department || "N/A"
            }`
          );
          if (dept === "Rejected") {
            console.log(
              `[DEBUG] Rejected admins documents:`,
              snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
            );
            if (count === 0) {
              console.log("[DEBUG] No rejected admins found in", coll);
            }
          }
          setAdminCounts((prev) => ({ ...prev, [dept]: count }));
        },
        (error) => {
          console.error(`Error fetching ${dept} admins:`, error);
          toast.error(`Failed to fetch ${dept} admins: ${error.message}`, {
            position: "top-center",
          });
        }
      );
      unsubscribers.push(unsubscribe);
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

 

useEffect(() => {
  const unsubscribers: (() => void)[] = [];

  Object.entries(departmentQueries).forEach(([dept, queryConfig]) => {
    const { patientPurpose } = queryConfig;
    if (!patientPurpose) return;

    let transQuery;

    if (dept === "DDE") {
    
      transQuery = query(
        collection(db, "Transactions"),
        where("purpose", "==", patientPurpose)
      );
    } else {
   
      transQuery = query(
        collection(db, "Transactions"),
        where("purpose", "==", patientPurpose),
        where("status", "in", ["Pending", "Approved", "Completed", "Cancelled"])
      );
    }

    const unsubscribe = onSnapshot(
      transQuery,
      (snap) => {
        const patientIds = new Set<string>();
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.patientId) patientIds.add(data.patientId);
        });
        const count = patientIds.size;

        setPatientCounts((prev) => ({ ...prev, [dept]: count }));
      },
      (error) => {
        console.error(`Error fetching ${dept} patients:`, error);
      }
    );
    unsubscribers.push(unsubscribe);
  });

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}, []);

  const patientUserData = [
    { name: "Clinical Patients", value: patientCounts.Clinical },
    { name: "Dental Patients", value: patientCounts.Dental },
    { name: "Radiology Patients", value: patientCounts.Radiology },
    { name: "Medical Patients", value: patientCounts.Medical },
    { name: "DDE Patients", value: patientCounts.DDE },
    { name: "Registered Users", value: totalRegisteredUsers },
  ];

  const adminDeptData = [
    { name: "Clinical Admins", value: adminCounts.Clinical },
    { name: "Dental Admins", value: adminCounts.Dental },
    { name: "Radiology Admins", value: adminCounts.Radiology },
    { name: "Medical Admins", value: adminCounts.Medical },
    { name: "DDE Admins", value: adminCounts.DDE },
    { name: "Rejected Admins", value: adminCounts.Rejected },
  ];



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
      {/* Sidebar */}
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
          <div className="nav-linkss">
            <div className="nav-items active">
              <FaTachometerAlt className="nav-icon" /> Dashboard
            </div>
            <div className="nav-items">
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
            <div className="nav-items">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-items">
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

        <div className="top-navbar-superadmins">
          <h5 className="navbar-title">Dashboard</h5>
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

        {/* Summary Cards */}
        <div className="summary-cards-content-wrapper">
          <div className="summary-cards-container">
            <div className="summary-cards-row">
              <div className="summary-cards-row single">
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_clinical")}
                >
                  <FaClinicMedical className="card-icon" />
                  <h5>{patientCounts.Clinical}</h5>
                  <p>Total Clinical Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_dental")}
                >
                  <FaTooth className="card-icon" />
                  <h5>{patientCounts.Dental}</h5>
                  <p>Total Dental Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_radiology")}
                >
                  <FaXRay className="card-icon" />
                  <h5>{patientCounts.Radiology}</h5>
                  <p>Total Radiology Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_medical")}
                >
                  <FaUserMd className="card-icon" />
                  <h5>{patientCounts.Medical}</h5>
                  <p>Total Medical Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_dde")}
                >
                  <FaStethoscope className="card-icon" />
                  <h5>{patientCounts.DDE}</h5>
                  <p>Total DDE Patients</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_registeredusers")}
                >
                  <FaUsers className="card-icon" />
                  <h5>{totalRegisteredUsers}</h5>
                  <p>Total Registered Users</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_clinicaladmin")}
                >
                  <FaClinicMedical className="card-icon" />
                  <h5>{adminCounts.Clinical}</h5>
                  <p>Clinical Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_dentaladmin")}
                >
                  <FaTooth className="card-icon" />
                  <h5>{adminCounts.Dental}</h5>
                  <p>Dental Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_radiologyadmin")}
                >
                  <FaXRay className="card-icon" />
                  <h5>{adminCounts.Radiology}</h5>
                  <p>Radiology Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_medicaladmin")}
                >
                  <FaUserMd className="card-icon" />
                  <h5>{adminCounts.Medical}</h5>
                  <p>Medical Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_ddeadmin")}
                >
                  <FaStethoscope className="card-icon" />
                  <h5>{adminCounts.DDE}</h5>
                  <p>DDE Admins</p>
                </div>
                <div
                  className="card"
                  onClick={() => handleNavigation("/superadmin_rejectedadmins")}
                >
                  <FaUserTimes className="card-icon" />
                  <h5>{adminCounts.Rejected}</h5>
                  <p>Rejected Admins</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="chart-activity-containers">
          <div className="chart-row">
            <div className="chart-box">
              <h5 className="chart-titles">Patients per Department</h5>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart width={400} height={400}>
                  <Pie
                    data={patientUserData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ percent }) => `${((percent as number) * 100).toFixed(0)}%`}
                  >
                    {patientUserData.map((entry, index) => {
                      const fillColor =
                        entry.name === "Registered Users"
                          ? REGISTERED_USER_COLOR
                          : COLORS[index % COLORS.length];
                      return <Cell key={`cell-${index}`} fill={fillColor} />;
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-box">
              <h5 className="chart-titles">Admins per Department</h5>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart width={400} height={400}>
                  <Pie
                    data={adminDeptData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ percent }) => `${((percent as number) * 100).toFixed(0)}%`}
                  >
                    {adminDeptData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
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

export default SuperAdmin_Dashboard;