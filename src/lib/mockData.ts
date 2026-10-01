import type { Doctor, Patient, QueueEvent, User } from './types';

export const seedDoctors: Doctor[] = [
  {
    id: 'doc_1',
    name: 'Dr. Himanshu',
    department: 'Cardiology',
    currentAvgConsultTime: 900,
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 0,
    totalConsultDuration: 0,
  },
  {
    id: 'doc_2',
    name: 'Dr. Soham',
    department: 'General Medicine',
    currentAvgConsultTime: 720,
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 0,
    totalConsultDuration: 0,
  },
  {
    id: 'doc_3',
    name: 'Dr. Pranav',
    department: 'Pediatrics',
    currentAvgConsultTime: 600,
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 0,
    totalConsultDuration: 0,
  },
  {
    id: 'doc_4',
    name: 'Dr. Pranay',
    department: 'Orthopedics',
    currentAvgConsultTime: 1080,
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 0,
    totalConsultDuration: 0,
  },
  {
    id: 'doc_5',
    name: 'Dr. Harsh',
    department: 'Dermatology',
    currentAvgConsultTime: 600,
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 0,
    totalConsultDuration: 0,
  },
  {
    id: 'doc_6',
    name: 'Dr. Sahil',
    department: 'Neurology',
    currentAvgConsultTime: 1200,
    status: 'available',
    currentConsultStartedAt: null,
    totalConsults: 0,
    totalConsultDuration: 0,
  },
];

// Cleared fake patient data
export const seedPatients: Patient[] = [];

// Cleared fake event data
export const seedEvents: QueueEvent[] = [];

// Admin & Doctor Logins (Password: 123456)
export const seedUsers: User[] = [
  {
    id: 'user_admin',
    email: 'admin@gmail.com',
    name: 'Hospital Admin',
    role: 'admin',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: true,
    },
  },
  {
    id: 'user_doc_1',
    email: 'himanshu@gmail.com',
    name: 'Dr. Himanshu',
    role: 'doctor',
    linkedDoctorId: 'doc_1',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: false,
    },
  },
  {
    id: 'user_doc_2',
    email: 'soham@gmail.com',
    name: 'Dr. Soham',
    role: 'doctor',
    linkedDoctorId: 'doc_2',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: false,
    },
  },
  {
    id: 'user_doc_3',
    email: 'pranav@gmail.com',
    name: 'Dr. Pranav',
    role: 'doctor',
    linkedDoctorId: 'doc_3',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: false,
    },
  },
  {
    id: 'user_doc_4',
    email: 'pranay@gmail.com',
    name: 'Dr. Pranay',
    role: 'doctor',
    linkedDoctorId: 'doc_4',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: false,
    },
  },
  {
    id: 'user_doc_5',
    email: 'harsh@gmail.com',
    name: 'Dr. Harsh',
    role: 'doctor',
    linkedDoctorId: 'doc_5',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: false,
    },
  },
  {
    id: 'user_doc_6',
    email: 'sahil@gmail.com',
    name: 'Dr. Sahil',
    role: 'doctor',
    linkedDoctorId: 'doc_6',
    notificationPrefs: {
      waitTimeChanges: true,
      youAreNext: true,
      doctorLate: false,
    },
  },
];

