import React, { useState, useEffect } from "react";
import { FaCamera } from "react-icons/fa";
import axios from "axios";
import "../../assets/EditProfile.css";
import { auth, db, googleProvider } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { updateProfile, updateEmail, reauthenticateWithPopup, GoogleAuthProvider } from "firebase/auth";
import { toast } from "react-toastify";

// Define interfaces for API responses
interface Province {
  name: string;
  code: string;
}

interface City {
  name: string;
  code: string;
  provinceCode: string;
}

interface Barangay {
  name: string;
  code: string;
  cityCode: string;
}

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
    lastName: "",
    firstName: "",
    middleName: "",
    email: "",
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

  // Utility function to convert file to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Utility function for API calls with retry
  const fetchWithRetry = async (url: string, retries = 3, delay = 1000): Promise<any> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url);
        return response.data;
      } catch (err: any) {
        console.error(`Attempt ${i + 1} failed for ${url}:`, err.message, err.response?.status);
        if (err.response?.status === 429 && i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
          continue;
        }
        throw new Error(`Failed to fetch data from ${url}: ${err.message}`);
      }
    }
  };

  // Check localStorage for cached data
  const getCachedData = (key: string): any => {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  };

  // Cache data to localStorage
  const cacheData = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // Fetch user profile from Firestore on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      console.log("Fetching profile for user:", user?.uid);
      if (user) {
        try {
          setLoading(true);
          const userRef = doc(db, "Users", user.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Firestore profile data:", data);
            setFormData({
              lastName: data.lastName || "",
              firstName: data.firstName || "",
              middleName: data.middleName || "",
              email: data.email || user.email || "",
              gender: data.gender || "",
              birthdate: data.birthdate || "",
              age: data.age || "",
              contactNumber: data.contactNumber || "",
              houseNo: data.houseNo || "",
              street: data.street || "",
              province: data.province || "",
              provinceCode: data.provinceCode || "",
              municipality: data.municipality || "",
              municipalityCode: data.municipalityCode || "",
              barangay: data.barangay || "",
              zipcode: data.zipcode || "",
            });
            setAvatar(data.photoBase64 || data.photoURL || user.photoURL || "/default-img.jpg");
            setAvatarBase64(data.photoBase64 || null);
          } else {
            setError("Profile not found.");
            toast.error("Profile not found.", { position: "top-center" });
          }
        } catch (err: any) {
          console.error("Error fetching profile:", err.message, err.code);
          setError(`Failed to load profile data: ${err.message}`);
          toast.error(`Failed to load profile data: ${err.message}`, { position: "top-center" });
        } finally {
          setLoading(false);
        }
      } else {
        setError("User not authenticated.");
        toast.error("User not authenticated.", { position: "top-center" });
        navigate("/");
      }
    };
    fetchProfile();
  }, [navigate]);

  // Fetch provinces and cities on mount
  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      setError(null);
      try {
        let provinceList: Province[] = getCachedData("provinces") || [];
        if (provinceList.length === 0) {
          const provincesData = await fetchWithRetry("https://psgc.gitlab.io/api/provinces/");
          provinceList = Array.isArray(provincesData)
            ? provincesData
                .filter((prov: any) => prov.name && prov.code)
                .map((prov: Province) => ({ name: prov.name.trim(), code: prov.code.trim() }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : [];
          if (provinceList.length === 0) {
            throw new Error("No valid province data received");
          }
          cacheData("provinces", provinceList);
        }
        setProvinces(provinceList);

        let cityList: City[] = getCachedData("cities") || [];
        if (cityList.length === 0) {
          const citiesData = await fetchWithRetry("https://psgc.gitlab.io/api/cities-municipalities/");
          cityList = Array.isArray(citiesData)
            ? citiesData
                .filter((city: any) => city.name && city.code && city.provinceCode)
                .map((city: City) => ({
                  name: city.name.trim(),
                  code: city.code.trim(),
                  provinceCode: city.provinceCode.trim(),
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : [];
          if (cityList.length === 0) {
            throw new Error("No valid city/municipality data received");
          }
          cacheData("cities", cityList);
        }
        setCities(cityList);
      } catch (err: any) {
        console.error("Error fetching location data:", err.message);
        setError("Failed to load provinces or cities. Please try again later.");
        toast.error("Failed to load provinces or cities. Please try again later.", { position: "top-center" });
        setProvinces([]);
        setCities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  // Fetch barangays when municipalityCode changes
  const fetchBarangays = async (municipalityCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const barangaysData = await fetchWithRetry(
        `https://psgc.gitlab.io/api/cities-municipalities/${municipalityCode}/barangays/`
      );
      const barangayList = Array.isArray(barangaysData)
        ? barangaysData
            .filter((brgy: any) => brgy.name && brgy.code)
            .map((brgy: Barangay) => ({
              name: brgy.name.trim(),
              code: brgy.code.trim(),
              cityCode: municipalityCode.trim(),
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];
      if (barangayList.length === 0) {
        setError(`No barangays found for ${formData.municipality}. Please select another municipality.`);
        toast.error(`No barangays found for ${formData.municipality}.`, { position: "top-center" });
      } else {
        cacheData(`barangays_${municipalityCode}`, barangayList);
      }
      setBarangays(barangayList);
      if (formData.barangay && !barangayList.find((b) => b.name === formData.barangay)) {
        setFormData((prev) => ({ ...prev, barangay: "" }));
      }
    } catch (err: any) {
      console.error("Error fetching barangays:", err.message);
      setError("Failed to load barangays. Please try another municipality or check your connection.");
      toast.error("Failed to load barangays. Please try another municipality or check your connection.", { position: "top-center" });
      setBarangays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.municipalityCode && !barangays.find((b) => b.cityCode === formData.municipalityCode)) {
      const cachedBarangays = getCachedData(`barangays_${formData.municipalityCode}`);
      if (cachedBarangays?.length > 0) {
        setBarangays(cachedBarangays);
        if (formData.barangay && !cachedBarangays.find((b: Barangay) => b.name === formData.barangay)) {
          setFormData((prev) => ({ ...prev, barangay: "" }));
        }
      } else {
        fetchBarangays(formData.municipalityCode);
      }
    } else if (!formData.municipalityCode) {
      setBarangays([]);
      setFormData((prev) => ({ ...prev, barangay: "" }));
    }
  }, [formData.municipalityCode]);

  // Update age based on birthdate
  useEffect(() => {
    if (formData.birthdate) {
      const birthDate = new Date(formData.birthdate);
      if (isNaN(birthDate.getTime())) {
        setFormData((prev) => ({ ...prev, age: "" }));
        return;
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const hasHadBirthdayThisYear =
        today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
      if (!hasHadBirthdayThisYear) age--;
      setFormData((prev) => ({ ...prev, age: age >= 0 ? age.toString() : "" }));
    } else {
      setFormData((prev) => ({ ...prev, age: "" }));
    }
  }, [formData.birthdate]);

  // Clean up avatar URL
  useEffect(() => {
    return () => {
      if (avatar !== "/default-img.jpg" && avatar.startsWith("data:")) {
        // No cleanup needed for Base64 strings
      }
    };
  }, [avatar]);

  // Handle avatar file change with Base64
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError("No file selected.");
      toast.error("No file selected.", { position: "top-center" });
      return;
    }
    if (!auth.currentUser) {
      setError("You must be logged in to upload an image.");
      toast.error("You must be logged in to upload an image.", { position: "top-center" });
      return;
    }

    console.log("Selected file:", file.name, file.size, file.type);
    try {
      // Validate file size and type
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size must be under 2MB.");
        toast.error("Image size must be under 2MB.", { position: "top-center" });
        return;
      }
      if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
        setError("Only JPEG or PNG images are allowed.");
        toast.error("Only JPEG or PNG images are allowed.", { position: "top-center" });
        return;
      }

      // Convert to Base64 for preview and storage
      setLoading(true);
      const base64 = await fileToBase64(file);
      console.log("Base64 generated, length:", base64.length);
      setAvatar(base64);
      setAvatarBase64(base64);
    } catch (err: any) {
      console.error("Error processing image:", err.message);
      setError("Failed to process image. Please try another image.");
      toast.error("Failed to process image. Please try another image.", { position: "top-center" });
      setAvatar("/default-img.jpg");
      setAvatarBase64(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log("Input changed:", name, value);
    if (name === "province") {
      const selectedProvince = provinces.find((prov) => prov.name === value);
      setFormData((prev) => ({
        ...prev,
        province: value,
        provinceCode: selectedProvince?.code || "",
        municipality: "",
        municipalityCode: "",
        barangay: "",
      }));
      setFormErrors((prev) => ({ ...prev, province: "", municipality: "", barangay: "" }));
    } else if (name === "municipality") {
      const selectedCity = cities.find((city) => city.name === value);
      setFormData((prev) => ({
        ...prev,
        municipality: value,
        municipalityCode: selectedCity?.code || "",
        barangay: "",
      }));
      setFormErrors((prev) => ({ ...prev, municipality: "", barangay: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    if (!formData.lastName) errors.lastName = "Last name is required";
    if (!formData.firstName) errors.firstName = "First name is required";
    if (!formData.email) errors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Invalid email format";
    if (!formData.birthdate) errors.birthdate = "Birthdate is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.province) errors.province = "Province is required";
    if (!formData.municipality) errors.municipality = "Municipality is required";
    if (!formData.barangay) errors.barangay = "Barangay is required";
    if (!formData.contactNumber) errors.contactNumber = "Contact number is required";
    else if (!/^\+?\d{7,15}$/.test(formData.contactNumber))
      errors.contactNumber = "Invalid contact number format (7-15 digits)";

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Re-authenticate user with Google
  const reAuthenticateWithGoogle = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error("No user is currently signed in.");
      }
      await reauthenticateWithPopup(auth.currentUser, googleProvider);
      toast.success("Re-authentication successful!", { position: "top-center" });
      return true;
    } catch (err: any) {
      console.error("Re-authentication error:", err.message, err.code);
      let errorMessage = "Failed to re-authenticate with Google. Please try again.";
      if (err.code === "auth/popup-closed-by-user") {
        errorMessage = "Re-authentication canceled. Please complete the Google sign-in to save changes.";
      } else if (err.code === "auth/network-request-failed") {
        errorMessage = "Network error during re-authentication. Please check your connection.";
      }
      setError(errorMessage);
      toast.error(errorMessage, { position: "top-center" });
      return false;
    }
  };

  // Handle save action with re-authentication
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      setError("Please fill in all required fields correctly.");
      toast.error("Please fill in all required fields correctly.", { position: "top-center" });
      return;
    }

    const user = auth.currentUser;
    console.log("Current user:", user?.uid, user?.email);
    if (!user) {
      setError("You must be logged in to save your profile.");
      toast.error("You must be logged in to save your profile.", { position: "top-center" });
      navigate("/");
      return;
    }

    setLoading(true);
    try {
      // Check if user signed in with Google
      const isGoogleUser = user.providerData.some(
        (provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID
      );

      // Update email if changed
      if (formData.email !== user.email) {
        try {
          if (isGoogleUser) {
            const reAuthSuccess = await reAuthenticateWithGoogle();
            if (!reAuthSuccess) {
              setLoading(false);
              return;
            }
          }
          await updateEmail(user, formData.email);
          console.log("Email updated in Firebase Authentication:", formData.email);
        } catch (emailErr: any) {
          console.error("Email update error:", emailErr.message, emailErr.code);
          if (emailErr.code === "auth/requires-recent-login") {
            const reAuthSuccess = await reAuthenticateWithGoogle();
            if (reAuthSuccess) {
              await updateEmail(user, formData.email);
              console.log("Email updated after re-authentication:", formData.email);
            } else {
              throw new Error("Re-authentication failed. Please try again.");
            }
          } else if (emailErr.code === "auth/email-already-in-use") {
            throw new Error("This email is already in use by another account.");
          } else if (emailErr.code === "auth/invalid-email") {
            throw new Error("Invalid email format.");
          } else {
            throw new Error(`Failed to update email: ${emailErr.message}`);
          }
        }
      }

      // Update profile photoURL with Base64 (optional)
      if (avatarBase64) {
        try {
          if (isGoogleUser) {
            const reAuthSuccess = await reAuthenticateWithGoogle();
            if (!reAuthSuccess) {
              setLoading(false);
              return;
            }
          }
          await updateProfile(user, { photoURL: avatarBase64 });
          console.log("User profile updated with new photoURL (Base64)");
        } catch (profileErr: any) {
          console.error("Profile update error:", profileErr.message, profileErr.code);
          if (profileErr.code === "auth/requires-recent-login") {
            const reAuthSuccess = await reAuthenticateWithGoogle();
            if (reAuthSuccess) {
              await updateProfile(user, { photoURL: avatarBase64 });
              console.log("Profile updated after re-authentication");
            } else {
              throw new Error("Re-authentication failed. Please try again.");
            }
          } else {
            console.warn("Profile photo update failed, continuing with Firestore update");
          }
        }
      }

      // Save profile data to Firestore
      const userRef = doc(db, "Users", user.uid);
      console.log("Saving profile data to Firestore:", { ...formData, photoBase64: avatarBase64 });
      await updateDoc(userRef, {
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        email: formData.email,
        gender: formData.gender,
        birthdate: formData.birthdate,
        age: formData.age,
        contactNumber: formData.contactNumber,
        houseNo: formData.houseNo,
        street: formData.street,
        province: formData.province,
        provinceCode: formData.provinceCode,
        municipality: formData.municipality,
        municipalityCode: formData.municipalityCode,
        barangay: formData.barangay,
        zipcode: formData.zipcode,
        photoBase64: avatarBase64 || null,
      });

      setSuccess("Profile updated successfully!");
      toast.success("Profile updated successfully!", { position: "top-center" });
      console.log("Profile saved successfully for user:", user.uid);
      if (onNavigate) {
        onNavigate("profile");
      } else {
        navigate("/profile");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Error saving profile:", err.message, err.code);
      setAvatarBase64(null);
      setAvatar("/default-img.jpg");
      let errorMessage = "Failed to save profile. Please try again.";
      if (err.code === "firestore/permission-denied") {
        errorMessage = "You don’t have permission to update your profile. Please log in again.";
      } else if (err.code === "auth/requires-recent-login") {
        errorMessage = "Please re-authenticate to update your profile or email.";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email format.";
      } else if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already in use by another account.";
      } else if (err.code === "firestore/quota-exceeded") {
        errorMessage = "Firestore quota exceeded. Image may be too large.";
      }
      setError(errorMessage);
      toast.error(errorMessage, { position: "top-center" });
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    if (onNavigate) {
      onNavigate("profile");
    } else {
      navigate("/profile");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Filter cities based on province
  const filteredCities = cities.filter((city) => city.provinceCode.trim() === formData.provinceCode.trim());

  return (
    <div className="edit-profile-container">
      <div className="profile-card">
        <div className="avatar-container">
          <div className="avatar-wrapper">
            <img src={avatar} alt="Avatar" className="avatar-img" />
            <div className="avatar-buttons">
              <label className="avatar-upload-btn">
                <FaCamera size={16} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleAvatarChange}
                  className="avatar-input"
                  disabled={loading}
                />
              </label>
            </div>
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}
        {success && <p className="success-message">{success}</p>}
        {loading && <p className="loading-message">Loading...</p>}

        <div className="form-section">
          <div className="name-row">
            <div>
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                className={formErrors.lastName ? "input-error" : ""}
                disabled={loading}
              />
              {formErrors.lastName && <p className="error-message">{formErrors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
                className={formErrors.firstName ? "input-error" : ""}
                disabled={loading}
              />
              {formErrors.firstName && <p className="error-message">{formErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="middleName">Middle Name</label>
              <input
                id="middleName"
                name="middleName"
                placeholder="Middle Name"
                value={formData.middleName}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div className="name-row">
            <div>
              <label htmlFor="birthdate">Birthdate</label>
              <input
                id="birthdate"
                name="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={handleChange}
                className={formErrors.birthdate ? "input-error" : ""}
                disabled={loading}
              />
              {formErrors.birthdate && <p className="error-message">{formErrors.birthdate}</p>}
            </div>
            <div>
              <label htmlFor="age">Age</label>
              <input
                id="age"
                name="age"
                placeholder="Age"
                type="number"
                value={formData.age}
                readOnly
                disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="contactNumber">Contact Number</label>
              <input
                id="contactNumber"
                name="contactNumber"
                placeholder="Contact Number"
                value={formData.contactNumber}
                onChange={handleChange}
                className={formErrors.contactNumber ? "input-error" : ""}
                disabled={loading}
              />
              {formErrors.contactNumber && <p className="error-message">{formErrors.contactNumber}</p>}
            </div>
          </div>

          <div className="name-row">
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className={formErrors.email ? "input-error" : ""}
                disabled={loading}
                 readOnly
              />
              {formErrors.email && <p className="error-message">{formErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={formErrors.gender ? "input-error" : ""}
                disabled={loading}
              >
                <option value="">Select Gender</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
              {formErrors.gender && <p className="error-message">{formErrors.gender}</p>}
            </div>
          </div>

          <div className="name-row">
            <div>
              <label htmlFor="houseNo">House No.</label>
              <input
                id="houseNo"
                name="houseNo"
                placeholder="House No."
                value={formData.houseNo}
                onChange={handleChange}
                disabled={loading}
                className={formErrors.houseNo ? "input-error" : ""}
              />
              {formErrors.houseNo && <p className="error-message">{formErrors.houseNo}</p>}
            </div>
            <div>
              <label htmlFor="street">Street</label>
              <input
                id="street"
                name="street"
                placeholder="Street"
                value={formData.street}
                onChange={handleChange}
                disabled={loading}
                className={formErrors.street ? "input-error" : ""}
              />
              {formErrors.street && <p className="error-message">{formErrors.street}</p>}
            </div>
          </div>

          <div className="name-row">
            <div>
              <label htmlFor="province">Province</label>
              <select
                id="province"
                name="province"
                value={formData.province}
                onChange={handleChange}
                disabled={loading || provinces.length === 0}
                className={formErrors.province ? "input-error" : ""}
              >
                <option value="">Select Province</option>
                {provinces.map((prov) => (
                  <option key={prov.code} value={prov.name}>
                    {prov.name}
                  </option>
                ))}
              </select>
              {formErrors.province && <p className="error-message">{formErrors.province}</p>}
            </div>
            <div>
              <label htmlFor="municipality">Municipality/City</label>
              <select
                id="municipality"
                name="municipality"
                value={formData.municipality}
                onChange={handleChange}
                disabled={loading || !formData.province || filteredCities.length === 0}
                className={formErrors.municipality ? "input-error" : ""}
              >
                <option value="">Select Municipality/City</option>
                {filteredCities.map((city) => (
                  <option key={city.code} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
              {formErrors.municipality && <p className="error-message">{formErrors.municipality}</p>}
            </div>
            <div>
              <label htmlFor="barangay">Barangay</label>
              <select
                id="barangay"
                name="barangay"
                value={formData.barangay}
                onChange={handleChange}
                disabled={loading || !formData.municipality || barangays.length === 0}
                className={formErrors.barangay ? "input-error" : ""}
              >
                <option value="">Select Barangay</option>
                {barangays.length > 0 ? (
                  barangays.map((barangay) => (
                    <option key={barangay.code} value={barangay.name}>
                      {barangay.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    {formData.municipality
                      ? "No barangays available. Try another municipality or check your connection."
                      : "Please select a municipality first"}
                  </option>
                )}
              </select>
              {formErrors.barangay && <p className="error-message">{formErrors.barangay}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="zipcode">Zip Code</label>
            <input
              id="zipcode"
              name="zipcode"
              placeholder="Zip Code"
              value={formData.zipcode}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="edit-buttons">
            <button className="save-btn" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
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