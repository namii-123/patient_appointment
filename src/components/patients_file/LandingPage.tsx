import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../assets/LandingPage.css";
import Login from "./Login";
import Signup from "./Signup";
import Services from "./Services";
import AboutUs from "./AboutUs";
import ContactUs from "./ContactUs";

const LandingPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<
    "home" | "services" | "about" | "contact"
  >("home");

  const [activeView, setActiveView] = useState<
    "home" | "services" | "about" | "contact"
  >("home");

  const [modalView, setModalView] = useState<"login" | "signup" | null>(null);

  const handleViewChange = (
    view: "home" | "services" | "about" | "contact"
  ) => {
    setCurrentView(view);
    setActiveView(view);
    setModalView(null); // Close the modal when switching views
  };

  const handleModalOpen = (modal: "login" | "signup") => {
    setModalView(modal);
  };

  const handleModalClose = () => {
    setModalView(null);
  };

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <Link to="#" onClick={() => handleViewChange("home")}>
            <img
              className="landing-logo"
              src="/logo.png"
              alt="DOH Logo"
              style={{ cursor: "pointer" }}
            />
          </Link>
          <div className="logo-text">DOH-Treatment and Rehabilitation Center Argao</div>
        </div>
        <ul className="nav-links">
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
            <ContactUs />
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
      <footer className="footer">
        <div className="footer-content">
          <p>© 2025 DOH-TRC Argao. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
