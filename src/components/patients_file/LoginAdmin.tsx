import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import "../../assets/LoginAdmin.css";
import logo from "/logo.png";
import { Eye, EyeOff } from "lucide-react"; // 👈 icons

const LoginAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleNavigation("/dashboard_dental");
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo-centered" />
          <h2 className="login-app-title">DOH-TRC Argao</h2>
          <h3 className="login-subtitle">Welcome, Admin</h3>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username" className="login-label">
            Username
          </label>
          <input
            type="text"
            id="username"
            className="login-inputs"
            placeholder="Enter your username"
            required
          />

          <label htmlFor="password" className="login-label">
            Password
          </label>
          <div className="password-wrapper">
  <input
    type={showPassword ? "text" : "password"}
    id="password"
    className="login-input"
    placeholder="Enter your password"
    required
  />
  <button
    type="button"
    className="eye-toggle"
    onClick={() => setShowPassword(!showPassword)}
    tabIndex={-1} // 👈 dili maka focus para dili mawala cursor
  >
    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
  </button>
</div>


          <button type="submit" className="login-button">
            Sign In
          </button>
        </form>

        <div className="login-links">
          <a href="/forgot-password" className="forgot-link">
            Forgot Password?
          </a>
          <p>
            Don’t have an account?{" "}
            <a href="/register" className="signup-link">
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;
