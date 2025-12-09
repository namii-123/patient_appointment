import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "../../assets/Signup.css";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import ShortUniqueId from "short-unique-id";

interface SignUpProps {
  onLoginClick?: () => void;
  onClose?: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onLoginClick, onClose }) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

 
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toast.dismiss(); 
    toast.error(message, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
    });
  };

  const calculateAge = (birthdateString: string) => {
    const today = new Date();
    const birthDate = new Date(birthdateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age.toString() : "";
  };

  const handleBirthdateChange = (v: string) => {
    setBirthdate(v);
    setAge(calculateAge(v));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

  
    if (!firstName.trim()) return showToast("First name required.");
    if (!lastName.trim()) return showToast("Last name required.");
    if (!email) return showToast("Email required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast("Invalid email format.");
    if (!birthdate) return showToast("Birthdate required.");
    if (!gender) return showToast("Gender required.");
    if (!contactNumber) return showToast("Contact number required.");
    if (!/^09\d{9}$/.test(contactNumber)) return showToast("Must be 11 digits starting with 09.");
    if (!password) return showToast("Password required.");
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password))
      return showToast("Password: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special.");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      const uidGen = new ShortUniqueId({ length: 8 });
      const userId = `USR-${uidGen.rnd()}`;

      await setDoc(doc(db, "Users", user.uid), {
        UserId: userId,
        firstName, lastName, age, gender, contactNumber, birthdate,
        email: user.email, uid: user.uid,
        createdAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "Patients", user.uid), {
        patientId: `PAT-${user.uid.substring(0, 6)}`,
        firstName, lastName, age, gender, contactNumber, birthdate,
        email: user.email, uid: user.uid, UserId: userId,
        createdAt: new Date().toISOString(),
      });

      await signOut(auth);

      toast.dismiss();
      toast.success("Successfully registered! Please log in.", {
        position: "top-center",
        autoClose: 2000,
      });

      onClose?.();
      onLoginClick?.();

    } catch (error: any) {
      const msg =
        error.code === "auth/email-already-in-use" ? "Email already registered."
        : error.code === "auth/weak-password" ? "Password too weak."
        : "Signup failed. Try again.";
      showToast(msg);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-left">
          <div className="logo-container">
            <img src="/logo.png" alt="logo" className="logo-img" />
            <h1>DOH-TRC Argao</h1>
          </div>
          <p>Join us in putting your health first.</p>
        </div>

        <div className="signup-right">
          <h2>Create Account</h2>
          <form onSubmit={handleSubmit}>
            <div className="name-rows">
              <div className="input-group">
                <label>First Name</label>
                <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="input-group">
              <label>Email</label>
              <input type="email" placeholder="juan@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="input-group">
              <label>Birthdate</label>
              <input type="date" value={birthdate} onChange={(e) => handleBirthdateChange(e.target.value)} required />
            </div>

            <div className="row-group">
              <div className="input-group">
                <label>Age</label>
                <input type="number" value={age} readOnly placeholder="Auto" />
              </div>
              <div className="input-group">
                <label>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Contact Number</label>
              <input
                type="tel"
                placeholder="09123456789"
                value={contactNumber}
                onChange={(e) => {
                  const n = e.target.value.replace(/\D/g, "");
                  if (n.length <= 11) setContactNumber(n);
                }}
                required
              />
            </div>

            <div className="input-group password-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create Strong Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                  <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                </span>
              </div>
            </div>

            <button type="submit" className="signup-btn">Create Account</button>
          </form>

          <p className="login-redirect">
            Already have an account? <span className="login-pill" onClick={onLoginClick}>Sign In</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;