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
} from "react-icons/fa";
import "../../../assets/PatientRecords_Radiology.css";
import logo from "/logo.png";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, query, where, onSnapshot, collection } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"

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
  validIDData?: { validIDFiles?: FileItem[] | null } | null;
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

  const availableDays = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

  useEffect(() => {
    setLoading(true);
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "DDE"),
      where("status", "in", ["Approved", "Rejected", "Completed"])
    );

    const unsubscribe = onSnapshot(transQuery, async (transSnap) => {
      const loaded: PatientRecord[] = [];

      for (const t of transSnap.docs) {
        const tData = t.data();

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
          status: tData.status || "Approved",
          validIDData: mapFileData(tData.validIDFiles, "validIDFiles"),
          courtOrderData: mapFileData(tData.courtOrderData, "courtFiles"),
          paoData: mapFileData(tData.paoData, "paoFiles"),
          empData: mapFileData(tData.empData, "empFiles"),
          lawyersRequestData: mapFileData(tData.lawyersRequestData, "lawyersRequestFiles"),
          receiptData: mapFileData(tData.receiptData, "officialReceiptFiles"),
        });
      }

      setPatientRecords(loaded);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching patient records:", error);
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

  const filteredPatientRecords = patientRecords.filter((rec) => {
    const fullName = `${rec.firstName} ${rec.lastName} ${rec.middleInitial || ""}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      rec.patientCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.UserId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.patientId.toLowerCase().includes(searchTerm.toLowerCase());

    const appointmentDate = new Date(rec.appointmentDate);
    const matchesYear = yearFilter === "All" || appointmentDate.getFullYear() === parseInt(yearFilter);
    const matchesMonth = monthFilter === "All" || availableMonths[appointmentDate.getMonth()] === monthFilter;
    const matchesDay = dayFilter === "All" || appointmentDate.getDate() === parseInt(dayFilter);

    const matchesStatus = statusFilter === "All" || rec.status === statusFilter;

    return matchesSearch && matchesStatus && matchesYear && matchesMonth && matchesDay;
  });

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
            <div className="filter">
              <label>Month:</label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="status-dropdown"
              >
                <option value="All">All</option>
                {availableMonths.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter">
              <label>Day:</label>
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className="status-dropdown"
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

          <p className="appointments-heading">All Accepted Appointments</p>

          <div className="table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Patient ID</th>
                  <th>Last Name</th>
                  <th>First Name</th>
                
                  <th>Services</th>
                  <th>Request Date</th>
                  <th>Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="no-records">
                      Loading dde patient records...
                    </td>
                  </tr>
                ) : filteredPatientRecords.length > 0 ? (
                  filteredPatientRecords.map((rec) => (
                    <tr key={rec.id}>
                      <td>{rec.UserId}</td>
                      <td>{rec.patientCode}</td>
                      <td>{rec.lastName}</td>
                      <td>{rec.firstName}</td>
                     
                     
                      <td>{rec.services.join(", ")}</td>
                      <td>{rec.requestDate}</td>
                      <td>
                          {rec.slotTime
                            ? new Date(`2000-01-01 ${rec.slotTime}`).toLocaleTimeString(
                                "en-US",
                                { hour: "numeric", minute: "2-digit", hour12: true }
                              )
                            : "N/A"}
                        </td>
                      <td>
                        <span className={`status-text ${rec.status.toLowerCase()}`}>
                          {rec.status}
                        </span>
                      </td>
                      <td>
                        {rec.status === "Approved" && (
                          <button
                            onClick={() => handleAction("Completed", rec)}
                            className="action-btns completed"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => handleAction("View Record", rec)}
                          className="action-btns view"
                        >
                          View More
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="no-records">
                      No dde patient records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      </main>
    </div>
  );
};

export default PatientRecords_DDE;