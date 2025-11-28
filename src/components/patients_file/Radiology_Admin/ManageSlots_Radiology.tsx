import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaUser, FaTachometerAlt, FaCalendarAlt, FaUsers, FaChartBar, FaSignOutAlt, FaClock, FaStethoscope } from "react-icons/fa";
import "../../../assets/ManageSlots.css";
import { db } from "../firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { X } from "lucide-react";
import logo from "/logo.png";

interface Slot {
  slotID: string;
  time: string;
  remaining: number;
}

type Notification = {
  text: string;
  unread: boolean;
};

interface DayData {
  slots: Slot[];
  totalSlots: number;
  unlimited: boolean;
  closed: boolean;
}

type SlotsState = Record<string, DayData>;

const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const generateDays = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const predefinedTimes = [
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "13:00 PM - 14:00 PM",
  "14:00 PM - 15:00 PM",
];

const ManageSlots_Radiology: React.FC = () => {
  const navigate = useNavigate();
  const department = "Radiographic";

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<SlotsState>({});
  const [unlimited, setUnlimited] = useState<boolean>(true);
  const [closed, setClosed] = useState<boolean>(false);
  const [slotCounts, setSlotCounts] = useState<Record<string, number>>({});
  const [maxYear, setMaxYear] = useState(today.getFullYear() + 20);
   const [showNotifications, setShowNotifications] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<Notification[]>([
      { text: "3 new appointment requests", unread: true },
      { text: "Reminder: Meeting at 2PM", unread: true },
      { text: "System update completed", unread: false },
    ]);
  
    const unreadCount = notifications.filter((n) => n.unread).length;
  
    const markAllAsRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    };

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const days = generateDays(currentYear, currentMonth);

  // Load all days — default to UNLIMITED if no data
  useEffect(() => {
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);
    const unsubs: (() => void)[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateKey(d);
      const ref = doc(db, "Departments", department, "Slots", dateKey);

      const unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as DayData;
          setSlots(prev => ({ ...prev, [dateKey]: data }));
        } else {
          // THIS IS THE KEY: DEFAULT = UNLIMITED
          setSlots(prev => ({
            ...prev,
            [dateKey]: {
              slots: [],
              totalSlots: 999,
              unlimited: true,
              closed: false
            }
          }));
        }
      });
      unsubs.push(unsub);
    }

    return () => unsubs.forEach(u => u());
  }, [currentMonth, currentYear, department]);

  const handleDayClick = (date: Date) => {
    const dateKey = formatDateKey(date);
    const dayData = slots[dateKey] || { unlimited: true, closed: false, slots: [] };

    setSelectedDate(date);
    setUnlimited(dayData.unlimited);
    setClosed(dayData.closed);

    // Pre-fill slot counts if limited
    const counts: Record<string, number> = {};
    if (!dayData.unlimited && dayData.slots?.length > 0) {
      dayData.slots.forEach(s => {
        counts[s.time] = s.remaining;
      });
    } else if (!dayData.unlimited) {
      predefinedTimes.forEach(t => counts[t] = 3);
    }
    setSlotCounts(counts);
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const dateKey = formatDateKey(selectedDate);
    const ref = doc(db, "Departments", department, "Slots", dateKey);

    let payload: DayData;

    if (closed) {
      payload = {
        slots: [],
        totalSlots: 0,
        unlimited: false,
        closed: true
      };
    } else if (unlimited) {
      payload = {
        slots: [],
        totalSlots: 999,
        unlimited: true,
        closed: false
      };
    } else {
      const slotsData = predefinedTimes.map(time => ({
        slotID: `${dateKey}-${time.replace(/[^a-zA-Z0-9]/g, "")}`,
        time,
        remaining: slotCounts[time] ?? 3
      }));
      const total = slotsData.reduce((sum, s) => sum + s.remaining, 0);
      payload = {
        slots: slotsData,
        totalSlots: total,
        unlimited: false,
        closed: false
      };
    }

    try {
      await setDoc(ref, payload, { merge: true });
      openCustomModal("Slots updated successfully!", "success");
      setSelectedDate(null);
      setSlotCounts({});
    } catch (err) {
      console.error("Save error:", err);
      openCustomModal("Failed to save slots.", "error");
    }
  };

  const getDisplayText = (dateKey: string): string => {
    const data = slots[dateKey];
    if (!data) return "Unlimited";
    if (data.closed) return "Closed";
    if (data.unlimited) return "Unlimited";
    return `${data.totalSlots} slots`;
  };

  // Modal Logic
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalMessage, setCustomModalMessage] = useState("");
  const [customModalType, setCustomModalType] = useState<"success" | "error" | "confirm">("success");
  const [onCustomModalConfirm, setOnCustomModalConfirm] = useState<() => void>(() => {});

  const openCustomModal = (msg: string, type: "success" | "error" | "confirm" = "success", onConfirm?: () => void) => {
    setCustomModalMessage(msg);
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
          <div className="logo-boxs" onClick={() => navigate("/dashboard_radiology")} style={{ cursor: "pointer" }}>
            <img src="logo.png" alt="logo" className="logoss" />
            <span className="logo-texts">RADIOLOGY</span>
          </div>
          <nav className="nav-linkss">
            <div className="nav-item"><FaTachometerAlt className="nav-icon" /><span onClick={() => navigate("/dashboard_radiology")}>Dashboard</span></div>
            <div className="nav-item"><FaCalendarAlt className="nav-icon" /><span onClick={() => navigate("/appointments_radiology")}>Appointments</span></div>
            <div className="nav-item"><FaUsers className="nav-icon" /><span onClick={() => navigate("/patientrecords_radiology")}>Patient Records</span></div>
            <div className="nav-item active"><FaClock className="nav-icon" /><span>Manage Slots</span></div>
            <div className="nav-item"><FaStethoscope className="nav-icon" /><span onClick={() => navigate("/services_radiology")}>Services</span></div>
            <div className="nav-item"><FaChartBar className="nav-icon" /><span onClick={() => navigate("/reports&analytics_radiology")}>Reports & Analytics</span></div>
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="user-box"><FaUser className="user-icon" /><span className="user-label">Admin</span></div>
          <div className="signout-box">
            <FaSignOutAlt className="signout-icon" />
            <span onClick={() => openCustomModal("Are you sure you want to sign out?", "confirm", async () => {
              await signOut(auth);
              navigate("/loginadmin", { replace: true });
            })} className="signout-label" style={{ cursor: "pointer" }}>Sign Out</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-navbar-dental">
          <h5 className="navbar-title">Manage Slots</h5>
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
          <div className="calendar-containers">
            <div className="calendar-headers">
              <h5 className="calendar-title">Monthly Calendar - Manage Slots</h5>
              <div className="calendar-nav">
                <select value={currentMonth} onChange={e => setCurrentMonth(parseInt(e.target.value))}>
                  {monthNames.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={currentYear} onChange={e => {
                  const y = parseInt(e.target.value);
                  setCurrentYear(y);
                  if (y === maxYear) setMaxYear(maxYear + 20);
                }}>
                  {Array.from({ length: maxYear - today.getFullYear() + 1 }, (_, i) => today.getFullYear() + i)
                    .map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="calendar-grid">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => <div key={d} className="calendar-weekday">{d}</div>)}
              {Array(days[0].getDay()).fill(null).map((_, i) => <div key={`empty-${i}`} className="calendar-day empty" />)}
              {days.map(day => {
  const dateKey = formatDateKey(day);
  const data = slots[dateKey];
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
  const isPast = day < new Date(new Date().setHours(0,0,0,0));

  let statusClass = "";
  let displayText = "Loading...";

  if (isWeekend) {
    statusClass = "status-weekend";
    displayText = "Closed";
  } else if (isPast) {
    statusClass = "status-past";
    displayText = "Past";
  } else if (data) {
    if (data.closed) {
      statusClass = "status-closed";
      displayText = "Closed";
    } else if (data.unlimited) {
      statusClass = "status-unlimited";
      displayText = "Unlimited";
    } else {
      statusClass = "status-limited";
      displayText = `${data.totalSlots} slots`;
    }
  } else {
    // Default while loading or no data
    statusClass = "status-unlimited";
    displayText = "Unlimited";
  }

  const isDisabled = isWeekend || isPast;

  return (
    <div
      key={dateKey}
      className={`calendar-day ${statusClass} ${isDisabled ? "disabled-day" : ""}`}
      onClick={() => !isDisabled && handleDayClick(day)}
      style={isDisabled ? { pointerEvents: "none" } : { cursor: "pointer" }}
    >
      <div className="day-number">{day.getDate()}</div>
      <div className="weekday-name">
        {day.toLocaleDateString("en-US", { weekday: "short" })}
      </div>
      <div className="slots-summary">
        {displayText}
      </div>
    </div>
  );
})}
            </div>
          </div>

          {/* SLOT MANAGEMENT MODAL */}
          {selectedDate && (
            <div className="modal-overlay-calendar">
              <div className="modal colored-modal">
                <button className="absolute top-4 right-4 text-gray-600 hover:text-red-600" onClick={() => setSelectedDate(null)}>
                  <X size={28} />
                </button>
                <h4 className="text-xl font-bold mb-6">Manage Slots - {selectedDate.toDateString()}</h4>

                <div className="space-y-5">
                  <label className="">
                    <input
                      type="checkbox"
                      checked={closed}
                      onChange={e => {
                        setClosed(e.target.checked);
                        if (e.target.checked) setUnlimited(false);
                      }}
                      className="w-5 h-5"
                    />
                    <strong>Close this day completely</strong>
                  </label>

                  {!closed && (
                    <label className="flex items-center gap-3 text-lg">
                      <input
                        type="checkbox"
                        checked={unlimited}
                        onChange={e => setUnlimited(e.target.checked)}
                        className="w-5 h-5"
                      />
                      <strong>Unlimited Slots (Always Available)</strong>
                    </label>
                  )}
                </div>

                {!closed && !unlimited && (
                  <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                    <p className="font-bold mb-3">Set capacity per time slot:</p>
                    {predefinedTimes.map(time => (
                      <div key={time} className="flex justify-between items-center py-2">
                        <span className="font-medium">{time}</span>
                        <input
                          type="number"
                          min="0"
                          value={slotCounts[time] ?? 3}
                          onChange={e => setSlotCounts(prev => ({ ...prev, [time]: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-3 py-2 border rounded-lg text-center"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-4 mt-8 justify-center">
                  <button className="button-saves px-8 py-3" onClick={handleSave}>
                    Save Changes
                  </button>
                  <button className="button-cancel px-8 py-3" onClick={() => setSelectedDate(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success/Error/Confirm Modal */}
          {showCustomModal && (
            <>
              <audio autoPlay>
                <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
              </audio>
              <div className="radiology-modal-overlay" onClick={closeCustomModal}>
                <div className="radiology-modal-content" onClick={e => e.stopPropagation()}>
                  <div className="radiology-modal-header">
                    <img src={logo} alt="Logo" className="radiology-modal-logo" />
                    <h3 className="radiology-modal-title">
                      {customModalType === "success" ? "SUCCESS" : customModalType === "error" ? "ERROR" : "CONFIRM ACTION"}
                    </h3>
                  </div>
                  <div className="radiology-modal-body">
                    <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>{customModalMessage}</p>
                  </div>
                  <div className="radiology-modal-footer">
                    {customModalType === "confirm" ? (
                      <>
                        <button className="radiology-modal-btn cancel" onClick={closeCustomModal}>Cancel</button>
                        <button className="radiology-modal-btn confirm" onClick={() => { closeCustomModal(); onCustomModalConfirm(); }}>
                          Confirm
                        </button>
                      </>
                    ) : (
                      <button className="radiology-modal-btn ok" onClick={closeCustomModal}>
                        OK
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageSlots_Radiology;