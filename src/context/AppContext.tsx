import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ConsultationReport, Doctor, Patient, QueueEvent, QueueEventType, TriageUrgency } from '../lib/types';
import { useAuth } from './AuthContext';
import { seedDoctors, seedPatients, seedEvents } from '../lib/mockData';
import {
  updateEma,
  recalcAllWaitTimes,
  reindexQueue,
  suggestDoctor,
  insertEmergency,
  markNoShow,
  reassignPatient,
  genId,
} from '../lib/queueEngine';
import { analyzeSymptoms } from '../lib/symptomTriage';

interface AppContextValue {
  doctors: Doctor[];
  patients: Patient[];
  events: QueueEvent[];
  // Actions
  checkInPatient: (
    name: string,
    department: string,
    isOnTime: boolean,
    symptoms?: string,
    chosenDoctorId?: string,
    isEmergency?: boolean,
    userId?: string
  ) => Patient;
  startConsultation: (doctorId: string, patientId: string) => void;
  endConsultation: (
    doctorId: string,
    patientId: string,
    report?: Omit<ConsultationReport, 'id' | 'patientId' | 'patientName' | 'doctorId' | 'doctorName' | 'department' | 'consultationDate' | 'durationMinutes'>
  ) => void;
  markPatientNoShow: (patientId: string) => void;
  insertEmergencyPatient: (
    name: string,
    department: string,
    doctorId: string,
    symptoms?: string
  ) => void;
  reassignPatientToDoctor: (patientId: string, newDoctorId: string) => void;
  triggerEmergencyOverride: (patientId: string) => void;
  saveConsultationReport: (
    patientId: string,
    report: Omit<ConsultationReport, 'id' | 'patientId' | 'patientName' | 'doctorId' | 'doctorName' | 'department' | 'consultationDate' | 'durationMinutes'>
  ) => void;
  redeemReward: (patientId: string, rewardCost: number, rewardName: string) => boolean;
  getSuggestedDoctor: (symptoms?: string) => Doctor | null;
  // Notifications
  notifications: AppNotification[];
  pushNotification: (n: Omit<AppNotification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

export interface AppNotification {
  id: string;
  type: 'wait_changed' | 'you_are_next' | 'doctor_late' | 'emergency' | 'info';
  message: string;
  timestamp: number;
}

// Database mapper helpers
function mapDbDoctorToDoctor(d: any): Doctor {
  return {
    id: d.id,
    name: d.name,
    department: d.department,
    currentAvgConsultTime: Number(d.current_avg_consult_time || 900),
    status: d.status || 'available',
    currentConsultStartedAt: d.current_consult_started_at ? Number(d.current_consult_started_at) : null,
    totalConsults: Number(d.total_consults || 0),
    totalConsultDuration: Number(d.total_consult_duration || 0),
  };
}

function mapDoctorToDbDoctor(d: Doctor) {
  return {
    id: d.id,
    name: d.name,
    department: d.department,
    current_avg_consult_time: d.currentAvgConsultTime,
    status: d.status,
    current_consult_started_at: d.currentConsultStartedAt,
    total_consults: d.totalConsults,
    total_consult_duration: d.totalConsultDuration,
  };
}

function mapDbPatientToPatient(p: any): Patient {
  return {
    id: p.id,
    userId: p.user_id || null,
    name: p.name,
    department: p.department,
    symptoms: p.symptoms || '',
    triageUrgency: p.triage_urgency || 'routine',
    checkInTime: Number(p.check_in_time || Date.now()),
    status: p.status || 'waiting',
    assignedDoctorId: p.assigned_doctor_id || null,
    queuePosition: Number(p.queue_position || 0),
    estimatedWaitTime: Number(p.estimated_wait_time || 0),
    points: Number(p.points || 0),
    badges: p.badges || [],
    redeemedRewards: p.redeemed_rewards || [],
    isEmergency: Boolean(p.is_emergency),
    isOnTime: Boolean(p.is_on_time),
    completedAt: p.completed_at ? Number(p.completed_at) : null,
    consultationReport: p.consultation_report || undefined,
  };
}

function mapPatientToDbPatient(p: Patient) {
  return {
    id: p.id,
    user_id: p.userId || null,
    name: p.name,
    department: p.department,
    symptoms: p.symptoms || '',
    triage_urgency: p.triageUrgency || 'routine',
    check_in_time: p.checkInTime,
    status: p.status,
    assigned_doctor_id: p.assignedDoctorId || null,
    queue_position: p.queuePosition,
    estimated_wait_time: p.estimatedWaitTime,
    points: p.points,
    badges: p.badges || [],
    redeemed_rewards: p.redeemedRewards || [],
    is_emergency: p.isEmergency,
    is_on_time: p.isOnTime,
    completed_at: p.completedAt,
    consultation_report: p.consultationReport || null,
  };
}

function mapDbEventToEvent(e: any): QueueEvent {
  return {
    id: e.id,
    type: e.type,
    doctorId: e.doctor_id || null,
    patientId: e.patient_id || null,
    timestamp: Number(e.timestamp || Date.now()),
    duration: e.duration ? Number(e.duration) : undefined,
    details: e.details || undefined,
  };
}

function mapEventToDbEvent(e: QueueEvent) {
  return {
    id: e.id,
    type: e.type,
    doctor_id: e.doctorId || null,
    patient_id: e.patientId || null,
    timestamp: e.timestamp,
    duration: e.duration || null,
    details: e.details || null,
  };
}

async function safeUpsertDoctors(docs: Doctor[]) {
  if (!isSupabaseConfigured || docs.length === 0) return;
  try {
    await supabase.from('doctors').upsert(docs.map(mapDoctorToDbDoctor));
  } catch (err) {
    console.warn('Supabase upsert doctors error:', err);
  }
}

async function safeUpsertPatients(pats: Patient[]) {
  if (!isSupabaseConfigured || pats.length === 0) return;
  try {
    await supabase.from('patients').upsert(pats.map(mapPatientToDbPatient));
  } catch (err) {
    console.warn('Supabase upsert patients error:', err);
  }
}

async function safeUpsertEvent(e: QueueEvent) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('events').upsert(mapEventToDbEvent(e));
  } catch (err) {
    console.warn('Supabase upsert event error:', err);
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>(seedDoctors);
  const [patients, setPatients] = useState<Patient[]>(seedPatients);
  const [events, setEvents] = useState<QueueEvent[]>(seedEvents);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const pushNotification = useCallback((n: Omit<AppNotification, 'id'>) => {
    const id = genId('notif');
    setNotifications((prev) => [...prev, { ...n, id }].slice(-5));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Supabase Data Initialization & Realtime Subscription
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isSubscribed = true;

    const fetchAllData = async () => {
      try {
        const [docsRes, patsRes, evtsRes] = await Promise.all([
          supabase.from('doctors').select('*'),
          supabase.from('patients').select('*'),
          supabase.from('events').select('*'),
        ]);

        if (!isSubscribed) return;

        if (docsRes.data && docsRes.data.length > 0) {
          setDoctors(docsRes.data.map(mapDbDoctorToDoctor));
        } else {
          await safeUpsertDoctors(seedDoctors);
        }

        if (patsRes.data && patsRes.data.length > 0) {
          setPatients(patsRes.data.map(mapDbPatientToPatient));
        } else {
          await safeUpsertPatients(seedPatients);
        }

        if (evtsRes.data && evtsRes.data.length > 0) {
          setEvents(evtsRes.data.map(mapDbEventToEvent));
        }
      } catch (err) {
        console.warn('Supabase initial fetch warning:', err);
      }
    };

    fetchAllData();

    // Supabase Realtime Channel
    const channel = supabase
      .channel('queuesense-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'doctors' },
        async () => {
          const res = await supabase.from('doctors').select('*');
          if (res.data && isSubscribed) setDoctors(res.data.map(mapDbDoctorToDoctor));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients' },
        async () => {
          const res = await supabase.from('patients').select('*');
          if (res.data && isSubscribed) setPatients(res.data.map(mapDbPatientToPatient));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        async () => {
          const res = await supabase.from('events').select('*');
          if (res.data && isSubscribed) setEvents(res.data.map(mapDbEventToEvent));
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const logEvent = useCallback(
    (
      type: QueueEventType,
      doctorId: string | null,
      patientId: string | null,
      duration?: number,
      details?: string
    ) => {
      const evt: QueueEvent = {
        id: genId('evt'),
        type,
        doctorId,
        patientId,
        timestamp: Date.now(),
        duration,
        details,
      };

      safeUpsertEvent(evt);
      setEvents((prev) => [...prev, evt]);
    },
    []
  );

  const recalcAll = useCallback(
    (docs: Doctor[], pats: Patient[]): Patient[] => {
      return recalcAllWaitTimes(pats, docs, Date.now());
    },
    []
  );

  // Check in a new patient with symptom triage & doctor allotment
  const checkInPatient = useCallback(
    (
      name: string,
      department: string,
      isOnTime: boolean,
      symptoms?: string,
      chosenDoctorId?: string,
      isEmergencyOverride?: boolean,
      userId?: string
    ): Patient => {
      const triage = symptoms
        ? analyzeSymptoms(symptoms, doctors, patients)
        : null;

      const dept = department || triage?.department || 'General Medicine';
      const doctorId =
        chosenDoctorId ||
        triage?.recommendedDoctor?.id ||
        suggestDoctor(doctors, patients)?.id ||
        doctors[0]?.id;

      if (!doctorId) {
        throw new Error('No specialist is currently available for check-in.');
      }

      const isEmergency = Boolean(isEmergencyOverride || triage?.isEmergency);
      const urgency: TriageUrgency = isEmergency
        ? 'emergency'
        : triage?.urgency || 'routine';

      const newPatient: Patient = {
        id: genId('pat'),
        userId: userId || user?.id || null,
        name,
        department: dept,
        symptoms: symptoms || '',
        triageUrgency: urgency,
        checkInTime: Date.now(),
        status: 'waiting',
        assignedDoctorId: doctorId,
        queuePosition: isEmergency ? 1 : 0,
        estimatedWaitTime: 0,
        points: isOnTime ? 20 : 0,
        badges: isOnTime ? ['Punctual'] : [],
        isEmergency,
        isOnTime,
        completedAt: null,
        redeemedRewards: [],
      };

      const updatedPatients = isEmergency
        ? [...insertEmergency(patients, doctorId, newPatient.id), newPatient]
        : [...patients, newPatient];

      const reindexed = reindexQueue(updatedPatients, doctorId, Date.now(), doctors);
      const finalPatients = recalcAll(doctors, reindexed);

      setPatients(finalPatients);
      safeUpsertPatients(finalPatients);

      logEvent(
        isEmergency ? 'emergency' : 'check_in',
        doctorId,
        newPatient.id,
        undefined,
        `Patient ${name} checked into ${dept}. Symptoms: ${symptoms || 'None specified'}`
      );

      if (isEmergency) {
        pushNotification({
          type: 'emergency',
          message: `URGENT: Emergency patient ${name} prioritized for consultation!`,
          timestamp: Date.now(),
        });
      }

      return newPatient;
    },
    [doctors, patients, user, logEvent, pushNotification, recalcAll]
  );

  // Start consultation
  const startConsultation = useCallback(
    (doctorId: string, patientId: string) => {
      const now = Date.now();

      const updatedDoctors = doctors.map((d) =>
        d.id === doctorId
          ? { ...d, status: 'in_consult' as const, currentConsultStartedAt: now }
          : d
      );

      const updatedPatients = patients.map((p) =>
        p.id === patientId
          ? { ...p, status: 'in_consult' as const, queuePosition: 0, estimatedWaitTime: 0 }
          : p
      );

      setDoctors(updatedDoctors);
      setPatients(updatedPatients);

      safeUpsertDoctors(updatedDoctors);
      safeUpsertPatients(updatedPatients);

      logEvent('consult_start', doctorId, patientId);

      setTimeout(() => {
        const next = patients.find(
          (p) =>
            p.assignedDoctorId === doctorId &&
            p.status === 'waiting' &&
            p.queuePosition === 1
        );
        if (next) {
          pushNotification({
            type: 'you_are_next',
            message: `${next.name}, you're next in line for consultation!`,
            timestamp: Date.now(),
          });
        }
      }, 100);
    },
    [doctors, patients, logEvent, pushNotification]
  );

  // End consultation — complete patient and re-index queue instantly!
  const endConsultation = useCallback(
    (
      doctorId: string,
      patientId: string,
      reportData?: Omit<ConsultationReport, 'id' | 'patientId' | 'patientName' | 'doctorId' | 'doctorName' | 'department' | 'consultationDate' | 'durationMinutes'>
    ) => {
      const now = Date.now();
      const currentDoc = doctors.find((d) => d.id === doctorId);
      const duration =
        currentDoc && currentDoc.currentConsultStartedAt !== null
          ? (now - currentDoc.currentConsultStartedAt) / 1000
          : currentDoc?.currentAvgConsultTime || 900;

      const newAvg = currentDoc
        ? updateEma(currentDoc.currentAvgConsultTime, duration)
        : 900;

      const updatedDoctors = doctors.map((d) => {
        if (d.id !== doctorId) return d;
        return {
          ...d,
          status: 'available' as const,
          currentConsultStartedAt: null,
          currentAvgConsultTime: Math.round(newAvg),
          totalConsults: d.totalConsults + 1,
          totalConsultDuration: d.totalConsultDuration + duration,
        };
      });

      const updatedPatients = patients.map((p) => {
        if (p.id !== patientId) return p;
        const earnedPoints = p.isOnTime ? 30 : 15;
        let consultationReport = p.consultationReport;
        if (reportData && currentDoc) {
          const durationMinutes = Math.max(1, Math.round(duration / 60));
          consultationReport = {
            ...reportData,
            id: genId('report'),
            patientId,
            patientName: p.name,
            doctorId: currentDoc.id,
            doctorName: currentDoc.name,
            department: p.department,
            consultationDate: now,
            durationMinutes,
          };
        }
        return {
          ...p,
          status: 'completed' as const,
          completedAt: now,
          queuePosition: -1,
          estimatedWaitTime: 0,
          points: (p.points || 0) + earnedPoints,
          badges:
            p.isOnTime && !p.badges.includes('Punctual')
              ? [...p.badges, 'Punctual']
              : p.badges,
          consultationReport,
        };
      });

      const reindexed = reindexQueue(updatedPatients, doctorId, now, updatedDoctors);
      const finalPatients = recalcAll(updatedDoctors, reindexed);

      // Update local state immediately so UI updates instantaneously!
      setDoctors(updatedDoctors);
      setPatients(finalPatients);

      // Sync with Supabase asynchronously
      safeUpsertDoctors(updatedDoctors);
      safeUpsertPatients(finalPatients);

      logEvent('consult_end', doctorId, patientId, duration);
    },
    [doctors, patients, logEvent, recalcAll]
  );

  // Mark no-show
  const markPatientNoShow = useCallback(
    (patientId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient || !patient.assignedDoctorId) return;
      const doctorId = patient.assignedDoctorId;

      const updated = markNoShow(patients, patientId);
      const reindexed = reindexQueue(updated, doctorId, Date.now(), doctors);
      const finalPatients = recalcAll(doctors, reindexed);

      setPatients(finalPatients);
      safeUpsertPatients(finalPatients);

      logEvent('no_show', doctorId, patientId);
      pushNotification({
        type: 'info',
        message: `${patient.name} marked as no-show.`,
        timestamp: Date.now(),
      });
    },
    [patients, doctors, logEvent, pushNotification, recalcAll]
  );

  // Insert emergency patient
  const insertEmergencyPatient = useCallback(
    (name: string, department: string, doctorId: string, symptoms?: string) => {
      const newPatient: Patient = {
        id: genId('pat'),
        userId: user?.id || null,
        name,
        department,
        symptoms: symptoms || 'Emergency triage admission',
        triageUrgency: 'emergency',
        checkInTime: Date.now(),
        status: 'waiting',
        assignedDoctorId: doctorId,
        queuePosition: 1,
        estimatedWaitTime: 0,
        points: 0,
        badges: [],
        isEmergency: true,
        isOnTime: true,
        completedAt: null,
        redeemedRewards: [],
      };

      const updated = insertEmergency(patients, doctorId, newPatient.id);
      const withNew = [...updated, newPatient];
      const reindexed = reindexQueue(withNew, doctorId, Date.now(), doctors);
      const finalPatients = recalcAll(doctors, reindexed);

      setPatients(finalPatients);
      safeUpsertPatients(finalPatients);

      logEvent('emergency', doctorId, newPatient.id, undefined, `Emergency admission for ${name}`);
      pushNotification({
        type: 'emergency',
        message: `Emergency patient ${name} prioritized in queue.`,
        timestamp: Date.now(),
      });
    },
    [doctors, patients, user, logEvent, pushNotification, recalcAll]
  );

  // Reassign patient
  const reassignPatientToDoctor = useCallback(
    (patientId: string, newDoctorId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient || !patient.assignedDoctorId) return;
      const oldDoctorId = patient.assignedDoctorId;

      const updated = reassignPatient(patients, patientId, newDoctorId);
      const reindexedOld = reindexQueue(updated, oldDoctorId, Date.now(), doctors);
      const reindexedNew = reindexQueue(reindexedOld, newDoctorId, Date.now(), doctors);
      const finalPatients = recalcAll(doctors, reindexedNew);

      setPatients(finalPatients);
      safeUpsertPatients(finalPatients);

      logEvent('reassign', newDoctorId, patientId);
      pushNotification({
        type: 'wait_changed',
        message: `${patient.name} reassigned to a new specialist. Wait time updated.`,
        timestamp: Date.now(),
      });
    },
    [patients, doctors, logEvent, pushNotification, recalcAll]
  );

  // Trigger emergency override
  const triggerEmergencyOverride = useCallback(
    (patientId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient || !patient.assignedDoctorId) return;
      const doctorId = patient.assignedDoctorId;

      const updated = patients.map((p) =>
        p.id === patientId
          ? { ...p, isEmergency: !p.isEmergency, triageUrgency: !p.isEmergency ? ('emergency' as const) : ('routine' as const) }
          : p
      );
      const reindexed = reindexQueue(updated, doctorId, Date.now(), doctors);
      const finalPatients = recalcAll(doctors, reindexed);

      setPatients(finalPatients);
      safeUpsertPatients(finalPatients);

      const emergencyEnabled = !patient.isEmergency;
      logEvent(emergencyEnabled ? 'emergency' : 'emergency_revert', doctorId, patientId);
      pushNotification({
        type: emergencyEnabled ? 'emergency' : 'info',
        message: emergencyEnabled
          ? `Emergency priority applied for ${patient.name}.`
          : `Emergency priority removed for ${patient.name}.`,
        timestamp: Date.now(),
      });
    },
    [patients, doctors, logEvent, pushNotification, recalcAll]
  );

  const saveConsultationReport = useCallback(
    (
      patientId: string,
      report: Omit<ConsultationReport, 'id' | 'patientId' | 'patientName' | 'doctorId' | 'doctorName' | 'department' | 'consultationDate' | 'durationMinutes'>
    ) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient || !patient.assignedDoctorId) return;
      const doctor = doctors.find((d) => d.id === patient.assignedDoctorId);
      if (!doctor) return;
      const durationMinutes = doctor.currentConsultStartedAt
        ? Math.max(1, Math.round((Date.now() - doctor.currentConsultStartedAt) / 60000))
        : Math.max(1, Math.round(doctor.currentAvgConsultTime / 60));

      const consultationReport: ConsultationReport = {
        ...report,
        id: genId('report'),
        patientId,
        patientName: patient.name,
        doctorId: doctor.id,
        doctorName: doctor.name,
        department: patient.department,
        consultationDate: patient.completedAt || Date.now(),
        durationMinutes,
      };

      const updatedPatients = patients.map((p) =>
        p.id === patientId ? { ...p, consultationReport } : p
      );

      setPatients(updatedPatients);
      safeUpsertPatients(updatedPatients);
    },
    [patients, doctors]
  );

  const redeemReward = useCallback(
    (patientId: string, rewardCost: number, rewardName: string): boolean => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient || (patient.points || 0) < rewardCost) {
        return false;
      }

      const updatedPoints = (patient.points || 0) - rewardCost;
      const redemption = {
        rewardName,
        cost: rewardCost,
        timestamp: Date.now(),
      };

      const updatedPatients = patients.map((p) =>
        p.id === patientId
          ? {
              ...p,
              points: updatedPoints,
              redeemedRewards: [...(p.redeemedRewards || []), redemption],
            }
          : p
      );

      setPatients(updatedPatients);
      safeUpsertPatients(updatedPatients);

      logEvent('reward_redeem', patient.assignedDoctorId, patientId, undefined, `Redeemed ${rewardName} for ${rewardCost} pts`);
      pushNotification({
        type: 'info',
        message: `Successfully redeemed "${rewardName}" for ${rewardCost} points!`,
        timestamp: Date.now(),
      });
      return true;
    },
    [patients, logEvent, pushNotification]
  );

  const getSuggestedDoctor = useCallback(
    (symptoms?: string) => {
      if (symptoms) {
        const triage = analyzeSymptoms(symptoms, doctors, patients);
        return triage.recommendedDoctor;
      }
      return suggestDoctor(doctors, patients);
    },
    [doctors, patients]
  );

  const visiblePatients = user?.role === 'patient'
    ? patients.filter((patient) => !patient.userId || patient.userId === user.id || user.linkedPatientId === patient.id)
    : patients;

  return (
    <AppContext.Provider
      value={{
        doctors,
        patients: visiblePatients,
        events,
        checkInPatient,
        startConsultation,
        endConsultation,
        markPatientNoShow,
        insertEmergencyPatient,
        reassignPatientToDoctor,
        triggerEmergencyOverride,
        saveConsultationReport,
        redeemReward,
        getSuggestedDoctor,
        notifications,
        pushNotification,
        dismissNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AuthProvider');
  return ctx;
}
