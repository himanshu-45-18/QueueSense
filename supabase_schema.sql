-- QueueSense Supabase Database Schema & Seed Data
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/percmiydlykcoqyfprpu/sql/new

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'patient',
  phone_number TEXT,
  photo_url TEXT,
  linked_doctor_id TEXT,
  linked_patient_id TEXT,
  notification_prefs JSONB DEFAULT '{"waitTimeChanges": true, "youAreNext": true, "doctorLate": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Doctors Table
CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  current_avg_consult_time NUMERIC DEFAULT 900,
  status TEXT DEFAULT 'available',
  current_consult_started_at BIGINT,
  total_consults INTEGER DEFAULT 0,
  total_consult_duration NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  symptoms TEXT,
  triage_urgency TEXT DEFAULT 'routine',
  check_in_time BIGINT NOT NULL,
  status TEXT DEFAULT 'waiting',
  assigned_doctor_id TEXT,
  queue_position INTEGER DEFAULT 0,
  estimated_wait_time NUMERIC DEFAULT 0,
  points INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]'::jsonb,
  redeemed_rewards JSONB DEFAULT '[]'::jsonb,
  is_emergency BOOLEAN DEFAULT FALSE,
  is_on_time BOOLEAN DEFAULT TRUE,
  completed_at BIGINT,
  consultation_report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Queue Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  doctor_id TEXT,
  patient_id TEXT,
  timestamp BIGINT NOT NULL,
  duration NUMERIC,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear old fake data
TRUNCATE TABLE public.patients CASCADE;
TRUNCATE TABLE public.events CASCADE;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public full access on users" ON public.users;
DROP POLICY IF EXISTS "Allow public full access on doctors" ON public.doctors;
DROP POLICY IF EXISTS "Allow public full access on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow public full access on events" ON public.events;

-- Enable RLS and add full public permissive access policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on doctors" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on patients" ON public.patients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access on events" ON public.events FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime subscriptions on all tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'doctors') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.doctors;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'patients') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
END $$;

-- 5. Insert Doctors with unique specializations
INSERT INTO public.doctors (id, name, department, current_avg_consult_time, status, total_consults, total_consult_duration)
VALUES
  ('doc_1', 'Dr. Himanshu', 'Cardiology', 900, 'available', 0, 0),
  ('doc_2', 'Dr. Soham', 'General Medicine', 720, 'available', 0, 0),
  ('doc_3', 'Dr. Pranav', 'Pediatrics', 600, 'available', 0, 0),
  ('doc_4', 'Dr. Pranay', 'Orthopedics', 1080, 'available', 0, 0),
  ('doc_5', 'Dr. Harsh', 'Dermatology', 600, 'available', 0, 0),
  ('doc_6', 'Dr. Sahil', 'Neurology', 1200, 'available', 0, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  department = EXCLUDED.department;

-- 6. Insert Users (Admin + 6 Doctors)
INSERT INTO public.users (id, email, name, role, linked_doctor_id)
VALUES
  ('user_admin', 'admin@gmail.com', 'Hospital Admin', 'admin', NULL),
  ('user_doc_1', 'himanshu@gmail.com', 'Dr. Himanshu', 'doctor', 'doc_1'),
  ('user_doc_2', 'soham@gmail.com', 'Dr. Soham', 'doctor', 'doc_2'),
  ('user_doc_3', 'pranav@gmail.com', 'Dr. Pranav', 'doctor', 'doc_3'),
  ('user_doc_4', 'pranay@gmail.com', 'Dr. Pranay', 'doctor', 'doc_4'),
  ('user_doc_5', 'harsh@gmail.com', 'Dr. Harsh', 'doctor', 'doc_5'),
  ('user_doc_6', 'sahil@gmail.com', 'Dr. Sahil', 'doctor', 'doc_6')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  linked_doctor_id = EXCLUDED.linked_doctor_id;

