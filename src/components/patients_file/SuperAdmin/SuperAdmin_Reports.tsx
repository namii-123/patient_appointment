
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaEnvelope } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { db } from "../firebase";
import { collection, query, onSnapshot, where, doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../../../assets/SuperAdmin_Reports.css";
import logo from "/logo.png";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 

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

interface Notification {
  text: string;
  unread: boolean;
}

const SuperAdmin_Reports: React.FC = () => {
  const navigate = useNavigate();
  const [department, setDepartment] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [yearFilter, setYearFilter] = useState<string>("All");
  const [monthFilter, setMonthFilter] = useState<string>("All");
  const [dayFilter, setDayFilter] = useState<string>("All");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new registration requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  // Department mapping for consistent naming
  const departmentMapping: Record<string, string> = {
    dental: "Dental",
    clinical: "Clinical Laboratory",
    radiology: "Radiographic",
    dde: "DDE",
    medical_dre: "Medical",
  };

  // Normalize status to capitalized form to match Transaction component
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

  // Validate and format date
  const formatDate = (dateField: any): string => {
    if (!dateField) return "";
    if (dateField.toDate) {
      // Firestore Timestamp
      return dateField.toDate().toISOString().split("T")[0];
    }
    if (typeof dateField === "string") {
      // Handle ISO string (e.g., 2025-10-14T01:40:27.632Z)
      if (/^\d{4}-\d{2}-\d{2}T/.test(dateField)) {
        return dateField.split("T")[0];
      }
      // Handle YYYY-MM-DD string
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateField)) {
        return dateField;
      }
    }
    return "";
  };

  // Fetch real-time data from Firebase
  useEffect(() => {
    setLoading(true);
    let constraints = [];

    // Department filtering
    if (department !== "all") {
      constraints.push(where("purpose", "==", departmentMapping[department]));
    }

    // Status filtering (match capitalized status)
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

        // Fetch patient data
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

        // Normalize status
        const normalizedStatus = normalizeStatus(tData.status);

        // Use createdAt for DDE Rejected transactions, otherwise use date
        const isDdeRejected = tData.purpose === "DDE" && normalizedStatus === "Rejected";
        const appointmentDate = isDdeRejected ? formatDate(tData.createdAt) : formatDate(tData.date);

        // Validate date
        if (!appointmentDate) {
          console.warn(`Invalid or missing date in transaction: ${t.id}, date: ${tData.date}, createdAt: ${tData.createdAt}`);
          invalidRecords.push(`Invalid date in transaction: ${t.id}, date: ${tData.date}, createdAt: ${tData.createdAt}`);
          continue; // Skip invalid dates
        }

        const dept = department === "all" ? tData.purpose : departmentMapping[department];

        // Apply date filtering client-side
        const [year, month, day] = appointmentDate.split("-");
        if (yearFilter !== "All" && year !== yearFilter) continue;
        if (monthFilter !== "All" && month !== monthFilter) continue;
        if (dayFilter !== "All" && day !== dayFilter) continue;

        // Aggregate data for chart
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

        dataByDate[appointmentDate].totalAppointments += 1;
        if (normalizedStatus === "Pending") dataByDate[appointmentDate].pending += 1;
        else if (normalizedStatus === "Approved") dataByDate[appointmentDate].approved += 1;
        else if (normalizedStatus === "Rejected") dataByDate[appointmentDate].rejected += 1;
        else if (normalizedStatus === "Completed") dataByDate[appointmentDate].completed += 1;
        else if (normalizedStatus === "Cancelled") dataByDate[appointmentDate].cancelled += 1;
        else {
          console.warn(`Unexpected status "${tData.status}" in transaction: ${t.id}`);
          invalidRecords.push(`Unexpected status "${tData.status}" in transaction: ${t.id}`);
        }

        // Store appointment details
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
  }, [department, statusFilter, yearFilter, monthFilter, dayFilter]);

  const unreadCount: number = notifications.filter((n) => n.unread).length;

  const markAllAsRead = (): void => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  // Summary calculation
  const totals = chartData.reduce(
    (acc, curr) => {
      acc.totalAppointments += curr.totalAppointments;
      acc.pending += curr.pending;
      acc.approved += curr.approved;
      acc.rejected += curr.rejected;
      acc.completed += curr.completed;
      acc.cancelled += curr.cancelled;
      return acc;
    },
    { totalAppointments: 0, pending: 0, approved: 0, rejected: 0, completed: 0, cancelled: 0 }
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const input = contentRef.current;
    if (!input) return;

    try {
      const pdfContainer = document.createElement("div");
      pdfContainer.style.width = "210mm";
      pdfContainer.style.minHeight = "297mm";
      pdfContainer.style.padding = "15mm";
      pdfContainer.style.background = "#fff";
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.fontFamily = "Arial, sans-serif";
      document.body.appendChild(pdfContainer);

      const header = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
          <div style="flex: 1;">
            <img src="/logo.png" alt="Logo" style="height: 60px;" onerror="this.style.display='none'">
          </div>
          <div style="flex: 2; text-align: center;">
            <p style="margin: 0; font-size: 14px; font-weight: bold;">REPUBLIC OF THE PHILIPPINES</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">DEPARTMENT OF HEALTH</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold;">TREATMENT AND REHABILITATION CENTER ARGAO</p>
            <p style="margin: 10px 0; font-size: 16px; font-weight: bold;">SUPER ADMIN REPORT</p>
            <p style="margin: 0; font-size: 12px;">DATE: ${yearFilter || "ALL"}-${monthFilter || "ALL"}-${dayFilter || "ALL"} | DEPARTMENT: ${department === "all" ? "ALL" : departmentMapping[department]} | STATUS: ${statusFilter}</p>
          </div>
          <div style="flex: 1; text-align: right;">
            <img src="/pilipinas.png" alt="Pilipinas Logo" style="height: 60px;" onerror="this.style.display='none'">
          </div>
        </div>
      `;
      pdfContainer.innerHTML = header;

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.marginTop = "20px";
      table.style.fontSize = "12px";

      let tableHTML = `
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Date</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Department</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Total</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Pending</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Approved</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Rejected</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Completed</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Cancelled</th>
          </tr>
        </thead>
        <tbody>
      `;

      chartData.forEach((row) => {
        tableHTML += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.date}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.department}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.totalAppointments}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.pending}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.approved}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.rejected}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.completed}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.cancelled}</td>
          </tr>
        `;
      });

      tableHTML += `</tbody>`;
      table.innerHTML = tableHTML;
      pdfContainer.appendChild(table);

      const summary = document.createElement("div");
      summary.style.marginTop = "20px";
      summary.style.fontSize = "12px";

      const summaryTitle = document.createElement("h3");
      summaryTitle.innerText = "Summary";
      summaryTitle.style.textAlign = "left";
      summaryTitle.style.marginBottom = "10px";
      summaryTitle.style.fontSize = "16px";
      summaryTitle.style.fontWeight = "bold";
      summary.appendChild(summaryTitle);

      const summaryGrid = document.createElement("div");
      summaryGrid.style.display = "grid";
      summaryGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
      summaryGrid.style.gap = "10px";

      summaryGrid.innerHTML = `
        <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
          <div>Total Appointments</div>
          <div style="font-weight: bold; font-size: 16px;">${totals.totalAppointments}</div>
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
          <div>Pending</div>
          <div style="font-weight: bold; font-size: 16px;">${totals.pending}</div>
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
          <div>Approved</div>
          <div style="font-weight: bold; font-size: 16px;">${totals.approved}</div>
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
          <div>Rejected</div>
          <div style="font-weight: bold; font-size: 16px;">${totals.rejected}</div>
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
          <div>Completed</div>
          <div style="font-weight: bold; font-size: 16px;">${totals.completed}</div>
        </div>
        <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
          <div>Cancelled</div>
          <div style="font-weight: bold; font-size: 16px;">${totals.cancelled}</div>
        </div>
      `;
      summary.appendChild(summaryGrid);
      pdfContainer.appendChild(summary);

      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SuperAdmin_Reports.pdf`);

      document.body.removeChild(pdfContainer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please check the console for details.");
    }
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

      {/* Main content */}
      <main className="main-content">
        <div className="top-navbar-dental">
          <h5 className="navbar-title">Reports and Analytics</h5>
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
                      {notif.unread && (
                        <span className="notification-badge">New</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="notification-empty">No new notifications</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="content-wrapper-reports" ref={contentRef}>
          <div className="filters-container-reports">
            <div className="filter-reports">
              <label>Department:</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="filter-reports">
              <label>Date:</label>
              <div className="date-select-group">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="All">Year</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = 2025 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  <option value="All">Month</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      {new Date(0, i).toLocaleString("default", { month: "long" })}
                    </option>
                  ))}
                </select>
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                >
                  <option value="All">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
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
                  stroke="#264653"
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
                  Date: {yearFilter || "All"}-{monthFilter || "All"}-{dayFilter || "All"} | 
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
                <strong>{totals.totalAppointments}</strong>
              </div>
              <div className="summary-cards">
                <span>Pending</span>
                <strong>{totals.pending}</strong>
              </div>
              <div className="summary-cards">
                <span>Approved</span>
                <strong>{totals.approved}</strong>
              </div>
              <div className="summary-cards">
                <span>Rejected</span>
                <strong>{totals.rejected}</strong>
              </div>
              <div className="summary-cards">
                <span>Completed</span>
                <strong>{totals.completed}</strong>
              </div>
              <div className="summary-cards">
                <span>Cancelled</span>
                <strong>{totals.cancelled}</strong>
              </div>
            </div>
          </div>
          {/* End of Print Content */}

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

          {/* Summary Section */}
          <div className="summary-section">
            <div className="summary-card">
              <span>Total Appointments</span>
              <strong>{totals.totalAppointments}</strong>
            </div>
            <div className="summary-card">
              <span>Pending</span>
              <strong>{totals.pending}</strong>
            </div>
            <div className="summary-card">
              <span>Approved</span>
              <strong>{totals.approved}</strong>
            </div>
            <div className="summary-card">
              <span>Rejected</span>
              <strong>{totals.rejected}</strong>
            </div>
            <div className="summary-card">
              <span>Completed</span>
              <strong>{totals.completed}</strong>
            </div>
            <div className="summary-card">
              <span>Cancelled</span>
              <strong>{totals.cancelled}</strong>
            </div>
          </div>

          <div className="actions-section">
            <button onClick={handlePrint} className="button-print">🖨️ Print</button>
            <button onClick={handleDownloadPDF} className="button-pdf">⬇️ Download PDF</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdmin_Reports;