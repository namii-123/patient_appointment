import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaClock, FaStethoscope } from "react-icons/fa";
import "../../../assets/ManageSlots.css";
import { db } from "../firebase";
import { doc, setDoc, onSnapshot, query, collection, where, writeBatch, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { X } from "lucide-react";
import logo from "/logo.png";
import toast, { Toaster } from 'react-hot-toast';



interface Slot {
  slotID: string;
  time: string;
  remaining: number;
}

type Notification = {
  text: string;
  unread: boolean;
};

interface DayData {
  slots: Slot[];
  totalSlots: number;
  unlimited: boolean;
  closed: boolean;
}


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


type SlotsState = Record<string, DayData>;

const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const generateDays = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const predefinedTimes = [
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "13:00 PM - 14:00 PM",
  "14:00 PM - 15:00 PM",
];

const ManageSlots_Radiology: React.FC = () => {
  const navigate = useNavigate();
  const department = "Radiographic";

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<SlotsState>({});
  const [unlimited, setUnlimited] = useState<boolean>(true);
  const [closed, setClosed] = useState<boolean>(false);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [maxYear, setMaxYear] = useState(today.getFullYear() + 20);


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
      where("purpose", "==", "Radiographic") 
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
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true }, 
    { text: "System update completed", unread: false }, 
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
  
  

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const days = generateDays(currentYear, currentMonth);

  // Load all days — default to UNLIMITED if no data
  useEffect(() => {
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);
    const unsubs: (() => void)[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateKey(d);
      const ref = doc(db, "Departments", department, "Slots", dateKey);

      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as DayData;
          setSlots(prev => ({ ...prev, [dateKey]: data }));
        } else {
          // THIS IS THE KEY: DEFAULT = UNLIMITED
          setSlots(prev => ({
            ...prev,
            [dateKey]: {
              slots: [],
              totalSlots: 999,
              unlimited: true,
              closed: false
            }
          }));
        }
      });
      unsubs.push(unsub);
    }

    return () => unsubs.forEach(u => u());
  }, [currentMonth, currentYear, department]);

  const handleDayClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    const dayData = slots[dateKey] || { unlimited: true, closed: false, slots: [] };

    setSelectedDate(date);
    setUnlimited(dayData.unlimited);
    setClosed(dayData.closed);

    // Pre-fill slot counts if limited
    const counts: Record<string, number> = {};
    if (!dayData.unlimited && dayData.slots?.length > 0) {
      dayData.slots.forEach(s => {
        counts[s.time] = s.remaining;
      });
    } else if (!dayData.unlimited) {
      predefinedTimes.forEach(t => counts[t] = 3);
    }
    setSlotCounts(counts);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const dateKey = formatDateKey(selectedDate);
    const ref = doc(db, "Departments", department, "Slots", dateKey);

    let payload: DayData;

    if (closed) {
      payload = {
        slots: [],
        totalSlots: 0,
        unlimited: false,
        closed: true
      };
    } else if (unlimited) {
      payload = {
        slots: [],
        totalSlots: 999,
        unlimited: true,
        closed: false
      };
    } else {
      const slotsData = predefinedTimes.map(time => ({
        slotID: `${dateKey}-${time.replace(/[^a-zA-Z0-9]/g, "")}`,
        time,
        remaining: slotCounts[time] ?? 3
      }));
      const total = slotsData.reduce((sum, s) => sum + s.remaining, 0);
      payload = {
        slots: slotsData,
        totalSlots: total,
        unlimited: false,
        closed: false
      };
    }

    try {
      await setDoc(ref, payload, { merge: true });
      openCustomModal("Slots updated successfully!", "success");
      setSelectedDate(null);
      setSlotCounts({});
    } catch (err) {
      console.error("Save error:", err);
      openCustomModal("Failed to save slots.", "error");
    }
  };

 
  // Modal Logic
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalMessage, setCustomModalMessage] = useState("");
  const [customModalType, setCustomModalType] = useState<"success" | "error" | "confirm">("success");
  const [onCustomModalConfirm, setOnCustomModalConfirm] = useState<() => void>(() => {});

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
    <div className="dashboards">
      <aside className="sidebars">
        <div>
          <div className="logo-boxs" onClick={() => navigate("/dashboard_radiology")} style={{ cursor: "pointer" }}>
            <img src="logo.png" alt="logo" className="logoss" />
            <span className="logo-texts">RADIOLOGY</span>
          </div>
          <nav className="nav-linkss">
            <div className="nav-item"><FaTachometerAlt className="nav-icon" /><span onClick={() => navigate("/dashboard_radiology")}>Dashboard</span></div>
            <div className="nav-item"><FaCalendarAlt className="nav-icon" /><span onClick={() => navigate("/appointments_radiology")}>Appointments</span></div>
            <div className="nav-item"><FaUsers className="nav-icon" /><span onClick={() => navigate("/patientrecords_radiology")}>Patient Records</span></div>
            <div className="nav-item active"><FaClock className="nav-icon" /><span>Manage Slots</span></div>
            <div className="nav-item"><FaStethoscope className="nav-icon" /><span onClick={() => navigate("/services_radiology")}>Services</span></div>
            <div className="nav-item"><FaChartBar className="nav-icon" /><span onClick={() => navigate("/reports&analytics_radiology")}>Reports & Analytics</span></div>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box"><FaUser className="user-icon" /><span className="user-label">Admin</span></div>
          <div className="signout-box">
            <FaSignOutAlt className="signout-icon" />
            <span onClick={() => openCustomModal("Are you sure you want to sign out?", "confirm", async () => {
              await signOut(auth);
              navigate("/loginadmin", { replace: true });
            })} className="signout-label" style={{ cursor: "pointer" }}>Sign Out</span>
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
          <h5 className="navbar-title">Manage Slots</h5>
             <div className="notification-wrapper">
  <FaBell
    className="notification-bell"
   onClick={() => {
    unlockAudioContext();           // ← Kini ang mag-unlock sa audio!
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
        

        <div className="content-wrapper">
          <div className="calendar-containers">
            <div className="calendar-headers">
              <h5 className="calendar-title">Monthly Calendar - Manage Slots</h5>
              <div className="calendar-nav">
                <select value={currentMonth} onChange={e => setCurrentMonth(parseInt(e.target.value))}>
                  {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={currentYear} onChange={e => {
                  const y = parseInt(e.target.value);
                  setCurrentYear(y);
                  if (y === maxYear) setMaxYear(maxYear + 20);
                }}>
                  {Array.from({ length: maxYear - today.getFullYear() + 1 }, (_, i) => today.getFullYear() + i)
                    .map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="calendar-grid">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="calendar-weekday">{d}</div>)}
              {Array(days[0].getDay()).fill(null).map((_, i) => <div key={`empty-${i}`} className="calendar-day empty" />)}
              {days.map(day => {
  const dateKey = formatDateKey(day);
  const data = slots[dateKey];
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const isPast = day < new Date(new Date().setHours(0,0,0,0));

  let statusClass = "";
  let displayText = "Loading...";

  if (isWeekend) {
    statusClass = "status-weekend";
    displayText = "Closed";
  } else if (isPast) {
    statusClass = "status-past";
    displayText = "Past";
  } else if (data) {
    if (data.closed) {
      statusClass = "status-closed";
      displayText = "Closed";
    } else if (data.unlimited) {
      statusClass = "status-unlimited";
      displayText = "Unlimited";
    } else {
      statusClass = "status-limited";
      displayText = `${data.totalSlots} slots`;
    }
  } else {
    // Default while loading or no data
    statusClass = "status-unlimited";
    displayText = "Unlimited";
  }

  const isDisabled = isWeekend || isPast;

  return (
    <div
      key={dateKey}
      className={`calendar-day ${statusClass} ${isDisabled ? "disabled-day" : ""}`}
      onClick={() => !isDisabled && handleDayClick(day)}
      style={isDisabled ? { pointerEvents: "none" } : { cursor: "pointer" }}
    >
      <div className="day-number">{day.getDate()}</div>
      <div className="weekday-name">
        {day.toLocaleDateString("en-US", { weekday: "short" })}
      </div>
      <div className="slots-summary">
        {displayText}
      </div>
    </div>
  );
})}
            </div>
          </div>

          {/* SLOT MANAGEMENT MODAL */}
          {selectedDate && (
            <div className="modal-overlay-calendar">
              <div className="modal colored-modal">
                <button className="absolute top-4 right-4 text-gray-600 hover:text-red-600" onClick={() => setSelectedDate(null)}>
                  <X size={28} />
                </button>
                <h4 className="text-xl font-bold mb-6">Manage Slots - {selectedDate.toDateString()}</h4>

                <div className="space-y-5">
                  <label className="">
                    <input
                      type="checkbox"
                      checked={closed}
                      onChange={e => {
                        setClosed(e.target.checked);
                        if (e.target.checked) setUnlimited(false);
                      }}
                      className="w-5 h-5"
                    />
                    <strong>Close this day completely</strong>
                  </label>

                  {!closed && (
                    <label className="flex items-center gap-3 text-lg">
                      <input
                        type="checkbox"
                        checked={unlimited}
                        onChange={e => setUnlimited(e.target.checked)}
                        className="w-5 h-5"
                      />
                      <strong>Unlimited Slots (Always Available)</strong>
                    </label>
                  )}
                </div>

                {!closed && !unlimited && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <p className="font-bold mb-3">Set capacity per time slot:</p>
                    {predefinedTimes.map(time => (
                      <div key={time} className="flex justify-between items-center py-2">
                        <span className="font-medium">{time}</span>
                        <input
                          type="number"
                          min="0"
                          value={slotCounts[time] ?? 3}
                          onChange={e => setSlotCounts(prev => ({ ...prev, [time]: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-3 py-2 border rounded-lg text-center"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 mt-8 justify-center">
                  <button className="button-saves px-8 py-3" onClick={handleSave}>
                    Save Changes
                  </button>
                  <button className="button-cancel px-8 py-3" onClick={() => setSelectedDate(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success/Error/Confirm Modal */}
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
                      {customModalType === "success" ? "SUCCESS" : customModalType === "error" ? "ERROR" : "CONFIRM ACTION"}
                    </h3>
                  </div>
                  <div className="radiology-modal-body">
                    <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>{customModalMessage}</p>
                  </div>
                  <div className="radiology-modal-footer">
                    {customModalType === "confirm" ? (
                      <>
                        <button className="radiology-modal-btn cancel" onClick={closeCustomModal}>Cancel</button>
                        <button className="radiology-modal-btn confirm" onClick={() => { closeCustomModal(); onCustomModalConfirm(); }}>
                          Confirm
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
        </div>
      </main>
    </div>
  );
};

export default ManageSlots_Radiology;