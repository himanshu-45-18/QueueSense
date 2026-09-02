// Real initial seed data for Firestore
import type { Doctor, Patient, QueueEvent, User } from './types';

const now = Date.now();
const MIN = 60 * 1000;

export const seedDoctors: Doctor[] = [
  {
    id: 'doc_1',
    name: 'Dr. Sarah Chen',
    department: 'Cardiology',
    currentAvgConsultTime: 900, // 15 min
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 18,
    totalConsultDuration: 18 * 900,
  },
  {
    id: 'doc_2',
    name: 'Dr. James Patel',
    department: 'General Medicine',
    currentAvgConsultTime: 720, // 12 min
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 24,
    totalConsultDuration: 24 * 720,
  },
  {
    id: 'doc_3',
    name: 'Dr. Maria Rodriguez',
    department: 'Pediatrics',
    currentAvgConsultTime: 600, // 10 min
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 15,
    totalConsultDuration: 15 * 600,
  },
  {
    id: 'doc_4',
    name: 'Dr. David Kim',
    department: 'Orthopedics',
    currentAvgConsultTime: 1080, // 18 min
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 12,
    totalConsultDuration: 12 * 1080,
  },
  {
    id: 'doc_5',
    name: 'Dr. Priya Sharma',
    department: 'Dermatology',
    currentAvgConsultTime: 600, // 10 min
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 10,
    totalConsultDuration: 10 * 600,
  },
  {
    id: 'doc_6',
    name: 'Dr. Alexander Wright',
    department: 'Neurology',
    currentAvgConsultTime: 1200, // 20 min
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 8,
    totalConsultDuration: 8 * 1200,
  },
];

export const seedPatients: Patient[] = [
  {
    id: 'pat_demo_1',
    name: 'John Anderson',
    department: 'Cardiology',
    symptoms: 'Mild chest pressure and irregular pulse',
    triageUrgency: 'urgent',
    checkInTime: now - 20 * MIN,
    status: 'waiting',
    assignedDoctorId: 'doc_1',
    queuePosition: 0,
    estimatedWaitTime: 0,
    points: 20,
    badges: ['Punctual'],
    isEmergency: false,
    isOnTime: true,
    completedAt: null,
  },
  {
    id: 'pat_demo_2',
    name: 'Sophia Martinez',
    department: 'General Medicine',
    symptoms: 'High fever and persistent cough for 2 days',
    triageUrgency: 'routine',
    checkInTime: now - 15 * MIN,
    status: 'waiting',
    assignedDoctorId: 'doc_2',
    queuePosition: 0,
    estimatedWaitTime: 0,
    points: 20,
    badges: ['Punctual'],
    isEmergency: false,
    isOnTime: true,
    completedAt: null,
  },
  {
    id: 'pat_demo_3',
    name: 'Lucas Garcia',
    department: 'Pediatrics',
    symptoms: 'Infant routine 6-month checkup and vaccination',
    triageUrgency: 'routine',
    checkInTime: now - 10 * MIN,
    status: 'waiting',
    assignedDoctorId: 'doc_3',
    queuePosition: 0,
    estimatedWaitTime: 0,
    points: 20,
    badges: ['Punctual'],
    isEmergency: false,
    isOnTime: true,
    completedAt: null,
  },
];

export const seedEvents: QueueEvent[] = [
  {
    id: 'evt_init_1',
    type: 'check_in',
    doctorId: 'doc_1',
    patientId: 'pat_demo_1',
    timestamp: now - 20 * MIN,
    details: 'Checked in for Cardiology consultation',
  },
  {
    id: 'evt_init_2',
    type: 'check_in',
    doctorId: 'doc_2',
    patientId: 'pat_demo_2',
    timestamp: now - 15 * MIN,
    details: 'Checked in for General Medicine consultation',
  },
];

export const seedUsers: User[] = [
  {
    id: 'user_patient_demo',
    email: 'patient@demo.com',
    name: 'Demo Patient',
    role: 'patient',
    linkedPatientId: 'pat_demo_1',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: true,
    },
  },
  {
    id: 'user_doctor_demo',
    email: 'doctor@demo.com',
    name: 'Dr. Sarah Chen',
    role: 'doctor',
    linkedDoctorId: 'doc_1',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: false,
    },
  },
  {
    id: 'user_admin_demo',
    email: 'admin@demo.com',
    name: 'Hospital Admin',
    role: 'admin',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: true,
    },
  },
];
