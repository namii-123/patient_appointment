import React, { useState, useEffect, useCallback } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, FaTimes, FaCheckCircle, FaEye } from "react-icons/fa";
import "../../../assets/Appointments_Dental.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { sendEmail } from "../emailService";
import ShortUniqueId from "short-unique-id";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { CircleX, X } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

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



// Types
interface FileItem {
  base64: string;
  name: string;
  uploadedAt: string;
}
interface AppointmentWithType extends Appointment {
  appointmentType?: "voluntary" | "pleabargain" | string;
  admissionTypeDisplay?: string;
  voluntaryAdmissionFiles?: FileItem[] | null;
  validIDFiles?: FileItem[] | null;
 
}
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
  appointmentType?: "voluntary" | "pleabargain" | string;  
  admissionType?: "voluntary" | "pleabargain" | string;     
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
  requestDate: string;
  appointmentDate: string;
  slotTime?: string;
  slotID?: string;
  purpose: string;
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  validIDData?: { validIDFiles?: FileItem[] | null } | null;
  courtOrderData?: { courtFiles?: FileItem[] | null } | null;
  paoData?: { paoFiles?: FileItem[] | null } | null;
  empData?: { empFiles?: FileItem[] | null } | null;
  lawyersRequestData?: { lawyersRequestFiles?: FileItem[] | null } | null;
  receiptData?: { officialReceiptFiles?: FileItem[] | null } | null;

}



const Appointments_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<AppointmentWithType | null>(null);
  

  const [showInfoModal, setShowInfoModal] = useState(false);
 
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; name: string } | null>(null);

  
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
  
  
  


  const getLocalDateString = (timestamp: any): string => {
    if (!timestamp) return "N/A";

    let date: Date;

    if (typeof timestamp === "string") {
      date = new Date(timestamp);
    } else if (timestamp?.toDate) {
      date = timestamp.toDate(); 
    } else {
      return "N/A";
    }

   
    const phDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return phDate.toISOString().split("T")[0]; 
  };


  useEffect(() => {
    setLoading(true);
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "DDE"),
      where("status", "in", ["Pending", "Cancelled"])
    );

    const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
      const loaded: Appointment[] = [];

      for (const t of transSnap.docs) {
        const tData = t.data();
        console.log(`Transaction ${t.id} createdAt:`, tData.createdAt);

        let patientData: any = {
          UserId: " ",
          lastName: "Unknown",
          firstName: "Unknown",
          middleInitial: "Unknown",
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

        let userId = " ";
        if (tData.uid) {
          const userRef = doc(db, "Users", tData.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userId = userSnap.data().UserId || " ";
          }
        }

        if (tData.patientId) {
          const pRef = doc(db, "Patients", tData.patientId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            patientData = pSnap.data();
            console.log(`Fetched patient data for ID ${tData.patientId}:`, patientData);
          } else {
            console.warn(`No patient document found for patientId: ${tData.patientId}`);
          }
        } else {
          console.warn(`No patientId in transaction: ${t.id}`);
        }

        const mapFileData = (fieldData: any, fileKey: string): { [key: string]: FileItem[] | null } | null => {
          let filesArray = fieldData;
          if (fieldData && typeof fieldData === 'object' && fileKey in fieldData) {
            filesArray = fieldData[fileKey];
          }
          if (filesArray && Array.isArray(filesArray) && filesArray.length > 0) {
            return {
              [fileKey]: filesArray.map((file: any) => ({
                base64: file.base64 || "",
                name: file.name || `${fileKey.replace("Files", "")}_file_${file.uploadedAt || new Date().toISOString()}.jpg`,
                uploadedAt: file.uploadedAt || new Date().toISOString(),
              })),
            };
          }
          return null;
        };

        let validIDData = mapFileData(tData.validIDFiles, "validIDFiles");
        let courtOrderData = mapFileData(tData.courtOrderData, "courtFiles");
        let paoData = mapFileData(tData.paoData, "paoFiles");
        let empData = mapFileData(tData.empData, "empFiles");
        let lawyersRequestData = mapFileData(tData.lawyersRequestData, "lawyersRequestFiles");
        let receiptData = mapFileData(tData.receiptData, "officialReceiptFiles");

        


        const requestDate = getLocalDateString(tData.createdAt);
        loaded.push({
          id: t.id,
          uid: tData.uid || "",
          UserId: userId,
          patientId: tData.patientId || "",
          patientCode: patientData.patientCode || "",
          lastName: patientData.lastName || "Unknown",
          firstName: patientData.firstName || "Unknown",
          middleInitial: patientData.middleInitial || "Unknown",
          age: patientData.age || 0,
          gender: patientData.gender || "",
          services: Array.isArray(tData.services) ? tData.services : [],
          appointmentType: patientData.appointmentType || tData.appointmentType || "voluntary",
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
          requestDate,
          appointmentDate: tData.date || "",
          slotTime: tData.slotTime || "",
          slotID: tData.slotID || "",
          purpose: tData.purpose || "DDE",
          status: tData.status || "Pending",
          validIDData,
          courtOrderData,
          paoData,
          empData,
          lawyersRequestData,
          receiptData,
        });
      }

     loaded.sort((a, b) => {
        const dateA = a.requestDate || "0000-00-00";
        const dateB = b.requestDate || "0000-00-00";
        return dateB.localeCompare(dateA); 
      });

      console.log("Loaded appointments (sorted newest first):", loaded);
      setAppointments(loaded);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching appointments:", error);
        setTimeout(() => setLoading(false), 300);
    });

    return () => unsubscribe();
  }, []);




  const handleStatusUpdate = async (
    id: string,
    newStatus: "Approved" | "Rejected",
    appointment: Appointment,
    rejectReason?: string,
    newDate?: string,
    newSlotTime?: string
  ) => {
    setLoading(true);
    try {
      const ref = doc(db, "Transactions", id);
      const updates: any = { status: newStatus };
      if (newStatus === "Approved" && newDate && newSlotTime) {
        const { randomUUID } = new ShortUniqueId({ length: 8 });
        const slotID = `SLOT-${randomUUID()}`;
        updates.date = newDate;
        updates.slotTime = newSlotTime; // Save with AM/PM
        updates.slotID = slotID;
      } else if (newStatus === "Rejected") {
        updates.date = "";
        updates.slotTime = "";
        updates.slotID = "";
      }
      await updateDoc(ref, updates);

      setAppointments((prev) => prev.filter((appt) => appt.id !== id));

      if (!appointment.email) {
        console.warn(`No email address for appointment ${id}`);
        alert("⚠️ Cannot send email: No email address provided.");
        return;
      }

      const isValidEmail = /\S+@\S+\.\S+/.test(appointment.email);
      if (!isValidEmail) {
        console.error(`Invalid email format for appointment ${id}:`, appointment.email);
        alert("⚠️ Cannot send email: Invalid email format.");
        return;
      }

      console.log(`Sending email for appointment ${id} to: ${appointment.email}`);
      const scheduledDate = newDate || appointment.appointmentDate;
      const scheduledTime = newSlotTime || "";
      const message =
        newStatus === "Approved"
          ? `We are pleased to inform you that your DDE appointment scheduled for ${scheduledDate}${scheduledTime ? ` at ${scheduledTime}` : ""} has been approved.
  
Slot ID: ${updates.slotID || "N/A"}.

Please make sure to bring the following documents when you visit the DDE clinic:
- Data Privacy Consent Form
- Assessment Form
- Any documents you have uploaded during the online appointment
- A valid ID for verification

Please arrive on time for your appointment and coordinate with the clinic staff for further assistance.

Thank you for choosing our DDE services.

Best regards,
DDE Team`
          : `We regret to inform you that your DDE appointment request has been rejected.
Reason: ${rejectReason || "Not specified"}.

Please contact us if you have any questions or wish to reschedule.

Sincerely,
DDE Team`;

      await sendEmail(
        appointment.email!,
        `${appointment.firstName} ${appointment.lastName}`,
        message,
        scheduledDate,
        scheduledTime
      );

      if (appointment.uid) {
        const notifCollection = collection(db, "Users", appointment.uid, "notifications");
        await addDoc(notifCollection, {
          text: newStatus === "Approved" 
            ? `Your DDE appointment for ${scheduledDate}${scheduledTime ? ` at ${scheduledTime}` : ""} has been approved.` 
            : `Your DDE appointment request has been rejected. Reason: ${rejectReason || "Not specified"}`,
          read: false,
          timestamp: serverTimestamp(),
          type: newStatus === "Approved" ? "approved" : "rejected",
        });
      }

        openCustomModal(`DDE appointment ${newStatus} successfully!`);
    } catch (error) {
      console.error(`Error updating status for appointment ${id}:`, error);
        openCustomModal("❌ Error updating DDE appointment status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

       
  
   
   
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [filterYear, setFilterYear] = useState<string>("All");
  const [filterMonth, setFilterMonth] = useState<string>("All");


  useEffect(() => {
    const today = new Date();
    setFilterYear(today.getFullYear().toString());
    setFilterMonth(String(today.getMonth() + 1).padStart(2, "0")); 
  }, []);


   const [admissionTypeFilter, setAdmissionTypeFilter] = useState<string>("All");
 
  const filteredAppointments = appointments.filter((appt) => {
  const matchesSearch =
    appt.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.UserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appt.patientCode.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus = statusFilter === "All" || appt.status === statusFilter;

  const [year, month] = (appt.appointmentDate || "").split("-");
  const matchesYear = filterYear === "All" || year === filterYear;
  const matchesMonth = filterMonth === "All" || month === filterMonth;

  // NEW: Admission Type Filter
  const matchesAdmissionType = admissionTypeFilter === "All" || 
    appt.appointmentType === admissionTypeFilter || 
    appt.admissionType === admissionTypeFilter;

  return matchesSearch && matchesStatus && matchesYear && matchesMonth && matchesAdmissionType;
});


  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [showAcceptModal, setShowAcceptModal] = useState<boolean>(false);
  const [newDate, setNewDate] = useState<string>("");
  const [newSlotTime, setNewSlotTime] = useState<string>("08");
  const [newMinutes, setNewMinutes] = useState<string>("00");
  const [selectedAmPm, setSelectedAmPm] = useState<"AM" | "PM">("AM");

 const renderFormData = (
  data: any,
  label: string,
  fileKey?: string
): React.ReactNode => {
  let files: FileItem[] = [];

  if (Array.isArray(data)) {
    files = data;
  } else if (data && typeof data === "object" && fileKey && Array.isArray(data[fileKey])) {
    files = data[fileKey];
  }

  if (files.length === 0) {
    return (
      <tr>
        <th>{label}</th>
        <td>N/A</td>
      </tr>
    );
  }

  return (
    <tr>
      <th>{label}</th>
      <td>
        {files.map((file: any, index: number) => {
          const base64 = file.base64 || "";
          const name = file.name || `File ${index + 1}`;
          const uploadedAt = file.uploadedAt || new Date().toISOString();

          if (!base64.startsWith("data:")) {
            return <p key={index}>Invalid file</p>;
          }

          const isImage = base64.startsWith("data:image/");
          const isPDF = base64.startsWith("data:application/pdf");

          return (
            <div key={index} className="file-item" style={{ marginBottom: "1rem" }}>
              {isImage ? (
                <img
                  src={base64}
                  alt={name}
                  className="form-image"
                  style={{ maxWidth: "250px", maxHeight: "250px", cursor: "pointer", borderRadius: "8px" }}
                  onClick={() => {
                    setEnlargedImage({ src: base64, name });
                    setShowEnlargedImage(true);
                  }}
                />
              ) : isPDF ? (
                <div>
                  <iframe src={base64} style={{ width: "250px", height: "300px" }} title={name} />
                  <br />
                  <a href={base64} download={name} style={{ color: "#2563eb" }}>
                    Download {name}
                  </a>
                </div>
              ) : (
                <a href={base64} download={name} style={{ color: "#2563eb" }}>
                  Download {name}
                </a>
              )}
              <p style={{ fontSize: "0.9rem", color: "#555", marginTop: "0.5rem" }}>
                {name} <br />
                <small>Uploaded: {new Date(uploadedAt).toLocaleString()}</small>
              </p>
            </div>
          );
        })}
      </td>
    </tr>
  );
};

  



  const formatSlotTime = (hours: string, minutes: string, amPm: "AM" | "PM"): string => {
    return `${hours}:${minutes} ${amPm}`;
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
const recordsPerPage = 5; 


const indexOfLastRecord = currentPage * recordsPerPage;
const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
const currentAppointments = filteredAppointments.slice(indexOfFirstRecord, indexOfLastRecord);

const totalPages = Math.ceil(filteredAppointments.length / recordsPerPage);


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
            onClick={() => navigate("/dashboard_dde")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="DDE Dental Logo" className="logoss" />
            <span className="logo-texts">DDE</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => navigate("/dashboard_dde")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item active">
              <FaCalendarAlt className="nav-icon" />
              <span>Appointments</span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => navigate("/patientrecords_dde")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => navigate("/reports&analytics_dde")}>
                Reports & Analytics
              </span>
            </div>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="user-box">
            <FaUser className="user-icon" />
            <span className="user-label"> Admin</span>
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
          <h5 className="navbar-title">Appointments</h5>
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

        <div className="content-wrapper">
          <div className="filter-barrss">
                            <div className="search-containerrrr">
                                <div className="search-bar-wrapper">
                                  <FaSearch className="search-icon" />
                                  <input
                                    type="text"
                                    placeholder="Search by Name or Number..."
                                    className="search-bar"
                                    value={searchTerm}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                  />
                                </div>
                    </div>
                               <div className="filter">
                                                            <label>Status:</label>
                                                            <select
                                                              className="status-dropdowns"
                                                              value={statusFilter}
                                                              onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                                                            >
                                                              <option value="All">All</option>
                                                              <option value="Pending">Pending</option>
                                                              <option value="Cancelled">Cancelled</option>
                                                            </select>
                                                          </div>
                           

                           <div className="filter">
  <label>Admission Type:</label>
  <select
    className="status-dropdowns"
    value={admissionTypeFilter}
    onChange={(e) => setAdmissionTypeFilter(e.target.value)}
  >
    <option value="All">All Types</option>
    <option value="voluntary">Voluntary Admission</option>
    <option value="pleabargain">Plea Bargain (Court-Ordered)</option>
  </select>
</div>
            <div className="filter">
              <label>Year:</label>
              <select
                className="status-dropdowns"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              >
                {(() => {
                  const currentYear = new Date().getFullYear();
                  const startYear = 2025;
                  const endYear = currentYear + 20;
                  const years = [];
                  for (let y = endYear; y >= startYear; y--) {
                    years.push(y);
                  }
                  return (
                    <>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                      <option value="All">All Years</option>
                    </>
                  );
                })()}
              </select>
            </div>

         
            <div className="filter">
              <label>Month:</label>
              <select
                className="status-dropdowns"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              >
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
                      <option value="All">All Months</option>
                    </>
                  );
                })()}
              </select>
            </div>
                                </div>

          <p className="appointments-header">All Patient Appointment Requests</p>
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
          <table className="appointments-tabless">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Patient ID</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Services</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Action</th>
                <th>More</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="no-records">
                    Loading dde appointments...
                  </td>
                </tr>
              ) : currentAppointments.length > 0 ? (
                currentAppointments.map((appt) => (
                  <tr key={appt.id}>
                    <td>{appt.UserId}</td>
                    <td>{appt.patientCode}</td>
                    <td>{appt.lastName}</td>
                    <td>{appt.firstName}</td>
                    <td>{appt.services.join(", ")}</td>
                    <td>{appt.appointmentDate || "N/A"}</td>
                    <td>
                      <span className={`status-text ${appt.status.toLowerCase()}`}>
                        {appt.status}
                      </span>
                    </td>
                    <td>
                      {appt.status === "Pending" && (
                        <>
                         <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            className="action-btnsss accept"
                            onClick={async () => {
                              if (appt.patientId) {
                                const pRef = doc(db, "Patients", appt.patientId);
                                const pSnap = await getDoc(pRef);
                                if (pSnap.exists()) {
                                  const patientData = pSnap.data();
                                  console.log("Patient data for accept:", patientData);
                                  if (!patientData.email) {
                                     openCustomModal("⚠️ No email address found for this patient.");
                                    return;
                                  }
                                  setSelectedAppointment({
                                    ...appt,
                                    ...patientData,
                                  });
                                  setNewDate(appt.appointmentDate);
                                  setNewSlotTime("08");
                                  setNewMinutes("00");
                                  setSelectedAmPm("AM");
                                  setShowAcceptModal(true);
                                } else {
                                  console.warn("No patient data for patientId:", appt.patientId);
                                    openCustomModal("⚠️ No patient data found.");
                                }
                              } else {
                                 openCustomModal("⚠️ No patientId found for this appointment.");
                              }
                            }}
                          >
                           <FaCheckCircle size={20} />
                          </button>
                          
                           <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                          <button
                            className="action-btnsss reject"
                            onClick={async () => {
                              if (appt.patientId) {
                                const pRef = doc(db, "Patients", appt.patientId);
                                const pSnap = await getDoc(pRef);
                                if (pSnap.exists()) {
                                  const patientData = pSnap.data();
                                  console.log("Patient data for reject:", patientData);
                                  if (!patientData.email) {
                                      openCustomModal("⚠️ No email address found for this patient.");
                                    return;
                                  }
                                  setSelectedAppointment({
                                    ...appt,
                                    ...patientData,
                                  });
                                  setShowRejectModal(true);
                                } else {
                                  console.warn("No patient data for patientId:", appt.patientId);
                                    openCustomModal("⚠️ No patient data found.");
                                }
                              } else {
                                  openCustomModal("⚠️ No patientId found for this appointment.");
                              }
                            }}
                          >
                           <CircleX size={20} />
                          </button>
                          </div>
                          </div>
                        </>
                      )}
                    </td>
                    <td>
                    <button
  className="action-btnsss view-more"
  onClick={async () => {
    if (!appt.patientId) {
      openCustomModal("No patientId found for this appointment.");
      return;
    }

    const pRef = doc(db, "Patients", appt.patientId);
    const tRef = doc(db, "Transactions", appt.id);

    try {
      const [pSnap, tSnap] = await Promise.all([getDoc(pRef), getDoc(tRef)]);

      if (!pSnap.exists() || !tSnap.exists()) {
        openCustomModal("No patient or transaction data found.");
        return;
      }

      const patientData = pSnap.data();
      const transactionData = tSnap.data();

      const type = patientData.appointmentType || patientData.admissionType || "Not Specified";

      setSelectedPatient({
        ...appt,
        ...patientData,
        appointmentType: type,
        admissionTypeDisplay:
          type === "voluntary"
            ? "Voluntary Admission"
            : type === "pleabargain"
            ? "Plea Bargain (Court-Ordered)"
            : "Not Specified",
        validIDData: transactionData.validIDData || null,
        courtOrderData: transactionData.courtOrderData || null,
        paoData: transactionData.paoData || null,
        empData: transactionData.empData || null,
        lawyersRequestData: transactionData.lawyersRequestData || null,
        receiptData: transactionData.receiptData || null,
        voluntaryAdmissionFiles: transactionData.voluntaryAdmissionFiles || null,
        validIDFiles: transactionData.validIDFiles || null,
      });

      setShowInfoModal(true);
    } catch (err) {
      console.error(err);
      openCustomModal("Error loading patient information.");
    }
  }}
>
  <FaEye size={20} />
</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="no-records">
                    No dde appointment requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
</div>

{/* PAGINATION */}
<div className="pagination-wrapper">
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
        className={`pagination-btn page-num ${page === currentPage ? "active" : ""} ${page === "..." ? "ellipsis" : ""}`}
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
          {showInfoModal && selectedPatient && (
            <div className="modal-overlayss">
              <div className="modal-boxss">
                <h3>DDE Patient Information</h3>
                <div className="modal-contentss">
                  <table className="info-table">
                    <tbody>
                      <tr><th>User ID</th><td>{selectedPatient.UserId}</td></tr>
                      <tr><th>Patient ID</th><td>{selectedPatient.patientCode}</td></tr>
                      <tr><th>Control No.</th><td>{selectedPatient.controlNo || "N/A"}</td></tr>
                      <tr><th>Last Name</th><td>{selectedPatient.lastName}</td></tr>
                      <tr><th>First Name</th><td>{selectedPatient.firstName}</td></tr>
                      <tr><th>Middle Initial</th><td>{selectedPatient.middleInitial || "N/A"}</td></tr>
                      <tr><th>Birthdate</th><td>{selectedPatient.birthdate || "N/A"}</td></tr>
                      <tr><th>Age</th><td>{selectedPatient.age}</td></tr>
                      <tr><th>Gender</th><td>{selectedPatient.gender}</td></tr>
                      <tr><th>Citizenship</th><td>{selectedPatient.citizenship || "N/A"}</td></tr>
                      <tr className="section-header">
                        <th colSpan={2}>Address</th>
                      </tr>
                      <tr><th>House No.</th><td>{selectedPatient.houseNo || "N/A"}</td></tr>
                      <tr><th>Street</th><td>{selectedPatient.street || "N/A"}</td></tr>
                      <tr><th>Barangay</th><td>{selectedPatient.barangay || "N/A"}</td></tr>
                      <tr><th>Municipality</th><td>{selectedPatient.municipality || "N/A"}</td></tr>
                      <tr><th>Province</th><td>{selectedPatient.province || "N/A"}</td></tr>
                      <tr><th>Email</th><td>{selectedPatient.email || "N/A"}</td></tr>
                      <tr><th>Contact</th><td>{selectedPatient.contact || "N/A"}</td></tr>
                      <tr><th>Department</th><td>{selectedPatient.purpose}</td></tr>
                      <tr><th>Services</th><td>{selectedPatient.services.join(", ") || "N/A"}</td></tr>
                    <tr className="section-header">
  <th colSpan={2}>Admission Information</th>
</tr>
<tr>
  <th>Appointment Type</th>
  <td>
    <span
      style={{
        padding: "6px 12px",
        borderRadius: "6px",
        fontWeight: "bold",
        backgroundColor:
          selectedPatient?.appointmentType === "voluntary"
            ? "#d4edda"
            : "#f8d7da",
        color:
          selectedPatient?.appointmentType === "voluntary"
            ? "#155724"
            : "#721c24",
        border: "1px solid",
        borderColor:
          selectedPatient?.appointmentType === "voluntary"
            ? "#c3e6cb"
            : "#f5c6cb",
      }}
    >
      {selectedPatient?.admissionTypeDisplay || "Not Specified"}
    </span>
  </td>
</tr>
<tr>
  <th>Admission Mode</th>
  <td>
    {selectedPatient?.appointmentType === "voluntary"
      ? "Self-referred / Walk-in"
      : selectedPatient?.appointmentType === "pleabargain"
      ? "Court-Ordered via Plea Bargain Agreement"
      : "Unknown"}
  </td>
</tr>
                      <tr><th>Request Date</th><td>{selectedPatient.requestDate}</td></tr>
                      {selectedPatient.status === "Approved" && selectedPatient.appointmentDate && (
                        <tr><th>Appointment Date</th><td>{selectedPatient.appointmentDate}</td></tr>
                      )}
                      {selectedPatient.status !== "Pending" && selectedPatient.slotTime && (
                        <tr>
                          <th>Slot Time</th>
                          <td>{new Date(`2000-01-01 ${selectedPatient.slotTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</td>
                        </tr>
                      )}
                      {selectedPatient.status !== "Pending" && selectedPatient.slotID && (
                        <tr><th>Slot ID</th><td>{selectedPatient.slotID}</td></tr>
                      )}
                      <tr><th>Status</th><td>{selectedPatient.status}</td></tr>
                      <tr className="section-header">
                        <th colSpan={2}>Form Data</th>
                      </tr>
                     {/* VOLUNTARY ADMISSION */}
{selectedPatient?.appointmentType === "voluntary" ? (
  <>
    {selectedPatient.voluntaryAdmissionFiles && 
      renderFormData(selectedPatient.voluntaryAdmissionFiles, "Voluntary Admission Document")}
    {selectedPatient.validIDFiles && 
      renderFormData(selectedPatient.validIDFiles, "Valid ID")}
  </>
) : (
  /* PLEA BARGAIN / COURT-ORDERED */
  <>
    {renderFormData(selectedPatient.validIDData, "Valid ID Data", "validIDFiles")}
    {renderFormData(selectedPatient.courtOrderData, "Court Order Data", "courtFiles")}
    {renderFormData(selectedPatient.paoData, "PAO Data", "paoFiles")}
    {renderFormData(selectedPatient.empData, "Employee Data", "empFiles")}
    {renderFormData(selectedPatient.lawyersRequestData, "Lawyer's Request Data", "lawyersRequestFiles")}
    {renderFormData(selectedPatient.receiptData, "Receipt Data", "officialReceiptFiles")}
  </>
)}
                    </tbody>
                  </table>
                </div>
                <div className="modal-buttonss">
                  <button
                    className="modal-closes"
                    onClick={() => {
                      setShowInfoModal(false);
                      setSelectedPatient(null);
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {showEnlargedImage && enlargedImage && (
            <div className="modal-overlay enlarged-image-overlay">
              <div className="enlarged-image-box">
                <button className="close-enlarged" onClick={() => setShowEnlargedImage(false)}>
                  <FaTimes />
                </button>
                <img
                  src={enlargedImage.src}
                  alt={enlargedImage.name}
                  className="enlarged-image"
                />
                <p>{enlargedImage.name}</p>
              </div>
            </div>
          )}

          {showRejectModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h3>Reject DDE Appointment</h3>
                <p>Please enter the reason for rejection:</p>
                <textarea
                  value={rejectReason}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                  placeholder="Type reason here..."
                />
                <div className="modal-buttons">
                  <button
                    className="modal-cancel"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason("");
                      setSelectedAppointment(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="modal-confirm"
                    onClick={async () => {
                      if (selectedAppointment && selectedAppointment.email) {
                        await handleStatusUpdate(
                          selectedAppointment.id,
                          "Rejected",
                          selectedAppointment,
                          rejectReason
                        );
                        openCustomModal(`DDE appointment rejected.\nReason: ${rejectReason}`);
                      } else {
                         openCustomModal("⚠️ Cannot reject appointment: No valid email address.");
                      }
                      setShowRejectModal(false);
                      setRejectReason("");
                      setSelectedAppointment(null);
                    }}
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {showAcceptModal && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h3>Accept DDE Appointment</h3>
                <p>
                  Set the date and slot time for{" "}
                  <strong>
                    {selectedAppointment
                      ? `${selectedAppointment.lastName}, ${selectedAppointment.firstName}${
                          selectedAppointment.middleInitial
                            ? " " + selectedAppointment.middleInitial + "."
                            : ""
                        }`
                      : ""}
                  </strong>
                  :
                </p>
                <div className="modal-input-group">
                  <label>Date:</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewDate(e.target.value)}
                    className="modal-input"
                  />
                </div>
                <div className="modal-input-group">
                  <label>Slot Time:</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <select
                      value={newSlotTime}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewSlotTime(e.target.value)}
                      className="modal-input"
                      style={{ width: "100px" }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                        <option key={hour} value={String(hour).padStart(2, "0")}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span>:</span>
                    <select
                      value={newMinutes}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewMinutes(e.target.value)}
                      className="modal-input"
                      style={{ width: "60px" }}
                    >
                      <option value="00">00</option>
                      <option value="30">30</option>
                    </select>
                    <select
                      value={selectedAmPm}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedAmPm(e.target.value as "AM" | "PM")}
                      className="modal-input"
                      style={{ width: "60px" }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div className="modal-buttons">
                  <button
                    className="modal-cancel"
                    onClick={() => {
                      setShowAcceptModal(false);
                      setSelectedAppointment(null);
                      setNewDate("");
                      setNewSlotTime("08");
                      setNewMinutes("00");
                      setSelectedAmPm("AM");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="modal-confirm"
                    onClick={async () => {
                      if (!newDate) {
                         openCustomModal("Please select a date.");
                        return;
                      }
                      const formattedSlotTime = formatSlotTime(newSlotTime, newMinutes, selectedAmPm);
                      if (selectedAppointment && selectedAppointment.email) {
                        await handleStatusUpdate(
                          selectedAppointment.id,
                          "Approved",
                          selectedAppointment,
                          undefined,
                          newDate,
                          formattedSlotTime
                        );
                         openCustomModal(`DDE appointment for ${selectedAppointment.lastName}, ${selectedAppointment.firstName} accepted.`);
                      } else {
                         openCustomModal("⚠️ Cannot accept appointment: No valid email address.");
                      }
                      setShowAcceptModal(false);
                      setSelectedAppointment(null);
                      setNewDate("");
                      setNewSlotTime("08");
                      setNewMinutes("00");
                      setSelectedAmPm("AM");
                    }}
                  >
                    Confirm Accept
                  </button>
                </div>
              </div>
            </div>
          )}
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

export default Appointments_DDE;