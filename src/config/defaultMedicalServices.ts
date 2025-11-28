// config/defaultDentalServices.ts (Most Accurate Version)
export const DEFAULT_MEDICAL_SERVICES: Record<string, string[]> = {
  "General & Pediatric": [
    "General Consultation",
    "Pediatric Consultation",
    "Medical Consultations",
    "Medical Certificate",
  ],
  "Maternal Health": [
    "Prenatal Consultation",
    "Postnatal Consultation",
    "Family Planning Consultation",
  ],
  "Special Groups": [
    "Senior Citizen / Geriatric Consultation",
    "Nutrition Counseling",
  ],
  "Others": [
    "Others",
  ],
} as const;