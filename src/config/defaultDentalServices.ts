// config/defaultDentalServices.ts (Most Accurate Version)
export const DEFAULT_DENTAL_SERVICES: Record<string, string[]> = {
  "Routine Care": [
    "Check-up",
    "Oral Prophylaxis",
    
  ],
  "Fillings": [
    "Temporary Filling",
    "Permanent Filling",
  ],
  "Extractions": [
    "Simple Extraction",
    "Complex Extraction",
  ],
  "Gum & Others": [
    "Gum Treatment",
    "Incision and Drainage",
  ],
   "Others": [
    "Others",
  ],
} as const;