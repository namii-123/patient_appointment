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
  FaArrowLeft,
  FaTimes,
  FaEnvelope,
} from "react-icons/fa";
import { toast } from "react-toastify";
import "../../../assets/SuperAdmin_Clinical.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { collection, query, onSnapshot, where, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 



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
  lastname: string;
  firstname: string;
  middleInitial?: string;
  age: number;
  gender: string;
  services: string[];
  appointmentDate: string;
  slot: string;
  status: "Pending" | "Approved" | "Rejected" | "Completed" | "Canceled";
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
  purpose?: string;
  slotID?: string;
  createdAt?: string;
  validIDData?: { validIDFiles?: FileItem[] | null } | null;
  courtOrderData?: { courtFiles?: FileItem[] | null } | null;
  paoData?: { paoFiles?: FileItem[] | null } | null;
  empData?: { empFiles?: FileItem[] | null } | null;
  lawyersRequestData?: { lawyersRequestFiles?: FileItem[] | null } | null;
  receiptData?: { officialReceiptFiles?: FileItem[] | null } | null;
}

const SuperAdmin_DDE: React.FC = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<Appointment | null>(null);
  const [showEnlargedImage, setShowEnlargedImage] = useState<boolean>(false);
  const [enlargedImage, setEnlargedImage] = useState<{ src: string; name: string } | null>(null);

  const notifications = [
    { id: 1, text: "New patient registered in Dental", unread: true },
    { id: 2, text: "3 Appointment requests pending approval", unread: true },
    { id: 3, text: "Radiology report uploaded by Dr. Smith", unread: false },
    { id: 4, text: "Clinical department updated patient records", unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    // Note: This updates the UI only; notifications are static in this example
    notifications.forEach((n) => (n.unread = false));
    setShowNotifications(false);
  };

  const [yearOptions, setYearOptions] = useState<number[]>(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 2025 + 1 }, (_, i) => 2025 + i);
  });

  const handleYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedYear(value);

    const lastYear = yearOptions[yearOptions.length - 1];
    if (value === lastYear.toString()) {
      const newYears = Array.from({ length: 10 }, (_, i) => lastYear + i + 1);
      setYearOptions((prev) => [...prev, ...newYears]);
    }
  };

  // Fetch appointments from Firestore
  useEffect(() => {
    setLoading(true);
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "DDE")
    );

    const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
      try {
        const loaded: Appointment[] = [];

        for (const t of transSnap.docs) {
          const tData = t.data();

          let patientData: any = {
            UserId: "",
            lastname: "Unknown",
            firstname: "Unknown",
            middleInitial: "",
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

          let userId = "";
          if (tData.uid) {
            const userRef = doc(db, "Users", tData.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              userId = userSnap.data().UserId || "";
            }
          }

          if (tData.patientId) {
            const pRef = doc(db, "Patients", tData.patientId);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) {
              patientData = pSnap.data();
            } else {
              console.warn(`No patient document found for patientId: ${tData.patientId}`);
            }
          } else {
            console.warn(`No patientId in transaction: ${t.id}`);
          }

          const mapFileData = (
            fieldData: any,
            fileKey: string
          ): { [key: string]: FileItem[] | null } | null => {
            let filesArray = fieldData;
            if (fieldData && typeof fieldData === "object" && fileKey in fieldData) {
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

          loaded.push({
            id: t.id,
            UserId: userId,
            patientId: tData.patientId || "",
            patientCode: patientData.patientCode || "",
            lastname: patientData.lastName || "Unknown",
            firstname: patientData.firstName || "Unknown",
            middleInitial: patientData.middleInitial || "",
            age: patientData.age || 0,
            gender: patientData.gender || "",
            services: Array.isArray(tData.services) ? tData.services : [],
            appointmentDate: tData.date || "",
            slot: tData.slotTime || "",
            status: tData.status || "Pending",
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
            purpose: tData.purpose || "",
            slotID: tData.slotID || "",
            createdAt: tData.createdAt || "",
            validIDData: mapFileData(tData.validIDFiles, "validIDFiles"),
            courtOrderData: mapFileData(tData.courtOrderData, "courtFiles"),
            paoData: mapFileData(tData.paoData, "paoFiles"),
            empData: mapFileData(tData.empData, "empFiles"),
            lawyersRequestData: mapFileData(tData.lawyersRequestData, "lawyersRequestFiles"),
            receiptData: mapFileData(tData.receiptData, "officialReceiptFiles"),
          });
        }

        console.log("Loaded appointments:", loaded);
        setAppointments(loaded);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to fetch appointments. Please try again.", { position: "top-center" });
        setLoading(false);
      }
    }, (error) => {
      console.error("Error in onSnapshot:", error);
      toast.error("Error fetching appointments. Please try again.", { position: "top-center" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Count totals
  const pendingCount = appointments.filter((a) => a.status.toLowerCase() === "pending").length;
  const approvedCount = appointments.filter((a) => a.status.toLowerCase() === "approved").length;
  const completedCount = appointments.filter((a) => a.status.toLowerCase() === "completed").length;
  const rejectedCount = appointments.filter((a) => a.status.toLowerCase() === "rejected").length;
  const canceledCount = appointments.filter((a) => a.status.toLowerCase() === "canceled").length;

  // Filter appointments
  const filteredAppointments = appointments.filter((a) => {
    if (filter !== "all" && a.status.toLowerCase() !== filter) return false;

    const [year, month, day] = a.appointmentDate.split("-");

    if (selectedYear && year !== selectedYear) return false;
    if (selectedMonth && month !== selectedMonth) return false;
    if (selectedDay && day !== selectedDay) return false;

    return true;
  });

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleViewMore = (record: Appointment) => {
    console.log("handleViewMore called with record:", record);
    setSelectedPatientRecord(record);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
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
            <div className="nav-item">
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
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/superadmin_manageadmins")}>
                Manage Admins
              </span>
            </div>
            <div className="nav-item">
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
                                     const isConfirmed = window.confirm("Are you sure you want to sign out?");
                                     if (isConfirmed) {
                                       try {
                                         await signOut(auth);
                                         navigate("/loginadmin", { replace: true });
                                       } catch (error) {
                                         console.error("Error signing out:", error);
                                         alert("Failed to sign out. Please try again.");
                                       }
                                     }
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
        {/* Top Navbar */}
        <div className="top-navbar-superadmin">
          <h2 className="navbar-title">DDE Appointments</h2>
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
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notification-item ${n.unread ? "unread" : ""}`}
                    >
                      <span>{n.text}</span>
                      {n.unread && <span className="notification-badge">New</span>}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Back Button */}
        <button className="back-btn" onClick={() => handleNavigation("/superadmin_dashboard")}>
          <FaArrowLeft /> Back
        </button>

        {/* Date Filter */}
        <div className="filters-container-clinical">
          <div className="filter-clinical">
            <label>Date:</label>
            <select
              id="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Month</option>
              <option value="01">January</option>
              <option value="02">February</option>
              <option value="03">March</option>
              <option value="04">April</option>
              <option value="05">May</option>
              <option value="06">June</option>
              <option value="07">July</option>
              <option value="08">August</option>
              <option value="09">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
          </div>

          <div className="filter-clinical">
            <select
              id="day"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => (
                <option key={i + 1} value={(i + 1).toString().padStart(2, "0")}>
                  {i + 1}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-clinical">
            <select id="year" value={selectedYear} onChange={handleYearChange}>
              <option value="">Year</option>
              {yearOptions.map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div
            className={`summary-card all ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            <h3>{appointments.length}</h3>
            <p>All</p>
          </div>
          <div
            className={`summary-card pending ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            <h3>{pendingCount}</h3>
            <p>Pending</p>
          </div>
          <div
            className={`summary-card approved ${filter === "approved" ? "active" : ""}`}
            onClick={() => setFilter("approved")}
          >
            <h3>{approvedCount}</h3>
            <p>Approved</p>
          </div>
          <div
            className={`summary-card completed ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            <h3>{completedCount}</h3>
            <p>Completed</p>
          </div>
          <div
            className={`summary-card rejected ${filter === "rejected" ? "active" : ""}`}
            onClick={() => setFilter("rejected")}
          >
            <h3>{rejectedCount}</h3>
            <p>Rejected</p>
          </div>
          <div
            className={`summary-card canceled ${filter === "canceled" ? "active" : ""}`}
            onClick={() => setFilter("canceled")}
          >
            <h3>{canceledCount}</h3>
            <p>Canceled</p>
          </div>
        </div>

        {/* Table for appointments */}
        <div className="appointments-section">
          <h3 className="section-title">
            {filter === "all"
              ? "All"
              : filter.charAt(0).toUpperCase() + filter.slice(1)}{" "}
            Appointments
          </h3>
          <table className="appointments-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Patient ID</th>
                <th>Lastname</th>
                <th>Firstname</th>
                <th>Middle Initial</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Services</th>
                <th>Appointment Date</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((a) => (
                  <tr key={a.id}>
                    <td>{a.UserId}</td>
                    <td>{a.patientCode}</td>
                    <td>{a.lastname}</td>
                    <td>{a.firstname}</td>
                    <td>{a.middleInitial || "N/A"}</td>
                    <td>{a.age}</td>
                    <td>{a.gender}</td>
                    <td>{a.services.join(", ") || "N/A"}</td>
                    <td>{a.status === "Rejected" ? (a.createdAt || "N/A") : a.appointmentDate}</td>
                    <td>{a.slot}</td>
                    <td>
                      <span className={`status-badge ${a.status.toLowerCase()}`}>
                        {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-button view-mores"
                        onClick={() => handleViewMore(a)}
                      >
                        View More
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "12px" }}>
                    {loading ? "Loading..." : "No appointments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View More Modal */}
        {showModal && selectedPatientRecord !== null && (
          <div className="modal-overlayd">
            <div className="modal-contentd">
              <div className="modal-inner">
                <div className="modal-headerd">
                  <h3>Patient Information</h3>
                  <button className="close-btnd" onClick={closeModal}>×</button>
                </div>
                <div className="modal-bodyd">
                  <table className="patient-info-tabled">
                    <tbody>
                      <tr><th>User ID</th><td>{selectedPatientRecord.UserId}</td></tr>
                      <tr><th>Patient ID</th><td>{selectedPatientRecord.patientCode}</td></tr>
                      <tr><th>Control No.</th><td>{selectedPatientRecord.controlNo || "N/A"}</td></tr>
                      <tr><th>Last Name</th><td>{selectedPatientRecord.lastname}</td></tr>
                      <tr><th>First Name</th><td>{selectedPatientRecord.firstname}</td></tr>
                      <tr><th>Middle Initial</th><td>{selectedPatientRecord.middleInitial || "N/A"}</td></tr>
                      <tr><th>Birthdate</th><td>{selectedPatientRecord.birthdate || "N/A"}</td></tr>
                      <tr><th>Age</th><td>{selectedPatientRecord.age}</td></tr>
                      <tr><th>Gender</th><td>{selectedPatientRecord.gender}</td></tr>
                      <tr><th>Citizenship</th><td>{selectedPatientRecord.citizenship || "N/A"}</td></tr>
                      <tr className="section-headerd">
                        <th colSpan={2}>Address</th>
                      </tr>
                      <tr><th>House No.</th><td>{selectedPatientRecord.houseNo || "N/A"}</td></tr>
                      <tr><th>Street</th><td>{selectedPatientRecord.street || "N/A"}</td></tr>
                      <tr><th>Barangay</th><td>{selectedPatientRecord.barangay || "N/A"}</td></tr>
                      <tr><th>Municipality</th><td>{selectedPatientRecord.municipality || "N/A"}</td></tr>
                      <tr><th>Province</th><td>{selectedPatientRecord.province || "N/A"}</td></tr>
                      <tr><th>Email</th><td>{selectedPatientRecord.email || "N/A"}</td></tr>
                      <tr><th>Contact</th><td>{selectedPatientRecord.contact || "N/A"}</td></tr>
                      <tr><th>Department</th><td>{selectedPatientRecord.purpose || "N/A"}</td></tr>
                      <tr><th>Services</th><td>{selectedPatientRecord.services.join(", ") || "N/A"}</td></tr>
                      <tr><th>Appointment Date</th><td>{selectedPatientRecord.appointmentDate || "N/A"}</td></tr>
                      <tr><th>Slot ID</th><td>{selectedPatientRecord.slotID || "N/A"}</td></tr>
                      <tr><th>Slot</th><td>{selectedPatientRecord.slot || "N/A"}</td></tr>
                      <tr><th>Status</th><td>{selectedPatientRecord.status}</td></tr>
                      <tr className="section-headerd">
                        <th colSpan={2}>Form Data</th>
                      </tr>
                      {renderFormData(selectedPatientRecord.validIDData, "Valid ID Data", "validIDFiles")}
                      {renderFormData(selectedPatientRecord.courtOrderData, "Court Order Data", "courtFiles")}
                      {renderFormData(selectedPatientRecord.paoData, "PAO Data", "paoFiles")}
                      {renderFormData(selectedPatientRecord.empData, "Employee Data", "empFiles")}
                      {renderFormData(selectedPatientRecord.lawyersRequestData, "Lawyer's Request Data", "lawyersRequestFiles")}
                      {renderFormData(selectedPatientRecord.receiptData, "Receipt Data", "officialReceiptFiles")}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enlarged Image Modal */}
        {showEnlargedImage && enlargedImage && (
          <div className="modal-overlayd enlarged-image-overlay">
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
      </main>
    </div>
  );
};

export default SuperAdmin_DDE;