import React from "react";
import { FaTooth, FaXRay, FaVials, FaUserMd, FaStethoscope } from "react-icons/fa";
import "../../assets/Services.css";

const Services: React.FC = () => {
  return (
    <section className="services-home">
      <h2>Our Services</h2>
      <div className="services-cards-home">
        <div className="service-card-home">
          <div className="service-icon">
            <FaTooth />
          </div>
          <h3>Dental Services</h3>
          <p>
            Oral exams, cleaning, extractions, fluoride treatment, and hygiene
            education delivered by licensed dentists.
          </p>
        </div>

        <div className="service-card-home">
          <div className="service-icon">
            <FaXRay />
          </div>
          <h3>Radiology Services</h3>
          <p>
            High-quality X-ray imaging for diagnostics including chest,
            extremities, and general radiographic procedures.
          </p>
        </div>

        <div className="service-card-home">
          <div className="service-icon">
            <FaVials />
          </div>
          <h3>Clinical Laboratory Services</h3>
          <p>
            Diagnostic lab testing: blood chemistry, urinalysis, hematology, and
            other essential clinical analyses.
          </p>
        </div>

        <div className="service-card-home">
          <div className="service-icon">
            <FaUserMd />
          </div>
          <h3>Drug Dependency Exam</h3>
          <p>
            Medical-legal Drug Dependency Examination for court or
            rehabilitation requirements by accredited evaluators.
          </p>
        </div>

        <div className="service-card-home">
          <div className="service-icon">
            <FaStethoscope />
          </div>
          <h3>Medical Consultations</h3>
          <p>
            General check-ups, follow-up care, and health evaluations by licensed medical professionals.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Services;