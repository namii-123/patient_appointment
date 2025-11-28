import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { db } from "../firebase"; 
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 
import logo from "/logo.png";
import { X } from "lucide-react";


type StatusType = "completed" | "pending" | "approved" | "rejected" | "cancelled" | "all";

interface ChartData {
  date: string;
  completed: number;
  pending: number;
  approved: number;
 rejected:number;
  cancelled: number;
}
interface Notification {
  text: string;
  unread: boolean;
}

const ReportsAnalytics_Dental: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusType>("all");
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [year, setYear] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState({
    total: 0,
    pending: 0,
    approved: 0,
   
    cancelled: 0,
    completed: 0,
  });

  useEffect(() => {
  const q = query(collection(db, "Transactions"), where("purpose", "==", "Dental"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data: any[] = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setAppointments(data);

    // CORRECT LOGIC: EXCLUDE REJECTED SA TOTAL APPOINTMENTS
    const counts = {
      total: data.filter((appt) => appt.status !== "Rejected").length,
      pending: data.filter((a) => a.status === "Pending").length,
      approved: data.filter((a) => a.status === "Approved").length,
      cancelled: data.filter((a) => a.status === "Cancelled").length,
      completed: data.filter((a) => a.status === "Completed").length,
    };

    setStatusCounts(counts);
  });

  return () => unsubscribe();
}, []);

  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const chartData = useMemo(() => {
    const grouped: Record<string, any> = {};

    appointments.forEach((appt) => {
      const date = appt.date;
      if (!grouped[date]) {
        grouped[date] = { date, pending: 0, approved: 0,  cancelled: 0, completed: 0 };
      }
      grouped[date][appt.status.toLowerCase()]++;
    });

    return Object.values(grouped);
  }, [appointments]);

  const unreadCount: number = notifications.filter((n) => n.unread).length;

  const markAllAsRead = (): void => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };


  
  const filteredData = useMemo(() => {
    let filtered = [...chartData];

    if (year) {
      filtered = filtered.filter((item) =>
        item.date.includes(year) 
      );
    }

    if (month) {
      filtered = filtered.filter((item) =>
        item.date.includes(month) 
      );
    }

   

    // Apply Status filter
    if (status !== "all") {
      return filtered.map((item) => {
        const empty: ChartData = {
          ...item,
          completed: 0,
          pending: 0,
          approved: 0,
        
          cancelled: 0,
        };
        empty[status] = item[status];
        return empty;
      });
    }

    return filtered;
  }, [status, year, month, chartData]);



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
            <p style="margin: 10px 0; font-size: 16px; font-weight: bold;">DENTAL SECTION REPORT</p>
            <p style="margin: 0; font-size: 12px;">DATE: ${year || "ALL"}-${month ||  "ALL"} | STATUS: ${status.toUpperCase()}</p>
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
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Total</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Completed</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Pending</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Approved</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Rejected</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Cancelled</th>
          </tr>
        </thead>
        <tbody>
      `;
      
      
      filteredData.forEach((row, idx) => {
        const total = row.completed + row.pending + row.approved + row.cancelled;
        tableHTML += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.date}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${total}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.completed}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.pending}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${row.approved}</td>
          
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
    <div style="font-weight: bold; font-size: 16px;">${statusCounts.total}</div>
  </div>
  <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
    <div>Completed</div>
    <div style="font-weight: bold; font-size: 16px;">${statusCounts.completed}</div>
  </div>
  <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
    <div>Pending</div>
    <div style="font-weight: bold; font-size: 16px;">${statusCounts.pending}</div>
  </div>
  <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
    <div>Approved</div>
    <div style="font-weight: bold; font-size: 16px;">${statusCounts.approved}</div>
  </div>
  
  <div style="border: 1px solid #ddd; padding: 10px; text-align: center;">
    <div>Cancelled</div>
    <div style="font-weight: bold; font-size: 16px;">${statusCounts.cancelled}</div>
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
      
      
      
      pdf.save(`Dental_Reports.pdf`);

      document.body.removeChild(pdfContainer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please check the console for details.");
    }
  };


  
    useEffect(() => {
    const today = new Date();
    setYear(today.getFullYear().toString());
    setMonth(String(today.getMonth() + 1).padStart(2, "0")); // e.g., "11" for November
  }, []);


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
    <div className="dashboards">
    
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/dashboard_dental")}
            style={{ cursor: "pointer" }}
          >
            <img src="logo.png" alt="logo" className="logoss" />
            <span className="logo-texts">DENTAL</span>
          </div>

          <nav className="nav-linkss">
            <div className="nav-item">
              <FaTachometerAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/dashboard_dental")}>
                Dashboard
              </span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_dental")}>
                Appointments
              </span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_dental")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item">
              <FaClock className="nav-icon" />
              <span onClick={() => navigate("/manageslots_dental")}>
                Manage Slots
              </span>
            </div>
                        
                         <div className="nav-item">
                             <FaStethoscope className="nav-icon" />
                                   <span onClick={() => navigate("/services_dental")}>
                                      Services
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
                      className={`notification-item ${
                        notif.unread ? "unread" : ""
                      }`}
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


        

       
        <div className="content-wrapper" ref={contentRef}>
         
          <div className="filters-containerss">
          

            {/* Year Filter - Dynamic & Future-Proof (Newest First) */}
<div className="filterss">
  <label>Year:</label>
  <select
    value={year}
    onChange={(e) => setYear(e.target.value)}
    className="status-dropdown"
  >
    <option value="">All Years</option>
    {(() => {
      const currentYear = new Date().getFullYear();
      const startYear = 2020; // or 2025 if gusto nimo sugdan later
      const futureBuffer = 30; // 30 years into the future

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

            {/* Month Filter - Current + Last 2 Months First */}
<div className="filterss">
  <label>Month:</label>
  <select
    value={month}
    onChange={(e) => setMonth(e.target.value)}
    className="status-dropdown"
  >
    <option value="">All Months</option>
    {(() => {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const currentMonthIdx = new Date().getMonth(); // 0 = Jan, 11 = Dec

      const recent: { name: string; value: string }[] = [];

      // Add current month + last 2 months (3 total)
      for (let i = 0; i < 3; i++) {
        const idx = (currentMonthIdx - i + 12) % 12;
        const monthNum = String(idx + 1).padStart(2, "0");
        recent.push({ name: monthNames[idx], value: monthNum });
      }

      return (
        <>
          {/* Recent 3 months sa taas */}
          {recent.map((m) => (
            <option key={m.value} value={m.value}>
              {m.name}
            </option>
          ))}
          {/* Remaining months */}
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

           
            {/* Status Filter */}
            <div className="filterss">
              <label>Status:</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as StatusType)}>
                <option value="all">All Appointments</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
               
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Appointment Trends Graph */}
          <h5 className="section-title center">Appointment Trends</h5>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={filteredData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
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




         
         {/* Hidden print content */}
<div id="print-content" style={{ display: 'none' }}>
    <div className="print-header">
      <div className="header-left">
        <img src="logo.png" alt="logo" className="header-logo" />
      </div>
      <div className="header-center">
        <p>REPUBLIC OF THE PHILIPPINES</p>
        <p>DEPARTMENT OF HEALTH</p>
        <p>TREATMENT AND REHABILITATION CENTER ARGAO</p>
        <p><strong>Dental Section Report</strong></p>
        <p>
          Date: {year || "All"}-{month ||  "All"} | Status: {status}
        </p>
      </div>
      <div className="header-right">
        <img src="pilipinas.png" alt="logo" className="header-logo" />
      </div>
    </div>

    {/* Appointment Table */}
    <table className="appointments-tables">
      <thead>
        <tr>
          <th>Date</th>
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
          const total = row.completed + row.pending + row.approved + row.cancelled;
          return (
            <tr key={idx}>
              <td>{row.date}</td>
              <td>{total}</td>
              <td>{row.completed}</td>
              <td>{row.pending}</td>
              <td>{row.approved}</td>
             
              <td>{row.cancelled}</td>
            </tr>
          );
        })}
      </tbody>
    </table>

<br></br>
<br></br>
<h3>Summary</h3>
    {/* Summary Section */}
    <div className="summary-sections">
      <div className="summary-cards">
        <span>Total Appointments</span>
        <strong>{statusCounts.total}</strong>
      </div>
      <div className="summary-cards">
        <span>Completed</span>
        <strong>{statusCounts.completed}</strong>
      </div>
      <div className="summary-cards">
        <span>Pending</span>
        <strong>{statusCounts.pending}</strong>
      </div>
      <div className="summary-cards">
        <span>Approved</span>
        <strong>{statusCounts.approved}</strong>
      </div>
    
      <div className="summary-cards">
        <span>Cancelled</span>
        <strong>{statusCounts.cancelled}</strong>
      </div>
    </div>
</div>

  {/* End of Print Content */}


          {/* Appointment Table */}
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Date</th>
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
                const total =
                  row.completed +
                  row.pending +
                  row.approved +
                
                  row.cancelled;
                return (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{total}</td>
                    <td>{row.completed}</td>
                    <td>{row.pending}</td>
                    <td>{row.approved}</td>
                   
                    <td>{row.cancelled}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary Section */}
          <div  className="summary-section">
            <div className="summary-card">
              <span>Total Appointments</span>
              <strong>{statusCounts.total}</strong>
            </div>
            <div className="summary-card">
              <span>Completed</span>
              <strong>{statusCounts.completed}</strong>
            </div>
            <div className="summary-card">
              <span>Pending</span>
              <strong>{statusCounts.pending}</strong>
            </div>
            <div className="summary-card">
              <span>Approved</span>
              <strong>{statusCounts.approved}</strong>
            </div>
          
            <div className="summary-card">
              <span>Cancelled</span>
              <strong>{statusCounts.cancelled}</strong>
            </div>
          </div>

          <div className="actions-section">
            <button onClick={handlePrint} className="button-print">🖨️ Print</button>
            <button onClick={handleDownloadPDF} className="button-pdf">⬇️ Download PDF</button>
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

export default ReportsAnalytics_Dental;