import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../assets/LandingPage.css";
import Login from "./Login";
import Signup from "./Signup";
import Services from "./Services";
import AboutUs from "./AboutUs";
import ContactUs from "./ContactUs";
import { FaHome, FaStethoscope, FaInfoCircle, FaPhone, FaUserCircle, FaUserPlus } from "react-icons/fa";

const LandingPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    "home" | "services" | "about" | "contact"
  >("home");

  const [activeView, setActiveView] = useState<
    "home" | "services" | "about" | "contact"
  >("home");

  const [modalView, setModalView] = useState<"login" | "signup" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false); // ✅ Added hamburger menu state

  const handleViewChange = (view: "home" | "services" | "about" | "contact") => {
    setCurrentView(view);
    setActiveView(view);
    setModalView(null);
    setMenuOpen(false); // ✅ Close menu when selecting a link
  };

  const handleModalOpen = (modal: "login" | "signup") => {
    setModalView(modal);
    setMenuOpen(false); // ✅ Close menu when modal opens
  };

  const handleModalClose = () => {
    setModalView(null);
  };

  return (
    <div className="landing-container">
      {/* Navbar */}
    
<nav className="navbar">
  <div className="logo">
    <div className="logo-left">
      <Link to="#" onClick={() => handleViewChange("home")}>
        <img
          className="landing-logo"
          src="/logo.png"
          alt="DOH Logo"
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
  </div>

  {/* DESKTOP NAV LINKS */}
  <ul className="nav-links desktop-only">
    <li
      className={activeView === "home" ? "active" : ""}
      onClick={() => handleViewChange("home")}
    >
      Home
    </li>
    <li
      className={activeView === "services" ? "active" : ""}
      onClick={() => handleViewChange("services")}
    >
      Services
    </li>
    <li
      className={activeView === "about" ? "active" : ""}
      onClick={() => handleViewChange("about")}
    >
      About Us
    </li>
    <li
      className={activeView === "contact" ? "active" : ""}
      onClick={() => handleViewChange("contact")}
    >
      Contact Us
    </li>
  </ul>

  {/* MOBILE SLIDE-IN MODAL MENU */}
  {menuOpen && (
    <div className="mobile-menu-modal-overlay" onClick={() => setMenuOpen(false)}>
      <div className="mobile-menu-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* CLOSE BUTTON */}
        <button className="mobile-menu-close-btn" onClick={() => setMenuOpen(false)}>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        {/* HEADER */}
        <div className="mobile-menu-header">
          <img src="/logo.png" alt="DOH Logo" className="mobile-menu-logo" />
          <span className="mobile-menu-title">DOH-TRC Argao</span>
        </div>

        {/* MENU LINKS WITH ICONS */}
        <ul className="mobile-menu-linkss">
          <li
            className={activeView === "home" ? "active" : ""}
            onClick={() => handleViewChange("home")}
          >
            <FaHome /> Home
          </li>
          <li
            className={activeView === "services" ? "active" : ""}
            onClick={() => handleViewChange("services")}
          >
            <FaStethoscope /> Services
          </li>
          <li
            className={activeView === "about" ? "active" : ""}
            onClick={() => handleViewChange("about")}
          >
            <FaInfoCircle /> About Us
          </li>
          <li
            className={activeView === "contact" ? "active" : ""}
            onClick={() => handleViewChange("contact")}
          >
            <FaPhone /> Contact Us
          </li>

         
         
        </ul>

        {/* MAKE APPOINTMENT BUTTON */}
        <button
          className="mobile-make-appointment-btn"
          onClick={() => {
            handleModalOpen("login");
            setMenuOpen(false);
          }}
        >
          Make Appointment
        </button>
      </div>
    </div>
  )}
</nav>

      {/* Main Content */}
      <div className="main-content">
        {currentView === "home" && (
          <section className="hero">
            <div className="hero-content">
              <h1>
                Find the Good Life <br /> With{" "}
                <span className="highlight">Good Health.</span>
              </h1>
              <p>
                Experience a healthier, happier life with expert care and
                personalized wellness solutions.
              </p>
              <button
                className="appointment-btn"
                onClick={() => handleModalOpen("login")}
              >
                Make Appointment
              </button>
            </div>
          </section>
        )}

        {currentView === "services" && (
          <section className="services">
            <Services />
          </section>
        )}

        {currentView === "about" && (
          <section className="about">
            <AboutUs onNavigate={handleViewChange} />
          </section>
        )}

        {currentView === "contact" && (
          <section className="contact">
           <ContactUs
  onLoginClick={() => handleModalOpen("login")}
  onSignUpClick={() => handleModalOpen("signup")}
/>
          </section>
        )}
      </div>

      {/* Modal */}
      {modalView && (
        <div className="modal-overlay" onClick={handleModalClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={handleModalClose}>
              ×
            </button>
            {modalView === "login" ? (
              <Login
                onClose={handleModalClose}
                onSignUpClick={() => handleModalOpen("signup")}
              />
            ) : (
              <Signup onLoginClick={() => handleModalOpen("login")} />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
    <footer className="footer-home">
        <div className="footer-content-home">
          <p>© 2025 DOH-TRC Argao. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
