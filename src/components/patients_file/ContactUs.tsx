import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../assets/ContactUs.css";
import {
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaPaperPlane,
  FaFacebookF,
} from "react-icons/fa";
import { db, auth } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

interface AuthContextType {
  isLoggedIn: boolean;
}
const AuthContext = React.createContext<AuthContextType>({ isLoggedIn: false });

interface ContactUsProps {
  onSignUpClick?: () => void;
  onLoginClick?: () => void;
}

const ContactUs: React.FC<ContactUsProps> = ({ onSignUpClick, onLoginClick }) => {
  const { isLoggedIn } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    email: "",
    message: "",
  });

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm?: () => void;
  }>({ isOpen: false, message: "", onConfirm: undefined });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const openDialog = (message: string, onConfirm?: () => void) => {
    setDialog({ isOpen: true, message, onConfirm });
  };

  const closeDialog = () => {
    setDialog({ isOpen: false, message: "", onConfirm: undefined });
  };

  const isFormValid = () => {
    return (
      formData.lastName.trim() !== "" &&
      formData.firstName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.message.trim() !== ""
    );
  };

  const checkEmailExists = async (email: string) => {
    const usersRef = collection(db, "Users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid()) {
      openDialog("Please fill in all fields.");
      return;
    }

    if (!isLoggedIn && !user) {
      try {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          openDialog("This email is already registered. Please log in.", () => {
            if (onLoginClick) {
              onLoginClick();
            } else {
              navigate("/login", { state: { from: location } });
            }
          });
        } else {
          openDialog("This email is not registered. Please sign up.", () => {
            if (onSignUpClick) {
              onSignUpClick();
            } else {
              navigate("/signup", { state: { from: location } });
            }
          });
        }
      } catch (error) {
        console.error("Error checking email:", error);
        openDialog("An error occurred. Please try again.");
      }
      return;
    }

    if (user) {
      openDialog("Message sent!", () => {
        setFormData({ lastName: "", firstName: "", email: "", message: "" });
      });
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  return (
    <div className="contact-section">
      <h1>Contact Us</h1>
      <p className="contact-description">
        We'd love to hear from you. Reach out via the options below or send us a message directly.
      </p>

      <div className="contact-grid">
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

        <div className="chat-form enhanced-form">
          <div className="chat-header">Send Us a Message</div>
          <form className="chat-box" onSubmit={handleSubmit}>
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
              type="submit"
              disabled={!isFormValid()}
              className={isFormValid() ? "" : "disabled"}
            >
              <FaPaperPlane /> Send Message
            </button>
          </form>
        </div>
      </div>

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