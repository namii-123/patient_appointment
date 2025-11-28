import React, { useState, useEffect } from "react";
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
  FaTimes,
  FaEye,
  FaCheckCircle,
} from "react-icons/fa";
import "../../../assets/PatientRecords_Radiology.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, query, where, onSnapshot, collection } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"
import { X } from "lucide-react";

interface FileItem {
  base64: string;
  name: string;
  uploadedAt: string;
}

interface PatientRecord {
  id: string;
  UserId: string;
  patientId: string;
  patientCode: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  age: number;
  gender: string;
  services: string[];
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
  status: "Approved" | "Rejected" | "Completed";
 appointmentType?: string;
admissionTypeDisplay?: string;
voluntaryAdmissionFiles?: { voluntaryAdmissionFiles?: FileItem[] | null } | null;
validIDFiles?: { validIDFiles?: FileItem[] | null } | null;
  validIDData?: { validIDData?: FileItem[] | null } | null;
  courtOrderData?: { courtFiles?: FileItem[] | null } | null;
  paoData?: { paoFiles?: FileItem[] | null } | null;
  empData?: { empFiles?: FileItem[] | null } | null;
  lawyersRequestData?: { lawyersRequestFiles?: FileItem[] | null } | null;
  receiptData?: { officialReceiptFiles?: FileItem[] | null } | null;
}

interface Notification {
  id: number;
  text: string;
  unread: boolean;
}

const PatientRecords_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);
  const [showEnlargedImage, setShowEnlargedImage] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; name: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [yearFilter, setYearFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");
  const [dayFilter, setDayFilter] = useState<string>("All");

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, text: "3 new dental appointment requests", unread: true },
    { id: 2, text: "Reminder: Dental checkup at 2PM", unread: true },
    { id: 3, text: "System update completed", unread: false },
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

 

  
  


 useEffect(() => {
  setLoading(true);

  const transQuery = query(
    collection(db, "Transactions"),
    where("purpose", "==", "DDE"),
    where("status", "in", ["Approved", "Rejected", "Completed"])
  );

  const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
    const loaded: PatientRecord[] = [];

    // Process each transaction one by one
    for (const t of transSnap.docs) {
      const tData = t.data();
      const transactionId = t.id;

      // Default values
      let userId = "N/A";
      let patientData: any = {
        patientCode: "",
        lastName: "Unknown",
        firstName: "Unknown",
        middleInitial: "",
        age: 0,
        gender: "",
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

      let appointmentType: string | undefined = undefined;

      // 1. Fetch UserId from Users collection
      if (tData.uid) {
        try {
          const userRef = doc(db, "Users", tData.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            userId = userSnap.data()?.UserId || "N/A";
          }
        } catch (err) {
          console.warn("Failed to fetch UserId for uid:", tData.uid);
        }
      }

      // 2. Fetch Patient Data (MAIN SOURCE OF TRUTH)
      if (tData.patientId) {
        try {
          const pRef = doc(db, "Patients", tData.patientId);
          const pSnap = await getDoc(pRef);

          if (pSnap.exists()) {
            const pData = pSnap.data();
            patientData = { ...patientData, ...pData }; // Merge properly

            // Get appointment type
            appointmentType = pData.appointmentType || pData.admissionType || undefined;
          } else {
            console.warn("Patient document not found:", tData.patientId);
          }
        } catch (err) {
          console.error("Error fetching patient:", tData.patientId, err);
        }
      } else {
        console.warn("Transaction has no patientId:", transactionId);
      }

      // 3. Handle requestDate safely
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
  const offset = 8 * 60; // UTC+8
  const phDate = new Date(date.getTime() + offset * 60 * 1000);
  return phDate.toISOString().slice(0, 10);
};

let requestDate = getLocalDateString(tData.createdAt);

      // 4. Helper to safely extract files
      const extractFiles = (data: any, key: string): FileItem[] | null => {
        if (!data) return null;
        const files = data[key] || data;
        if (Array.isArray(files) && files.length > 0) {
          return files.map((f: any) => ({
            base64: f.base64 || "",
            name: f.name || `${key}_${Date.now()}.jpg`,
            uploadedAt: f.uploadedAt || new Date().toISOString(),
          }));
        }
        return null;
      };

      // 5. Build final record
      loaded.push({
        id: transactionId,
        UserId: userId,
        patientId: tData.patientId || "",
        patientCode: patientData.patientCode || "N/A",
        lastName: patientData.lastName || "Unknown",
        firstName: patientData.firstName || "Unknown",
        middleInitial: patientData.middleInitial || "",
        age: patientData.age || 0,
        gender: patientData.gender || "N/A",
        services: Array.isArray(tData.services) ? tData.services : [],
        controlNo: patientData.controlNo || "N/A",
        birthdate: patientData.birthdate || "N/A",
        citizenship: patientData.citizenship || "N/A",
        houseNo: patientData.houseNo || "N/A",
        street: patientData.street || "N/A",
        barangay: patientData.barangay || "N/A",
        municipality: patientData.municipality || "N/A",
        province: patientData.province || "N/A",
        email: patientData.email || "N/A",
        contact: patientData.contact || "N/A",
        requestDate,
        appointmentDate: tData.date || "N/A",
        slotTime: tData.slotTime || "N/A",
        slotID: tData.slotID || "N/A",
        purpose: tData.purpose || "DDE",
        status: (tData.status as PatientRecord["status"]) || "Approved",

        // New fields
        appointmentType,
        admissionTypeDisplay:
          appointmentType === "voluntary"
            ? "Voluntary Admission"
            : appointmentType === "pleabargain"
            ? "Plea Bargain (Court-Ordered)"
            : "Not Specified",

        // File data
        voluntaryAdmissionFiles: tData.voluntaryAdmissionFiles
          ? { voluntaryAdmissionFiles: extractFiles(tData.voluntaryAdmissionFiles, "voluntaryAdmissionFiles") }
          : null,
        validIDFiles: tData.validIDFiles
          ? { validIDFiles: extractFiles(tData.validIDFiles, "validIDFiles") }
          : null,
        validIDData: tData.validIDData
          ? { validIDData: extractFiles(tData.validIDData, "validIDData") }
          : null,
        courtOrderData: tData.courtOrderData
          ? { courtFiles: extractFiles(tData.courtOrderData, "courtFiles") }
          : null,
        paoData: tData.paoData
          ? { paoFiles: extractFiles(tData.paoData, "paoFiles") }
          : null,
        empData: tData.empData
          ? { empFiles: extractFiles(tData.empData, "empFiles") }
          : null,
        lawyersRequestData: tData.lawyersRequestData
          ? { lawyersRequestFiles: extractFiles(tData.lawyersRequestData, "lawyersRequestFiles") }
          : null,
        receiptData: tData.receiptData
          ? { officialReceiptFiles: extractFiles(tData.receiptData, "officialReceiptFiles") }
          : null,
      });
    }

    setPatientRecords(loaded);
    setLoading(false);
  }, (error) => {
    console.error("Error listening to Transactions:", error);
    setLoading(false);
  });

  return () => unsubscribe();
}, []);




  const handleAction = (action: string, patientRecord: PatientRecord) => {
    setSelectedPatientRecord(patientRecord);
    if (action === "Completed" && patientRecord.status === "Approved") {
      setShowCompletedModal(true);
    } else if (action === "View Record") {
      setShowRecordModal(true);
    } else {
      console.log(`${action} patient record with ID: ${patientRecord.id}`);
    }
  };

  const confirmCompleted = async () => {
    if (selectedPatientRecord) {
      try {
        const ref = doc(db, "Transactions", selectedPatientRecord.id);
        await updateDoc(ref, { status: "Completed" });

        setPatientRecords((prev) =>
          prev.map((rec) =>
            rec.id === selectedPatientRecord.id
              ? { ...rec, status: "Completed" }
              : rec
          )
        );

        console.log(`Marked as completed: ${selectedPatientRecord.id}`);
      } catch (error) {
        console.error("Error marking as completed:", error);
        alert("❌ Error marking as completed. Please try again.");
      }
    }
    setShowCompletedModal(false);
    setSelectedPatientRecord(null);
  };

  const renderFormData = (
    data: { [key: string]: FileItem[] | null } | null | undefined,
    label: string,
    fileKey: string
  ): React.ReactNode => {
    if (!data) {
      console.warn(`No data for ${label} in appointment`);
      return (
        <tr>
          <th>{label}</th>
          <td>N/A</td>
        </tr>
      );
    }

    const files = data[fileKey] || [];
    if (!Array.isArray(files) || files.length === 0) {
      console.warn(`No valid files for ${label} in appointment:`, data);
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
          {files.map((file, index) => {
            const isValidBase64 = file.base64 && (
              file.base64.startsWith("data:image/") ||
              file.base64.startsWith("data:application/pdf;") ||
              file.base64.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;")
            );
            if (!isValidBase64) {
              console.warn(`Invalid base64 data for ${file.name}:`, file.base64);
              return (
                <div key={index} style={{ marginBottom: "1rem" }}>
                  <p>Unsupported file format for {file.name}</p>
                </div>
              );
            }

            return (
              <div key={index} style={{ marginBottom: "1rem" }}>
                {file.base64.startsWith("data:image/") ? (
                  <img
                    src={file.base64}
                    alt={`${label} - ${file.name}`}
                    className="form-image"
                    style={{ maxWidth: "200px", maxHeight: "200px", marginLeft: "0.5rem", cursor: "pointer" }}
                    onClick={() => {
                      if (file.base64) {
                        setEnlargedImage({ src: file.base64, name: file.name });
                        setShowEnlargedImage(true);
                      }
                    }}
                  />
                ) : file.base64.startsWith("data:application/pdf;") ? (
                  <div>
                    <iframe
                      src={file.base64}
                      title={`${label} - ${file.name}`}
                      style={{ width: "200px", height: "200px", marginLeft: "0.5rem" }}
                      onError={(e) => console.error(`Failed to load PDF for ${file.name}:`, e)}
                    />
                    <a
                      href={file.base64}
                      download={file.name}
                      style={{ display: "block", marginTop: "0.5rem" }}
                    >
                      Download {file.name}
                    </a>
                  </div>
                ) : file.base64.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;") ? (
                  <div>
                    <a
                      href={file.base64}
                      download={file.name}
                      style={{ display: "block", marginLeft: "0.5rem", color: "#2563eb", textDecoration: "underline" }}
                    >
                      Download {file.name}
                    </a>
                    <p>(Uploaded: {new Date(file.uploadedAt).toLocaleString()})</p>
                  </div>
                ) : null}
                {file.base64.startsWith("data:image/") && (
                  <p>{file.name} (Uploaded: {new Date(file.uploadedAt).toLocaleString()})</p>
                )}
              </div>
            );
          })}
        </td>
      </tr>
    );
  };

  // Sort by appointment date: newest first
const sortedPatientRecords = [...patientRecords].sort((a, b) => {
  return b.requestDate.localeCompare(a.requestDate);
});

const filteredAndSortedRecords = sortedPatientRecords.filter((rec) => {
  const fullName = `${rec.firstName} ${rec.lastName} ${rec.middleInitial || ""}`.toLowerCase();
  const matchesSearch = 
    fullName.includes(searchTerm.toLowerCase()) ||
    rec.patientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rec.UserId.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus = statusFilter === "All" || rec.status === statusFilter;

  // NEW LOGIC: Only apply date filters if status is NOT Rejected
  let matchesDate = true;
  if (rec.status !== "Rejected" && rec.appointmentDate) {
    const [year, month, day] = rec.appointmentDate.split("-");

    const matchesYear = yearFilter === "All" || year === yearFilter;
    const matchesMonth = monthFilter === "All" || month === monthFilter;
    const matchesDay = dayFilter === "All" || day === dayFilter.padStart(2, "0");

    matchesDate = matchesYear && matchesMonth && matchesDay;
  }
  

  return matchesSearch && matchesStatus && matchesDate;
});

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
  
 // Add this useEffect (butangan sa ubos sa imong other useEffects)
useEffect(() => {
  const today = new Date();
  const currentYear = today.getFullYear().toString();
  const currentMonth = String(today.getMonth() + 1).padStart(2, "0"); // 1-12 → "01" to "12"

  setYearFilter(currentYear);
  setMonthFilter(currentMonth);
}, []);


const [currentPage, setCurrentPage] = useState<number>(1);
const recordsPerPage = 5; // same sa radiology

// Pagination calculations
const indexOfLastRecord = currentPage * recordsPerPage;
const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
const currentRecords = filteredAndSortedRecords.slice(indexOfFirstRecord, indexOfLastRecord);
const totalPages = Math.ceil(filteredAndSortedRecords.length / recordsPerPage);

// Smart page number generator (same sa Radiology)
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
}, [searchTerm, statusFilter, yearFilter, monthFilter, dayFilter]);
  
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
              <span onClick={() => navigate("/dashboard_dde")}>Dashboard</span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => navigate("/appointments_dde")}>Appointments</span>
            </div>
            <div className="nav-item active">
              <FaUsers className="nav-icon" />
              <span>Patient Records</span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => navigate("/reports&analytics_dde")}>Reports & Analytics</span>
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
        <div className="top-navbar-dental">
          <h5 className="navbar-title">Patient Records</h5>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button className="mark-read-btn" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`notification-item ${notif.unread ? "unread" : ""}`}
                    >
                      <span>{notif.text}</span>
                      {notif.unread && <span className="notification-badge">New</span>}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No new notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="content-wrapper">
          <div className="filter-barr">
            <div className="search-containerrr">
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-dropdown"
              >
                <option value="All">All</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
        <div className="filter">
  <label>Year:</label>
  <select
    className="status-dropdown"
    value={yearFilter}
    onChange={(e) => setYearFilter(e.target.value)}
  >
    <option value="All">All</option>
    {(() => {
      const currentYear = new Date().getFullYear();
      const startYear = 2020; // or 2023, depende nimo
      const endYear = currentYear + 20;

      const years = [];
      for (let y = endYear; y >= startYear; y--) {
        years.push(y);
      }

      return years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ));
    })()}
  </select>
</div>
            <div className="filter">
  <label>Month:</label>
  <select
    value={monthFilter}
    onChange={(e) => setMonthFilter(e.target.value)}
    className="status-dropdown"
  >
    <option value="All">All</option>
    {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map((num) => {
      const monthName = new Date(2000, parseInt(num) - 1).toLocaleString("en-US", { month: "long" });
      return (
        <option key={num} value={num}>
          {monthName}
        </option>
      );
    })}
  </select>
</div>
           
          </div>

       {/* Subheading */}
        <p className="appointments-heading">All Accepted Appointments</p>

        {/* Table */}
        <div className="table-container">
           <table className="appointments-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Patient ID</th>
                  <th>Lastname</th>
                  <th>Firstname</th>
                
                 
                  <th>Services</th>
                  <th>Request Date</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
  {currentRecords.length > 0 ? (
    currentRecords.map((rec) => (
      <tr key={rec.id}>
        <td>{rec.UserId}</td>
        <td>{rec.patientCode}</td>
        <td>{rec.lastName}</td>
        <td>{rec.firstName}</td>
        <td>{rec.services.join(", ")}</td>
        <td>{rec.requestDate}</td>
        <td>{rec.slotTime}</td>
        <td>
          <span className={`status-text ${rec.status.toLowerCase()}`}>
            {rec.status}
          </span>
        </td>
        <td>
           <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          {rec.status === "Approved" && (
            <button
              onClick={() => handleAction("Completed", rec)}
              className="action-btnssss completed"
            >
             <FaCheckCircle size={20} />
              <span className="btn-text desktop-only"> </span>
            </button>
          )}
          <button
            onClick={() => handleAction("View Record", rec)}
            className="action-btnssss view"
          >
           <FaEye size={20} />
          </button>
          </div>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan={9} className="no-records">
        No records found.
      </td>
    </tr>
  )}
</tbody>
            </table>


            {/* PAGINATION - Same style sa Radiology */}
<div className="pagination-wrapper">
  <div className="pagination-info">
    Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredAndSortedRecords.length)} of {filteredAndSortedRecords.length} records
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
          </div>

          {showCompletedModal && selectedPatientRecord && (
            <div className="modal-overlay">
              <div className="modal-box">
                <h3>Mark DDE Appointment as Completed</h3>
                <p>
                  Are you sure you want to mark{" "}
                  <strong>{`${selectedPatientRecord.lastName}, ${selectedPatientRecord.firstName}`}</strong>{" "}
                  as completed?
                </p>
                <div className="modal-buttons">
                  <button onClick={confirmCompleted} className="modal-confirm">
                    Yes
                  </button>
                  <button
                    onClick={() => {
                      setShowCompletedModal(false);
                      setSelectedPatientRecord(null);
                    }}
                    className="modal-cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showRecordModal && selectedPatientRecord && (
            <div className="modal-overlay">
              <div className="modal-boxs record-modal">
                <button
                  className="modal-close-icon"
                  onClick={() => {
                    setShowRecordModal(false);
                    setSelectedPatientRecord(null);
                  }}
                >
                  <FaTimes />
                </button>
                <h3>DDE Patient Information</h3>
                <div className="modal-contentss">
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <th>User ID</th>
                        <td>{selectedPatientRecord.UserId}</td>
                      </tr>
                      <tr>
                        <th>Patient ID</th>
                        <td>{selectedPatientRecord.patientCode}</td>
                      </tr>
                      <tr>
                        <th>Control No.</th>
                        <td>{selectedPatientRecord.controlNo || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Last Name</th>
                        <td>{selectedPatientRecord.lastName}</td>
                      </tr>
                      <tr>
                        <th>First Name</th>
                        <td>{selectedPatientRecord.firstName}</td>
                      </tr>
                      <tr>
                        <th>Middle Initial</th>
                        <td>{selectedPatientRecord.middleInitial || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Birthdate</th>
                        <td>{selectedPatientRecord.birthdate || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Age</th>
                        <td>{selectedPatientRecord.age}</td>
                      </tr>
                      <tr>
                        <th>Gender</th>
                        <td>{selectedPatientRecord.gender}</td>
                      </tr>
                      <tr>
                        <th>Citizenship</th>
                        <td>{selectedPatientRecord.citizenship || "N/A"}</td>
                      </tr>
                      <tr className="section-header">
                        <th colSpan={2}>Address</th>
                      </tr>
                      <tr>
                        <th>House No.</th>
                        <td>{selectedPatientRecord.houseNo || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Street</th>
                        <td>{selectedPatientRecord.street || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Barangay</th>
                        <td>{selectedPatientRecord.barangay || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Municipality</th>
                        <td>{selectedPatientRecord.municipality || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Province</th>
                        <td>{selectedPatientRecord.province || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Email</th>
                        <td>{selectedPatientRecord.email || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Contact</th>
                        <td>{selectedPatientRecord.contact || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Department</th>
                        <td>{selectedPatientRecord.purpose}</td>
                      </tr>
                      <tr>
                        <th>Services</th>
                        <td>{selectedPatientRecord.services.join(", ") || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Request Date</th>
                        <td>{selectedPatientRecord.requestDate}</td>
                      </tr>
                      {(selectedPatientRecord.status === "Approved" || selectedPatientRecord.status === "Completed") && (
                        <tr>
                          <th>Appointment Date</th>
                          <td>{selectedPatientRecord.appointmentDate || "N/A"}</td>
                        </tr>
                      )}
                      <tr>
                        <th>Slot ID</th>
                        <td>{selectedPatientRecord.slotID || "N/A"}</td>
                      </tr>
                      <tr>
                        <th>Slot Time</th>
                        <td>
                          {selectedPatientRecord.slotTime
                            ? new Date(`2000-01-01 ${selectedPatientRecord.slotTime}`).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit", hour12: true }
                              )
                            : "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <th>Status</th>
                        <td>{selectedPatientRecord.status}</td>
                      </tr>
                      <tr className="section-header">
                        <th colSpan={2}>Form Data</th>
                      </tr>
                      <tr>
  <th>Appointment Type</th>
  <td>
    <span
      style={{
        padding: "6px 12px",
        borderRadius: "6px",
        fontWeight: "bold",
        backgroundColor: selectedPatientRecord?.appointmentType === "voluntary" ? "#d4edda" : "#f8d7da",
        color: selectedPatientRecord?.appointmentType === "voluntary" ? "#155724" : "#721c24",
      }}
    >
      {selectedPatientRecord?.admissionTypeDisplay || "Not Specified"}
    </span>
  </td>
</tr>
<tr>
  <th>Admission Mode</th>
  <td>
    {selectedPatientRecord?.appointmentType === "voluntary"
      ? "Self-referred / Walk-in"
      : selectedPatientRecord?.appointmentType === "pleabargain"
        ? "Court-Ordered via Plea Bargain Agreement"
        : "Unknown"}
  </td>
</tr>
                    {selectedPatientRecord?.appointmentType === "voluntary" ? (
  <>
    {renderFormData(selectedPatientRecord.voluntaryAdmissionFiles, "Voluntary Admission Document", "voluntaryAdmissionFiles")}
    {renderFormData(selectedPatientRecord.validIDFiles, "Valid ID", "validIDFiles")}
  </>
) : (
  /* PLEA BARGAIN / COURT-ORDERED */
  <>
    {renderFormData(selectedPatientRecord.validIDData, "Valid ID Data", "validIDData")}
    {renderFormData(selectedPatientRecord.courtOrderData, "Court Order Data", "courtFiles")}
    {renderFormData(selectedPatientRecord.paoData, "PAO Data", "paoFiles")}
    {renderFormData(selectedPatientRecord.empData, "Employee Data", "empFiles")}
    {renderFormData(selectedPatientRecord.lawyersRequestData, "Lawyer's Request Data", "lawyersRequestFiles")}
    {renderFormData(selectedPatientRecord.receiptData, "Receipt Data", "officialReceiptFiles")}
  </>
)}
                    </tbody>
                  </table>
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

export default PatientRecords_DDE;