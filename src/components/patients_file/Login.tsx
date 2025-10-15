import { useState } from "react";
import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FaGoogle } from "react-icons/fa";
import "../../assets/Login.css";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { sendPasswordResetEmail } from "firebase/auth";
import ShortUniqueId from "short-unique-id";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation

interface LoginProps {
  onClose?: () => void;
  onSignUpClick?: () => void;
}

const Login: React.FC<LoginProps> = ({ onClose, onSignUpClick }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); // Initialize navigate hook

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      let firstName = "";
      let lastName = "";
      if (user.displayName) {
        const nameParts = user.displayName.split(" ");
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }

      const userRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(userRef);
      const uidGen = new ShortUniqueId({ length: 8 });
      const userId = `USR-${uidGen.rnd()}`;

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          UserId: userId,
          uid: user.uid,
          firstName,
          lastName,
          email: user.email,
          emailVerified: user.emailVerified,
          photoURL: user.photoURL,
          providerId: user.providerData[0]?.providerId || "google",
          createdAt: new Date(),
        });
      }

      toast.success(
        `Welcome ${firstName || user.displayName || "User"} ${lastName || ""}!`,
        { position: "top-center" }
      );
      onClose?.(); // Close the modal
      navigate("/home"); // Navigate to the home page
    } catch (error) {
      console.error(error);
      toast.error("Google sign-in failed. Please try again.", { position: "top-center" });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error("Please enter a valid email address.", { position: "top-center" });
      return;
    }
    if (!validatePassword(password)) {
      toast.error("Password must be at least 8 characters long.", { position: "top-center" });
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(userRef);

      let displayName = user.email;
      if (docSnap.exists()) {
        const data = docSnap.data();
        displayName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || user.email;
      }

      toast.success(`Welcome ${displayName}!`, { position: "top-center" });
      onClose?.(); // Close the modal
      navigate("/home"); // Navigate to the home page
    } catch (error) {
      const err = error as { code?: string; message?: string };
      let errorMessage: string;

      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "The email address you entered is not registered.";
          break;
        case "auth/wrong-password":
          errorMessage = "The password you entered is incorrect.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Try again later.";
          break;
        default:
          errorMessage = "Login failed. Please check your credentials and try again.";
          break;
      }

      toast.error(errorMessage, { position: "top-center" });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first.", { position: "top-center" });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Please check your inbox.", { position: "top-center" });
    } catch (error) {
      const err = error as { code?: string; message?: string };
      let errorMessage = "Failed to send reset email. Please try again.";

      switch (err.code) {
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/user-not-found":
          errorMessage = "No account found with that email.";
          break;
      }

      toast.error(errorMessage, { position: "top-center" });
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-left">
          <div className="logo-container">
            <img src="/logo.png" alt="logo" className="logo-img" />
            <h2>DOH-TRC Argao</h2>
          </div>
          <p>Your health, our priority.</p>
        </div>

        <div className="login-right">
          <h2>Sign In</h2>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group password-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </span>
              </div>
            </div>

            <button type="submit" className="login-btn">
              Sign In
            </button>
          </form>

          <div className="or-separator">
            <hr className="separator-line" />
            <span className="or-text">or</span>
            <hr className="separator-line" />
          </div>

          <button className="google-login-btn" onClick={handleGoogleLogin}>
            <FaGoogle className="google-icon" />
            Sign in with Google
          </button>

          <p
            className="forgot-password"
            onClick={handleForgotPassword}
            style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
          >
            Forgot Password?
          </p>

          <p className="signup-text">
            Don't have an account?{" "}
            <span
              className="signup-pill"
              onClick={() => {
                onClose?.();
                onSignUpClick?.();
              }}
            >
              Sign Up
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;