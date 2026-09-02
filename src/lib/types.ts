// Core data model types — Firestore-shaped for future drop-in swap

export type Role = 'patient' | 'doctor' | 'admin';

export type DoctorStatus = 'available' | 'in_consult' | 'on_break';
export type PatientStatus =
  | 'waiting'
  | 'in_consult'
  | 'completed'
  | 'no_show'
  | 'recalled';

export type QueueEventType =
  | 'consult_start'
  | 'consult_end'
  | 'emergency'
  | 'emergency_revert'
  | 'no_show'
  | 'check_in'
  | 'reassign'
  | 'reward_redeem';

export type TriageUrgency = 'routine' | 'urgent' | 'emergency';

export interface Doctor {
  id: string;
  name: string;
  department: string;
  currentAvgConsultTime: number; // seconds
  status: DoctorStatus;
  currentConsultStartedAt: number | null; // epoch ms
  totalConsults: number;
  totalConsultDuration: number; // for computing historical avg
}

export interface RedeemedReward {
  rewardName: string;
  cost: number;
  timestamp: number;
}

export interface PrescribedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface ConsultationReport {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  consultationDate: number;
  durationMinutes: number;
  symptoms: string;
  diagnosis: string;
  clinicalNotes: string;
  prescriptions: PrescribedMedicine[];
  followUpDays?: number;
  advice?: string;
}

export interface Patient {
  id: string;
  userId?: string | null;
  name: string;
  department: string;
  symptoms?: string;
  triageUrgency?: TriageUrgency;
  checkInTime: number; // epoch ms
  status: PatientStatus;
  assignedDoctorId: string | null;
  queuePosition: number; // 0 = currently being seen
  estimatedWaitTime: number; // seconds
  points: number;
  badges: string[];
  redeemedRewards?: RedeemedReward[];
  isEmergency: boolean;
  isOnTime: boolean;
  completedAt: number | null;
  consultationReport?: ConsultationReport;
}

export interface QueueEvent {
  id: string;
  type: QueueEventType;
  doctorId: string | null;
  patientId: string | null;
  timestamp: number;
  duration?: number; // for consult_end events
  details?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phoneNumber?: string | null;
  photoURL?: string | null;
  linkedDoctorId?: string | null; // for doctor-role users
  linkedPatientId?: string | null; // for patient-role users
  notificationPrefs: {
    waitTimeChanges: boolean;
    youAreNext: boolean;
    doctorLate: boolean;
  };
}

export interface AppState {
  doctors: Doctor[];
  patients: Patient[];
  events: QueueEvent[];
  currentUserId: string | null;
}
