// config/defaultClinicalServices.ts
export const DEFAULT_CLINICAL_SERVICES: Record<string, string[]> = {
  Screening: ["Drug Test"],

  Hematology: [
    "Complete Blood Count (CBC)",
    "Clotting Time and Bleeding Time",
  ],

  "Microscopy-Parasitology": [
    "Urinalysis",
    "Fecalysis",
  ],

  "Clinical Chemistry": [
    "RBS (Random Blood Sugar)",
    "FBS (Fasting Blood Sugar)",
    "Lipid Panel",
    "Cholesterol",
    "Triglycerides",
    "High-Density Lipoprotein(HDL)",
    "Low-Density Lipoprotein(LDL)",
    "VLDL",
    "Serum Sodium (Na+)",
    "Serum Potassium (K+)",
    "Serum Chloride (Cl-)",
    "Serum Creatinine",
    "SGOT / AST",
    "SGPT / ALT",
    "BUA (Blood Uric Acid)",
    "BUN (Blood Urea Nitrogen)",
  ],

  "Immunology and Serology": [
    "HBsAg Screening Test",
    "HCV Screening Test",
    "Syphilis Screening Test",
    "Dengue Duo NS1",
    "Pregnancy Test",
    "Blood Typing",
  ],

  "Blood Chemistry": [
    "HbA1c",
  ],
} as const;