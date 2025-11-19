import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../assets/Profile.css";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface ProfileData {
  photoURL?: string;
  lastName: string;
  firstName: string;
  middleName: string;
  email: string;
  gender: string;
  birthdate: string;
  age: string;
  contactNumber: string;
  houseNo: string;
  street: string;
  province: string;
  provinceCode: string;
  municipality: string;
  municipalityCode: string;
  barangay: string;
  zipcode: string;
  photoBase64?: string; 
}

interface ProfileProps {
  onNavigate?: (view: "editprofile" | "transaction") => void;
}

const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [avatar, setAvatar] = useState<string>("/default-img.jpg");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);


 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as ProfileData;
          setProfileData(data);

          
          const photo = data.photoBase64 
            ? data.photoBase64 
            : data.photoURL 
              ? data.photoURL 
              : "/default-img.jpg";

          setAvatar(photo);
        } else {
      
          setAvatar(user.photoURL || "/default-img.jpg");
          setProfileData({
            lastName: "",
            firstName: "",
            middleName: "",
            email: user.email || "",
            gender: "",
            birthdate: "",
            age: "",
            contactNumber: "",
            houseNo: "",
            street: "",
            province: "",
            provinceCode: "",
            municipality: "",
            municipalityCode: "",
            barangay: "",
            zipcode: "",
            photoBase64: undefined,  
            photoURL: user.photoURL || undefined,
          });
        }
      } catch (err) {
        console.error("Error:", err);
        setAvatar(user?.photoURL || "/default-img.jpg");
      }
    } else {
      navigate("/");
    }
  });

  return () => unsubscribe();
}, [navigate]);


  const formatBirthdate = (date: string): string => {
    if (!date) return "";
    try {
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return date;
    }
  };

  const handleEditProfile = () => {
    if (onNavigate) {
      onNavigate("editprofile");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const gotoTransaction = () => {
    if (onNavigate) {
      onNavigate("transaction");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");
    if (confirmLogout) {
      await signOut(auth);
      navigate("/");
    }
  };

  const handleAvatarClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="profile-container-profile">
      <div className="profile-card-profile">
        <div className="avatar-section-profile">
          <div className="avatar-wrapper-profile">
            <img
              src={avatar}
              alt="Profile"
              className="nav-avatar-img"
              onClick={handleAvatarClick}
              style={{ cursor: "pointer" }}
              title="View larger image"
            />
          </div>
          <h1 className="profile-name">
            <span className="first-names">{profileData?.firstName || "First"}</span>{" "}
            <span className="middle-name">{profileData?.middleName || ""}</span>{" "}
            <span className="last-name">{profileData?.lastName || "Last"}</span>
          </h1>
          <p className="profile-email">{profileData?.email || "email@example.com"}</p>
          <button onClick={handleEditProfile} className="edit-btn">Edit Profile</button>
        </div>

        <div className="details-section-profile">
          <div className="detail-item">
            <span className="detail-label">Gender:</span>
            <span className="detail-value">{profileData?.gender || "Not set"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Birthdate:</span>
            <span className="detail-value">
              {profileData?.birthdate ? formatBirthdate(profileData.birthdate) : "Not set"}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Age:</span>
            <span className="detail-value">{profileData?.age || "Not set"}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Contact Number:</span>
            <span className="detail-value">{profileData?.contactNumber || "Not set"}</span>
          </div>
          <div className="detail-items">
            <span className="detail-label">Address:</span>
            <br />
            <div className="detail-value address-details">
              <div><strong>House No.:</strong> {profileData?.houseNo || "Not set"}</div>
              <div><strong>Street:</strong> {profileData?.street || "Not set"}</div>
              <div><strong>Barangay:</strong> {profileData?.barangay || "Not set"}</div>
              <div><strong>Municipality/City:</strong> {profileData?.municipality || "Not set"}</div>
              <div><strong>Province:</strong> {profileData?.province || "Not set"}</div>
              <div><strong>Zip Code:</strong> {profileData?.zipcode || "Not set"}</div>
            </div>
          </div>
        </div>

        <div className="button-group-profile">
          <button className="history-btn-profile" onClick={gotoTransaction}>
            View Transactions
          </button>
          <button className="signout-btn-profile" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="avatar-modal" onClick={handleCloseModal}>
          <div className="avatar-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="avatar-modal-close" onClick={handleCloseModal} title="Close">
              &times;
            </button>
            <img src={avatar} alt="Enlarged Profile" className="avatar-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;