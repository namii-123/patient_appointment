import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../../assets/LoginAdmin.css";
import logo from "/logo.png";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";


const LoginAdmin: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<string>("");

  const auth = getAuth();
  const db = getFirestore();

  const handleNavigation = (path: string) => {
    navigate(path);
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
      // 1. Get email from username or direct email
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

      // 2. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, password);
      const user = userCredential.user;
      const uid = user.uid;

      // 3. Fetch user data
      let userDoc = await getDoc(doc(db, "UserAdmin", uid));
      let userData: any = null;
    

      if (!userDoc.exists()) {
        userDoc = await getDoc(doc(db, "ManageAdmins", uid));
       
      }

      if (!userDoc.exists()) {
        toast.error("User data not found.", { position: "top-center" });
        await auth.signOut();
        setLoading(false);
        return;
      }

      userData = userDoc.data();

      // 4. Status Check
      if (!["approved", "Active"].includes(userData.status)) {
        toast.error("Your account is not approved or active.", { position: "top-center" });
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 5. SUCCESS: Direct to Dashboard
      toast.success(`Welcome, ${userData.firstname}!`, { position: "top-center" });

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
            toast.error("No department assigned. Contact Super Admin.", { position: "top-center" });
            await auth.signOut();
        }
      }

    } catch (err: any) {
      let errorMessage = "Login failed. Please try again.";
      switch (err.code) {
        case "auth/user-not-found":
          errorMessage = "No account found.";
          break;
        case "auth/wrong-password":
          errorMessage = "Incorrect password.";
          break;
        case "auth/invalid-email":
          errorMessage = "Invalid email.";
          break;
        case "auth/too-many-requests":
          errorMessage = "Too many attempts. Try again later.";
          break;
      }
      toast.error(errorMessage, { position: "top-center" });
    } finally {
      setLoading(false);
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
        toast.error("Error finding user.", { position: "top-center" });
        return;
      }
    }

    try {
      await sendPasswordResetEmail(auth, userEmail);
      toast.success("Password reset email sent! Check your inbox.", { position: "top-center" });
    } catch (error: any) {
      toast.error(error.code === "auth/user-not-found" ? "No account found." : "Failed to send reset email.", {
        position: "top-center",
      });
    }
  };

  return (
    <div className="login-wrappers">
      <div className="login-cards">
        <div className="login-header">
          <img src={logo} alt="Logo" className="login-logo-centered" />
          <h5 className="login-app-title">DOH-TRC Argao</h5>
          <h5 className="login-subtitle">Welcome, Admin</h5>
        </div>

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
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="login-links">
          <p
            className="forgot-links"
            onClick={handleForgotPassword}
          
          >
            Forgot Password?
          </p>
          <p>
            Don’t have an account?{" "}
            <a href="/register" className="signup-link">
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginAdmin;