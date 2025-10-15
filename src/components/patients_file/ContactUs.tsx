import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/ContactUs.css";
import {
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaPaperPlane,
  FaFacebookF,
} from "react-icons/fa";
import { db } from "./firebase"; // Import your Firebase config
import { collection, query, where, getDocs } from "firebase/firestore";

// Mock AuthContext for demonstration (replace with your actual auth context)
interface AuthContextType {
  isLoggedIn: boolean;
}
const AuthContext = React.createContext<AuthContextType>({ isLoggedIn: false });

interface ContactUsProps {
  onSignUpClick?: () => void; // Prop to trigger Signup modal
  onLoginClick?: () => void; // Prop to trigger Login modal
}

const ContactUs: React.FC<ContactUsProps> = ({ onSignUpClick, onLoginClick }) => {
  const { isLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();

  // State for form inputs
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    email: "",
    message: "",
  });

  // State for dialog
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, message: "", onConfirm: undefined });

  // Function to handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // Function to open dialog
  const openDialog = (message: string, onConfirm?: () => void) => {
    setDialog({ isOpen: true, message, onConfirm });
  };

  // Function to close dialog
  const closeDialog = () => {
    setDialog({ isOpen: false, message: "", onConfirm: undefined });
  };

  // Check if all fields are filled
  const isFormValid = () => {
    return (
      formData.lastName.trim() !== "" &&
      formData.firstName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.message.trim() !== ""
    );
  };

  // Check if email exists in Firestore Users collection
  const checkEmailExists = async (email: string) => {
    const usersRef = collection(db, "Users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Returns true if email exists
  };

  const handleSendMessage = async () => {
    if (!isFormValid()) {
      openDialog("Please fill in all fields.");
      return;
    }

    if (!isLoggedIn) {
      try {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          openDialog("This email is already registered. Please log in.", () => {
            if (onLoginClick) {
              onLoginClick(); // Open Login modal
            } else {
              navigate("/login"); // Fallback to login route
            }
          });
        } else {
          openDialog("This email is not registered. Please sign up.", () => {
            if (onSignUpClick) {
              onSignUpClick(); // Open Signup modal
            } else {
              navigate("/signup"); // Fallback to signup route
            }
          });
        }
      } catch (error) {
        console.error("Error checking email:", error);
        openDialog("An error occurred. Please try again.");
      }
      return;
    }

    // If logged in and form is valid, proceed with sending message
    openDialog("Message sent!", () => {
      // Clear form fields on confirm
      setFormData({ lastName: "", firstName: "", email: "", message: "" });
    });
  };

  return (
    <div className="contact-section">
      <h2>Contact Us</h2>
      <p className="contact-description">
        We'd love to hear from you. Reach out via the options below or send us a message directly.
      </p>

      <div className="contact-grid">
        {/* Contact Cards */}
        <div className="contact-cards-vertical">
          <div className="contact-card">
            <FaPhoneAlt className="contact-icon" />
            <h3>Phone</h3>
            <p>(032) 485-8815</p>
          </div>
          <div className="contact-card">
            <FaEnvelope className="contact-icon" />
            <h3>Email</h3>
            <p>trcchief@trcargao.doh.gov.ph</p>
          </div>
          <div className="contact-card">
            <FaMapMarkerAlt className="contact-icon" />
            <h3>Address</h3>
            <p>Candabong, Binlod, Argao, Cebu</p>
          </div>
          <a
            href="https://www.facebook.com/dohtrcargaocebu"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-card"
          >
            <FaFacebookF className="contact-icon facebook-icon" />
            <h3>Facebook</h3>
            <p>facebook.com/dohtrcargao</p>
          </a>
        </div>

        {/* Message Form */}
        <div className="chat-form enhanced-form">
          <div className="chat-header">Send Us a Message</div>
          <div className="chat-box">
            <input
              type="text"
              id="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              id="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleInputChange}
              required
            />
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <textarea
              id="message"
              rows={5}
              placeholder="Your Message..."
              value={formData.message}
              onChange={handleInputChange}
              required
            />
            <button
              onClick={handleSendMessage}
              disabled={!isFormValid()}
              className={isFormValid() ? "" : "disabled"}
            >
              <FaPaperPlane /> Send Message
            </button>
          </div>
        </div>
      </div>

      {/* Custom Dialog */}
      {dialog.isOpen && (
        <div className="dialog-overlay" role="dialog" aria-labelledby="dialog-message">
          <div className="dialog-content">
            <p id="dialog-message">{dialog.message}</p>
            <div className="dialog-buttons">
              <button
                className="dialog-button confirm"
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog();
                }}
                autoFocus
              >
                Okay
              </button>
              <button className="dialog-button cancel" onClick={closeDialog}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactUs;