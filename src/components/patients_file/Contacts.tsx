import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaPaperPlane,
  FaFacebookF,
  FaTimes,
} from "react-icons/fa";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import "../../assets/Contacts.css";

const Contacts: React.FC = () => {
  const [formData, setFormData] = useState({
    UserId: "",
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    gender: "",
    contactNumber: "",
    birthdate: "",
    messages: "",
  });

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    message: string;
    type: "confirm" | "success" | "error" | null;
  }>({ isOpen: false, message: "", type: null });


  
  const [mapOpen, setMapOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const auth = getAuth();
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




  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      if (user) {
        try {
          const userRef = doc(db, "Users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            setFormData((prev) => ({
              ...prev,
              UserId: data.UserId || user.uid,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || user.email || "",
              age: data.age || "",
              gender: data.gender || "",
              contactNumber: data.contactNumber || "",
              birthdate: data.birthdate || "",
            }));
          } else {
            setFormData((prev) => ({
              ...prev,
              UserId: user.uid,
              email: user.email || "",
            }));
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setDialog({
            isOpen: true,
            message: "Error fetching user data. Please try again.",
            type: "error",
          });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFormData({ ...formData, [e.target.id]: e.target.value });

  const isFormValid = () =>
    formData.messages.trim() !== "" &&
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.email.trim() !== "";

  

 const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (!isFormValid()) {
    openModal("Please fill in all required fields.", "error");
    return;
  }
  openModal(
    "Are you sure you want to send this message?",
    "confirm",
    confirmSend
  );
};

const confirmSend = async () => {
  try {
    await addDoc(collection(db, "Messages"), {
      uid: auth.currentUser?.uid || null,
      ...formData,
      createdAt: new Date().toLocaleString(),
      timestamp: serverTimestamp(),
    });
    openModal("Thank you!\nYour message has been sent successfully.", "success");
    setFormData((prev) => ({ ...prev, messages: "" }));
  } catch (error) {
    console.error("Error:", error);
    openModal("Failed to send message.\nPlease check your connection and try again.", "error");
  }
};

  return (
    <section className="contact-section">
      <h1 className="contact-title">Contact Us</h1>
      <p className="contact-subtitle">
        We'd love to hear from you! Get in touch or send us a message below.
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

          <div
            className="contact-card modern clickable"
            onClick={() => setMapOpen(true)}
          >
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
    readOnly={isLoggedIn}
  />
  <input
    type="text"
    id="firstName"
    placeholder="First Name"
    value={formData.firstName}
    onChange={handleInputChange}
    required
    readOnly={isLoggedIn}
  />
</div>

            <input
              type="email"
              id="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              readOnly={isLoggedIn}
            />
            <textarea
              id="messages"
              rows={5}
              placeholder="Your Message..."
              value={formData.messages}
              onChange={handleInputChange}
              required
            />
            <button type="submit" disabled={!isFormValid()}>
              <FaPaperPlane /> Send Message
            </button>
          </form>
        </div>
      </div>

      {/* Dialog */}
     {showModal && (
  <>
    {/* Alert Sound */}
    <audio autoPlay>
      <source src="https://assets.mixkit.co/sfx/preview/mixkit-alert-buzzer-1355.mp3" type="audio/mpeg" />
    </audio>

    <div className="doh-modal-overlay" onClick={closeModal}>
      <div className="doh-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="doh-modal-header">
          <img src="/logo.png" alt="DOH Logo" className="doh-modal-logo" />
          <h3 className="doh-modal-title">
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
              {modalType === "success" ? "Done" : "OK"}
            </button>
          )}
        </div>
      </div>
    </div>
  </>
)}

      {/* Map Modal */}
      {mapOpen && (
        <div className="dialog-overlay" onClick={() => setMapOpen(false)}>
          <div
            className="map-modal"
            onClick={(e) => e.stopPropagation()}
          >
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
              src="https://maps.google.com/maps?q=Candabong, Binlod, Argao, Cebu&t=&z=15&ie=UTF8&iwloc=&output=embed"
            ></iframe>
          </div>
        </div>
      )}
    </section>
  );
};

export default Contacts;
