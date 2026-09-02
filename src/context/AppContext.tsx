import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
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
  endConsultation: (doctorId: string, patientId: string) => void;
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

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>(isFirebaseConfigured ? [] : seedDoctors);
  const [patients, setPatients] = useState<Patient[]>(isFirebaseConfigured ? [] : seedPatients);
  const [events, setEvents] = useState<QueueEvent[]>(isFirebaseConfigured ? [] : seedEvents);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const pushNotification = useCallback((n: Omit<AppNotification, 'id'>) => {
    const id = genId('notif');
    setNotifications((prev) => [...prev, { ...n, id }].slice(-5));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Firebase Firestore Real-Time Subscriptions and Auto-Seeding
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    // Listen to live real-time updates from Firestore
    const unsubDoctors = onSnapshot(
      collection(db, 'doctors'),
      (snapshot) => {
        const docsData: Doctor[] = snapshot.docs.map((d) => d.data() as Doctor);
        setDoctors(docsData);
      },
      (err) => console.warn('Firestore doctors listener:', err)
    );

    const patientCollection = user?.role === 'patient' && user.id
      ? query(collection(db, 'patients'), where('userId', '==', user.id))
      : collection(db, 'patients');

    const unsubPatients = onSnapshot(
      patientCollection,
      (snapshot) => {
        const patsData: Patient[] = snapshot.docs.map((p) => p.data() as Patient);
        setPatients(patsData);
      },
      (err) => console.warn('Firestore patients listener:', err)
    );

    const unsubEvents = onSnapshot(
      collection(db, 'events'),
      (snapshot) => {
        const evtsData: QueueEvent[] = snapshot.docs.map((e) => e.data() as QueueEvent);
        setEvents(evtsData);
      },
      (err) => console.warn('Firestore events listener:', err)
    );

    return () => {
      unsubDoctors();
      unsubPatients();
      unsubEvents();
    };
  }, [user]);

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

      if (isFirebaseConfigured) {
        setDoc(doc(db, 'events', evt.id), evt).catch((err) =>
          console.warn('Error saving event to Firestore:', err)
        );
      }

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
      // Analyze symptoms if provided
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
        userId: userId || null,
        name,
        department: dept,
        symptoms: symptoms || '',
        triageUrgency: urgency,
        checkInTime: Date.now(),
        status: 'waiting',
        assignedDoctorId: doctorId,
        queuePosition: isEmergency ? 1 : 0,
        estimatedWaitTime: 0,
        points: isOnTime ? 20 : 0, // Real gamification starting from 0, +20 for on-time arrival!
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

      if (isFirebaseConfigured) {
        const batch = writeBatch(db);
        finalPatients.forEach((p) => {
          batch.set(doc(db, 'patients', p.id), p);
        });
        batch.commit().catch((err) => console.warn('Firestore check-in error:', err));
      }

      setPatients(finalPatients);
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
    [doctors, patients, logEvent, pushNotification, recalcAll]
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

      if (isFirebaseConfigured) {
        const docRef = doc(db, 'doctors', doctorId);
        const patRef = doc(db, 'patients', patientId);
        updateDoc(docRef, { status: 'in_consult', currentConsultStartedAt: now }).catch((e) =>
          console.warn(e)
        );
        updateDoc(patRef, {
          status: 'in_consult',
          queuePosition: 0,
          estimatedWaitTime: 0,
        }).catch((e) => console.warn(e));
      }

      setDoctors(updatedDoctors);
      setPatients(updatedPatients);
      logEvent('consult_start', doctorId, patientId);

      // Notify next patient in line
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

  // End consultation — awards completion points and updates EMA
  const endConsultation = useCallback(
    (doctorId: string, patientId: string) => {
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
        return {
          ...p,
          status: 'completed' as const,
          completedAt: now,
          points: (p.points || 0) + earnedPoints,
          badges:
            p.isOnTime && !p.badges.includes('Punctual')
              ? [...p.badges, 'Punctual']
              : p.badges,
        };
      });

      const reindexed = reindexQueue(updatedPatients, doctorId, now, updatedDoctors);
      const finalPatients = recalcAll(updatedDoctors, reindexed);

      if (isFirebaseConfigured) {
        const batch = writeBatch(db);
        updatedDoctors.forEach((d) => {
          batch.set(doc(db, 'doctors', d.id), d);
        });
        finalPatients.forEach((p) => {
          batch.set(doc(db, 'patients', p.id), p);
        });
        batch.commit().catch((err) => console.warn('Firestore end consult error:', err));
      }

      setDoctors(updatedDoctors);
      setPatients(finalPatients);
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

      if (isFirebaseConfigured) {
        const batch = writeBatch(db);
        finalPatients.forEach((p) => {
          batch.set(doc(db, 'patients', p.id), p);
        });
        batch.commit().catch((err) => console.warn('Firestore mark no-show error:', err));
      }

      setPatients(finalPatients);
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

      if (isFirebaseConfigured) {
        const batch = writeBatch(db);
        finalPatients.forEach((p) => {
          batch.set(doc(db, 'patients', p.id), p);
        });
        batch.commit().catch((err) =>
          console.warn('Firestore insert emergency error:', err)
        );
      }

      setPatients(finalPatients);
      logEvent('emergency', doctorId, newPatient.id, undefined, `Emergency admission for ${name}`);
      pushNotification({
        type: 'emergency',
        message: `Emergency patient ${name} prioritized in queue.`,
        timestamp: Date.now(),
      });
    },
    [doctors, patients, logEvent, pushNotification, recalcAll]
  );

  // Reassign patient to different doctor
  const reassignPatientToDoctor = useCallback(
    (patientId: string, newDoctorId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient || !patient.assignedDoctorId) return;
      const oldDoctorId = patient.assignedDoctorId;

      const updated = reassignPatient(patients, patientId, newDoctorId);
      const reindexedOld = reindexQueue(updated, oldDoctorId, Date.now(), doctors);
      const reindexedNew = reindexQueue(reindexedOld, newDoctorId, Date.now(), doctors);
      const finalPatients = recalcAll(doctors, reindexedNew);

      if (isFirebaseConfigured) {
        const batch = writeBatch(db);
        finalPatients.forEach((p) => {
          batch.set(doc(db, 'patients', p.id), p);
        });
        batch.commit().catch((err) => console.warn('Firestore reassign error:', err));
      }

      setPatients(finalPatients);
      logEvent('reassign', newDoctorId, patientId);
      pushNotification({
        type: 'wait_changed',
        message: `${patient.name} reassigned to a new specialist. Wait time updated.`,
        timestamp: Date.now(),
      });
    },
    [patients, doctors, logEvent, pushNotification, recalcAll]
  );

  // Emergency override
  const triggerEmergencyOverride = useCallback(
    (patientId: string) => {
      const patient = patients.find((p) => p.id === patientId);
      if (!patient || !patient.assignedDoctorId) return;
      const doctorId = patient.assignedDoctorId;

      const updated = patients.map((p) =>
        p.id === patientId
          ? { ...p, isEmergency: !p.isEmergency, triageUrgency: !p.isEmergency ? 'emergency' as const : 'routine' as const }
          : p
      );
      const reindexed = reindexQueue(updated, doctorId, Date.now(), doctors);
      const finalPatients = recalcAll(doctors, reindexed);

      if (isFirebaseConfigured) {
        const batch = writeBatch(db);
        finalPatients.forEach((p) => {
          batch.set(doc(db, 'patients', p.id), p);
        });
        batch.commit().catch((err) =>
          console.warn('Firestore emergency override error:', err)
        );
      }

      setPatients(finalPatients);
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
      if (isFirebaseConfigured) {
        updateDoc(doc(db, 'patients', patientId), { consultationReport }).catch((err) =>
          console.warn('Firestore report save error:', err)
        );
      }
      setPatients((currentPatients) =>
        currentPatients.map((p) => p.id === patientId ? { ...p, consultationReport } : p)
      );
    },
    [patients, doctors]
  );

  // Gamification: Redeem Points for Real Rewards
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

      if (isFirebaseConfigured) {
        updateDoc(doc(db, 'patients', patientId), {
          points: updatedPoints,
          redeemedRewards: [...(patient.redeemedRewards || []), redemption],
        }).catch((err) => console.warn('Firestore reward redemption error:', err));
      }

      setPatients(updatedPatients);
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
    ? patients.filter((patient) => patient.userId === user.id)
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
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
