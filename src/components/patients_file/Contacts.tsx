import React from "react";
import type { FormEvent } from "react";
import "../../assets/Contacts.css";
import {
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhoneAlt,
  FaPaperPlane,
  FaFacebookF,
} from "react-icons/fa";

const Contacts: React.FC = () => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Message sent!");
  };

  return (
    <div className="contact-sections">
      <h1>Contact Us</h1>
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
          <form className="chat-box" onSubmit={handleSubmit}>
            <input type="text" placeholder="Last Name" required />
            <input type="text" placeholder="First Name" required />
            <input type="email" placeholder="Email" required />
            <textarea rows={5} placeholder="Your Message..." required />
            <button type="submit">
              <FaPaperPlane /> Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contacts;
