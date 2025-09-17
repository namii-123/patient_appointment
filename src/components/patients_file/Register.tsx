import React, { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/Register.css";
import logo from "/logo.png";
import { Eye, EyeOff } from "lucide-react";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    handleNavigation("/loginadmin");
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <div className="register-header">
          <img src={logo} alt="Logo" className="register-logo-centered" />
          <h2 className="register-app-title">DOH-TRC Argao</h2>
          <h3 className="register-subtitle">Create Account</h3>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="lastname" className="register-label">Last Name</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="lastname"
              className="register-input"
              placeholder="Last Name"
              required
            />
          </div>

          <label htmlFor="firstname" className="register-label">First Name</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="firstname"
              className="register-input"
              placeholder="First Name"
              required
            />
          </div>

          <label htmlFor="username" className="register-label">Username</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="username"
              className="register-input"
              placeholder="Username"
              required
            />
          </div>

          <label htmlFor="email" className="register-label">Email</label>
          <div className="input-wrapper">
            <input
              type="email"
              id="email"
              className="register-input"
              placeholder="Email"
              required
            />
          </div>

          <label htmlFor="password" className="register-label">Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="register-input"
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="eye-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="register-button">Register</button>
        </form>

        <div className="register-links">
          <p>
            Already have an account?{" "}
            <a href="/loginadmin" className="signup-link">Sign In</a>
          </p>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Registration Successful!</h3>
            <p>
              Please wait for approval from the superadmin. You will receive a
              notification via email once approved.
            </p>
            <button className="modal-button" onClick={closeModal}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;