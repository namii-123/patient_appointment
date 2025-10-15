import React, { useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaSearch, FaTimes } from "react-icons/fa";
import "../../../assets/Appointments_Dental.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { sendEmail } from "../emailService";
import ShortUniqueId from "short-unique-id";

import {
  collection,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

// Types
interface FileItem {
  base64: string;
  name: string;
  uploadedAt: string;
}

interface Appointment {
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
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  validIDData?: { validIDFiles?: FileItem[] | null } | null;
  courtOrderData?: { courtFiles?: FileItem[] | null } | null;
  paoData?: { paoFiles?: FileItem[] | null } | null;
  empData?: { empFiles?: FileItem[] | null } | null;
  lawyersRequestData?: { lawyersRequestFiles?: FileItem[] | null } | null;
  receiptData?: { officialReceiptFiles?: FileItem[] | null } | null;
}

interface Notification {
  text: string;
  unread: boolean;
}

const Appointments_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [dayFilter, setDayFilter] = useState("All");

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Appointment | null>(null);
  const [showEnlargedImage, setShowEnlargedImage] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; name: string } | null>(null);

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new dental appointment requests", unread: true },
    { text: "Reminder: Dental checkup at 2PM", unread: true },
    { text: "System update completed", unread: false },
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

        let requestDate: string;
        if (tData.createdAt) {
          if (typeof tData.createdAt === 'string') {
            requestDate = tData.createdAt.split('T')[0];
          } else if (tData.createdAt && typeof tData.createdAt.toDate === 'function') {
            requestDate = tData.createdAt.toDate().toISOString().split('T')[0];
          } else {
            console.warn(`Unexpected createdAt format for transaction ${t.id}:`, tData.createdAt);
            requestDate = new Date().toISOString().split('T')[0];
          }
        } else {
          console.warn(`No createdAt field for transaction ${t.id}`);
          requestDate = new Date().toISOString().split('T')[0];
        }

        loaded.push({
          id: t.id,
          UserId: userId,
          patientId: tData.patientId || "",
          patientCode: patientData.patientCode || "",
          lastName: patientData.lastName || "Unknown",
          firstName: patientData.firstName || "Unknown",
          middleInitial: patientData.middleInitial || "Unknown",
          age: patientData.age || 0,
          gender: patientData.gender || "",
          services: Array.isArray(tData.services) ? tData.services : [],
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

      console.log("Loaded appointments:", loaded);
      setAppointments(loaded);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching appointments:", error);
      setLoading(false);
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

      alert(`DDE appointment ${newStatus} successfully!`);
    } catch (error) {
      console.error(`Error updating status for appointment ${id}:`, error);
      alert("❌ Error updating DDE appointment status. Please try again.");
    } finally {
      setLoading(false);
    }
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

  const availableMonths = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const availableDays = Array.from({ length: 31 }, (_, index) => index + 1);

  const filteredAppointments = appointments.filter((appt) => {
    const matchesSearch =
      appt.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.UserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appt.patientCode.toLowerCase().includes(searchTerm.toLowerCase());

    const appointmentDate = appt.appointmentDate ? new Date(appt.appointmentDate) : null;
    const matchesYear = yearFilter === "All" || (appointmentDate && appointmentDate.getFullYear() === parseInt(yearFilter));
    const matchesMonth = monthFilter === "All" || (appointmentDate && availableMonths[appointmentDate.getMonth()] === monthFilter);
    const matchesDay = dayFilter === "All" || (appointmentDate && appointmentDate.getDate() === parseInt(dayFilter));

    const matchesStatus = statusFilter === "All" || appt.status === statusFilter;

    return matchesSearch && matchesYear && matchesMonth && matchesDay && matchesStatus;
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

  const convertTo24Hour = (time: string, amPm: "AM" | "PM"): string => {
    const [hours, minutes] = time.split(":");
    let hoursNum = parseInt(hours, 10);
    if (amPm === "PM" && hoursNum !== 12) hoursNum += 12;
    if (amPm === "AM" && hoursNum === 12) hoursNum = 0;
    return `${String(hoursNum).padStart(2, "0")}:${minutes}`;
  };

  const formatSlotTime = (hours: string, minutes: string, amPm: "AM" | "PM"): string => {
    return `${hours}:${minutes} ${amPm}`;
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
              onClick={() => {
                const isConfirmed = window.confirm("Are you sure you want to sign out?");
                if (isConfirmed) {
                  navigate("/loginadmin");
                }
              }}
              className="signout-label"
            >
              Sign Out
            </span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-navbar-dental">
          <h2 className="navbar-title">Appointments</h2>
          <div className="notification-wrapper">
            <FaBell
              className="notification-bell"
              onClick={() => setShowNotifications(!showNotifications)}
            />
            {unreadCount > 0 && (
              <span className="notification-count">{unreadCount}</span>
            )}
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
                  notifications.map((notif, index) => (
                    <div
                      key={index}
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
         <div className="filter-bars">
                               <div className="searchbar-containerss">
                                 <div className="searchss">
                                   <FaSearch className="search-iconss" />
                                   <input
                                     type="text"
                                     placeholder="Search by Name or Number..."
                                     className="search-input"
                                     value={searchTerm}
                                     onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                                   />
                                 </div>
                               </div>
            <div className="filters">
              <label>Status:</label>
              <select
                className="status-dropdown"
                value={statusFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div className="filters">
              <label>Year:</label>
              <select
                className="status-dropdown"
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
            <div className="filters">
              <label>Month:</label>
              <select
                className="status-dropdown"
                value={monthFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setMonthFilter(e.target.value)}
              >
                <option value="All">All</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="filters">
              <label>Day:</label>
              <select
                className="status-dropdown"
                value={dayFilter}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setDayFilter(e.target.value)}
              >
                <option value="All">All</option>
                {availableDays.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="appointments-header">All Patient Appointment Requests</p>

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
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((appt) => (
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
                          <button
                            className="action-btn accept"
                            onClick={async () => {
                              if (appt.patientId) {
                                const pRef = doc(db, "Patients", appt.patientId);
                                const pSnap = await getDoc(pRef);
                                if (pSnap.exists()) {
                                  const patientData = pSnap.data();
                                  console.log("Patient data for accept:", patientData);
                                  if (!patientData.email) {
                                    alert("⚠️ No email address found for this patient.");
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
                                  alert("⚠️ No patient data found.");
                                }
                              } else {
                                alert("⚠️ No patientId found for this appointment.");
                              }
                            }}
                          >
                            Accept
                          </button>
                          <button
                            className="action-btn reject"
                            onClick={async () => {
                              if (appt.patientId) {
                                const pRef = doc(db, "Patients", appt.patientId);
                                const pSnap = await getDoc(pRef);
                                if (pSnap.exists()) {
                                  const patientData = pSnap.data();
                                  console.log("Patient data for reject:", patientData);
                                  if (!patientData.email) {
                                    alert("⚠️ No email address found for this patient.");
                                    return;
                                  }
                                  setSelectedAppointment({
                                    ...appt,
                                    ...patientData,
                                  });
                                  setShowRejectModal(true);
                                } else {
                                  console.warn("No patient data for patientId:", appt.patientId);
                                  alert("⚠️ No patient data found.");
                                }
                              } else {
                                alert("⚠️ No patientId found for this appointment.");
                              }
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                    <td>
                      <button
                        className="view-more-btn"
                        onClick={async () => {
                          if (appt.patientId) {
                            const pRef = doc(db, "Patients", appt.patientId);
                            const tRef = doc(db, "Transactions", appt.id);
                            const [pSnap, tSnap] = await Promise.all([
                              getDoc(pRef),
                              getDoc(tRef),
                            ]);
                            if (pSnap.exists() && tSnap.exists()) {
                              const patientData = pSnap.data();
                              const transactionData = tSnap.data();
                              setSelectedPatient({
                                ...appt,
                                ...patientData,
                                validIDData: transactionData.validIDData || null,
                                courtOrderData: transactionData.courtOrderData || null,
                                paoData: transactionData.paoData || null,
                                empData: transactionData.empData || null,
                                lawyersRequestData: transactionData.lawyersRequestData || null,
                                receiptData: transactionData.receiptData || null,
                              });
                              setShowInfoModal(true);
                            } else {
                              console.warn("No patient or transaction data found for patientId:", appt.patientId);
                              alert("⚠️ No patient or transaction data found.");
                            }
                          } else {
                            alert("⚠️ No patientId found for this appointment.");
                          }
                        }}
                      >
                        View More
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
                      {renderFormData(selectedPatient.validIDData, "Valid ID Data", "validIDFiles")}
                      {renderFormData(selectedPatient.courtOrderData, "Court Order Data", "courtFiles")}
                      {renderFormData(selectedPatient.paoData, "PAO Data", "paoFiles")}
                      {renderFormData(selectedPatient.empData, "Employee Data", "empFiles")}
                      {renderFormData(selectedPatient.lawyersRequestData, "Lawyer's Request Data", "lawyersRequestFiles")}
                      {renderFormData(selectedPatient.receiptData, "Receipt Data", "officialReceiptFiles")}
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
                        alert(`DDE appointment rejected.\nReason: ${rejectReason}`);
                      } else {
                        alert("⚠️ Cannot reject appointment: No valid email address.");
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
                        alert("Please select a date.");
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
                        alert(`DDE appointment for ${selectedAppointment.lastName}, ${selectedAppointment.firstName} accepted.`);
                      } else {
                        alert("⚠️ Cannot accept appointment: No valid email address.");
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
      </main>
    </div>
  );
};

export default Appointments_DDE;