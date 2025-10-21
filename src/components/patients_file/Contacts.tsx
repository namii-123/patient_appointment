import React, { useState, useEffect } from "react";
import {
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaPaperPlane,
  FaFacebookF,
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

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const auth = getAuth();

  // ✅ Fetch full user data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoggedIn(!!user);
      if (user) {
        try {
          const userRef = doc(db, "Users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            console.log("✅ Firestore user data:", data);

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
            console.warn("⚠️ No document found for user:", user.uid);
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
  ) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const isFormValid = () =>
    formData.messages.trim() !== "" &&
    formData.firstName.trim() !== "" &&
    formData.lastName.trim() !== "" &&
    formData.email.trim() !== "";

  const openDialog = (message: string, type: "confirm" | "success" | "error") =>
    setDialog({ isOpen: true, message, type });

  const closeDialog = () =>
    setDialog({ isOpen: false, message: "", type: null });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid()) {
      openDialog("Please fill in all required fields.", "error");
      return;
    }
    openDialog("Are you sure you want to send this message?", "confirm");
  };

  // ✅ Save message to Firestore with full user info
  const confirmSend = async () => {
    try {
      const messagesRef = collection(db, "Messages");
      await addDoc(messagesRef, {
        uid: auth.currentUser?.uid || null,
        UserId: formData.UserId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        age: formData.age,
        gender: formData.gender,
        contactNumber: formData.contactNumber,
        birthdate: formData.birthdate,
        messages: formData.messages,
        createdAt: new Date().toLocaleString(),
        timestamp: serverTimestamp(),
      });
      openDialog("Message sent successfully!", "success");
      setFormData((prev) => ({
        ...prev,
        messages: "",
      }));
    } catch (error) {
      console.error("Error saving message:", error);
      openDialog("Error sending message. Please try again.", "error");
    }
  };

  return (
    <div className="contact-sections">
      <h1>Contact Us</h1>
      <p className="contact-description">
        We'd love to hear from you. Reach out via the options below or send us a
        message directly.
      </p>

      <div className="contact-grid">
        {/* LEFT SIDE */}
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

        {/* RIGHT SIDE FORM */}
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

      {/* DIALOG */}
      {dialog.isOpen && (
        <div className="dialog-overlay" role="dialog">
          <div className="dialog-content">
            <p>{dialog.message}</p>
            <div className="dialog-buttons">
              {dialog.type === "confirm" ? (
                <>
                  <button
                    className="dialog-button confirm"
                    onClick={() => {
                      confirmSend();
                      closeDialog();
                    }}
                  >
                    Yes
                  </button>
                  <button className="dialog-button cancel" onClick={closeDialog}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="dialog-button confirm" onClick={closeDialog}>
                  Okay
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
