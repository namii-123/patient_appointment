import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar,
   FaSignOutAlt, FaClock, FaTimesCircle, FaCheckCircle } from "react-icons/fa";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, } from "recharts";
import "../../../assets/Dashboard_Clinical.css";
import logo from "/logo.png";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase"; 



interface Notification {
  text: string;
  unread: boolean;
}

interface ChartData {
  name: string;
  value: number;
}



// ---------- Component ----------
const Dashboard_Radiology: React.FC = () => {
  const navigate = useNavigate();
  const handleNavigation = (path: string) => {
    navigate(path);
  };


  const [totalUsers, setTotalUsers] = useState(0);
    const [totalPatients, setTotalPatients] = useState(0);
    const [totalAppointments, setTotalAppointments] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [cancelledCount, setCancelledCount] = useState(0);
    const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  
  
  const [weeklyActivity, setWeeklyActivity] = useState<Record<string, number>>({
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  });


  useEffect(() => {
    const transQuery = query(
      collection(db, "Transactions"),
      where("purpose", "==", "Radiographic")
    );
  
    const unsubscribe = onSnapshot(transQuery, (snap) => {
      // Initialize counters
      const activity: Record<string, number> = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
        Sunday: 0,
      };
  
      // Get current date
      const now = new Date();
  
      // Find Monday of this week
      const firstDayOfWeek = new Date(now);
      const day = now.getDay(); // 0=Sunday, 1=Monday, ...
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
      firstDayOfWeek.setDate(diff);
      firstDayOfWeek.setHours(0, 0, 0, 0);
  
      // Find Sunday of this week
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);
  
      snap.forEach((doc) => {
        const data = doc.data();
        if (!data.date) return;
  
        const apptDate = data.date.toDate ? data.date.toDate() : new Date(data.date);
  
        // Check if within this week
        if (apptDate >= firstDayOfWeek && apptDate <= lastDayOfWeek) {
          const dayIndex = apptDate.getDay();
          const dayNames = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ];
          const dayName = dayNames[dayIndex];
          activity[dayName] = (activity[dayName] || 0) + 1;
        }
      });
  
      setWeeklyActivity(activity);
    });
  
    return () => unsubscribe();
  }, []);
  
  
  
  
    useEffect(() => {
      // Count Users
      const fetchUsers = async () => {
        const q = query(
          collection(db, "Transactions"),
          where("purpose", "==", "Radiographic")
        );
        const snap = await getDocs(q);
      
        const uniqueUsers = new Set<string>();
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.UserId) {
            uniqueUsers.add(data.UserId);
          }
        });
      
        setTotalUsers(uniqueUsers.size);
      };
      

  
      // Count Patients
  
const fetchPatients = async () => {
  const q = query(
    collection(db, "Transactions"),
    where("purpose", "==", "Radiographic")
  );
  const snap = await getDocs(q);

  const uniquePatients = new Set<string>();
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.patientId) {
      uniquePatients.add(data.patientId);
    }
  });

  setTotalPatients(uniquePatients.size);
};


  
      // Real-time Appointments (Total, Pending, Cancelled)
      const transQuery = query(
        collection(db, "Transactions"),
        where("purpose", "==", "Radiographic")
      );
  
      const unsubscribe = onSnapshot(transQuery, (snap) => {
    let total = 0;
    let pending = 0;
    let cancelled = 0;
    let approved = 0;
    let rejected = 0;
    let completed = 0;
  
    snap.forEach((doc) => {
      const data = doc.data();
      total++;
      if (data.status === "Pending") pending++;
      if (data.status === "Cancelled") cancelled++;
      if (data.status === "Approved") approved++;
      if (data.status === "Rejected") rejected++;
      if (data.status === "Completed") completed++;
    });
  
    setTotalAppointments(total);
    setPendingCount(pending);
    setCancelledCount(cancelled);
    setApprovedCount(approved);
    setRejectedCount(rejected);
    setCompletedCount(completed);
  });
      fetchUsers();
      fetchPatients();
  
      return () => unsubscribe();
    }, []);
  

  // Notifications
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

 

  // Chart Data
    const data: ChartData[] = [
  { name: "Approved", value: approvedCount },
  { name: "Pending", value: pendingCount },
  { name: "Canceled", value: cancelledCount },
  { name: "Completed", value: completedCount },
  { name: "Rejected", value: rejectedCount },
];

  const COLORS: string[] = ["#4CAF50", "#FFC107", "#F44336", "#2196F3", "#FF5722"];
  const unreadCount: number = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

 

  return (
    <div className="dashboards">
      {/* Sidebar */}
      <aside className="sidebars">
        <div>
          <div
            className="logo-boxs"
            onClick={() => handleNavigation("/dashboard_radiology")}
            style={{ cursor: "pointer" }}
          >
            <img src={logo} alt="logo" className="logoss" />
            <span className="logo-texts">Radiology</span>
          </div>

          {/* Nav Links */}
          <nav className="nav-linkss">
            <div className="nav-item active">
              <FaTachometerAlt className="nav-icon" />
              <span>Dashboard</span>
            </div>
            <div className="nav-item">
              <FaCalendarAlt className="nav-icon" />
              <span onClick={() => handleNavigation("/appointments_radiology")}>
                Appointments
              </span>
            </div>
            <div className="nav-item">
              <FaUsers className="nav-icon" />
              <span onClick={() => handleNavigation("/patientrecords_radiology")}>
                Patient Records
              </span>
            </div>
            <div className="nav-item">
              <FaClock className="nav-icon" />
              <span onClick={() => handleNavigation("/manageslots_radiology")}>
                Manage Slots
              </span>
            </div>
            <div className="nav-item">
              <FaChartBar className="nav-icon" />
              <span onClick={() => handleNavigation("/reports&analytics_radiology")}>
                Reports & Analytics
              </span>
            </div>
           
          </nav>
        </div>

        {/* User Info and Sign Out */}
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

      {/* Main content */}
      <main className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar-radiology">
          <h2 className="navbar-title">Dashboard</h2>
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
                  <div className="notification-empty">
                    No new notifications
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
      <div className="content-wrapper">
          <div className="cards-container">
                  <div className="card-row">
        
                      <div className="cardss">
                      <FaUsers className="card-icon" />
                      <h3>{totalUsers}</h3>
                      <p>Total Users</p>
                    </div>
        
                    <div className="cardss">
                      <FaUsers className="card-icon" />
                      <h3>{totalPatients}</h3>
                      <p>Total Patients</p>
                    </div>
                    <div className="cardss">
                      <FaCalendarAlt className="card-icon" />
                      <h3>{totalAppointments}</h3>
                      <p>Total Appointments</p>
                    </div>
                    
                  </div>
        
                  <div className="card-row">
                    <div className="cardss">
                      <FaChartBar className="card-icon" />
                       <h3>{pendingCount}</h3>
                      <p>Pending Appointments</p>
                    </div>
                     <div className="cardss">
                      <FaCalendarAlt className="card-icon" />
                      <h3>{cancelledCount}</h3>
                      <p>Canceled Appointments</p>
                    </div>
        
                    <div className="cardss">
                      <FaCalendarAlt className="card-icon" />
                      <h3>{approvedCount}</h3>
                      <p>Approved Appointments</p>
                    </div>
                   
                   
                  </div>
        
                  <div className="card-row">
                    <div className="cardss">
                      <FaTimesCircle className="card-icon" />
                      <h3>{rejectedCount}</h3>
                      <p>Total Rejected</p>
                    </div>
                    <div className="cardss">
                      <FaCheckCircle className="card-icon" />
                      <h3>{completedCount}</h3>
                      <p>Total Completed</p>
                    </div>
                  </div>
                </div>

        {/* Charts and Activity */}
        <div className="chart-activity-container">
          <div className="chart-wrapper">
            <h3 className="chart-title">Appointment Distribution</h3>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} (${(percent ? (percent * 100).toFixed(1) : 0)}%)`
                  }                  
                  dataKey="value"
                  paddingAngle={3}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  layout="horizontal"
                  align="center"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="activity-wrapper">
  <h3 className="chart-title">Weekly Activity Status</h3>
  <ul className="activity-list">
    {Object.entries(weeklyActivity).map(([day, count]) => (
      <li key={day}>
        <strong>{day}:</strong>{" "}
        {(day === "Saturday" || day === "Sunday")
          ? "Closed"
          : `${count} Appointments`}
      </li>
    ))}
  </ul>
</div>

        </div>

      
      
</div>
</main>
</div>
);
};

export default Dashboard_Radiology;

