
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaEnvelope, FaUserPlus, FaUserTimes } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { db } from "../firebase";
import { collection, query, onSnapshot, where, doc, getDoc, orderBy, writeBatch, updateDoc, deleteDoc } from "firebase/firestore";
import { Printer } from "lucide-react";

import "../../../assets/SuperAdmin_Reports.css";
import logo from "/logo.png";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import { X } from "lucide-react";
import { Toaster } from 'react-hot-toast';
import { toast } from "react-toastify";

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
  type: "new_appointment" | "appointment_cancelled" | "info" | "contact_message";
  message: string;
  patientName: string;
  date: string;
  slotTime: string;
  timestamp: any;
  read: boolean;
  purpose?: string;
}





interface ChartData {
  date: string;
  department: string;
  totalAppointments: number;
  pending: number;
  approved: number;
  rejected: number;
  completed: number;
  cancelled: number;
}




interface Appointment {
  id: string;
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
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Cancelled";
  purpose: string;
  createdAt?: string;
}



const SuperAdmin_Reports: React.FC = () => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [yearFilter, setYearFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");

 
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



  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

 


  
  const departmentMapping: Record<string, string> = {
    dental: "Dental",
    clinical: "Clinical Laboratory",
    radiology: "Radiographic",
    dde: "DDE",
    medical_dre: "Medical",
  };

  
  const normalizeStatus = (status: string): Appointment["status"] => {
    const lowerStatus = status?.toLowerCase();
    const statusMap: Record<string, Appointment["status"]> = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      completed: "Completed",
      cancelled: "Cancelled",
    };
    return statusMap[lowerStatus] || "Pending";
  };


  const formatDate = (dateField: any): string => {
    if (!dateField) return "";
    if (dateField.toDate) {
     
      return dateField.toDate().toISOString().split("T")[0];
    }
    if (typeof dateField === "string") {
      
      if (/^\d{4}-\d{2}-\d{2}T/.test(dateField)) {
        return dateField.split("T")[0];
      }
     
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateField)) {
        return dateField;
      }
    }
    return "";
  };

  useEffect(() => {
  const now = new Date();
  setYearFilter(now.getFullYear().toString());
  setMonthFilter(now.toLocaleString("default", { month: "long" }));
}, []); 


 
  useEffect(() => {
    setLoading(true);
    let constraints = [];

   
    if (department !== "all") {
      constraints.push(where("purpose", "==", departmentMapping[department]));
    }

   
    if (statusFilter !== "All") {
      constraints.push(where("status", "==", statusFilter));
    }


    


    const transQuery = query(collection(db, "Transactions"), ...constraints);

    const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
      const loadedAppointments: Appointment[] = [];
      const dataByDate: Record<string, ChartData> = {};
      const invalidRecords: string[] = [];

      for (const t of transSnap.docs) {
        const tData = t.data();

    
        let patientData: any = {
          patientCode: "",
          lastName: "Unknown",
          firstName: "Unknown",
          middleInitial: "",
          age: 0,
          gender: "",
        };

        if (tData.patientId) {
          const pRef = doc(db, "Patients", tData.patientId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            patientData = pSnap.data();
          } else {
            console.warn(`No patient document found for patientId: ${tData.patientId} in transaction: ${t.id}`);
            invalidRecords.push(`Missing patient data for transaction: ${t.id}`);
          }
        } else {
          console.warn(`No patientId in transaction: ${t.id}`);
          invalidRecords.push(`Missing patientId in transaction: ${t.id}`);
        }

      
        const normalizedStatus = normalizeStatus(tData.status);

       
        const isDdeRejected = tData.purpose === "DDE" && normalizedStatus === "Rejected";
        const appointmentDate = isDdeRejected ? formatDate(tData.createdAt) : formatDate(tData.date);

       
        if (!appointmentDate) {
          console.warn(`Invalid or missing date in transaction: ${t.id}, date: ${tData.date}, createdAt: ${tData.createdAt}`);
          invalidRecords.push(`Invalid date in transaction: ${t.id}, date: ${tData.date}, createdAt: ${tData.createdAt}`);
          continue; 
        }

        const dept = department === "all" ? tData.purpose : departmentMapping[department];

     
const dateObj = new Date(appointmentDate);
const yearStr = dateObj.getFullYear().toString();
const monthName = dateObj.toLocaleString("default", { month: "long" }); 


if (yearFilter !== "All" && yearStr !== yearFilter) continue;
if (monthFilter !== "All" && monthName !== monthFilter) continue;

       
       if (!dataByDate[appointmentDate]) {
  dataByDate[appointmentDate] = {
    date: appointmentDate,
    department: department === "all" ? "All" : dept,
    totalAppointments: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
  };
}


if (!(normalizedStatus === "Rejected" && tData.purpose !== "DDE")) {
  dataByDate[appointmentDate].totalAppointments += 1;
}


if (normalizedStatus === "Pending") {
  dataByDate[appointmentDate].pending += 1;
} else if (normalizedStatus === "Approved") {
  dataByDate[appointmentDate].approved += 1;
} else if (normalizedStatus === "Rejected") {
  dataByDate[appointmentDate].rejected += 1; 
} else if (normalizedStatus === "Completed") {
  dataByDate[appointmentDate].completed += 1;
} else if (normalizedStatus === "Cancelled") {
  dataByDate[appointmentDate].cancelled += 1;
}
        else {
          console.warn(`Unexpected status "${tData.status}" in transaction: ${t.id}`);
          invalidRecords.push(`Unexpected status "${tData.status}" in transaction: ${t.id}`);
        }

      
        loadedAppointments.push({
          id: t.id,
          patientId: tData.patientId || "",
          patientCode: patientData.patientCode || "",
          lastname: patientData.lastName || "Unknown",
          firstname: patientData.firstName || "Unknown",
          middleInitial: patientData.middleInitial || "",
          age: patientData.age || 0,
          gender: patientData.gender || "",
          services: Array.isArray(tData.services) ? tData.services : [],
          appointmentDate,
          slot: tData.slotTime || "",
          status: normalizedStatus,
          purpose: tData.purpose || "",
          createdAt: formatDate(tData.createdAt),
        });
      }

      if (invalidRecords.length > 0) {
        console.warn(`Found ${invalidRecords.length} invalid records:`, invalidRecords);
        toast.warn(`Found ${invalidRecords.length} invalid records. Check console for details.`, {
          position: "top-center",
        });
      }

      const aggregatedData = Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
      setChartData(aggregatedData);
      setAppointments(loadedAppointments);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      toast.error(`Failed to fetch data: ${error.message}`, {
        position: "top-center",
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [department, statusFilter, yearFilter, monthFilter]);

  

const showRejectedInTotal = department === "all" || department === "dde";
  
  const displayTotals = chartData.reduce(
  (acc, curr) => {
   
    const total = showRejectedInTotal
      ? curr.pending + curr.approved + curr.rejected + curr.completed + curr.cancelled
      : curr.pending + curr.approved + curr.completed + curr.cancelled;

    acc.totalAppointments += total;
    acc.pending += curr.pending;
    acc.approved += curr.approved;
    acc.rejected += curr.rejected;
    acc.completed += curr.completed;
    acc.cancelled += curr.cancelled;
    return acc;
  },
  { totalAppointments: 0, pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0 }
);




  const generateOfficialReport = async (file: File, isPrint: boolean = false) => {
 
  const id = toast.loading(
  isPrint ? "Preparing report for printing..." : "Generating official report..."
);
toast.dismiss(id);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    if (pages.length === 0) throw new Error("Invalid or empty template");

    const helvetica = await pdfDoc.embedFont("Helvetica");
    const helveticaBold = await pdfDoc.embedFont("Helvetica-Bold");

    const blue = rgb(0.05, 0.3, 0.65);
    const darkRed = rgb(0.8, 0, 0);
    const black = rgb(0, 0, 0);

    // Determine period text
    const yearText = yearFilter === "All" ? "All Years" : yearFilter;
    const monthText = monthFilter === "All" ? "" : monthFilter;
    const periodText = monthFilter === "All" ? yearText : `${monthText} ${yearText}`;
    const deptText = department === "all" ? "All Departments" : departmentMapping[department];
    const statusText = statusFilter === "All" ? "All Statuses" : statusFilter;

    const generatedAt = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

    let currentPage = pages[0];
    let y = 680;

    // Copy first page as template
    const [templatePage] = await pdfDoc.copyPages(pdfDoc, [0]);

    const drawCentered = (text: string, yPos: number, size = 12, bold = false) => {
      const font = bold ? helveticaBold : helvetica;
      const width = font.widthOfTextAtSize(text, size);
      currentPage.drawText(text, {
        x: (595.28 - width) / 2,
        y: yPos,
        size,
        font,
        color: bold ? blue : black,
      });
    };

    // Header
    drawCentered("SUPER ADMIN REPORT", y, 18, true);
    y -= 35;
    drawCentered(`Period: ${periodText}`, y, 14);
    y -= 28;
    drawCentered(`Department: ${deptText}`, y, 14);
    y -= 28;
    drawCentered(`Status Filter: ${statusText}`, y, 14);
    y -= 28;
    drawCentered(`Generated: ${generatedAt}`, y, 11);
    y -= 60;

    // Table Headers (7 columns)
    const colX = [50, 130, 210, 280, 350, 420, 490];
    const headers = ["Date",  "Total", "Pending", "Approved", "Rejected", "Completed", "Cancelled"];

    const drawHeader = () => {
      currentPage.drawRectangle({ x: 40, y: y - 5, width: 515, height: 28, color: blue });
      headers.forEach((h, i) => {
        currentPage.drawText(h, {
          x: colX[i],
          y: y + 6,
          size: 11,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });
      });
      y -= 35;
    };

    drawHeader();

    // Table Rows
    chartData.forEach((row) => {
      if (y < 100) {
        currentPage = pdfDoc.addPage(templatePage);
        y = 680;
        drawHeader();
      }

      const total = showRejectedInTotal
        ? row.pending + row.approved + row.rejected + row.completed + row.cancelled
        : row.pending + row.approved + row.completed + row.cancelled;

      const cells = [
        row.date,
       
        total.toString(),
        row.pending.toString(),
        row.approved.toString(),
        row.rejected.toString(),
        row.completed.toString(),
        row.cancelled.toString(),
      ];

      cells.forEach((cell, i) => {
        currentPage.drawText(cell, {
          x: colX[i],
          y: y + 5,
          size: 10.5,
          font: helvetica,
          color: i === 2 ? darkRed : black,
        });
      });

      currentPage.drawLine({
        start: { x: 40, y: y - 5 },
        end: { x: 555, y: y - 5 },
        thickness: 0.5,
        color: rgb(0.75, 0.75, 0.75),
      });

      y -= 26;
    });

    // Summary Box
    if (y < 250) {
      currentPage = pdfDoc.addPage(templatePage);
      y = 680;
    }

    const summaryY = y - 20;
    const boxWidth = 400;
    const boxX = (595.28 - boxWidth) / 2;

    currentPage.drawRectangle({
      x: boxX,
      y: summaryY - 200,
      width: boxWidth,
      height: 190,
      borderColor: blue,
      borderWidth: 2,
    });

    let sy = summaryY - 30;
    const labelX = boxX + 30;
    const valueX = boxX + boxWidth - 80;

    const summaryItems = [
      ["Total Appointments", displayTotals.totalAppointments],
      ["Pending", displayTotals.pending],
      ["Approved", displayTotals.approved],
      ["Completed", displayTotals.completed],
      ["Cancelled", displayTotals.cancelled],
    ];

    // Only show Rejected if applicable
    if (showRejectedInTotal) {
      summaryItems.splice(3, 0, ["Rejected", displayTotals.rejected]);
    }

    summaryItems.forEach(([label, value]) => {
      currentPage.drawText(label + ":", { x: labelX, y: sy, size: 14, font: helveticaBold, color: black });
      currentPage.drawText(value.toString(), { x: valueX, y: sy, size: 18, font: helveticaBold, color: black });
      sy -= 32;
    });

    // Finalize
  const pdfBytes = await pdfDoc.save();
    const safeBytes = new Uint8Array(pdfBytes);
const blob = new Blob([safeBytes.buffer], { type: "application/pdf" });

    if (isPrint) {
      const url = URL.createObjectURL(blob);
      PrintJS({ printable: url, type: "pdf", showModal: true });
      toast.success("Report ready for printing!");
    } else {
      const filename = `SuperAdmin_Report_${periodText.replace(/ /g, "_")}_${deptText.replace(/ /g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      saveAs(blob, filename);
      toast.success("Official report downloaded!");

    }
  } catch (err) {
    console.error("PDF Generation Failed:", err);
    toast.error("Failed to generate report. Make sure you selected a valid DOH PDF template.");
  }
};

// New Handlers (parehas ra sa DDE)
const handlePrint = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) generateOfficialReport(file, true);
  };
 toast("Select your official DOH template for printing", {
  icon: <Printer />
});

  input.click();
};

const handleDownloadPDF = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf";
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) generateOfficialReport(file, false);
  };
toast("Select your official DOH template PDF", {
  icon: <Printer />
});
  input.click();
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
            <div className="nav-items">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-items active">
              <FaChartBar className="nav-icon" />
              <span>Reports & Analytics</span>
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
        <div className="content-wrapper-reports" ref={contentRef}>
        <div className="filters-container-reports">
  <div className="filter-reports">
    <label>Department:</label>
    <select value={department} onChange={(e) => setDepartment(e.target.value)}>
      <option value="all">All Departments</option>
      <option value="dental">Dental</option>
      <option value="clinical">Clinical</option>
      <option value="radiology">Radiology</option>
      <option value="dde">DDE</option>
      <option value="medical_dre">Medical DRE</option>
    </select>
  </div>

  <div className="filter-reports">
    <label>Status:</label>
    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
      <option value="All">All</option>
      <option value="Pending">Pending</option>
      <option value="Approved">Approved</option>
      <option value="Rejected">Rejected</option>
      <option value="Completed">Completed</option>
      <option value="Cancelled">Cancelled</option>
    </select>
  </div>

  {/* YEAR FILTER – starts with current year selected */}
  <div className="filter-reports">
    <label>Year:</label>
              <select
                className="status-dropdowns"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                onClick={handleYearClick}
              >
                <option value="All">All</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
  </div>

  {/* MONTH FILTER – shows month names, current month selected */}
  <div className="filter-reports">
    <label>Month:</label>
    <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
      <option value="All">All </option>
      {[
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
      ].map((month) => (
        <option key={month} value={month}>
          {month}
        </option>
      ))}
    </select>
  </div>

  {/* Day filter – you already had this, kept as-is (optional) */}
  {/* <div className="filter-reports">
    <label>Day:</label>
    <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
      <option value="All">All Days</option>
      {Array.from({ length: 31 }, (_, i) => (
        <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
          {i + 1}
        </option>
      ))}
    </select>
  </div> */}
</div>

          {/* Department Trends Graph */}
          <h5 className="section-title center">Department Trends</h5>
          <div className="line graph">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={chartData}
                margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalAppointments"
                  stroke="#2a9d8f"
                  strokeWidth={2}
                  name="Total Appointments"
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  stroke="#f4a261"
                  strokeWidth={2}
                  name="Pending"
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  stroke="#e76f51"
                  strokeWidth={2}
                  name="Approved"
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  stroke="#8f0505ff"
                  strokeWidth={2}
                  name="Rejected"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#8a2be2"
                  strokeWidth={2}
                  name="Completed"
                />
                <Line
                  type="monotone"
                  dataKey="cancelled"
                  stroke="#6b7280"
                  strokeWidth={2}
                  name="Cancelled"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Hidden print content */}
          <div id="print-content" style={{ display: 'none' }}>
            <div className="print-header">
              <div className="header-left">
                <img src="/logo.png" alt="logo" className="header-logo" />
              </div>
              <div className="header-center">
                <p>REPUBLIC OF THE PHILIPPINES</p>
                <p>DEPARTMENT OF HEALTH</p>
                <p>TREATMENT AND REHABILITATION CENTER ARGAO</p>
                <p><strong>Super Admin Report</strong></p>
                <p>
                  Date: {yearFilter || "All"}-{monthFilter || "All"} | 
                  Department: {department === "all" ? "All" : departmentMapping[department]} | 
                  Status: {statusFilter}
                </p>
              </div>
              <div className="header-right">
                <img src="/pilipinas.png" alt="logo" className="header-logo" />
              </div>
            </div>

            {/* Appointment Table */}
            <table className="appointments-tables">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Department</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>Approved</th>
                 <th>Rejected</th>
                  <th>Completed</th>
                  <th>Cancelled</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{row.department}</td>
                    <td>{row.totalAppointments}</td>
                    <td>{row.pending}</td>
                    <td>{row.approved}</td>
                   <td>{row.rejected}</td>
                    <td>{row.completed}</td>
                    <td>{row.cancelled}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <br />
            <br />
            <h3>Summary</h3>
            {/* Summary Section */}
            <div className="summary-sections">
              <div className="summary-cards">
                <span>Total Appointments</span>
                <strong>{displayTotals.totalAppointments}</strong>
              </div>
              <div className="summary-cards">
                <span>Pending</span>
                <strong>{displayTotals.pending}</strong>
              </div>
              <div className="summary-cards">
                <span>Approved</span>
                <strong>{displayTotals.approved}</strong>
              </div>
            <th>Rejected</th>
<td>{displayTotals.rejected}</td>

{/* Sa summary */}
<div className="summary-card">
  <span>Rejected</span>
  <strong>{displayTotals.rejected}</strong>
</div>
              <div className="summary-cards">
                <span>Completed</span>
                <strong>{displayTotals.completed}</strong>
              </div>
              <div className="summary-cards">
                <span>Cancelled</span>
                <strong>{displayTotals.cancelled}</strong>
              </div>
            </div>
          </div>
          {/* End of Print Content */}




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

          {/* Appointment Table */}
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Department</th>
                <th>Total Appointments</th>
                <th>Pending</th>
                <th>Approved</th>
              <th>Rejected</th>
                <th>Completed</th>
                <th>Cancelled</th>
              </tr>
            </thead>
            <tbody>
              {chartData.length > 0 ? (
                chartData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{row.department}</td>
                    <td>{row.totalAppointments}</td>
                    <td>{row.pending}</td>
                    <td>{row.approved}</td>
                    <td>{row.rejected}</td>
                    <td>{row.completed}</td>
                    <td>{row.cancelled}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center" }}>
                    {loading ? "Loading..." : "No data in this range"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
</div>
          {/* Summary Section */}
         <div className="summary-section">
  <div className="summary-card">
    <span>Total Appointments</span>
    <strong>{displayTotals.totalAppointments}</strong>
  </div>
  <div className="summary-card">
    <span>Pending</span>
    <strong>{displayTotals.pending}</strong>
  </div>
  <div className="summary-card">
    <span>Approved</span>
    <strong>{displayTotals.approved}</strong>
  </div>
  {/* Only show Rejected if DDE is in view */}
  {showRejectedInTotal && (
    <div className="summary-card">
      <span>Rejected</span>
      <strong>{displayTotals.rejected}</strong>
    </div>
  )}
  <div className="summary-card">
    <span>Completed</span>
    <strong>{displayTotals.completed}</strong>
  </div>
  <div className="summary-card">
    <span>Cancelled</span>
    <strong>{displayTotals.cancelled}</strong>
  </div>
</div>
         <div className="actions-section">
  <button onClick={handlePrint} className="button-print">
    Print  Report
  </button>
  <button onClick={handleDownloadPDF} className="button-pdf">
    Download Report
  </button>
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

export default SuperAdmin_Reports;