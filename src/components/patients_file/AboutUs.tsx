import React from "react";
import "../../assets/AboutUs.css";

interface AboutUsProps {
  onNavigate?: (view: "home" | "services" | "about" | "contact") => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onNavigate }) => {
 const handleGetInTouch = () => {
  if (onNavigate) {
    onNavigate("contact");
    window.scrollTo({ top: 0, behavior: "smooth" }); // scroll to top smoothly
  }
};


  return (
    <>
      {/* Hero Section */}
      <div className="about-page">
        <section className="about-hero">
          <div className="about-overlay">
            <h1>About DOH-TRC Argao</h1>
            <p>Committed to healing, recovery, and transformation since 1984</p>
          </div>
        </section>

        {/* Intro Section */}
        <section className="about-intro">
          <h2>Dedicated to Compassionate Care and Recovery</h2>
          <p>
            DOH-TRC Argao is a beacon of hope for individuals seeking recovery from substance use. 
            Our multidisciplinary team offers a holistic and evidence-based approach to rehabilitation, 
            ensuring each individual is treated with dignity, compassion, and respect.
          </p>
        </section>
      </div>

      {/* Main Content */}
      <section className="about-content">
        <div className="about-grid">
          <div className="about-card">
            <h4>Mission</h4>
            <p>
              To provide high-quality treatment and support services that empower individuals and families 
              on their path toward a drug-free, fulfilling life.
            </p>
          </div>

          <div className="about-card">
            <h4>Vision</h4>
            <p>
              A society where every individual affected by substance use disorder is offered 
              support, understanding, and a second chance to reintegrate and thrive.
            </p>
          </div>

          <div className="about-card">
            <h4>Quality & Policy</h4>
            <p>
              We are committed to maintaining the highest standards of care through continuous improvement, 
              professional development, and adherence to best practices. Our policies ensure confidentiality, 
              ethical treatment, and respect for every individual's rights throughout their recovery journey.
            </p>
          </div>

          <div className="about-card">
            <h4>Core Values</h4>
            <p>
              Compassion, Integrity, Respect, Excellence, and Collaboration guide everything we do to foster a supportive and healing environment.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
       <section className="about-cta">
        <div className="cta-box">
          <h2>Ready to Begin a New Chapter?</h2>
          <p>Discover how DOH-TRC Argao can support your journey to recovery.</p>
          <button className="cta-button" onClick={handleGetInTouch}>
            Get in Touch
          </button>
        </div>
      </section>
    </>
  );
};

export default AboutUs;
