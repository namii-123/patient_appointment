import React, { useState, useEffect, useRef } from "react";
import { FaUser, FaFileAlt, FaSignOutAlt } from "react-icons/fa";
import { signOut } from "firebase/auth";
import { auth } from "./firebase"; 
import {toast} from "react-toastify"
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaBell,
  FaTooth,
  FaXRay,
  FaVials,
  FaUserMd,
  FaStethoscope,
} from "react-icons/fa";
import "../../assets/Home.css";
import Contacts from "./Contacts";
import Profile from "./Profile";
import EditProfile from "./EditProfile";
import Transaction from "./Transaction";
import AllServices from "./AllServices";
import AppointmentCalendar from "./AppointmentCalendar";
import ClinicalLabServices from "./ClinicalLabServices";
import RadiographicServices from "./RadiographicServices";
import DentalServices from "./DentalServices";
import MedicalConsultations from "./MedicalConsultations";
import CalendarClinicalLab from "./CalendarClinicalLab";
import CalendarDental from "./CalendarDental";
import CalendarMedical from "./CalendarMedical";
import ReviewPage from "./ReviewPage";

import {
  FaEnvelope,
  FaCalendarCheck,
  FaTools,
  FaInfoCircle,
} from "react-icons/fa";



interface Notification {
  id: number;
  text: string;
  read: boolean;
  timestamp: Date;
  icon?: React.ReactNode;
}

const initialNotifications: Notification[] = [
  { id: 1, text: "New message from admin", read: false, timestamp: new Date(), icon: <FaEnvelope /> },
  { id: 2, text: "Your appointment is confirmed", read: true, timestamp: new Date(Date.now() - 3600000), icon: <FaCalendarCheck /> },
  { id: 3, text: "System maintenance on Friday", read: false, timestamp: new Date(Date.now() - 86400000 * 2), icon: <FaTools /> },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD">("ALL");
  const [currentView, setCurrentView] = useState<"home" | "contacts" | "dde" | "allservices" | "profile" | "editprofile" | "transaction" | "calendar" | "confirm" 
  | "labservices" | "radioservices" | "dental" | "medical" | "calendarlab" | "calendardental"
  | "calendarmedical" | "review">("home");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLLIElement>(null);
  const [formData, setFormData] = useState<any>(null);


  const handleNavigate = (targetView: "profile" | "editprofile" | "transaction" | "allservices" | "calendar" | "confirm"
  | "labservices" | "radioservices" | "dental" | "medical" | "calendarlab" | "calendardental" | "calendarmedical" | "review"
) => {

    setCurrentView(targetView);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleNotifDropdown = () => {
    setNotifDropdownOpen(prev => !prev);
    setProfileDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(prev => !prev);
    setNotifDropdownOpen(false);
  };

  const handleNotificationClick = (id: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: !notif.read } : notif
      )
    );
  };

 const handleLogout = async () => {
  if (window.confirm("Are you sure you want to sign out?")) {
    try {
      await signOut(auth); 
      window.location.href = "/"; 
    } catch (error) {
      console.error("Error signing out:", error);
    }
  }
};



  const unreadCount = notifications.filter(notif => !notif.read).length;
  const filteredNotifications =
    activeTab === "ALL" ? notifications : notifications.filter(notif => !notif.read);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        notifRef.current &&
        !notifRef.current.contains(target) &&
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setNotifDropdownOpen(false);
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [openOptionsId, setOpenOptionsId] = useState<number | null>(null);

  const toggleOptions = (id: number) => {
    setOpenOptionsId(prev => (prev === id ? null : id));
  };

  const toggleReadStatus = (id: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: !notif.read } : notif
      )
    );
    setOpenOptionsId(null);
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    setOpenOptionsId(null);
  };

  const formatNotifTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (diff < 3600000) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (diff < 86400000) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="landing-container-homes">
      <nav className="navbar-homes">
        <div className="logos">
          <Link to="/home">
            <img
              className="landing-logos"
              src="/logo.png"
              alt="DOH Logo"
              onClick={() => setCurrentView("home")}
              style={{ cursor: "pointer" }}
            />
          </Link>
          <div className="logo-text">DOH-TRC Argao</div>
        </div>

          <div className="notification-bell-wrapper" ref={notifRef}>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            <FaBell className="notification-bell" onClick={toggleNotifDropdown} />
            {notifDropdownOpen && (
              <div className="notification-dropdown">
                <div className="notification-header">Notifications</div>
                <div className="tab-buttons">
                  <button className={activeTab === "ALL" ? "tab active" : "tab"} onClick={() => setActiveTab("ALL")}>ALL</button>
                  <button className={activeTab === "UNREAD" ? "tab active" : "tab"} onClick={() => setActiveTab("UNREAD")}>UNREAD</button>
                </div>
                <div className="notification-list">
                  {filteredNotifications.length === 0 ? (
                    <p className="empty">No Notifications.</p>
                  ) : (
                    <ul>
                      {filteredNotifications.map((notif) => (
                        <li key={notif.id} className={`notification-item ${notif.read ? "read" : "unread"}`}>
                          <div className="notif-left-icon">
                            {notif.icon || <FaInfoCircle />}
                          </div>
                          <div className="notif-content" onClick={() => handleNotificationClick(notif.id)}>
                            <span className="notif-text">{notif.text}</span>
                            <span className="notif-time">{formatNotifTime(notif.timestamp)}</span>
                          </div>
                          <div className="notif-options">
                            <div className="notif-dots" onClick={() => toggleOptions(notif.id)}>⋮</div>
                            {notif.id === openOptionsId && (
                              <div className="notif-dropdown-menu">
                                <button onClick={() => toggleReadStatus(notif.id)}>
                                  {notif.read ? "Mark as Unread" : "Mark as Read"}
                                </button>
                                <button onClick={() => deleteNotification(notif.id)}>Delete</button>
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hamburger button (uses React state) */}
  <div className={`hamburger ${menuOpen ? "open" : ""}`}
    onClick={() => setMenuOpen(!menuOpen)}>
    <span></span>
    <span></span>
    <span></span>
  </div>

  <ul className={`nav-links-homes ${menuOpen ? "active" : ""}`}>
          <li className={`home-link ${currentView === "home" ? "active" : ""}`} onClick={() => { setCurrentView("home"); setMenuOpen(false);}}>Home</li>
          <li className={`home-link ${currentView === "contacts" ? "active" : ""}`} onClick={() => { setCurrentView("contacts"); setMenuOpen(false);}}>Contact Us</li>
          <li className="profile-avatar-wrapper" ref={profileRef}>
            <span className="nav-icon-profile">
            <FaUserCircle className="profile-icon" onClick={ toggleProfileDropdown} />
            </span>
            <span className="nav-text-profile" onClick={ toggleProfileDropdown}>User</span>
            {profileDropdownOpen && (
              <div className="profile-dropdown">
                <ul>
                  <li
                    onClick={() => {
                      setCurrentView("profile");
                      setMenuOpen(false);
                      setProfileDropdownOpen(false);
                    }}
                  >
                    <FaUser className="dropdown-icon" /> Profile
                  </li>
                  <li
                    onClick={() => {
                      setCurrentView("transaction");
                      setMenuOpen(false)
                      setProfileDropdownOpen(false);
                    }}
                  >
                    <FaFileAlt className="dropdown-icon" /> Transactions
                  </li>
                  <li
                    onClick={() => {
                       handleLogout();
                       setMenuOpen(false);
                      setProfileDropdownOpen(false);
                    }}
                  >
                    <FaSignOutAlt className="dropdown-icon" /> Sign Out
                  </li>
                </ul>
              </div>
            )}
          </li>
        </ul>
      </nav>

      {currentView === "home" && (
        <>
          <section className="hero-home">
            <div className="hero-content-home">
              <h1>Healthcare you can trust.</h1>
              <p>Serving the community with care and compassion.</p>
              <p className="hero-text">Committed to providing accessible healthcare services <br />for all.</p>
            </div>
          </section>

          <section className="services-homes">
            <h2>Our Services</h2>
            <div className="services-cards-homes">
              <div className="service-card-homes">
                <div className="service-icons"><FaTooth /></div>
                <h3>Dental Services</h3>
                <p>Providing complete oral health care, including cleanings, exams, and treatment plans.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons"><FaXRay /></div>
                <h3>Radiology Services</h3>
                <p>Advanced imaging services such as X-rays and ultrasounds for accurate diagnosis.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons"><FaVials /></div>
                <h3>Clinical Laboratory Services</h3>
                <p>Fast and accurate blood tests, screenings, and laboratory diagnostics.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons"><FaUserMd /></div>
                <h3>Drug Dependency Exam</h3>
                <p>Professional assessment services for individuals undergoing drug rehabilitation programs.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons"><FaStethoscope /></div>
                <h3>Medical Consultations</h3>
                <p>General check-ups, follow-up care, and health evaluations by licensed medical professionals.</p>
              </div>
            </div>
           <div className="click-button" style={{ display: "flex", gap: "10px" }}>
  <button className="learn-more" onClick={() => setCurrentView("allservices")}>Book For All Services</button>
  <button className="learn-more" onClick={() => setCurrentView("dde")}>Book For DDE</button>
</div>

          </section>
        </>
      )}

      {currentView === "contacts" && (
        <section className="contacts">
          <Contacts />
        </section>
      )}

     

   
   
{currentView === "calendar" && (
  <AppointmentCalendar
    formData={formData} // pass formData here
    onNavigate={(targetView) => setCurrentView(targetView)}
  />
)}



{currentView === "labservices" && (
  <ClinicalLabServices
    onNavigate={(view, data) => {
      setCurrentView(view);
      setFormData(data);
    }}
    patientId={formData?.patientId}
    controlNo={formData?.controlNo}
    formData={formData}
  />
)}


{currentView === "calendarlab" && (
  <CalendarClinicalLab
    formData={formData} // pass formData here
    onNavigate={(targetView) => setCurrentView(targetView)}
  />
)}

   
{currentView === "calendardental" && (
  <CalendarDental
    formData={formData} // pass formData here
    onNavigate={(targetView) => setCurrentView(targetView)}
  />
)}

{currentView === "calendarmedical" && (
  <CalendarMedical
    formData={formData} // pass formData here
    onNavigate={(targetView) => setCurrentView(targetView)}
  />
)}



{currentView === "allservices" && (
  <AllServices onNavigate={(view, data) => {
    setCurrentView(view);
    setFormData(data);  // 🔑 store formData, patientId, controlNo in state
  }} />
)}

{currentView === "radioservices" && (
  <RadiographicServices
    onNavigate={(view, data) => {
      setCurrentView(view);
      setFormData(data);
    }}
    patientId={formData?.patientId}
    controlNo={formData?.controlNo}
    formData={formData}
  />
)}


{currentView === "dental" && (
  <DentalServices
    onNavigate={(view, data) => {
      setCurrentView(view);
      setFormData(data);
    }}
    patientId={formData?.patientId}
    controlNo={formData?.controlNo}
    formData={formData}
  />
)}


{currentView === "medical" && (
  <MedicalConsultations
    onNavigate={(view, data) => {
      setCurrentView(view);
      setFormData(data);
    }}
    patientId={formData?.patientId}
    controlNo={formData?.controlNo}
    formData={formData}
  />
)}

{currentView === "review" && (
  <ReviewPage
    formData={formData}
    onNavigate={(view, data) => {
      setCurrentView(view);
      if (data) setFormData(data);
    }}
  />
)}

     

      
      {currentView === "profile" && <Profile onNavigate={handleNavigate} />}
      {currentView === "editprofile" && <EditProfile onNavigate={handleNavigate} />}
      {currentView === "transaction" && <Transaction onNavigate={handleNavigate} />}
      
      
      
      

      <footer className="footer-home">
        <div className="footer-content-home">
          <p>© 2025 DOH-TRC Argao. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;