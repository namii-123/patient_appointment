import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../../assets/LoginAdmin.css";
import logo from "/logo.png";
import { Eye, EyeOff } from "lucide-react";
import emailjs from "@emailjs/browser";
import { toast } from "react-toastify";

const LoginAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [otpTimeLeft, setOtpTimeLeft] = useState<number>(0);
  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetOtp, setResetOtp] = useState<string>("");
  const [enteredResetOtp, setEnteredResetOtp] = useState<string>("");

  const auth = getAuth();
  const db = getFirestore();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const sendOtpEmail = async (userEmail: string, userName: string, generatedOtp: string) => {
    try {
      await emailjs.send(
        "service_fumzhyb",
        "template_3tac02n",
        { to_email: userEmail, user_name: userName, otp: generatedOtp },
        "Sua8ZigqntncFkBCw"
      );
      console.log("OTP email sent successfully");
      toast.success("OTP sent to your email.", { position: "top-center" });
    } catch (error) {
      console.error("Failed to send OTP email:", error);
      toast.error("Failed to send OTP. Please try again.", { position: "top-center" });
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if ((showOtpInput || showResetForm) && otpTimeLeft > 0) {
      interval = setInterval(() => {
        setOtpTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (otpTimeLeft === 0 && (showOtpInput || showResetForm)) {
      setOtp("");
      setResetOtp("");
      toast.error("Your OTP has expired. Please request a new one.", { position: "top-center" });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimeLeft, showOtpInput, showResetForm]);

  const validatePasswordStrength = (password: string): boolean => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const loginId = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!loginId || !password) {
      toast.error("Please fill in all fields.", { position: "top-center" });
      setLoading(false);
      return;
    }

    let userEmail = "";

    try {
      if (loginId.includes("@")) {
        userEmail = loginId;
      } else {
        const q = query(collection(db, "UserAdmin"), where("username", "==", loginId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          userEmail = querySnapshot.docs[0].data().email;
        } else {
          const qManage = query(collection(db, "ManageAdmins"), where("username", "==", loginId));
          const manageSnapshot = await getDocs(qManage);
          if (!manageSnapshot.empty) {
            userEmail = manageSnapshot.docs[0].data().email;
          } else {
            toast.error("Username not found.", { position: "top-center" });
            setLoading(false);
            return;
          }
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
      const user = userCredential.user;
      const uid = user.uid;

      let userDoc = await getDoc(doc(db, "UserAdmin", uid));
      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, "ManageAdmins", uid));
      }

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status === "pending") {
          toast.error("Your account is pending approval. Please wait for super admin approval.", {
            position: "top-center",
          });
          await auth.signOut();
          setLoading(false);
          return;
        }
        if (userData.status !== "approved") {
          toast.error("Your account has been rejected or is not approved yet.", {
            position: "top-center",
          });
          await auth.signOut();
          setLoading(false);
          return;
        }

        const generatedOtp = generateOtp();
        setOtp(generatedOtp);
        setEmail(userEmail);
        setOtpTimeLeft(5 * 60);
        await sendOtpEmail(userEmail, `${userData.firstname} ${userData.lastname}`, generatedOtp);
        setShowOtpInput(true);
      } else {
        toast.error("User data not found. Please contact support.", { position: "top-center" });
        await auth.signOut();
      }
    } catch (err: any) {
      let errorMessage = "Login failed. Please try again.";
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No account found with that email.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password.";
          break;
        case "auth/invalid-email":
          errorMessage = "Please enter a valid email address.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many failed attempts. Try again later.";
          break;
      }
      toast.error(errorMessage, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enteredOtp === otp) {
      getDoc(doc(db, "ManageAdmins", auth.currentUser?.uid || "")).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.role === "superadmin") {
            handleNavigation("/superadmin_dashboard");
          } else {
            switch (userData.department) {
              case "Dental":
                handleNavigation("/dashboard_dental");
                break;
              case "Radiographic":
                handleNavigation("/dashboard_radiology");
                break;
              case "Medical":
                handleNavigation("/dashboard_medical");
                break;
              case "Clinical Laboratory":
                handleNavigation("/dashboard_clinical");
                break;
              case "DDE":
                handleNavigation("/dashboard_dde");
                break;
              default:
                toast.error("No department assigned. Please contact the Super Admin.", {
                  position: "top-center",
                });
                auth.signOut();
            }
          }
          setShowOtpInput(false);
          setOtp("");
          setEnteredOtp("");
        } else {
          getDoc(doc(db, "UserAdmin", auth.currentUser?.uid || "")).then((userSnap) => {
            if (userSnap.exists()) {
              const userData = userSnap.data();
              if (userData.role === "superadmin") {
                handleNavigation("/superadmin_dashboard");
              } else {
                switch (userData.department) {
                  case "Dental":
                    handleNavigation("/dashboard_dental");
                    break;
                  case "Radiographic":
                    handleNavigation("/dashboard_radiology");
                    break;
                  case "Medical":
                    handleNavigation("/dashboard_medical");
                    break;
                  case "Clinical Laboratory":
                    handleNavigation("/dashboard_clinical");
                    break;
                  case "DDE":
                    handleNavigation("/dashboard_dde");
                    break;
                  default:
                    toast.error("No department assigned. Please contact the Super Admin.", {
                      position: "top-center",
                    });
                    auth.signOut();
                }
              }
              setShowOtpInput(false);
              setOtp("");
              setEnteredOtp("");
            } else {
              toast.error("User data not found after OTP verification.", { position: "top-center" });
              auth.signOut();
            }
          });
        }
      });
    } else {
      toast.error("Invalid OTP. Please try again.", { position: "top-center" });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email or username first.", { position: "top-center" });
      return;
    }

    let userEmail = email;
    if (!userEmail.includes("@")) {
      try {
        const q = query(collection(db, "UserAdmin"), where("username", "==", userEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          userEmail = querySnapshot.docs[0].data().email;
        } else {
          const qManage = query(collection(db, "ManageAdmins"), where("username", "==", userEmail));
          const manageSnapshot = await getDocs(qManage);
          if (!manageSnapshot.empty) {
            userEmail = manageSnapshot.docs[0].data().email;
          } else {
            toast.error("Username not found.", { position: "top-center" });
            return;
          }
        }
      } catch (err) {
        toast.error("Error finding user email. Please try again.", { position: "top-center" });
        return;
      }
    }

    try {
      const generatedOtp = generateOtp();
      setResetOtp(generatedOtp);
      setEmail(userEmail);
      setOtpTimeLeft(5 * 60);
      await sendOtpEmail(userEmail, "Admin", generatedOtp);
      setShowResetForm(true);
    } catch (error) {
      toast.error("Failed to initiate password reset. Please try again.", { position: "top-center" });
    }
  };

  const handleResetPasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (enteredResetOtp !== resetOtp) {
      toast.error("Invalid OTP. Please try again.", { position: "top-center" });
      setLoading(false);
      return;
    }

    if (!validatePasswordStrength(newPassword)) {
      toast.error(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
        { position: "top-center" }
      );
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.", { position: "top-center" });
      setLoading(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        toast.success("Password updated successfully! Please log in with your new password.", {
          position: "top-center",
        });
        setShowResetForm(false);
        setNewPassword("");
        setConfirmPassword("");
        setEnteredResetOtp("");
        setResetOtp("");
        await auth.signOut();
      } else {
        // Fallback to email-based reset if user is not authenticated
        await sendPasswordResetEmail(auth, email);
        toast.success("Password reset email sent! Please check your inbox.", { position: "top-center" });
        setShowResetForm(false);
        setNewPassword("");
        setConfirmPassword("");
        setEnteredResetOtp("");
        setResetOtp("");
      }
    } catch (error) {
      const err = error as { code?: string; message?: string };
      let errorMessage = "Failed to reset password. Please try again.";
      switch (err.code) {
        case "auth/requires-recent-login":
          errorMessage = "Session expired. Please log in again to reset your password.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email address.";
          break;
      }
      toast.error(errorMessage, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrappers">
      <div className="login-cards">
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo-centered" />
          <h2 className="login-app-title">DOH-TRC Argao</h2>
          <h3 className="login-subtitle">
            {showResetForm ? "Reset Password" : "Welcome, Admin"}
          </h3>
        </div>

        {!showOtpInput && !showResetForm ? (
          <form className="login-forms" onSubmit={handleSubmit}>
            <label htmlFor="username" className="login-labels">
              Email or Username
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="username"
                name="username"
                className="login-input"
                placeholder="Enter your email or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label htmlFor="password" className="login-labels">
              Password
            </label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className="login-input"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="eye-toggles"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        ) : showOtpInput ? (
          <form className="login-forms" onSubmit={handleOtpSubmit}>
            <label htmlFor="otp" className="login-labels">
              Enter OTP (Expires in {Math.floor(otpTimeLeft / 60)}:
              {("0" + (otpTimeLeft % 60)).slice(-2)})
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="otp"
                name="otp"
                className="login-input"
                placeholder="Enter the OTP sent to your email"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <button
              type="button"
              className="login-button secondary"
              onClick={async () => {
                const newOtp = generateOtp();
                setOtp(newOtp);
                setOtpTimeLeft(5 * 60);
                await sendOtpEmail(email, "Admin", newOtp);
              }}
            >
              Resend OTP
            </button>

            <button
              type="button"
              className="login-button secondary"
              onClick={() => {
                setShowOtpInput(false);
                setEnteredOtp("");
                auth.signOut();
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <form className="login-forms" onSubmit={handleResetPasswordSubmit}>
            <label htmlFor="reset-otp" className="login-labels">
              Enter OTP (Expires in {Math.floor(otpTimeLeft / 60)}:
              {("0" + (otpTimeLeft % 60)).slice(-2)})
            </label>
            <div className="input-wrapper">
              <input
                type="text"
                id="reset-otp"
                name="reset-otp"
                className="login-input"
                placeholder="Enter the OTP sent to your email"
                value={enteredResetOtp}
                onChange={(e) => setEnteredResetOtp(e.target.value)}
                required
              />
            </div>

            <label htmlFor="new-password" className="login-labels">
              New Password
            </label>
            <div className="password-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                id="new-password"
                name="new-password"
                className="login-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-toggles"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label htmlFor="confirm-password" className="login-labels">
              Confirm Password
            </label>
            <div className="password-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirm-password"
                name="confirm-password"
                className="login-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye-toggles"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              className="login-button secondary"
              onClick={async () => {
                const newOtp = generateOtp();
                setResetOtp(newOtp);
                setOtpTimeLeft(5 * 60);
                await sendOtpEmail(email, "Admin", newOtp);
              }}
            >
              Resend OTP
            </button>

            <button
              type="button"
              className="login-button secondary"
              onClick={() => {
                setShowResetForm(false);
                setNewPassword("");
                setConfirmPassword("");
                setEnteredResetOtp("");
                setResetOtp("");
                auth.signOut();
              }}
            >
              Cancel
            </button>
          </form>
        )}

        <div className="login-links">
          {!showOtpInput && !showResetForm && (
            <>
              <p
                className="forgot-link"
                onClick={handleForgotPassword}
                style={{ cursor: "pointer", color: "#007bff", textDecoration: "underline" }}
              >
                Forgot Password?
              </p>
              <p>
                Don’t have an account?{" "}
                <a href="/register" className="signup-link">
                  Register
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;