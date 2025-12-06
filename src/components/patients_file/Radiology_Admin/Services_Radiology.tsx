import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,
  FaClock,
  FaStethoscope,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaUndo,
  FaBroom,
} from "react-icons/fa";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import "../../../assets/Dashboard_Clinical.css";
import logo from "/logo.png";
import { DEFAULT_SERVICES } from "../../../config/defaultServices";
import { X } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
  isDeleted: boolean;
}
interface Notification {
  text: string;
  unread: boolean;
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

const Services_Radiology: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("");
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [showTrash, setShowTrash] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherCategory, setOtherCategory] = useState("");


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
   
   
  
  

  // One-time cleanup button
  const [showCleanupBtn, setShowCleanupBtn] = useState(true);

  const categories = useMemo(() => {
    const cats = [...new Set(services.map((s) => s.category))].filter(Boolean);
    return cats.sort((a, b) => a.localeCompare(b));
  }, [services]);

  // CLEANUP DUPLICATES (One-time only)
 const cleanupDuplicates = async () => {
  openCustomModal(
    `Permanently delete duplicate services?\n\nThis will keep only the first occurrence of each service (based on name + category) and permanently remove the rest.\n\nThis action CANNOT be undone!`,
    "confirm",
    async () => {
      try {
        const q = query(collection(db, "RadiologyServices"), where("department", "==", "Radiographic"));
        const snapshot = await getDocs(q);

        const seen = new Map<string, string>(); // key: "category|lowercase-name" → docId (first one)
        const toDelete: string[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.category || !data.name) return; // skip invalid docs

          const key = `${data.category}|${data.name.trim().toLowerCase()}`;

          if (seen.has(key)) {
            toDelete.push(doc.id);
          } else {
            seen.set(key, doc.id); // keep the first one
          }
        });

        if (toDelete.length === 0) {
          openCustomModal("No duplicates found! All services are clean!", "success");
          setShowCleanupBtn(false);
          return;
        }

        // Proceed with deletion
        const batch = writeBatch(db);
        toDelete.forEach((id) => {
          batch.delete(doc(db, "RadiologyServices", id));
        });
        await batch.commit();

        const deletedCount = toDelete.length;
        openCustomModal(
          `Cleanup complete!\n\nPermanently deleted ${deletedCount} duplicate service${deletedCount > 1 ? "s" : ""}.`,
          "success"
        );
        setShowCleanupBtn(false); // hide button after successful cleanup
      } catch (error) {
        console.error("Cleanup failed:", error);
        openCustomModal("Cleanup failed. Please try again or check your connection.", "error");
      }
    }
  );
};

   

  // BULLETPROOF SEEDING (Same as Clinical — never adds duplicates)
  useEffect(() => {
    const seedDefaultServices = async () => {
      const colRef = collection(db, "RadiologyServices");
      const q = query(colRef, where("department", "==", "Radiographic"));
      const snapshot = await getDocs(q);

      const existing = new Map<string, boolean>();
      snapshot.forEach((doc) => {
        const d = doc.data();
        const key = `${d.category}|${d.name.trim().toLowerCase()}`;
        existing.set(key, true);
      });

      const batch = writeBatch(db);
      let added = 0;

      Object.entries(DEFAULT_SERVICES).forEach(([category, names]) => {
        names.forEach((rawName) => {
          const name = rawName.trim();
          const key = `${category}|${name.toLowerCase()}`;

          if (!existing.has(key)) {
            const docRef = doc(colRef);
            batch.set(docRef, {
              name,
              category,
              enabled: true,
              isDeleted: false,
              department: "Radiographic",
              createdAt: new Date(),
            });
            added++;
            existing.set(key, true);
          }
        });
      });

      if (added > 0) {
        await batch.commit();
        console.log(`Seeded ${added} missing radiology services`);
      }
    };

    seedDefaultServices();

    // Real-time listener
    const q = query(collection(db, "RadiologyServices"), where("department", "==", "Radiographic"));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: Service[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        fetched.push({
          id: d.id,
          name: data.name,
          category: data.category || "Uncategorized",
          enabled: data.enabled ?? true,
          isDeleted: data.isDeleted ?? false,
        });
      });
      fetched.sort((a, b) => a.name.localeCompare(b.name));
      setServices(fetched);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // SAVE SERVICE (with duplicate prevention)
  const handleSaveService = async () => {
    const name = (editingId ? editName : newServiceName).trim();
    let cat = editingId
      ? editCategory.trim()
      : showOtherInput && otherCategory.trim()
      ? otherCategory.trim()
      : newServiceCategory.trim();

    if (!name) return  openCustomModal("Service name is required");
    if (!cat) return  openCustomModal("Category is required");

    // Prevent duplicate when adding
    const key = `${cat}|${name.toLowerCase()}`;
    const exists = services.some(
      (s) => `${s.category}|${s.name.trim().toLowerCase()}` === key && s.id !== editingId
    );

    if (!editingId && exists) {
      return  openCustomModal("This service already exists in this category!");
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "RadiologyServices", editingId), { name, category: cat });
      } else {
        await addDoc(collection(db, "RadiologyServices"), {
          name,
          category: cat,
          enabled: true,
          department: "Radiographic",
          createdAt: new Date(),
          isDeleted: false,
        });
      }
      closeModal();
    } catch (e) {
      console.error(e);
       openCustomModal("Failed to save service");
    }
  };

  const toggleService = async (id: string, cur: boolean) => {
    await updateDoc(doc(db, "RadiologyServices", id), { enabled: !cur });
  };

 const softDeleteService = async (id: string) => {
  openCustomModal(
    "Are you sure you want to move this service to trash?",
    "confirm",
    async () => {
      try {
        await updateDoc(doc(db, "RadiologyServices", id), { isDeleted: true, enabled: false });
        openCustomModal("Service moved to trash successfully!", "success");
      } catch (e) {
        console.error(e);
        openCustomModal("Failed to move service to trash", "error");
      }
    }
  );
};

const restoreService = async (id: string) => {
  openCustomModal(
    "Are you sure you want to restore this service?",
    "confirm",
    async () => {
      try {
        await updateDoc(doc(db, "RadiologyServices", id), { isDeleted: false });
        openCustomModal("Service restored successfully!", "success");
      } catch (e) {
        console.error(e);
        openCustomModal("Failed to restore service", "error");
      }
    }
  );
};

const permanentlyDeleteService = async (id: string) => {
  openCustomModal(
    "Are you sure you want to PERMANENTLY DELETE this service? This action cannot be undone!",
    "confirm",
    async () => {
      try {
        await deleteDoc(doc(db, "RadiologyServices", id));
        openCustomModal("Service permanently deleted!", "success");
      } catch (e) {
        console.error(e);
        openCustomModal("Failed to delete service", "error");
      }
    }
  );
};

  const openAddModal = () => {
    setEditingId(null);
    setNewServiceName("");
    setNewServiceCategory("");
    setOtherCategory("");
    setShowOtherInput(false);
    setShowAddModal(true);
  };

  const openEditModal = (s: Service) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditCategory(s.category);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setShowOtherInput(false);
    setOtherCategory("");
  };

  const handleCategoryChange = (value: string) => {
    if (value === "others") {
      setShowOtherInput(true);
      setNewServiceCategory("");
    } else {
      setShowOtherInput(false);
      setNewServiceCategory(value);
      setOtherCategory("");
    }
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

  const activeServices = services.filter((s) => !s.isDeleted);
  const trashedServices = services.filter((s) => s.isDeleted);

  return (
    <div className="dashboards">
      {/* SAME SIDEBAR AS BEFORE */}

        <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => navigate("/dashboard_radiology")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Radiology</span>
          </div>

          <nav className="nav-linkss">
            {[
              { to: "/dashboard_radiology", icon: FaTachometerAlt, label: "Dashboard" },
              { to: "/appointments_radiology", icon: FaCalendarAlt, label: "Appointments" },
              { to: "/patientrecords_radiology", icon: FaUsers, label: "Patient Records" },
              { to: "/manageslots_radiology", icon: FaClock, label: "Manage Slots" },
              { to: "", icon: FaStethoscope, label: "Services", active: true },
              { to: "/reports&analytics_radiology", icon: FaChartBar, label: "Reports & Analytics" },
            ].map((item) => (
              <div
                key={item.to}
                className={`nav-item ${item.active || location.pathname.includes(item.to) ? "active" : ""}`}
                onClick={() => item.to && navigate(item.to)}
              >
                <item.icon className="nav-icon" />
                <span>{item.label}</span>
              </div>
            ))}
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
        <div className="top-navbar-radiology">
          <h5 className="navbar-title">Radiology Services Management</h5>
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

        <div className="content-wrapper" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3>{showTrash ? "Trashed Services" : "All Services"}</h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {showCleanupBtn && !showTrash && (
                <button onClick={cleanupDuplicates} style={{ background: "#ff9800", color: "white", padding: "10px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", border: "none" }}>
                  <FaBroom /> Cleanup Duplicates
                </button>
              )}
              <button onClick={() => setShowTrash(!showTrash)} style={{ background: "#f0f0f0", padding: "10px 16px", borderRadius: "8px", border: "1px solid #ccc" }}>
                {showTrash ? "Show Active" : "Show Trash"} ({trashedServices.length})
              </button>
              {!showTrash && (
                <button onClick={openAddModal} style={{ background: "#005b9f", color: "white", padding: "10px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px" , border: "none"}}>
                  <FaPlus /> Add Service
                </button>
              )}
            </div>
          </div>

          {/* SAME RENDERING AS BEFORE BUT WITH SORTING */}


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
  
          {loading ? <p>Loading…</p> : (
            <div style={{ display: "grid", gap: "16px" }}>
              {Object.entries(
                (showTrash ? trashedServices : activeServices).reduce((acc, svc) => {
                  if (!acc[svc.category]) acc[svc.category] = [];
                  acc[svc.category].push(svc);
                  return acc;
                }, {} as Record<string, Service[]>)
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cat, list]) => (
                  <div key={cat} style={{ border: "1px solid #ddd", borderRadius: "12px", padding: "16px", background: "#f9f9f9" }}>
                    <h4 style={{ margin: "0 0 12px", color: "#005b9f", fontWeight: 600 }}>{cat}</h4>
                    <div style={{ display: "grid", gap: "10px" }}>
                      {list.sort((a, b) => a.name.localeCompare(b.name)).map((svc) => (
                        <div key={svc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", background: "white", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", opacity: svc.enabled && !svc.isDeleted ? 1 : 0.6 }}>
                          <span style={{ fontWeight: svc.enabled ? "500" : "normal" }}>
                            {svc.name}
                            {svc.isDeleted && <small> (Trashed)</small>}
                            {!svc.enabled && !svc.isDeleted && <small> (Disabled)</small>}
                          </span>
                          <div style={{ display: "flex", gap: "8px" }}>
                            {!svc.isDeleted && (
                              <button onClick={() => toggleService(svc.id, svc.enabled)} style={{ background: "none", border: "none", fontSize: "1.4rem" }}>
                                {svc.enabled ? <FaToggleOn color="#4CAF50" /> : <FaToggleOff color="#ccc" />}
                              </button>
                            )}
                            <button onClick={() => openEditModal(svc)} style={{ color: "#005b9f" }}><FaEdit /></button>
                            {svc.isDeleted ? (
                              <>
                                <button onClick={() => restoreService(svc.id)} style={{ color: "#4CAF50" }}><FaUndo /></button>
                                <button onClick={() => permanentlyDeleteService(svc.id)} style={{ color: "#F44336" }}><FaTrash /></button>
                              </>
                            ) : (
                              <button onClick={() => softDeleteService(svc.id)} style={{ color: "#F44336" }}><FaTrash /></button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          
          )}
        </div>
        </div>
      </main>
      

      {/* SAME MODAL AS BEFORE */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={closeModal}>
          <div style={{ background: "white", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? "Edit Service" : "Add New Service"}</h3>
            {/* ... same input fields as before ... */}
            <div style={{ marginBottom: "16px" }}>
              <label>Service Name</label>
              <input value={editingId ? editName : newServiceName} onChange={(e) => editingId ? setEditName(e.target.value) : setNewServiceName(e.target.value)}   placeholder="New service name..." style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label>Category</label>
              {editingId ? (
                <input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} />
              ) : (
                <>
                  <select value={showOtherInput ? "others" : newServiceCategory} onChange={(e) => handleCategoryChange(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }}>
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="others">+ Others (Add New)</option>
                  </select>
                  {showOtherInput && <input value={otherCategory} onChange={(e) => setOtherCategory(e.target.value)}  style={{ width: "100%", marginTop: "8px", padding: "10px", borderRadius: "8px", border: "1px solid #ccc" }} placeholder="New category..." autoFocus />}
                </>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button onClick={closeModal} style={{ padding: "10px 16px", border: "1px solid #ccc", borderRadius: "8px", background: "white" }}>Cancel</button>
              <button onClick={handleSaveService} style={{ padding: "10px 16px", background: "#005b9f", color: "white", border: "none", borderRadius: "8px" }}>
                {editingId ? "Update" : "Add"} Service
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
      

      
    </div>

    
  );
};

export default Services_Radiology;