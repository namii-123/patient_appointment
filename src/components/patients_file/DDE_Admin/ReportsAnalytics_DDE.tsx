import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBell,
  FaUser,
  FaTachometerAlt,
  FaCalendarAlt,
  FaUsers,
  FaChartBar,
  FaSignOutAlt,

} from "react-icons/fa";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "../../../assets/ReportsAnalytics_Dental.css";

import { db } from "../firebase";
import { collection, query, where, onSnapshot, writeBatch, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"
import { X } from "lucide-react";
import logo from "/logo.png";
import toast, { Toaster } from 'react-hot-toast';

import PrintJS from "print-js";
import { PDFDocument, rgb } from "pdf-lib";
import { saveAs } from "file-saver";

interface Notification {
  id?: string;
  text: string;
  unread: boolean;
  timestamp: Date | null; 
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



type StatusType = "completed" | "pending" | "approved" | "rejected" | "cancelled" | "all";

interface ChartData {
  requestDate: string;
  completed: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}



const ReportsAnalytics_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusType>("all");
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

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
        where("purpose", "==", "DDE") 
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
    
    
    
 

  useEffect(() => {
     setLoading(true);
    const q = query(collection(db, "Transactions"), where("purpose", "==", "DDE"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = snapshot.docs.map((doc) => {
        const tData = doc.data();
        let requestDate: string;
        if (tData.createdAt) {
          if (typeof tData.createdAt === "string") {
            requestDate = tData.createdAt.split("T")[0];
          } else if (tData.createdAt && typeof tData.createdAt.toDate === "function") {
            requestDate = tData.createdAt.toDate().toISOString().split("T")[0];
          } else {
            console.warn(`Unexpected createdAt format for transaction ${doc.id}:`, tData.createdAt);
            requestDate = new Date().toISOString().split("T")[0];
          }
        } else {
          console.warn(`No createdAt field for transaction ${doc.id}`);
          requestDate = new Date().toISOString().split("T")[0];
        }
        return { id: doc.id, ...tData, requestDate };
      });
      setAppointments(data);

     
        setTimeout(() => setLoading(false), 300);
    
    });

    return () => unsubscribe();
  }, []);

 

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const chartData = useMemo(() => {
    const grouped: Record<string, any> = {};

    appointments.forEach((appt) => {
      const date = appt.requestDate;
      if (!grouped[date]) {
        grouped[date] = { requestDate: date, pending: 0, approved: 0, rejected: 0, cancelled: 0, completed: 0 };
      }
      grouped[date][appt.status.toLowerCase()]++;
    });

    return Object.values(grouped);
  }, [appointments]);

 



  const filteredData = useMemo(() => {
    let filtered = [...chartData];
  
    if (year) {
    filtered = filtered.filter((item) =>
      item.requestDate.includes(year)  
    );
  }

  if (month) {
    filtered = filtered.filter((item) =>
      item.requestDate.includes(month)  
    );
  }
  
    
    if (status !== "all") {
      return filtered.map((item) => {
        const empty: ChartData = {
          ...item,
          completed: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          cancelled: 0,
        };
        empty[status] = item[status];
        return empty;
      });
    }
  
    return filtered;
  }, [status, year, month, chartData]);
  
  
  
  const filteredSummary = useMemo(() => {
    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let completed = 0;
    let cancelled = 0;
  
    filteredData.forEach((day) => {
      if (status !== "all") {
     
        const value = (day as any)[status] || 0;
        total += value;
  
      
        if (status === "pending") pending += value;
        if (status === "approved") approved += value;
         if (status === "rejected") rejected += value;
        if (status === "completed") completed += value;
        if (status === "cancelled") cancelled += value;
      } else {
      
        const dayTotal = day.pending + day.approved + day.completed + day.cancelled;
        total += dayTotal;
        pending += day.pending;
        approved += day.approved;
        rejected += day.rejected;
        completed += day.completed;
        cancelled += day.cancelled;
      }
    });
  
    return { total, pending, approved, rejected, completed, cancelled };
  }, [filteredData, status]);



 
const generatePDFReport = async (file: File, isPrint: boolean = false) => {
  const toastId = isPrint ? "pdf-print" : "pdf-download";
  toast.loading(isPrint ? "Preparing print..." : "Generating PDF report...", { id: toastId });

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) throw new Error("Empty template");

    const helvetica = await pdfDoc.embedFont("Helvetica");
    const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");

    const blueHeader = rgb(0.05, 0.3, 0.65);
    const darkBlue = rgb(0.05, 0.2, 0.5);
    const redTotal = rgb(0.8, 0, 0);
    const black = rgb(0, 0, 0);

    const periodText = year && month
      ? new Date(parseInt(year), parseInt(month) - 1).toLocaleString("en-US", { month: "long", year: "numeric" })
      : year ? `Year ${year}` : "All Time";
    const statusText = status === "all" ? "All Appointments" : status.charAt(0).toUpperCase() + status.slice(1);
    const generatedAt = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

    let currentPage = pages[0];
    let y = 670;

    // Copy first page as template for new pages
   const [templatePage] = await pdfDoc.copyPages(pdfDoc, [0]);
  

    const drawCentered = (text: string, yPos: number, size = 12, bold = false) => {
      const font = bold ? helveticaBold : helvetica;
      const width = font.widthOfTextAtSize(text, size);
      currentPage.drawText(text, {
        x: (595.28 - width) / 2,
        y: yPos,
        size,
        font,
        color: bold ? darkBlue : black,
      });
    };

    // Header Text
    drawCentered("DDE REPORTS", y, 18, true);
    y -= 30;
    drawCentered(`Period: ${periodText}`, y, 14);
    y -= 25;
    drawCentered(`Status: ${statusText}`, y, 14);
    y -= 25;
    drawCentered(`Generated: ${generatedAt}`, y, 11);
    y -= 50;

    // 7 COLUMNS NA GYUD (with Rejected)
    const colX = [50, 130, 200, 270, 340, 410, 480]; // ← Na-adjust para 7 columns
    const headers = ["Date", "Total", "Completed", "Pending", "Approved", "Rejected", "Cancelled"];

    const drawHeader = () => {
      currentPage.drawRectangle({
        x: 40, y: y - 5, width: 515, height: 25, color: blueHeader
      });
      headers.forEach((h, i) => {
        currentPage.drawText(h, {
          x: colX[i],
          y: y + 6,
          size: 11,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });
      });
      y -= 30;
    };

    drawHeader();

    // Table Rows
    filteredData.forEach((row) => {
      if (y < 120) {
        currentPage = pdfDoc.addPage(templatePage);
        y = 650;
        drawHeader();
      }

      const total = row.completed + row.pending + row.approved + row.rejected + row.cancelled;

      const cells = [
        row.requestDate || "N/A",
        total.toString(),
        row.completed.toString(),
        row.pending.toString(),
        row.approved.toString(),
        row.rejected.toString(),
        row.cancelled.toString(),
      ];

      cells.forEach((cell, i) => {
        currentPage.drawText(cell, {
          x: colX[i],
          y: y + 5,
          size: 10.5,
          font: helvetica,
          color: i === 1 ? redTotal : black,
        });
      });

      currentPage.drawLine({
        start: { x: 40, y: y - 5 },
        end: { x: 555, y: y - 5 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });

      y -= 24;
    });

    // Summary Box
    const summaryHeight = 180;
         if (y - summaryHeight < 50) { 
           currentPage = pdfDoc.addPage(templatePage);
           y = 650;
         }
   
         const summaryX = 100;
         const summaryY = y - 20;
         const summaryWidth = 400;
         const blueBorder = rgb(0.05, 0.3, 0.65);
   
         currentPage.drawRectangle({
           x: summaryX,
           y: summaryY - summaryHeight,
           width: summaryWidth,
           height: summaryHeight,
           borderColor: blueBorder,
           borderWidth: 2,
           color: rgb(1, 1, 1),
         });
   
          const blackColor = rgb(0, 0, 0);
         let sy = summaryY - 25;
         const labelX = summaryX + 30;
         const valueX = summaryX + summaryWidth - 50;
   
         const summaryData = [
           ["Total Appointments", filteredSummary.total],
           ["Completed", filteredSummary.completed],
           ["Pending", filteredSummary.pending],
           ["Approved", filteredSummary.approved],
           ["Rejected", filteredSummary.rejected],
           ["Cancelled", filteredSummary.cancelled],
         ];
   
         summaryData.forEach(([label, value]) => {
           currentPage.drawText(label + ":", { x: labelX, y: sy, size: 14, font: helveticaBold, color: blackColor });
           currentPage.drawText(Number(value).toString(), { x: valueX, y: sy, size: 18, font: helveticaBold, color: blackColor });
           sy -= 28;
         });
   
    // Save & Output
    const pdfBytes = await pdfDoc.save();
    const safeBytes = new Uint8Array(pdfBytes);
const blob = new Blob([safeBytes.buffer], { type: "application/pdf" });


    if (isPrint) {
      const url = URL.createObjectURL(blob);
      PrintJS({ printable: url, type: "pdf", showModal: true });
      toast.success("Ready to print!", { id: toastId });
    } else {
      const filename = `DDE_Report_${year || "All"}_${month || "All"}_${status}_${new Date().toISOString().slice(0,10)}.pdf`;
      saveAs(blob, filename);
      toast.success("PDF downloaded successfully!", { id: toastId });
    }

  } catch (err) {
    console.error("PDF Generation Error:", err);
    toast.error("Failed to inject data. Please try a different template.", { id: toastId });
  }
};

const handlePrint = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) generatePDFReport(file, true);
  };
  toast("Select your DOH template for printing", { icon: "Printer", duration: 8000 });
  input.click();
};

const handleDownloadPDFReport = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) generatePDFReport(file, false);
  };
  toast("Select your official DOH template", { icon: "File", duration: 8000 });
  input.click();
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
  
  useEffect(() => {
  const today = new Date();
  setYear(today.getFullYear().toString());
  setMonth(String(today.getMonth() + 1).padStart(2, "0")); 
}, []);




const [currentPage, setCurrentPage] = useState<number>(1);
const recordsPerPage = 10; 


const indexOfLastRecord = currentPage * recordsPerPage;
const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredData.length / recordsPerPage);

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


  return (
    <div className="dashboards">
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/dashboard_dde")}
            style={{ cursor: "pointer" }}
          >
            <img src="logo.png" alt="logo" className="logoss" />
            <span className="logo-texts">DDE</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/dashboard_dde")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_dde")}>
                Appointments
              </span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_dde")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item active">
              <FaChartBar className="nav-icon" />
              <span>Reports & Analytics</span>
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
          <h5 className="navbar-title">Reports and Analytics</h5>
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

        <div className="content-wrapper" ref={contentRef}>
          <div className="filters-containerss">
            
<div className="filterss">
  <label>Year:</label>
  <select
    value={year}
    onChange={(e) => setYear(e.target.value)}
    className="status-dropdown"
  >
    <option value="">All</option>
    {(() => {
      const currentYear = new Date().getFullYear();
      const startYear = 2020; 
      const futureBuffer = 30;

      const years = [];
      for (let y = currentYear + futureBuffer; y >= startYear; y--) {
        years.push(y);
      }
      return years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ));
    })()}
  </select>
</div>

           
<div className="filterss">
  <label>Month:</label>
  <select
    value={month}
    onChange={(e) => setMonth(e.target.value)}
    className="status-dropdown"
  >
    <option value="">All</option>
    {(() => {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const currentMonthIdx = new Date().getMonth(); 
      const recent: { name: string; value: string }[] = [];

      
      for (let i = 0; i < 3; i++) {
        const idx = (currentMonthIdx - i + 12) % 12;
        const monthNum = String(idx + 1).padStart(2, "0");
        recent.push({ name: monthNames[idx], value: monthNum });
      }

      return (
        <>
         
          {recent.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name}
            </option>
          ))}
        
          {monthNames.map((name, i) => {
            const val = String(i + 1).padStart(2, "0");
            if (recent.some((r) => r.value === val)) return null;
            return (
              <option key={val} value={val}>
                {name}
              </option>
            );
          })}
        </>
      );
    })()}
  </select>
            </div>

           
            <div className="filterss">
              <label>Status:</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusType)}>
                <option value="all">All Appointments</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <h5 className="section-title center">Appointment Trends</h5>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={filteredData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="requestDate" />
              <YAxis />
              <Tooltip />
              <Legend />
              {(status === "all" || status === "completed") && (
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                />
              )}
              {(status === "all" || status === "pending") && (
                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke="#f4a261"
                  strokeWidth={2}
                />
              )}
              {(status === "all" || status === "approved") && (
                <Line
                  type="monotone"
                  dataKey="approved"
                  stroke="#4caf50"
                  strokeWidth={2}
                />
              )}
              {(status === "all" || status === "rejected") && (
                <Line
                  type="monotone"
                  dataKey="rejected"
                  stroke="#ff9800"
                  strokeWidth={2}
                />
              )}
              {(status === "all" || status === "cancelled") && (
                <Line
                  type="monotone"
                  dataKey="cancelled"
                  stroke="#e76f51"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>

          <div id="print-content" style={{ display: "none" }}>
            <div className="print-header">
              <div className="header-left">
                <img src="logo.png" alt="logo" className="header-logo" />
              </div>
              <div className="header-center">
                <p>REPUBLIC OF THE PHILIPPINES</p>
                <p>DEPARTMENT OF HEALTH</p>
                <p>TREATMENT AND REHABILITATION CENTER ARGAO</p>
                <p><strong>DDE Section Report</strong></p>
                <p>
                  Date: {year || "All"}-{month || "All"} | Status: {status}
                </p>
              </div>
              <div className="header-right">
                <img src="pilipinas.png" alt="logo" className="header-logo" />
              </div>
            </div>

            <table className="appointments-tables">
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Total</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Approved</th>
                  <th>Rejected</th>
                  <th>Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => {
                  const total = row.completed + row.pending + row.approved + row.rejected + row.cancelled;
                  return (
                    <tr key={idx}>
                      <td>{row.requestDate}</td>
                      <td>{total}</td>
                      <td>{row.completed}</td>
                      <td>{row.pending}</td>
                      <td>{row.approved}</td>
                      <td>{row.rejected}</td>
                      <td>{row.cancelled}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <br />
            <br />
            <h3>Summary</h3>
              <div className="summary-sections">
  <div className="summary-cards">
    <span>Total Appointments</span>
    <strong>{filteredSummary.total}</strong>
  </div>
  <div className="summary-cards">
    <span>Completed</span>
    <strong>{filteredSummary.completed}</strong>
  </div>
  <div className="summary-cards">
    <span>Pending</span>
    <strong>{filteredSummary.pending}</strong>
  </div>
  <div className="summary-cards">
    <span>Approved</span>
    <strong>{filteredSummary.approved}</strong>
  </div>
  <div className="summary-cards">
    <span>Rejected</span>
    <strong>{filteredSummary.rejected}</strong>
  </div>
  <div className="summary-cards">
    <span>Cancelled</span>
    <strong>{filteredSummary.cancelled}</strong>
  </div>
</div>
</div>




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
                <th>Request Date</th>
                <th>Total</th>
                <th>Completed</th>
                <th>Pending</th>
                <th>Approved</th>
                <th>Rejected</th>
                <th>Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.length > 0 ? (
      currentRecords.map((row, idx) => {
        const total = row.completed + row.pending + row.approved + row.rejected + row.cancelled;
                return (
                  <tr key={idx}>
                    <td>{row.requestDate}</td>
                    <td>{total}</td>
                    <td>{row.completed}</td>
                    <td>{row.pending}</td>
                    <td>{row.approved}</td>
                    <td>{row.rejected}</td>
                    <td>{row.cancelled}</td>
                  </tr>
                );
              })    ) : (
      <tr>
        <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#888" }}>
          No records found for the selected filters.
        </td>
      </tr>
        )}
            </tbody>
          </table>


          {filteredData.length > recordsPerPage && (
  <div className="pagination-wrapper" style={{ marginTop: "30px" }}>
    <div className="pagination-info">
      Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredData.length)} of{" "}
      {filteredData.length} records
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
          className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${
            page === "..." ? "ellipsis" : ""
          }`}
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
)}


             <div className="summary-section">
  <div className="summary-card">
    <span>Total Appointments</span>
    <strong>{filteredSummary.total}</strong>
  </div>
  <div className="summary-card">
    <span>Completed</span>
    <strong>{filteredSummary.completed}</strong>
  </div>
  <div className="summary-card">
    <span>Pending</span>
    <strong>{filteredSummary.pending}</strong>
  </div>
  <div className="summary-card">
    <span>Approved</span>
    <strong>{filteredSummary.approved}</strong>
  </div>
  <div className="summary-card">
    <span>Rejected</span>
    <strong>{filteredSummary.rejected}</strong>
  </div>
  <div className="summary-card">
    <span>Cancelled</span>
    <strong>{filteredSummary.cancelled}</strong>
  </div>
</div>
</div>
 
           
        <div className="actions-section">
        <button onClick={handlePrint} className="button-print">
          Print Report
        </button>

        <button onClick={handleDownloadPDFReport} className="button-pdf">
          Download Report
        </button>
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
      </main>
    </div>
  );
};

export default ReportsAnalytics_DDE;