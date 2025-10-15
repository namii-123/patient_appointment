import { useState } from "react";
import type { FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import "../../assets/Signup.css";
import { createUserWithEmailAndPassword } from "firebase/auth";
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

  // Calculate age from birthdate
  const calculateAge = (birthdateString: string) => {
    const today = new Date();
    const birthDate = new Date(birthdateString);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      calculatedAge--;
    }
    return calculatedAge >= 0 ? calculatedAge.toString() : "";
  };

  const handleBirthdateChange = (value: string) => {
    setBirthdate(value);
    const calculatedAge = calculateAge(value);
    setAge(calculatedAge);
  };

  // Handle password input change (no toast during typing)
  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  // Handle email input change (no toast during typing)
  const handleEmailChange = (value: string) => {
    setEmail(value);
  };

  // Handle contact number input change (no toast during typing)
  const handleContactNumberChange = (value: string) => {
    const onlyNums = value.replace(/\D/g, "");
    if (onlyNums.length > 11) return; // Limit input
    setContactNumber(onlyNums);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate fields sequentially to show only one toast
    if (!firstName.trim()) {
      toast.dismiss();
      toast.error("❌ First name is required.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!lastName.trim()) {
      toast.dismiss();
      toast.error("❌ Last name is required.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!email) {
      toast.dismiss();
      toast.error("❌ Email is required.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.dismiss();
      toast.error("❌ Invalid email format.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!birthdate) {
      toast.dismiss();
      toast.error("❌ Birthdate is required.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!gender) {
      toast.dismiss();
      toast.error("❌ Gender is required.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!contactNumber) {
      toast.dismiss();
      toast.error("❌ Contact number is required.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const contactRegex = /^09\d{9}$/;
    if (!contactRegex.test(contactNumber)) {
      toast.dismiss();
      toast.error("❌ Invalid contact number. Must be 11 digits starting with 09.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    if (!password) {
      toast.dismiss();
      toast.error("❌ Password is required.", {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      toast.dismiss();
      toast.error(
        "❌ Password must be at least 8 chars with uppercase, lowercase, number, and special char.",
        {
          position: "top-center",
          autoClose: 3000,
        }
      );
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user) {
        const uidGen = new ShortUniqueId({ length: 8 });
        const userId = `USR-${uidGen.rnd()}`;

        await setDoc(doc(db, "Users", user.uid), {
          UserId: userId,
          firstName,
          lastName,
          age,
          gender,
          contactNumber,
          birthdate,
          email: user.email,
          uid: user.uid,
          createdAt: new Date().toISOString(),
        });

        await setDoc(doc(db, "Patients", user.uid), {
          patientId: `PAT-${user.uid.substring(0, 6)}`,
          firstName,
          lastName,
          age,
          gender,
          contactNumber,
          birthdate,
          email: user.email,
          uid: user.uid,
          UserId: userId,
          createdAt: new Date().toISOString(),
        });

        toast.success("Successfully registered! Please log in.", {
          position: "top-center",
          autoClose: 2000,
        });

        // Switch to login modal without closing the modal overlay
        if (onLoginClick) {
          onLoginClick();
        }
      }
    } catch (error: any) {
      toast.dismiss();
      switch (error.code) {
        case "auth/email-already-in-use":
          toast.error("❌ This email is already registered.", { position: "top-center" });
          break;
        case "auth/invalid-email":
          toast.error("❌ Invalid email format.", { position: "top-center" });
          break;
        case "auth/weak-password":
          toast.error("❌ Weak password. Please use a stronger one.", { position: "top-center" });
          break;
        default:
          toast.error("❌ Something went wrong. Please try again.", { position: "top-center" });
          console.error("Signup Error:", error);
          break;
      }
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-left">
          <div className="logo-container">
            <img src="/logo.png" alt="logo" className="logo-img" />
            <h2>DOH-TRC Argao</h2>
          </div>
          <p>Join us in putting your health first.</p>
        </div>

        <div className="signup-right">
          <h2>Create Account</h2>
          <form onSubmit={handleSubmit}>
            <div className="name-rows">
              <div className="input-group">
                <label>First Name</label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label>Birthdate</label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => handleBirthdateChange(e.target.value)}
                required
              />
            </div>

            <div className="row-group">
              <div className="input-group">
                <label>Age</label>
                <input type="number" value={age} readOnly placeholder="Age" />
              </div>

              <div className="input-group">
                <label>Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">Select gender</option>
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
                placeholder="09XXXXXXXXX"
                value={contactNumber}
                onChange={(e) => handleContactNumberChange(e.target.value)}
                required
              />
            </div>

            <div className="input-group password-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
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

            <button type="submit" className="signup-btn">
              Sign Up
            </button>
          </form>

          <p className="login-redirect">
            Already have an account?{" "}
            <span className="login-pill" onClick={onLoginClick}>
              Sign In
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;