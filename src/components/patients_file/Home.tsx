import React, { useState, useEffect, useRef } from "react";
import { FaUser, FaFileAlt, FaSignOutAlt, FaHome, FaPhone, FaCalendarAlt } from "react-icons/fa";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase"; 
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react"; // Add this line
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
import FormDDE from "./FormDDE";
import CourtOrderForm from "./CourtOrderForm";
import PAOForm from "./PAOForm";
import EmployeeRecommendationForm from "./EmployeeRecommendationForm";
import LawyersRequestForm from "./LawyersRequestForm";
import OfficialReceiptForm from "./OfficialReceiptForm";
import ValidIDForm from "./ValidIDForm";
import ConsentForm from "./ConsentForm";
import VoluntaryAdmissionForm from "./VoluntaryAdmissionForm";
import VoluntaryValidIDForm from "./VoluntaryValidIDForm";
import About from "./About";
import Notifications from "./Notifications";
import { FaEnvelope, FaCalendarCheck, FaTools, FaInfoCircle } from "react-icons/fa";
import { onAuthStateChanged } from "firebase/auth"; 
import type { User } from "firebase/auth"; 
import { doc, getDoc, collection, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore"; 

interface Notification {
  id: string;
  text: string;
  read: boolean;
  timestamp: Date;
  icon?: React.ReactNode;
  type?: string;
}

const initialNotifications: Notification[] = [
  { id: "1", text: "New message from admin", read: false, timestamp: new Date(), icon: <FaEnvelope /> },
  { id: "2", text: "Your appointment is confirmed", read: true, timestamp: new Date(Date.now() - 3600000), icon: <FaCalendarCheck /> },
  { id: "3", text: "System maintenance on Friday", read: false, timestamp: new Date(Date.now() - 86400000 * 2), icon: <FaTools /> },
];

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD">("ALL");
    const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "confirm">("confirm");
  const [onModalConfirm, setOnModalConfirm] = useState<() => void>(() => {});
  const [currentView, setCurrentView] = useState<
    | "home"
    | "contacts"
    | "abouts"
    | "dde"
    | "allservices"
    | "notifications"
    | "profile"
    | "editprofile"
    | "transaction"
    | "calendar"
    | "confirm"
    | "labservices"
    | "radioservices"
    | "dental"
    | "medical"
    | "calendarlab"
    | "calendardental"
    | "calendarmedical"
    | "review"
    | "formdde"
    | "courtorder"
    | "pao"
    | "employee-recommendation"
    | "lawyersrequest"
    | "officialreceipt"
    | "validid"
    | "consentform"
    | "voluntaryform"
    | "voluntary-admission"
    | "voluntaryid"
  >("home");
  const [avatar, setAvatar] = useState<string>("/default-img.jpg"); // State for avatar image

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLLIElement>(null);
  const [formData, setFormData] = useState<any>(null);

  const handleNavigate = (
    targetView:
      | "profile"
      | "abouts"
      | "contacts"
      | "editprofile"
      | "transaction"
      | "allservices"
      | "calendar"
      | "confirm"
      | "labservices"
      | "radioservices"
      | "dental"
      | "medical"
      | "calendarlab"
      | "calendardental"
      | "calendarmedical"
      | "review"
      | "formdde"
      | "courtorder"
      | "pao"
      | "employee-recommendation"
      | "lawyersrequest"
      | "officialreceipt"
      | "validid"
      | "consentform"
      | "voluntaryform"
      | "voluntary-admission"
      | "voluntaryid"
  ) => {
    setCurrentView(targetView);
    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log("Navigated to:", targetView); // Debug log
  };

  const toggleNotifDropdown = () => {
    setNotifDropdownOpen((prev) => !prev);
    setProfileDropdownOpen(false);
  };

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen((prev) => !prev);
    setNotifDropdownOpen(false);
  };


    const openModal = (
    message: string,
    type: "success" | "error" | "confirm",
    onConfirm?: () => void
  ) => {
    setModalMessage(message);
    setModalType(type);
    if (onConfirm) setOnModalConfirm(() => onConfirm);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setOnModalConfirm(() => {});
  };

  const handleNotificationClick = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      const notifRef = doc(db, "Users", auth.currentUser!.uid, "notifications", id);
      await updateDoc(notifRef, { read: !notif.read });
    }
  };

    const handleLogout = () => {
    openModal(
      "Are you sure you want to sign out?",
      "confirm",
      async () => {
        try {
          await signOut(auth);
          openModal("You have been signed out successfully!", "success");
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
        } catch (error) {
          console.error("Error signing out:", error);
          openModal("Error signing out. Please try again.", "error");
        }
      }
    );
  };

  const unreadCount = notifications.filter((notif) => !notif.read).length;
  const filteredNotifications =
    activeTab === "ALL" ? notifications : notifications.filter((notif) => !notif.read);

  // Fetch user profile and avatar on auth state change
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const userRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as { photoBase64?: string };
            setAvatar(data.photoBase64 || user.photoURL || "/default-img.jpg");
          } else {
            setAvatar(user.photoURL || "/default-img.jpg");
          }

          // Listen to notifications
          const notifCollection = collection(db, "Users", user.uid, "notifications");
          const unsubscribeNotif = onSnapshot(notifCollection, (snap) => {
            const notifs: Notification[] = snap.docs.map(doc => {
              const data = doc.data();
              let icon: React.ReactNode | undefined;
if (data.type === "approved") {
  icon = <FaCalendarCheck />;
} else if (data.type === "rejected") {
  icon = <FaEnvelope />;
} else if (data.type === "rescheduled") {
  icon = <FaCalendarAlt style={{ color: "#28a745" }} />; // or any icon
}
              return {
                id: doc.id,
                text: data.text,
                read: data.read,
                timestamp: data.timestamp?.toDate() || new Date(),
                icon,
                type: data.type,
              };
            });
            setNotifications(notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
          });

          return () => unsubscribeNotif();
        } catch (err) {
          console.error("Error fetching profile avatar:", err);
          setAvatar("/default-img.jpg");
        }
      } else {
        setAvatar("/default-img.jpg"); // Reset to default if logged out
        navigate("/"); // Redirect to login if not authenticated
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

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

  const [openOptionsId, setOpenOptionsId] = useState<string | null>(null);

  const toggleOptions = (id: string) => {
    setOpenOptionsId((prev) => (prev === id ? null : id));
  };

  const toggleReadStatus = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      const notifRef = doc(db, "Users", auth.currentUser!.uid, "notifications", id);
      await updateDoc(notifRef, { read: !notif.read });
    }
    setOpenOptionsId(null);
  };

  const deleteNotification = async (id: string) => {
    const notifRef = doc(db, "Users", auth.currentUser!.uid, "notifications", id);
    await deleteDoc(notifRef);
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

  {/* HAMBURGER ICON */}
  <div
    className={`hamburger ${menuOpen ? "open" : ""}`}
    onClick={() => setMenuOpen(!menuOpen)}
  >
    <span></span>
    <span></span>
    <span></span>
  </div>

{/* MOBILE SLIDE-IN MENU MODAL */}
{menuOpen && (
  <div className="mobile-menu-modal-overlay" onClick={() => setMenuOpen(false)}>
    <div className="mobile-menu-modal-content" onClick={(e) => e.stopPropagation()}>
      {/* CLOSE BUTTON */}
      <button className="mobile-menu-close-btn" onClick={() => setMenuOpen(false)}>
        <X size={24} />
      </button>

      {/* LOGO + TITLE */}
      <div className="mobile-menu-header">
        <img src="/logo.png" alt="DOH Logo" className="mobile-menu-logo" />
        <span className="mobile-menu-title">DOH-TRC Argao</span>
      </div>

      {/* MENU LINKS WITH ICONS */}
      <ul className="mobile-menu-links">
        <li
          className={currentView === "home" ? "active" : ""}
          onClick={() => {
            setCurrentView("home");
            setMenuOpen(false);
          }}
        >
          <FaHome /> {/* Home icon */}
          Home
        </li>
        <li
          className={currentView === "abouts" ? "active" : ""}
          onClick={() => {
            setCurrentView("abouts");
            setMenuOpen(false);
          }}
        >
          <FaInfoCircle /> {/* About icon */}
          About Us
        </li>
        <li
          className={currentView === "contacts" ? "active" : ""}
          onClick={() => {
            setCurrentView("contacts");
            setMenuOpen(false);
          }}
        >
          <FaPhone /> {/* Contact icon */}
          Contact Us
        </li>

        {/* NOTIFICATIONS (MOBILE) */}
        <li
          className={currentView === "notifications" ? "active" : ""}
          onClick={() => {
            setCurrentView("notifications");
            setMenuOpen(false);
          }}
        >
          <FaBell /> {/* Notification icon */}
          Notifications
          {unreadCount > 0 && <span className="badge-mobile">{unreadCount}</span>}
        </li>

        {/* PROFILE & TRANSACTIONS (MOBILE) */}
        <li
          className={currentView === "profile" ? "active" : ""}
          onClick={() => {
            setCurrentView("profile");
            setMenuOpen(false);
          }}
        >
          <FaUser /> {/* Profile icon */}
          Profile
        </li>
        <li
          className={currentView === "transaction" ? "active" : ""}
          onClick={() => {
            setCurrentView("transaction");
            setMenuOpen(false);
          }}
        >
          <FaFileAlt /> {/* Transactions icon */}
          Transactions
        </li>

        {/* SIGN OUT */}
        <li
          onClick={() => {
            handleLogout();
            setMenuOpen(false);
          }}
        >
          <FaSignOutAlt /> {/* Sign out icon */}
          Sign Out
        </li>
      </ul>
    </div>
  </div>
)}


  {/* NAV LINKS */}
  <ul className={`nav-links-homes ${menuOpen ? "active" : ""}`}>
    <li
      className={`home-link ${currentView === "home" ? "active" : ""}`}
      onClick={() => {
        setCurrentView("home");
        setMenuOpen(false);
      }}
    >
      Home
    </li>
    <li
      className={`home-link ${currentView === "abouts" ? "active" : ""}`}
      onClick={() => {
        setCurrentView("abouts");
        setMenuOpen(false);
      }}
    >
      About Us
    </li>
    <li
      className={`home-link ${currentView === "contacts" ? "active" : ""}`}
      onClick={() => {
        setCurrentView("contacts");
        setMenuOpen(false);
      }}
    >
      Contact Us
    </li>

    {/* DESKTOP NOTIFICATION BELL */}
    <div className="notification-bell-wrapper desktop-only" ref={notifRef}>
      {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      <FaBell className="notification-bell" onClick={toggleNotifDropdown} />
      {notifDropdownOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">Notifications</div>
          <div className="tab-buttons">
            <button
              className={activeTab === "ALL" ? "tab active" : "tab"}
              onClick={() => setActiveTab("ALL")}
            >
              ALL
            </button>
            <button
              className={activeTab === "UNREAD" ? "tab active" : "tab"}
              onClick={() => setActiveTab("UNREAD")}
            >
              UNREAD
            </button>
          </div>
          <div className="notification-list">
            {filteredNotifications.length === 0 ? (
              <p className="empty">No Notifications.</p>
            ) : (
              <ul>
                {filteredNotifications.map((notif) => (
                  <li
                    key={notif.id}
                    className={`notification-item ${notif.read ? "read" : "unread"}`}
                  >
                    <div className="notif-left-icon">{notif.icon || <FaInfoCircle />}</div>
                    <div
                      className="notif-content"
                      onClick={() => handleNotificationClick(notif.id)}
                    >
                      <span className="notif-text">{notif.text}</span>
                      <span className="notif-time">{formatNotifTime(notif.timestamp)}</span>
                    </div>
                    <div className="notif-options">
                      <div className="notif-dots" onClick={() => toggleOptions(notif.id)}>
                        ⋮
                      </div>
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

    {/* MOBILE NOTIFICATION TEXT LINK */}
    <li
      className={`home-link mobile-only ${currentView === "notifications" ? "active" : ""}`}
      onClick={() => {
        setCurrentView("notifications");
        setMenuOpen(false);
      }}
    >
      Notifications
      {unreadCount > 0 && <span className="badge-mobile">{unreadCount}</span>}
    </li>

          {/* ✅ MOBILE-ONLY PROFILE LINKS */}
  <li
    className={`home-link mobile-only ${currentView === "profile" ? "active" : ""}`}
    onClick={() => {
      setCurrentView("profile");
      setMenuOpen(false);
    }}
  >
    Profile
  </li>
  <li
    className={`home-link mobile-only ${currentView === "transaction" ? "active" : ""}`}
    onClick={() => {
      setCurrentView("transaction");
      setMenuOpen(false);
    }}
  >
    Transactions
  </li>
  <li
    className="home-link mobile-only"
    onClick={() => {
      handleLogout();
      setMenuOpen(false);
    }}
  >
    Sign Out
  </li>

    {/* PROFILE DROPDOWN */}
    <li className="profile-avatar-wrapper desktop-only" ref={profileRef}>
      <span className="nav-icon-profile">
        <img
          src={avatar}
          alt="User Avatar"
          className="nav-avatar-img"
          onClick={toggleProfileDropdown}
          style={{
            cursor: "pointer",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            border: "2px solid black",
          }}
        />
      </span>
      <span className="nav-text-profile" onClick={toggleProfileDropdown}>
        User
      </span>
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
                setMenuOpen(false);
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
              <p className="hero-text">
                Committed to providing accessible healthcare services <br />
                for all.
              </p>
            </div>
          </section>

          <section className="services-homes">
            <h2>Our Services</h2>
            <div className="services-cards-homes">
              <div className="service-card-homes">
                <div className="service-icons">
                  <FaTooth />
                </div>
                <h5>Dental Services</h5>
                <p>Providing complete oral health care, including cleanings, exams, and treatment plans.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons">
                  <FaXRay />
                </div>
                <h5>Radiology Services</h5>
                <p>Advanced imaging services such as X-rays and ultrasounds for accurate diagnosis.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons">
                  <FaVials />
                </div>
                <h5>Clinical Laboratory Services</h5>
                <p>Fast and accurate blood tests, screenings, and laboratory diagnostics.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons">
                  <FaUserMd />
                </div>
                <h5>Drug Dependency Exam</h5>
                <p>Professional assessment services for individuals undergoing drug rehabilitation programs.</p>
              </div>
              <div className="service-card-homes">
                <div className="service-icons">
                  <FaStethoscope />
                </div>
                <h5>Medical Consultations</h5>
                <p>General check-ups, follow-up care, and health evaluations by licensed medical professionals.</p>
              </div>
            </div>
            <div className="click-button" style={{ display: "flex", gap: "10px" }}>
            <button className={`learn-more ${currentView === ("allservices" as typeof currentView) ? "active" : ""}`}
            onClick={() => { setCurrentView("allservices"); setMenuOpen(false);  window.scrollTo({ top: 0, behavior: "smooth" });
            }}>Book For All Services</button>

            <button className={`learn-more ${currentView === ("formdde" as typeof currentView) ? "active" : ""}`}
            onClick={() => { setCurrentView("formdde"); setMenuOpen(false);  window.scrollTo({ top: 0, behavior: "smooth" });
            }}>Book For DDE</button>
            </div>
          </section>
        </>
      )}

{currentView === "notifications" && (
  <section className="notifications-section">
    <Notifications
      notifications={notifications}
      onMarkAsRead={(id: string) => handleNotificationClick(id)}
      onDelete={(id: string) => deleteNotification(id)}
      onNavigateBack={() => setCurrentView("home")}
    />
  </section>
)}

   


      {currentView === "contacts" && (
        <section className="contacts">
          <Contacts
           
          />
        </section>
      )}

      {currentView === "calendar" && (
        <AppointmentCalendar
          formData={formData}
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
          formData={formData}
          onNavigate={(targetView) => setCurrentView(targetView)}
        />
      )}

      {currentView === "calendardental" && (
        <CalendarDental
          formData={formData}
          onNavigate={(targetView) => setCurrentView(targetView)}
        />
      )}

      {currentView === "calendarmedical" && (
        <CalendarMedical
          formData={formData}
          onNavigate={(targetView) => setCurrentView(targetView)}
        />
      )}

      {currentView === "allservices" && (
        <AllServices
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
        />
      )}

      {currentView === "formdde" && (
        <FormDDE
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
        />
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

      {currentView === "courtorder" && (
        <CourtOrderForm
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
          patientId={formData?.patientId}
          controlNo={formData?.controlNo}
          formData={formData}
        />
      )}
      

{currentView === "voluntaryid" && (
  <VoluntaryValidIDForm
    onNavigate={(view, data) => {
      setCurrentView(view);
      setFormData(data);
    }}
    patientId={formData?.patientId}
    controlNo={formData?.controlNo}
    formData={formData}
  />
)}
      {currentView === "pao" && (
        <PAOForm
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
          patientId={formData?.patientId}
          controlNo={formData?.controlNo}
          formData={formData}
        />
      )}

      {currentView === "employee-recommendation" && (
        <EmployeeRecommendationForm
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
          patientId={formData?.patientId}
          controlNo={formData?.controlNo}
          formData={formData}
        />
      )}

       {currentView === "voluntaryform" && (
        <VoluntaryAdmissionForm
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
          patientId={formData?.patientId}
          controlNo={formData?.controlNo}
          formData={formData}
        />
      )}

      {currentView === "lawyersrequest" && (
        <LawyersRequestForm
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
          patientId={formData?.patientId}
          controlNo={formData?.controlNo}
          formData={formData}
        />
      )}

      {currentView === "officialreceipt" && (
        <OfficialReceiptForm
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
          patientId={formData?.patientId}
          controlNo={formData?.controlNo}
          formData={formData}
        />
      )}

      {currentView === "validid" && (
        <ValidIDForm
          onNavigate={(view, data) => {
            setCurrentView(view);
            setFormData(data);
          }}
          patientId={formData?.patientId}
          controlNo={formData?.controlNo}
          formData={formData}
        />
      )}

      {currentView === "consentform" && (
        <ConsentForm
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
      {currentView === "abouts" && <About onNavigate={handleNavigate} />}

      <footer className="footer-home">
        <div className="footer-content-home">
          <p>© 2025 DOH-TRC Argao. All Rights Reserved.</p>
        </div>
      </footer>



            {/* SIGN OUT MODAL */}
      {showModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
          </audio>

          <div className="home-modal-overlay" onClick={closeModal}>
            <div className="home-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="home-modal-header">
                <img src="/logo.png" alt="DOH Logo" className="home-modal-logo" />
                <h3 className="home-modal-title">
                  {modalType === "success" && "SUCCESS"}
                  {modalType === "error" && "ERROR"}
                  {modalType === "confirm" && "CONFIRM SIGN OUT"}
                </h3>
                <button className="home-modal-close" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>

              <div className="home-modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center" }}>{modalMessage}</p>
              </div>

              <div className="home-modal-footer">
                {modalType === "confirm" && (
                  <>
                    <button className="home-modal-btn cancel" onClick={closeModal}>
                      No, Stay
                    </button>
                    <button
                      className="home-modal-btn confirm"
                      onClick={() => {
                        closeModal();
                        onModalConfirm();
                      }}
                    >
                      Yes, Sign Out
                    </button>
                  </>
                )}
                {(modalType === "success" || modalType === "error") && (
                  <button className="home-modal-btn ok" onClick={closeModal}>
                    {modalType === "success" ? "Done" : "OK"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

    </div>

    
  );
};

export default Home;