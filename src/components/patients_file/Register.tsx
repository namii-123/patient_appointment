import React, { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import "../../assets/Register.css";
import logo from "/logo.png";
import { Eye, EyeOff } from "lucide-react";
import ShortUniqueId from "short-unique-id";


const Register: React.FC = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);


  
  const auth = getAuth();
  const db = getFirestore();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const lastname = formData.get("lastname") as string;
    const firstname = formData.get("firstname") as string;
    const username = formData.get("username") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

   
    if (!lastname || !firstname || !username || !email || !password) {
      alert("Please fill in all fields.");
      setLoading(false);
      return;
    }

    
    const emailQuery = query(collection(db, "UserAdmin"), where("email", "==", email));
    const emailSnapshot = await getDocs(emailQuery);
    if (!emailSnapshot.empty) {
      alert("This email is already taken.");
      setLoading(false);
      return;
    }

  
    const usernameQuery = query(collection(db, "UserAdmin"), where("username", "==", username));
    const usernameSnapshot = await getDocs(usernameQuery);
    if (!usernameSnapshot.empty) {
      alert("This username is already taken.");
      setLoading(false);
      return;
    }

   
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.");
      setLoading(false);
      return;
    }


   const uid = new ShortUniqueId({ length: 6 });

  const generateAdminId = () => {
  return `ADMIN-${uid.rnd()}`;
};


    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const adminId = generateAdminId();

      
      

      await setDoc(doc(db, "UserAdmin", user.uid), {
        uid: user.uid,
        adminId, 
        lastname,
        firstname,
        username,
        email: user.email,
        status: "pending",
        role: " ",
        createdAt: new Date().toISOString(),
      });

      setShowModal(true);
    } catch (err: any) {
      alert(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
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
          <h5 className="register-app-title">DOH-TRC Argao</h5>
          <h5 className="register-subtitle">Create Account</h5>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <label htmlFor="lastname" className="register-label">Last Name</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="lastname"
              name="lastname"
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
              name="firstname"
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
              name="username"
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
              name="email"
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
              name="password"
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

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
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