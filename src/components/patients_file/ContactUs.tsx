import React, { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../assets/ContactUs.css";
import { addDoc, serverTimestamp, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import {
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaPaperPlane,
  FaFacebookF,
  FaTimes,
} from "react-icons/fa";
import { db, auth } from "./firebase";
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
  const [shortUserId, setShortUserId] = useState<string>("Guest"); // ← This is the key!

  // Map modal
  const [mapOpen, setMapOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    lastName: "",
    firstName: "",
    email: "",
    message: "",
  });

  // DOH-style modal
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "confirm">("confirm");
  const [onModalConfirm, setOnModalConfirm] = useState<() => void>(() => {});

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
    setModalMessage("");
    setOnModalConfirm(() => {});
  };

  /* ------------------- AUTH & USER DATA LISTENER ------------------- */
 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    setLoading(false);

    if (currentUser) {
      try {
        const userDocRef = doc(db, "Users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);

        let userData: any = {};

        if (userSnap.exists()) {
          userData = userSnap.data();
        } else {
          const usersRef = collection(db, "Users");
          const q = query(usersRef, where("uid", "==", currentUser.uid));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            userData = querySnapshot.docs[0].data();
          }
        }

        // FIX 1: Use exact field name → UserId (capital U)
        const fetchedShortId = userData.UserId || "Guest";
        setShortUserId(fetchedShortId);

        // Auto-fill form
        setFormData(prev => ({
          ...prev,
          lastName: userData.lastName || "",
          firstName: userData.firstName || "",
          email: userData.email || currentUser.email || "",
        }));
      } catch (error) {
        console.error("Error fetching user data:", error);
        setShortUserId("Guest");
      }
    } else {
      setShortUserId("Guest");
      setFormData(prev => ({
        ...prev,
        lastName: "",
        firstName: "",
        email: "",
      }));
    }
  });

  return () => unsubscribe();
}, []); // ← CRITICAL: Empty array!

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFormData({ ...formData, [e.target.id]: e.target.value });

  const isFormValid = () =>
    formData.lastName.trim() !== "" &&
    formData.firstName.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.message.trim() !== "";

  const checkEmailExists = async (email: string) => {
    const usersRef = collection(db, "Users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid()) {
      openModal("Please fill in all fields.", "error");
      return;
    }

    // If not logged in, prompt login/signup
    if (!user) {
      try {
        const emailExists = await checkEmailExists(formData.email);
        if (emailExists) {
          openModal("This email is already registered. Please log in.", "confirm", () => {
            if (onLoginClick) onLoginClick();
            else navigate("/login", { state: { from: location } });
          });
        } else {
          openModal("This email is not registered. Please sign up.", "confirm", () => {
            if (onSignUpClick) onSignUpClick();
            else navigate("/signup", { state: { from: location } });
          });
        }
      } catch (error) {
        console.error("Error checking email:", error);
        openModal("An error occurred. Please try again.", "error");
      }
      return;
    }

    // Confirm send
    openModal("Are you sure you want to send this message?", "confirm", confirmSendMessage);
  };

const confirmSendMessage = async () => {
  try {
    await addDoc(collection(db, "Messages"), {
      UserId: shortUserId,
      uid: user?.uid || null,
      lastName: formData.lastName.trim(),
      firstName: formData.firstName.trim(),
      email: formData.email.trim(),
      messages: formData.message.trim(),
      createdAt: serverTimestamp(),
      replied: false,
    });

    // 1. CLEAR MESSAGE INSTANTLY (textarea mawala dayon)
    setFormData(prev => ({ ...prev, message: "" }));

    // 2. Kung guest, i-clear tanan (optional)
    if (!user) {
      setFormData({
        lastName: "",
        firstName: "",
        email: "",
        message: "",
      });
    }


    openModal("Thank you!\nYour message has been sent successfully.", "success");

    

  } catch (error: any) {
    console.error("Error sending message:", error);
    openModal(`Failed to send message.\n${error.message}`, "error");
  }
  
};

  if (loading) return <div>Loading...</div>;

  return (
    <section className="contact-sections">
      <h1 className="contact-titless">Contact Us</h1>
      <p className="contact-subtitle">
        We'd love to hear from you. Reach out via the options below or send us a message directly.
      </p>

      <div className="contact-grid-2col">
        {/* LEFT SIDE */}
        <div className="contact-cards-wrapper">
          <div className="contact-card modern">
            <FaPhoneAlt className="contact-icon" />
            <h4>Phone</h4>
            <p>(032) 485-8815</p>
          </div>
          <div className="contact-card modern">
            <FaEnvelope className="contact-icon" />
            <h4>Email</h4>
            <p>trcchief@trcargao.doh.gov.ph</p>
          </div>
          <div className="contact-card modern clickable" onClick={() => setMapOpen(true)}>
            <FaMapMarkerAlt className="contact-icon" />
            <h4>Address</h4>
            <p>Candabong, Binlod, Argao, Cebu</p>
          </div>
          <a
            href="https://www.facebook.com/dohtrcargaocebu"
            target="_blank"
            rel="noopener noreferrer"
            className="contact-card modern"
          >
            <FaFacebookF className="contact-icon facebook" />
            <h4>Facebook</h4>
            <p>@dohtrcargaocebu</p>
          </a>
        </div>

        {/* RIGHT SIDE FORM */}
        <div className="contact-form-card">
          <h2>Send a Message</h2>
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="name-fields">
              <input
                type="text"
                id="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                readOnly={!!user}
                style={user ? { backgroundColor: "#f0f0f0", cursor: "not-allowed" } : {}}
              />
              <input
                type="text"
                id="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                readOnly={!!user}
                style={user ? { backgroundColor: "#f0f0f0", cursor: "not-allowed" } : {}}
              />
            </div>
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              readOnly={!!user}
              style={user ? { backgroundColor: "#f0f0f0", cursor: "not-allowed" } : {}}
            />
            <textarea
              id="message"
              rows={5}
              placeholder="Your Message..."
              value={formData.message}
              onChange={handleInputChange}
              required
            />
            <button type="submit" disabled={!isFormValid()}>
              <FaPaperPlane /> Send Message
            </button>
          </form>
        </div>
      </div>

      {/* DOH-STYLED MODAL */}
      {showModal && (
        <>
          <audio autoPlay>
            <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
          </audio>
          <div className="doh-modal-overlay" onClick={closeModal}>
            <div className="doh-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="doh-modal-header">
                <img src="/logo.png" alt="DOH Logo" className="doh-modal-logo" />
                <h3 className="doh-modal-titles">
                  {modalType === "success" && "MESSAGE SENT"}
                  {modalType === "error" && "ERROR"}
                  {modalType === "confirm" && "CONFIRM SEND"}
                </h3>
                <button className="doh-modal-close" onClick={closeModal}>
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="doh-modal-body">
                <p style={{ whiteSpace: "pre-line", textAlign: "center", fontSize: "1.1rem" }}>
                  {modalMessage}
                </p>
              </div>
              <div className="doh-modal-footer">
                {modalType === "confirm" && (
                  <>
                    <button className="doh-modal-btn cancel" onClick={closeModal}>
                      No, Cancel
                    </button>
                    <button
                      className="doh-modal-btn confirm"
                      onClick={() => {
                        closeModal();
                        onModalConfirm();
                      }}
                    >
                      Yes, Send
                    </button>
                  </>
                )}
                {(modalType === "success" || modalType === "error") && (
                  <button className="doh-modal-btn ok" onClick={closeModal}>
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* MAP MODAL */}
      {mapOpen && (
        <div className="dialog-overlay" onClick={() => setMapOpen(false)}>
          <div className="map-modal" onClick={(e) => e.stopPropagation()}>
            <button className="map-close-btn" onClick={() => setMapOpen(false)}>
              <FaTimes />
            </button>
            <iframe
              title="TRC Argao Location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              src="https://maps.google.com/maps?q=Candabong,+Binlod,+Argao,+Cebu&t=&z=15&ie=UTF8&iwloc=&output=embed"
            ></iframe>
          </div>
        </div>
      )}
    </section>
  );
};

export default ContactUs;