import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/patients_file/LandingPage';
import Login from './components/patients_file/Login';
import Signup from './components/patients_file/Signup';
import Services from './components/patients_file/Services';
import AboutUs from './components/patients_file/AboutUs';
import ContactUs from './components/patients_file/ContactUs';
import Home from './components/patients_file/Home';
import Contacts from './components/patients_file/Contacts';
import Profile from './components/patients_file/Profile';
import EditProfile from './components/patients_file/EditProfile';
import Transaction from './components/patients_file/Transaction';
import AllServices from './components/patients_file/AllServices';
import AppointmentCalendar from './components/patients_file/AppointmentCalendar';
import ClinicalLabServices from './components/patients_file/ClinicalLabServices';
import RadiographicServices from './components/patients_file/RadiographicServices';
import DentalServices from './components/patients_file/DentalServices';
import MedicalConsultations from './components/patients_file/MedicalConsultations';
import CalendarClinicalLab from './components/patients_file/CalendarClinicalLab';
import CalendarDental from './components/patients_file/CalendarDental';
import CalendarMedical from './components/patients_file/CalendarMedical';
import ReviewPage from './components/patients_file/ReviewPage';

import LoginAdmin from './components/patients_file/LoginAdmin';
import Register from './components/patients_file/Register';

// Dental Admin
import Dashboard_Dental from './components/patients_file/Dental_Admin/Dashboard_Dental';
import Appointments_Dental from './components/patients_file/Dental_Admin/Appointments_Dental';
import PatientRecords_Dental from './components/patients_file/Dental_Admin/PatientRecords_Dental';
import ReportsAnalytics_Dental from './components/patients_file/Dental_Admin/ReportsAnalytics_Dental';
import ManageSlots_Dental from './components/patients_file/Dental_Admin/ManageSlots_Dental';

// Radiology Admin
import Dashboard_Radiology from './components/patients_file/Radiology_Admin/Dashboard_Radiology';
import Appointments_Radiology from './components/patients_file/Radiology_Admin/Appointments_Radiology';
import PatientRecords_Radiology from './components/patients_file/Radiology_Admin/PatientRecords_Radiology';
import ReportsAnalytics_Radiology from './components/patients_file/Radiology_Admin/ReportsAnalytics_Radiology';
import ManageSlots_Radiology from './components/patients_file/Radiology_Admin/ManageSlots_Radiology';

// Clinical Lab Admin
import Dashboard_Clinical from './components/patients_file/ClinicalLab_Admin/Dashboard_Clinical';
import Appointments_Clinical from './components/patients_file/ClinicalLab_Admin/Appointments_Clinical';
import PatientRecords_Clinical from './components/patients_file/ClinicalLab_Admin/PatientRecords_Clinical';
import ReportsAnalytics_Clinical from './components/patients_file/ClinicalLab_Admin/ReportsAnalytics_Clinical';
import ManageSlots_Clinical from './components/patients_file/ClinicalLab_Admin/ManageSlots_Clinical';

// DDE Admin
import Dashboard_DDE from './components/patients_file/DDE_Admin/Dashboard_DDE';
import Appointments_DDE from './components/patients_file/DDE_Admin/Appointments_DDE';
import PatientRecords_DDE from './components/patients_file/DDE_Admin/PatientRecords_DDE';
import ReportsAnalytics_DDE from './components/patients_file/DDE_Admin/ReportsAnalytics_DDE';

// Medical Admin
import Dashboard_Medical from './components/patients_file/Medical_Admin/Dashboard_Medical';
import Appointments_Medical from './components/patients_file/Medical_Admin/Appointments_Medical';
import PatientRecords_Medical from './components/patients_file/Medical_Admin/PatientRecords_Medical';
import ReportsAnalytics_Medical from './components/patients_file/Medical_Admin/ReportsAnalytics_Medical';
import ManageSlots_Medical from './components/patients_file/Medical_Admin/ManageSlots_Medical';

//Super Admin
import SuperAdmin_Dashboard from './components/patients_file/SuperAdmin/SuperAdmin_Dashboard';
import SuperAdmin_UserRequests from './components/patients_file/SuperAdmin/SuperAdmin_UserRequests';
import SuperAdmin_ManageAdmins from './components/patients_file/SuperAdmin/SuperAdmin_ManageAdmins';
import SuperAdmin_Reports from './components/patients_file/SuperAdmin/SuperAdmin_Reports';
import SuperAdmin_Clinical from './components/patients_file/SuperAdmin/SuperAdmin_Clinical';
import SuperAdmin_Dental from './components/patients_file/SuperAdmin/SuperAdmin_Dental';
import SuperAdmin_Radiology from './components/patients_file/SuperAdmin/SuperAdmin_Radiology';
import SuperAdmin_Medical from './components/patients_file/SuperAdmin/SuperAdmin_Medical';
import SuperAdmin_DDE from './components/patients_file/SuperAdmin/SuperAdmin_DDE';
import SuperAdmin_ClinicalAdmin from './components/patients_file/SuperAdmin/SuperAdmin_ClinicalAdmin';


import { ToastContainer } from "react-toastify";
import RequireAuth from "./components/patients_file/RequireAuth";

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/services" element={<Services />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />


            {/* Admin dashboards also protected */}
            <Route path="/loginadmin" element={<LoginAdmin />} />
            <Route path="/register" element={<Register />} />
            
           {/*dental*/}
            <Route path="/dashboard_dental" element={<Dashboard_Dental />} />
            <Route path="/appointments_dental" element={<Appointments_Dental />} />
            <Route path="/patientrecords_dental" element={<PatientRecords_Dental />} />
            <Route path="/reports&analytics_dental" element={<ReportsAnalytics_Dental />} />
            <Route path="/manageslots_dental" element={<ManageSlots_Dental />} />


            {/*radiology*/}
            <Route path="/dashboard_radiology" element={<Dashboard_Radiology />} />
            <Route path="/appointments_radiology" element={<Appointments_Radiology />} />
            <Route path="/patientrecords_radiology" element={<PatientRecords_Radiology />} />
            <Route path="/reports&analytics_radiology" element={<ReportsAnalytics_Radiology />} />
            <Route path="/manageslots_radiology" element={<ManageSlots_Radiology />} />


            {/*clinical*/}
            <Route path="/dashboard_clinical" element={<Dashboard_Clinical />} />
            <Route path="/appointments_clinical" element={<Appointments_Clinical />} />
            <Route path="/patientrecords_clinical" element={<PatientRecords_Clinical />} />
            <Route path="/reports&analytics_clinical" element={<ReportsAnalytics_Clinical />} />
            <Route path="/manageslots_clinical" element={<ManageSlots_Clinical />} />


            {/*dde*/}
            <Route path="/dashboard_dde" element={<Dashboard_DDE />} />
            <Route path="/appointments_dde" element={<Appointments_DDE />} />
            <Route path="/patientrecords_dde" element={<PatientRecords_DDE />} />
            <Route path="/reports&analytics_dde" element={<ReportsAnalytics_DDE />} />


            {/*medical*/}
            <Route path="/dashboard_medical" element={<Dashboard_Medical />} />
            <Route path="/appointments_medical" element={<Appointments_Medical />} />
            <Route path="/patientrecords_medical" element={<PatientRecords_Medical />} />
            <Route path="/reports&analytics_medical" element={<ReportsAnalytics_Medical />} />
            <Route path="/manageslots_medical" element={<ManageSlots_Medical />} />



            {/*superadmin*/}
            <Route path="/superadmin_dashboard" element={<SuperAdmin_Dashboard/>} />
            <Route path="/superadmin_userrequests" element={<SuperAdmin_UserRequests/>} />
            <Route path="/superadmin_manageadmins" element={<SuperAdmin_ManageAdmins/>} />
            <Route path="/superadmin_reports" element={<SuperAdmin_Reports/>} />
            <Route path="/superadmin_clinical" element={<SuperAdmin_Clinical/>} />
            <Route path="/superadmin_dental" element={<SuperAdmin_Dental/>} />
            <Route path="/superadmin_radiology" element={<SuperAdmin_Radiology/>} />
            <Route path="/superadmin_medical" element={<SuperAdmin_Medical/>} />
            <Route path="/superadmin_dde" element={<SuperAdmin_DDE/>} />
            <Route path="/superadmin_clinicaladmin" element={<SuperAdmin_ClinicalAdmin/>} />


          {/* Protected routes */}
          <Route element={<RequireAuth />}>
            <Route path="/home" element={<Home />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/editprofile" element={<EditProfile />} />
            <Route path="/transaction" element={<Transaction />} />
            <Route path="/allservices" element={<AllServices />} />
            <Route path="/calendar" element={<AppointmentCalendar />} />
            <Route path="/labservices" element={<ClinicalLabServices />} />
            <Route path="/radioservices" element={<RadiographicServices />} />
            <Route path="/dental" element={<DentalServices />} />
            <Route path="/medical" element={<MedicalConsultations />} />
            <Route path="/calendarlab" element={<CalendarClinicalLab />} />
            <Route path="/calendardental" element={<CalendarDental />} />
            <Route path="/calendarmedical" element={<CalendarMedical />} />
            <Route path="/review" element={<ReviewPage />} />
            
          
          </Route>
        </Routes>

        <ToastContainer
          position="top-center"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable
          style={{ zIndex: 999999 }}
        />
      </div>
    </Router>
  );
};

export default App;
