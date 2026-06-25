export interface Person {
  id: string;
  name: string;
  createdAt: number;
}

export interface Medication {
  id: string;
  personId: string;
  name: string;
  dosage: string;
  frequencyHours: number;
  durationDays?: number;
  startDate: number;
  endDate?: number | null;
  createdAt: number;
  isAntibiotic?: boolean;
}

export interface Dose {
  id: string;
  personId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: number;
  takenAt?: number | null;
  status: "pending" | "taken" | "skipped";
  isAntibiotic?: boolean;
}
