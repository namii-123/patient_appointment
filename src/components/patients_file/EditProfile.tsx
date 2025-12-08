import React, { useState, useEffect } from "react";
import { FaCamera, FaSpinner } from "react-icons/fa";
import axios from "axios";
import "../../assets/EditProfile.css";
import { auth, db, googleProvider } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { updateProfile, updateEmail, reauthenticateWithPopup,  } from "firebase/auth";
import { toast } from "react-toastify";

interface Province { name: string; code: string; }
interface City { name: string; code: string; provinceCode: string; }
interface Barangay { name: string; code: string; cityCode: string; }

interface FormData {
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
}

interface EditProfileProps {
  onNavigate?: (view: "profile" | "editprofile") => void;
}

const EditProfile: React.FC<EditProfileProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    lastName: "", firstName: "", middleName: "", email: "", gender: "", birthdate: "", age: "",
    contactNumber: "", houseNo: "", street: "", province: "", provinceCode: "",
    municipality: "", municipalityCode: "", barangay: "", zipcode: "",
  });

  const [avatar, setAvatar] = useState<string>("/default-img.jpg");
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});

  // === UTILITIES ===
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const fetchWithRetry = async (url: string, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try { return (await axios.get(url)).data; }
      catch (err: any) {
        if (err.response?.status === 429 && i < retries - 1) {
          await new Promise(r => setTimeout(r, delay * (i + 1)));
          continue;
        }
        throw err;
      }
    }
  };

  const getCachedData = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  };
  const cacheData = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

  
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) { navigate("/"); return; }

      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "Users", user.uid));
        if (snap.exists()) {
          const d = snap.data();
          setFormData(prev => ({
            ...prev,
            lastName: d.lastName || "",
            firstName: d.firstName || "",
            middleName: d.middleName || "",
            email: d.email || user.email || "",
            gender: d.gender || "",
            birthdate: d.birthdate || "",
            age: d.age || "",
            contactNumber: d.contactNumber || "",
            houseNo: d.houseNo || "",
            street: d.street || "",
            province: d.province || "",
            provinceCode: d.provinceCode || "",
            municipality: d.municipality || "",
            municipalityCode: d.municipalityCode || "",
            barangay: d.barangay || "",
            zipcode: d.zipcode || "",
          }));
          const photo = d.photoBase64 || d.photoURL || user.photoURL || "/default-img.jpg";
          setAvatar(photo);
          setAvatarBase64(d.photoBase64 || null);
        }
      } catch (err: any) {
        toast.error("Failed to load profile.", { position: "top-center" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigate]);


  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Provinces
        let provs = getCachedData("provinces") || [];
        if (!provs.length) {
          const data = await fetchWithRetry("https://psgc.gitlab.io/api/provinces/");
          provs = data.filter((p: any) => p.name && p.code)
            .map((p: Province) => ({ name: p.name.trim(), code: p.code.trim() }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
          cacheData("provinces", provs);
        }
        setProvinces(provs);

        // Cities
        let cits = getCachedData("cities") || [];
        if (!cits.length) {
          const data = await fetchWithRetry("https://psgc.gitlab.io/api/cities-municipalities/");
          cits = data.filter((c: any) => c.name && c.code && c.provinceCode)
            .map((c: City) => ({
              name: c.name.trim(),
              code: c.code.trim(),
              provinceCode: c.provinceCode.trim(),
            }))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));
          cacheData("cities", cits);
        }
        setCities(cits);
      } catch {
        toast.error("Failed to load locations.", { position: "top-center" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  const loadBarangays = async (code: string) => {
    const cached = getCachedData(`barangays_${code}`);
    if (cached) { setBarangays(cached); return; }

    setLoading(true);
    try {
      const data = await fetchWithRetry(
        `https://psgc.gitlab.io/api/cities-municipalities/${code}/barangays/`
      );
      const list = data
        .filter((b: any) => b.name && b.code)
        .map((b: any) => ({ name: b.name.trim(), code: b.code.trim(), cityCode: code }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      cacheData(`barangays_${code}`, list);
      setBarangays(list);
    } catch {
      setBarangays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.municipalityCode) loadBarangays(formData.municipalityCode);
    else { setBarangays([]); setFormData(p => ({ ...p, barangay: "" })); }
  }, [formData.municipalityCode]);

  
  useEffect(() => {
    if (!formData.birthdate) {
      setFormData(p => ({ ...p, age: "" }));
      return;
    }
    const b = new Date(formData.birthdate);
    if (isNaN(b.getTime())) return;

    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    setFormData(p => ({ ...p, age: age >= 0 ? age.toString() : "" }));
  }, [formData.birthdate]);

 
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be < 2MB", { position: "top-center" });
      return;
    }
    if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
      toast.error("Only JPG/PNG", { position: "top-center" });
      return;
    }

    setLoading(true);
    try {
      const b64 = await fileToBase64(file);
      setAvatar(b64);
      setAvatarBase64(b64);
    } catch {
      toast.error("Failed to process image", { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

 
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormErrors(p => ({ ...p, [name]: "" }));

    if (name === "province") {
      const prov = provinces.find(p => p.name === value);
      setFormData(p => ({
        ...p,
        province: value,
        provinceCode: prov?.code || "",
        municipality: "", municipalityCode: "", barangay: "", zipcode: "",
      }));
    }
    else if (name === "municipality") {
      const city = cities.find(c => c.name === value);
      let zip = "";
      if (city?.code) {
        try {
          const info = await fetchWithRetry(
            `https://psgc.gitlab.io/api/cities-municipalities/${city.code}/`
          );
          zip = info?.zipcode || "";
        } catch {}
      }
      setFormData(p => ({
        ...p,
        municipality: value,
        municipalityCode: city?.code || "",
        barangay: "",
        zipcode: zip,
      }));
    }
    else {
      setFormData(p => ({ ...p, [name]: value }));
    }
  };

  
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.lastName) errors.lastName = "Last name required";
    if (!formData.firstName) errors.firstName = "First name required";
    if (!formData.email) errors.email = "Email required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Invalid email";
    if (!formData.birthdate) errors.birthdate = "Birthdate required";
    if (!formData.gender) errors.gender = "Gender required";
    if (!formData.contactNumber) errors.contactNumber = "Contact required";
    else if (!/^\+?\d{7,15}$/.test(formData.contactNumber))
      errors.contactNumber = "7–15 digits only";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  
  const reAuthenticateWithGoogle = async () => {
    try {
      await reauthenticateWithPopup(auth.currentUser!, googleProvider);
      toast.success("Re-authenticated!", { position: "top-center" });
      return true;
    } catch (err: any) {
      toast.error(err.code === "auth/popup-closed-by-user"
        ? "Re-auth canceled"
        : "Re-auth failed", { position: "top-center" });
      return false;
    }
  };

 
const handleSave = async () => {
  setError(null);
  setSuccess(null);

  if (!validateForm()) {
    toast.error("Fix required fields", { position: "top-center" });
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    navigate("/");
    return;
  }

  setLoading(true);
  try {
    const isGoogle = user.providerData.some(p => p.providerId === "google.com");

   
    if (formData.email !== user.email) {
      if (isGoogle) {
        const ok = await reAuthenticateWithGoogle();
        if (!ok) throw new Error("Re-authentication canceled");
      }
      await updateEmail(user, formData.email);
      toast.success("Email updated!", { position: "top-center" });
    }

  
    await updateProfile(user, {
      displayName: `${formData.firstName} ${formData.lastName}`.trim(),
     
    });

    
    await updateDoc(doc(db, "Users", user.uid), {
      lastName: formData.lastName,
      firstName: formData.firstName,
      middleName: formData.middleName || null,
      email: formData.email,
      gender: formData.gender,
      birthdate: formData.birthdate,
      age: formData.age,
      contactNumber: formData.contactNumber,
      houseNo: formData.houseNo || null,
      street: formData.street || null,
      province: formData.province || null,
      provinceCode: formData.provinceCode || null,
      municipality: formData.municipality || null,
      municipalityCode: formData.municipalityCode || null,
      barangay: formData.barangay || null,
      zipcode: formData.zipcode || null,
      photoBase64: avatarBase64, 
    });

    toast.success("Profile saved successfully!", { position: "top-center" });
    onNavigate ? onNavigate("profile") : navigate("/profile");
  } catch (err: any) {
    console.error("Save error:", err);
    let msg = "Failed to save profile.";
    if (err.code === "auth/requires-recent-login") {
      msg = "Please re-sign in to update sensitive info.";
    } else if (err.message?.includes?.("re-auth")) {
      msg = "Re-authentication required. Try again.";
    }
    toast.error(msg, { position: "top-center" });
  } finally {
    setLoading(false);
  }
};

  const handleCancel = () => {
    onNavigate ? onNavigate("profile") : navigate("/profile");
  };

  const filteredCities = cities.filter(c => c.provinceCode === formData.provinceCode);

  return (
    <div className="edit-profile-container">
      <div className="profile-card">
   
   <div className="custom-avatar-container">
  <div className="custom-avatar-wrapper">
    <img 
      src={avatar} 
      alt="User Avatar" 
      className="custom-avatar-img" 
    />
    
    <label className="custom-avatar-upload-btn">
      <FaCamera size={16} />
      <input
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleAvatarChange}
        className="custom-avatar-input"
        disabled={loading}
      />
    </label>
    {loading && (
      <div className="custom-avatar-loading">
        <FaSpinner className="spin" size={20} />
      </div>
    )}
  </div>
</div>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        {loading && <p className="loading-message">Please wait...</p>}

        <div className="form-section">
  
  <div className="name-row">
    <div>
      <label>Last Name *</label>
      <input
        name="lastName"
        placeholder="e.g. Dela Cruz"
        value={formData.lastName}
        onChange={handleChange}
        disabled={loading}
        className={formErrors.lastName ? "input-error" : ""}
      />
      {formErrors.lastName && <p className="error-message">{formErrors.lastName}</p>}
    </div>
    <div>
      <label>First Name *</label>
      <input
        name="firstName"
        placeholder="e.g. Juan"
        value={formData.firstName}
        onChange={handleChange}
        disabled={loading}
        className={formErrors.firstName ? "input-error" : ""}
      />
      {formErrors.firstName && <p className="error-message">{formErrors.firstName}</p>}
    </div>
    <div>
      <label>Middle Name</label>
      <input
        name="middleName"
        placeholder="e.g. Santos (optional)"
        value={formData.middleName}
        onChange={handleChange}
        disabled={loading}
      />
    </div>
  </div>

 
  <div className="name-row">
    <div>
      <label>Birthdate *</label>
      <input
        type="date"
        name="birthdate"
        value={formData.birthdate}
        onChange={handleChange}
        disabled={loading}
        className={formErrors.birthdate ? "input-error" : ""}
      />
      {formErrors.birthdate && <p className="error-message">{formErrors.birthdate}</p>}
    </div>
    <div>
      <label>Age</label>
      <input
        placeholder="Auto-calculated"
        value={formData.age}
        readOnly
        disabled={loading}
      />
    </div>
    <div>
      <label>Contact No. *</label>
      <input
        name="contactNumber"
        placeholder="e.g. 09123456789"
        value={formData.contactNumber}
        onChange={handleChange}
        disabled={loading}
        className={formErrors.contactNumber ? "input-error" : ""}
      />
      {formErrors.contactNumber && <p className="error-message">{formErrors.contactNumber}</p>}
    </div>
  </div>


  <div className="name-row">
    <div>
      <label>Email *</label>
      <input
        type="email"
        name="email"
        placeholder="you@example.com"
        value={formData.email}
        onChange={handleChange}
        disabled={loading}
        readOnly
        className={formErrors.email ? "input-error" : ""}
      />
      {formErrors.email && <p className="error-message">{formErrors.email}</p>}
    </div>
    <div>
      <label>Gender *</label>
      <select
        name="gender"
        value={formData.gender}
        onChange={handleChange}
        disabled={loading}
        className={formErrors.gender ? "input-error" : ""}
      >
        <option value="">Choose gender</option>
        <option value="Female">Female</option>
        <option value="Male">Male</option>
        <option value="Other">Other</option>
      </select>
      {formErrors.gender && <p className="error-message">{formErrors.gender}</p>}
    </div>
  </div>

 
  <div className="name-row">
    <div>
      <label>House No.</label>
      <input
        name="houseNo"
        placeholder="e.g. 123"
        value={formData.houseNo}
        onChange={handleChange}
        disabled={loading}
      />
    </div>
    <div>
      <label>Street</label>
      <input
        name="street"
        placeholder="e.g. M. J. Cuenco Ave"
        value={formData.street}
        onChange={handleChange}
        disabled={loading}
      />
    </div>
  </div>

  <div className="name-row">
    <div>
      <label>Province</label>
      <select
        name="province"
        value={formData.province}
        onChange={handleChange}
        disabled={loading || !provinces.length}
      >
        <option value="">Select Province</option>
        {provinces.map(p => (
          <option key={p.code} value={p.name}>{p.name}</option>
        ))}
      </select>
    </div>
    <div>
      <label>Municipality/City</label>
      <select
        name="municipality"
        value={formData.municipality}
        onChange={handleChange}
        disabled={loading || !formData.province}
      >
        <option value="">Select City/Municipality</option>
        {filteredCities.map(c => (
          <option key={c.code} value={c.name}>{c.name}</option>
        ))}
      </select>
    </div>
    <div>
      <label>Barangay</label>
      <select
        name="barangay"
        value={formData.barangay}
        onChange={handleChange}
        disabled={loading || !formData.municipality}
      >
        <option value="">Select Barangay</option>
        {barangays.map(b => (
          <option key={b.code} value={b.name}>{b.name}</option>
        ))}
      </select>
    </div>
  </div>

  <div>
    <label>Zip Code</label>
    <input
      name="zipcode"
      placeholder="e.g. 6000"
      value={formData.zipcode}
      onChange={handleChange}
      disabled={loading}
    />
  </div>


  <div className="edit-buttons">
    <button className="save-btn" onClick={handleSave} disabled={loading}>
      {loading ? "Saving..." : "Save Changes"}
    </button>
    <button className="cancel-btn-edit" onClick={handleCancel} disabled={loading}>
      Cancel
    </button>
  </div>
</div>

          
      </div>
    </div>
  );
};

export default EditProfile;