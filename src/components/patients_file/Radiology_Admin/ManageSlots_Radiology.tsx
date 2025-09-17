import React, { useState, useEffect} from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaClock} from "react-icons/fa";
import "../../../assets/ManageSlots.css";
import { db } from "../firebase";
import { doc, setDoc, onSnapshot} from "firebase/firestore";
import ShortUniqueId from "short-unique-id";




interface Slot {
  time: string;
  remaining: number;
  slotID?: string;
}

interface Notification {
  text: string;
  unread: boolean;
}

const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

type SlotsState = Record<string, { slots: Slot[]; totalSlots: number }>;



const generateDays = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};


const ManageSlots_Radiology: React.FC = () => {
  const navigate = useNavigate();
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const currentDate = new Date();
   const [currentMonth, setCurrentMonth] = useState<number>(currentDate.getMonth());
   const [currentYear, setCurrentYear] = useState<number>(currentDate.getFullYear());
   const [selectedDate, setSelectedDate] = useState<Date | null>(null);
   const [slots, setSlots] = useState<SlotsState>({});
   const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
   const [closeDay, setCloseDay] = useState(false);
 


 const monthNames: string[] = [
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
  ];

  const days: Date[] = generateDays(currentYear, currentMonth);
  const department = "Radiographic";


   const predefinedSlots: { time: string; capacity: number }[] = [
      { time: "8:00 AM - 9:00 AM", capacity: 3 },
      { time: "9:00 AM - 10:00 AM", capacity: 3 },
      { time: "10:00 AM - 11:00 AM", capacity: 3 },
      { time: "11:00 AM - 12:00 PM", capacity: 2 },
      { time: "13:00 PM - 14:00 PM", capacity: 2 },
      { time: "14:00 PM - 15:00 PM", capacity: 2 },
    ];
  
    const [maxYear, setMaxYear] = useState(currentDate.getFullYear() + 20);
    

   useEffect(() => {
       const unsubscribeFns: (() => void)[] = [];
   
       const loadSlots = async () => {
         const start = new Date(currentYear, currentMonth, 1);
         const end = new Date(currentYear, currentMonth + 1, 0);
         const updatedSlots: SlotsState = {};
   
         for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
           const dateKey = formatDateKey(d);
           const slotRef = doc(db, "Departments", department, "Slots", dateKey);
   
           const unsub = onSnapshot(
             slotRef,
             (slotSnap) => {
               console.log(`ManageSlots_Radiographic: Date ${dateKey}, Firestore data:`, slotSnap.data());
               if (slotSnap.exists()) {
                 const data = slotSnap.data();
                 if (data.closed) {
                   updatedSlots[dateKey] = { slots: [], totalSlots: 0 };
                 } else {
                   const slotsData = (data.slots as Slot[]) || [];
                   const totalSlots = slotsData.reduce((sum, s) => sum + (s.remaining || 0), 0);
                   updatedSlots[dateKey] = { slots: slotsData, totalSlots };
                 }
               } else {
                 const slotsData = predefinedSlots.map((s) => ({
                   time: s.time,
                   remaining: s.capacity,
                 }));
                 const totalSlots = slotsData.reduce((sum, s) => sum + s.remaining, 0);
                 updatedSlots[dateKey] = { slots: slotsData, totalSlots };
               }
               setSlots((prev) => ({ ...prev, ...updatedSlots }));
             },
             (error) => {
               console.error(`onSnapshot error for ${dateKey}:`, error);
             }
           );
   
           unsubscribeFns.push(unsub);
         }
       };
   
       loadSlots();
   
       return () => {
         unsubscribeFns.forEach((fn) => fn());
       };
     }, [currentMonth, currentYear, department]);
   
   

 const handleDayClick = (date: Date) => {
    const dayStr = date.toDateString();
    const daySlots = getSlotsForDay(dayStr);

    const initialCounts: Record<string, number> = {};
    daySlots.forEach((slot) => {
      initialCounts[slot.time] = slot.remaining;
    });

    setSelectedDate(date);
    setSlotCounts(initialCounts);
    setCloseDay(daySlots.length === 0);
  };



  const handleSlotSubmit = async () => {
    if (!selectedDate) return;
  
    try {
      const dateKey = formatDateKey(selectedDate);
      const slotRef = doc(db, "Departments", department, "Slots", dateKey);
  
      if (closeDay) {
        await setDoc(slotRef, { date: dateKey, closed: true, slots: [], totalSlots: 0 }, { merge: true });
        setSlots((prev) => ({ ...prev, [dateKey]: { slots: [], totalSlots: 0 } }));
      } else {
        const uid = new ShortUniqueId({ length: 8 });
        const slotsData = predefinedSlots.flatMap((s) => {
          const count = slotCounts[s.time] ?? s.capacity;
          return Array.from({ length: count }).map(() => ({
            slotID: `SLOT-${uid.randomUUID()}`,
            time: s.time,
            remaining: 1,
          }));
        });
  
        const totalSlots = slotsData.reduce((sum, s) => sum + s.remaining, 0);
  
        await setDoc(slotRef, { date: dateKey, closed: false, slots: slotsData, totalSlots }, { merge: true });
        setSlots((prev) => ({ ...prev, [dateKey]: { slots: slotsData, totalSlots } }));
      }
  
      setSelectedDate(null);
      setSlotCounts({});
      setCloseDay(false);
    } catch (error) {
      console.error("Error saving slots:", error);
      alert("Failed to save slots. Please try again.");
    }
  };
  


  const getSlotsForDay = (dayStr: string): Slot[] => {
  const date = new Date(dayStr);
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return [];

  const dateKey = formatDateKey(date);

 
  if (slots[dateKey] && slots[dateKey].slots.length === 0 && slots[dateKey].totalSlots === 0) {
    return [];
  }

  if (slots[dateKey]?.slots && slots[dateKey].slots.length > 0) {
    const grouped: Record<string, number> = {};
    slots[dateKey].slots.forEach((s) => {
      grouped[s.time] = (grouped[s.time] || 0) + (s.remaining || 0);
    });

    return Object.keys(grouped).map((time) => ({
      time,
      remaining: grouped[time],
    }));
  }

  return predefinedSlots.map((s) => ({
    time: s.time,
    remaining: s.capacity,
  }));
};




  // Notifications
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    { text: "3 new appointment requests", unread: true },
    { text: "Reminder: Meeting at 2PM", unread: true },
    { text: "System update completed", unread: false },
  ]);

 

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
            <img src="logo.png" alt="logo" className="logoss" />
            <span className="logo-texts">RADIOLOGY</span>
          </div>

          {/* Nav Links */}
          <nav className="nav-linkss">
            <div className="nav-item ">
              <FaTachometerAlt className="nav-icon" />
               <span onClick={() => navigate("/dashboard_radiology")}>Dashboard</span>
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
            <div className="nav-item active" >
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
              onClick={() => handleNavigation("/")}
              className="signout-label"
            >
              Sign Out
            </span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Top Navbar */}
        <div className="top-navbar-dental">
          <h2 className="navbar-title">Manage Slots</h2>
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

       
      <div className="content-wrapper">
      

       
<div className="calendar-containers">
          <div className="calendar-headers">
            <h3 className="calendar-title">Monthly Calendar - Manage Slots</h3>
            <div className="calendar-nav">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              >
                {monthNames.map((month, i) => (
                  <option value={i} key={i}>
                    {month}
                  </option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => {
                  const selected = parseInt(e.target.value);
                  setCurrentYear(selected);
                  if (selected === maxYear) {
                    setMaxYear(maxYear + 20);
                  }
                }}
              >
                {Array.from(
                  { length: maxYear - currentDate.getFullYear() + 1 },
                  (_, i) => currentDate.getFullYear() + i
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>



          <div className="calendar-grid">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
              <div key={wd} className="calendar-weekday">
                {wd}
              </div>
            ))}
            {Array(days[0].getDay())
              .fill(null)
              .map((_, idx) => (
                <div key={"empty-" + idx} className="calendar-day empty"></div>
              ))}
            {days.map((day) => {
              const dayStr = day.toDateString();
              const dateKey = formatDateKey(day);
              const totalAvailable = slots[dateKey]?.totalSlots || getSlotsForDay(dayStr).reduce((sum, s) => sum + s.remaining, 0);
              const dayOfWeek = day.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const isPast = day < todayStart;
              const weekdayName = day.toLocaleDateString("en-US", { weekday: "short" });

              return (
                <div
                  key={dayStr}
                  className={`calendar-day ${isWeekend ? "disabled-day" : ""} ${isPast ? "past-day" : ""}`}
                  onClick={() => {
                    if (!isWeekend && !isPast) {
                      handleDayClick(day);
                    }
                  }}
                >
                  <div className="day-number">{day.getDate()}</div>
                  <div className="weekday-name">{weekdayName}</div>
                  <div className="slots-summary">
                    {isWeekend ? (
                      <span className="closed">Closed</span>
                    ) : isPast ? (
                      <span className="closed">Past</span>
                    ) : totalAvailable > 0 ? (
                      <span>{totalAvailable} slots</span>
                    ) : (
                      <span className="closed">Closed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        {/* Slot Add Modal */}
 {selectedDate && (
          <div className="modal-overlay-calendar">
            <div className="modal colored-modal">
              <h4>Manage Slots for {selectedDate.toDateString()}</h4>
              <label>
                <input
                  type="checkbox"
                  checked={closeDay}
                  onChange={(e) => setCloseDay(e.target.checked)}
                />
                Close this day (No slots available)
              </label>
              {!closeDay && (
                <div className="slot-list">
                  {getSlotsForDay(selectedDate.toDateString()).map((slot) => (
                    <div key={slot.time} className="slot-row">
                      <span>{slot.time}</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={slotCounts[slot.time] ?? slot.remaining}
                        onChange={(e) =>
                          setSlotCounts((prev) => ({
                            ...prev,
                            [slot.time]: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-actionss">
                <button className="button-save" onClick={handleSlotSubmit}>
                  Save
                </button>
                <button
                  className="button-cancel"
                  onClick={() => setSelectedDate(null)}
                >
                  Cancel
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

export default ManageSlots_Radiology;

