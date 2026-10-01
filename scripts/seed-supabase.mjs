import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://percmiydlykcoqyfprpu.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_yAzCYPLt98JhMGX1KzwWYg_RDYoe4Nm';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const seedDoctors = [
  {
    id: 'doc_1',
    name: 'Dr. Himanshu',
    department: 'Cardiology',
    current_avg_consult_time: 900,
    status: 'available',
    current_consult_started_at: null,
    total_consults: 0,
    total_consult_duration: 0,
  },
  {
    id: 'doc_2',
    name: 'Dr. Soham',
    department: 'General Medicine',
    current_avg_consult_time: 720,
    status: 'available',
    current_consult_started_at: null,
    total_consults: 0,
    total_consult_duration: 0,
  },
  {
    id: 'doc_3',
    name: 'Dr. Pranav',
    department: 'Pediatrics',
    current_avg_consult_time: 600,
    status: 'available',
    current_consult_started_at: null,
    total_consults: 0,
    total_consult_duration: 0,
  },
  {
    id: 'doc_4',
    name: 'Dr. Pranay',
    department: 'Orthopedics',
    current_avg_consult_time: 1080,
    status: 'available',
    current_consult_started_at: null,
    total_consults: 0,
    total_consult_duration: 0,
  },
  {
    id: 'doc_5',
    name: 'Dr. Harsh',
    department: 'Dermatology',
    current_avg_consult_time: 600,
    status: 'available',
    current_consult_started_at: null,
    total_consults: 0,
    total_consult_duration: 0,
  },
  {
    id: 'doc_6',
    name: 'Dr. Sahil',
    department: 'Neurology',
    current_avg_consult_time: 1200,
    status: 'available',
    current_consult_started_at: null,
    total_consults: 0,
    total_consult_duration: 0,
  },
];

const seedUsers = [
  {
    id: 'user_admin',
    email: 'admin@gmail.com',
    name: 'Hospital Admin',
    role: 'admin',
    notification_prefs: { waitTimeChanges: true, youAreNext: true, doctorLate: true },
  },
  {
    id: 'user_doc_1',
    email: 'himanshu@gmail.com',
    name: 'Dr. Himanshu',
    role: 'doctor',
    linked_doctor_id: 'doc_1',
    notification_prefs: { waitTimeChanges: true, youAreNext: true, doctorLate: false },
  },
  {
    id: 'user_doc_2',
    email: 'soham@gmail.com',
    name: 'Dr. Soham',
    role: 'doctor',
    linked_doctor_id: 'doc_2',
    notification_prefs: { waitTimeChanges: true, youAreNext: true, doctorLate: false },
  },
  {
    id: 'user_doc_3',
    email: 'pranav@gmail.com',
    name: 'Dr. Pranav',
    role: 'doctor',
    linked_doctor_id: 'doc_3',
    notification_prefs: { waitTimeChanges: true, youAreNext: true, doctorLate: false },
  },
  {
    id: 'user_doc_4',
    email: 'pranay@gmail.com',
    name: 'Dr. Pranay',
    role: 'doctor',
    linked_doctor_id: 'doc_4',
    notification_prefs: { waitTimeChanges: true, youAreNext: true, doctorLate: false },
  },
  {
    id: 'user_doc_5',
    email: 'harsh@gmail.com',
    name: 'Dr. Harsh',
    role: 'doctor',
    linked_doctor_id: 'doc_5',
    notification_prefs: { waitTimeChanges: true, youAreNext: true, doctorLate: false },
  },
  {
    id: 'user_doc_6',
    email: 'sahil@gmail.com',
    name: 'Dr. Sahil',
    role: 'doctor',
    linked_doctor_id: 'doc_6',
    notification_prefs: { waitTimeChanges: true, youAreNext: true, doctorLate: false },
  },
];

async function seed() {
  console.log('Clearing old fake patient & event data...');
  await supabase.from('patients').delete().neq('id', '');
  await supabase.from('events').delete().neq('id', '');

  console.log('Seeding fresh doctors & users in Supabase database...');
  const resDocs = await supabase.from('doctors').upsert(seedDoctors);
  console.log('Doctors seed result:', JSON.stringify(resDocs));

  const resUsers = await supabase.from('users').upsert(seedUsers);
  console.log('Users seed result:', JSON.stringify(resUsers));
}

seed();

