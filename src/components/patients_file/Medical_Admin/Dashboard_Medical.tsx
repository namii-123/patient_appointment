import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaClock,  FaCheckCircle, FaStethoscope,  } from "react-icons/fa";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, } from "recharts";
import "../../../assets/Dashboard_Clinical.css";
import logo from "/logo.png";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { X } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';


interface AdminNotification {
  id: string;
  type: "new_appointment" | "appointment_cancelled";
  message: string;
  patientName: string;
  date: string;
  slotTime: string;
  timestamp: any;
  read: boolean;
}



interface Notification {
  id?: string;
  text: string;
  unread: boolean;
  timestamp: Date | null; 
}


interface ChartData {
  name: string;
  value: number;
}



// ---------- Component ----------
const Dashboard_Medical: React.FC = () => {
  const navigate = useNavigate();
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPatients, setTotalPatients] = useState(0);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);

const [completedCount, setCompletedCount] = useState(0);



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
      where("purpose", "==", "Medical") 
    );
  
    const unsubscribe = onSnapshot(notifQuery, (snapshot) => {
      const notificationsToProcess: AdminNotification[] = [];
  
     
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
  
      
        if (change.type === "added" || change.type === "modified") {
          const notif: AdminNotification = {
            id: change.doc.id,
            type: data.type || "new_appointment",
            message: data.message || "",
            patientName: data.patientName || "Unknown Patient",
            date: data.date || "",
            slotTime: data.slotTime || "",
            timestamp: data.timestamp,
            read: data.read === true,
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
            (b.timestamp?.toDate?.() || 0) - (a.timestamp?.toDate?.() || 0)
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
  
  
  

const [weeklyActivity, setWeeklyActivity] = useState<Record<string, number>>({
  Monday: 0,
  Tuesday: 0,
  Wednesday: 0,
  Thursday: 0,
  Friday: 0,
  Saturday: 0,
  Sunday: 0,
});


  
useEffect(() => {
  const transQuery = query(
    collection(db, "Transactions"),
    where("purpose", "==", "Medical")
  );

  const unsubscribe = onSnapshot(transQuery, (snap) => {
  
    const activity: Record<string, number> = {
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
      Sunday: 0,
    };

    
    const now = new Date();

    
    const firstDayOfWeek = new Date(now);
    const day = now.getDay(); 
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    firstDayOfWeek.setDate(diff);
    firstDayOfWeek.setHours(0, 0, 0, 0);

    
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23, 59, 59, 999);

    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.date) return;

      const apptDate = data.date.toDate ? data.date.toDate() : new Date(data.date);

      
      if (apptDate >= firstDayOfWeek && apptDate <= lastDayOfWeek) {
        const dayIndex = apptDate.getDay();
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const dayName = dayNames[dayIndex];
        activity[dayName] = (activity[dayName] || 0) + 1;
      }
    });

    setWeeklyActivity(activity);
  });

  return () => unsubscribe();
}, []);




  useEffect(() => {
   
    const fetchUsers = async () => {
      const q = query(
        collection(db, "Transactions"),
        where("purpose", "==", "Medical")
      );
      const snap = await getDocs(q);
    
      const uniqueUsers = new Set<string>();
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.UserId) {
          uniqueUsers.add(data.UserId);
        }
      });
    
      setTotalUsers(uniqueUsers.size);
    };
    



const fetchPatients = async () => {
  const q = query(
    collection(db, "Transactions"),
    where("purpose", "==", "Medical")
  );
  const snap = await getDocs(q);

  const validPatientIds = new Set<string>();

  snap.forEach((doc) => {
    const data = doc.data();
    const status = (data.status || "").toString().toLowerCase().trim();

    
    if (status !== "rejected" && data.patientId) {
      validPatientIds.add(data.patientId);
    }
  });

  setTotalPatients(validPatientIds.size);
};



    
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "Medical")
    );

    const unsubscribe = onSnapshot(transQuery, (snap) => {
  let total = 0;
  let pending = 0;
  let cancelled = 0;
  let approved = 0;
  
  let completed = 0;

   snap.forEach((doc) => {
  const data = doc.data();
  const status = data.status?.toLowerCase();

  
  if (status !== "rejected") {
    total++; 
  }

  if (status === "pending") pending++;
  if (status === "cancelled") cancelled++;
  if (status === "approved") approved++;
  if (status === "completed") completed++;
});

  setTotalAppointments(total);
  setPendingCount(pending);
  setCancelledCount(cancelled);
  setApprovedCount(approved);
 
  setCompletedCount(completed);
});
    fetchUsers();
    fetchPatients();

    return () => unsubscribe();
  }, []);


 

  

  // Chart Data
  const data: ChartData[] = [
  { name: "Approved", value: approvedCount },
  { name: "Pending", value: pendingCount },
  { name: "Canceled", value: cancelledCount },
  { name: "Completed", value: completedCount },
 
];


  const COLORS: string[] = ["#4CAF50", "#FFC107", "#F44336", "#2196F3", "#FF5722"];

 

  
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
            <div className="nav-item active">
              <FaTachometerAlt className="nav-icon" />
              <span>Dashboard</span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_medical")}>
                Appointments
              </span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_medical")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item">
              <FaClock className="nav-icon" />
              <span onClick={() => handleNavigation("/manageslots_medical")}>
                Manage Slots
              </span>
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

      {/* Main content */}
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
      
        <div className="top-navbar-clinical">
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
                              // Prevent mark as read if clicking delete button
                              if ((e.target as HTMLElement).closest(".notification-delete-btn")) return;
                    
                              if (!notif.read) {
                                try {
                                  await updateDoc(doc(db, "admin_notifications", notif.id), { read: true });
                                  setAdminNotifications(prev =>
                                    prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                                  );
                                  setUnreadCount(prev => Math.max(0, prev - 1));
                                } catch (err) {
                                  console.error("Failed to mark as read:", err);
                                }
                              }
                            }}
                          >
                            <div className="notification-main">
                           <div className="notification-message">
                      <p className="notification-text">
                        <strong>{notif.patientName}</strong>: {notif.message}
                      </p>
                    
                      {/* MAIN DATE & TIME (larger & bold) */}
                      <div style={{ 
                        fontSize: "14px", 
                        fontWeight: "600", 
                        color: "#333",
                        marginTop: "6px"
                      }}>
                        {notif.date} at {notif.slotTime}
                      </div>
                    
                      {/* TIME AGO (gray, smaller, ubos gyud) */}
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
          

        {/* Cards */}
      <div className="content-wrapper">
         <div className="cards-container">
                 <div className="card-row">
       
                      <div className="cardss">
                                   <FaUsers className="card-icon" />
                                   <h5>{totalUsers}</h5>
                                   <p>Total Users</p>
                                 </div>
                     
                                 <div className="cardss">
                                   <FaUsers className="card-icon" />
                                   <h5>{totalPatients}</h5>
                                   <p>Total Patients</p>
                                 </div>
                                 <div className="cardss">
                                   <FaCalendarAlt className="card-icon" />
                                   <h5>{totalAppointments}</h5>
                                   <p>Total Appointments</p>
                                 </div>
                   
                 </div>
       
                 <div className="card-row">
                   <div className="cardss">
                                <FaChartBar className="card-icon" />
                                 <h5>{pendingCount}</h5>
                                <p>Pending Appointments</p>
                              </div>
                               <div className="cardss">
                                <FaCalendarAlt className="card-icon" />
                                <h5>{cancelledCount}</h5>
                                <p>Canceled Appointments</p>
                              </div>
                  
                              <div className="cardss">
                                <FaCalendarAlt className="card-icon" />
                                 <h5>{approvedCount}</h5>
                                <p>Approved Appointments</p>
                              </div>
                             
                  
                  
                 </div>
       
                 <div className="card-row">
                  
                             <div className="cardss">
                               <FaCheckCircle className="card-icon" />
                               <h5>{completedCount}</h5>
                               <p>Total Completed</p>
                             </div>
                 </div>
               </div>

        {/* Charts and Activity */}
        <div className="chart-activity-container">
          <div className="chart-wrapper">
            <h5 className="chart-title">Appointment Distribution</h5>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} (${(percent ? (percent * 100).toFixed(1) : 0)}%)`
                  }                  
                  dataKey="value"
                  paddingAngle={3}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  layout="horizontal"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="activity-wrapper">
  <h5 className="chart-title">Weekly Activity Status</h5>
  <ul className="activity-list">
    {Object.entries(weeklyActivity).map(([day, count]) => (
      <li key={day}>
        <strong>{day}:</strong>{" "}
        {(day === "Saturday" || day === "Sunday")
          ? "Closed"
          : `${count} Appointments`}
      </li>
    ))}
  </ul>
</div>
        </div>

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

       
</div>
</main>
</div>
);
};

export default Dashboard_Medical;

