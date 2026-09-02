// Queue algorithms — pure functions for wait-time calculation, EMA, and queue ops

import type { Doctor, Patient } from './types';

// EMA weight: newAvg = alpha * last + (1-alpha) * old
const EMA_ALPHA = 0.3;

/**
 * Update a doctor's average consultation time using exponential moving average.
 * Called whenever a consultation ends.
 */
export function updateEma(
  oldAvg: number,
  lastDurationSeconds: number
): number {
  return EMA_ALPHA * lastDurationSeconds + (1 - EMA_ALPHA) * oldAvg;
}

/**
 * Estimated wait time for a patient.
 * = (patients ahead in queue) * (doctor's EMA) - (elapsed since current consult started)
 * Clamped to >= 0.
 */
export function estimateWaitTime(
  patient: Patient,
  doctor: Doctor,
  now: number
): number {
  const patientsAhead = Math.max(0, patient.queuePosition);
  let wait = patientsAhead * doctor.currentAvgConsultTime;

  if (
    doctor.status === 'in_consult' &&
    doctor.currentConsultStartedAt !== null
  ) {
    const elapsed = (now - doctor.currentConsultStartedAt) / 1000;
    wait -= elapsed;
  }

  return Math.max(0, Math.round(wait));
}

/**
 * Recalculate estimated wait times for all waiting patients of a given doctor.
 * Returns updated patients array (new references for changed patients).
 */
export function recalcWaitTimes(
  patients: Patient[],
  doctor: Doctor,
  now: number
): Patient[] {
  return patients.map((p) => {
    if (
      p.assignedDoctorId === doctor.id &&
      (p.status === 'waiting' || p.status === 'recalled')
    ) {
      return {
        ...p,
        estimatedWaitTime: estimateWaitTime(p, doctor, now),
      };
    }
    return p;
  });
}

/**
 * Recalculate for all doctors — used after global events.
 */
export function recalcAllWaitTimes(
  patients: Patient[],
  doctors: Doctor[],
  now: number
): Patient[] {
  let result = patients;
  for (const doc of doctors) {
    result = recalcWaitTimes(result, doc, now);
  }
  return result;
}

/**
 * Re-index queue positions for a doctor's waiting patients, sorted by check-in time
 * (emergencies first). Returns updated patients array.
 */
export function reindexQueue(
  patients: Patient[],
  doctorId: string,
  now: number,
  doctors: Doctor[]
): Patient[] {
  const doc = doctors.find((d) => d.id === doctorId);
  if (!doc) return patients;

  // Get waiting/recalled patients for this doctor
  const queuePatients = patients
    .filter(
      (p) =>
        p.assignedDoctorId === doctorId &&
        (p.status === 'waiting' || p.status === 'recalled')
    )
    .sort((a, b) => {
      // emergencies first
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      // then by check-in time
      return a.checkInTime - b.checkInTime;
    });

  // Assign positions
  const updatedMap = new Map<string, Patient>();
  queuePatients.forEach((p, idx) => {
    updatedMap.set(p.id, {
      ...p,
      queuePosition: idx,
    });
  });

  // Merge back
  let result = patients.map((p) => updatedMap.get(p.id) || p);

  // Recalc wait times
  result = recalcWaitTimes(result, doc, now);
  return result;
}

/**
 * Suggest the best doctor for a new patient.
 * Picks doctor with lowest (queue length * EMA), not just shortest queue.
 */
export function suggestDoctor(
  doctors: Doctor[],
  patients: Patient[]
): Doctor | null {
  const eligible = doctors.filter((d) => d.status !== 'on_break');
  if (eligible.length === 0) return null;

  let best: Doctor | null = null;
  let bestScore = Infinity;

  for (const doc of eligible) {
    const queueLen = patients.filter(
      (p) =>
        p.assignedDoctorId === doc.id &&
        (p.status === 'waiting' || p.status === 'recalled')
    ).length;
    const score = queueLen * doc.currentAvgConsultTime;
    if (score < bestScore) {
      bestScore = score;
      best = doc;
    }
  }

  return best;
}

/**
 * Insert an emergency patient at front of queue (position 0 if no one in consult,
 * position 1 if someone is currently being seen).
 */
export function insertEmergency(
  patients: Patient[],
  doctorId: string,
  patientId: string
): Patient[] {
  return patients.map((p) => {
    if (p.id === patientId) {
      return {
        ...p,
        assignedDoctorId: doctorId,
        status: 'waiting',
        isEmergency: true,
      };
    }
    return p;
  });
}

/**
 * Mark a patient as no-show: remove from queue position, append to recall list.
 */
export function markNoShow(
  patients: Patient[],
  patientId: string
): Patient[] {
  return patients.map((p) => {
    if (p.id === patientId) {
      return {
        ...p,
        status: 'no_show',
        queuePosition: -1,
      };
    }
    return p;
  });
}

/**
 * Reassign a patient to a different doctor.
 */
export function reassignPatient(
  patients: Patient[],
  patientId: string,
  newDoctorId: string
): Patient[] {
  return patients.map((p) => {
    if (p.id === patientId) {
      return {
        ...p,
        assignedDoctorId: newDoctorId,
        status: 'waiting',
      };
    }
    return p;
  });
}

/**
 * Generate a simple unique ID.
 */
export function genId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
