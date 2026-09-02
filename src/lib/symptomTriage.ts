import type { Doctor, Patient, TriageUrgency } from './types';

export interface TriageResult {
  department: string;
  urgency: TriageUrgency;
  isEmergency: boolean;
  recommendedDoctor: Doctor | null;
  alternativeDoctors: Doctor[];
  matchedKeywords: string[];
  reasoning: string;
}

interface DepartmentRule {
  department: string;
  keywords: string[];
  emergencyKeywords: string[];
  urgentKeywords: string[];
}

const DEPARTMENT_RULES: DepartmentRule[] = [
  {
    department: 'Cardiology',
    keywords: [
      'heart', 'chest', 'palpitation', 'pulse', 'bp', 'blood pressure',
      'angina', 'cardiac', 'cholesterol', 'shortness of breath', 'breathless',
      'left arm pain', 'tightness'
    ],
    emergencyKeywords: ['severe chest pain', 'crushing chest', 'heart attack', 'cardiac arrest', 'severe shortness of breath'],
    urgentKeywords: ['palpitations', 'chest discomfort', 'irregular pulse', 'high bp', 'dizziness'],
  },
  {
    department: 'Pediatrics',
    keywords: [
      'child', 'baby', 'infant', 'kid', 'toddler', 'newborn', 'pediatric',
      'vaccination', 'growth', 'teething', 'crying', 'colic', 'measles'
    ],
    emergencyKeywords: ['infant unresponsive', 'child breathing difficulty', 'blue lips', 'seizure in child'],
    urgentKeywords: ['high fever in infant', 'child persistent vomiting', 'child lethargic', 'febrile'],
  },
  {
    department: 'Orthopedics',
    keywords: [
      'bone', 'joint', 'fracture', 'knee', 'spine', 'back pain', 'shoulder',
      'wrist', 'ankle', 'sprain', 'dislocation', 'ligament', 'arthritis',
      'tendon', 'sports injury', 'swollen joint', 'limping'
    ],
    emergencyKeywords: ['open fracture', 'bone visible', 'severe trauma', 'cannot move limb'],
    urgentKeywords: ['suspected fracture', 'severe sprain', 'dislocated shoulder', 'acute back spasm'],
  },
  {
    department: 'Dermatology',
    keywords: [
      'skin', 'rash', 'itch', 'itching', 'allergy', 'eczema', 'acne',
      'hives', 'burn', 'lesion', 'mole', 'psoriasis', 'blister', 'redness',
      'dermatitis', 'fungal'
    ],
    emergencyKeywords: ['severe chemical burn', 'anaphylaxis rash', 'rapidly spreading blistering'],
    urgentKeywords: ['spreading rash', 'severe itching with swelling', 'infected skin'],
  },
  {
    department: 'Neurology',
    keywords: [
      'headache', 'migraine', 'nerve', 'numbness', 'tingling', 'seizure',
      'dizzy', 'vertigo', 'tremor', 'fainting', 'blackout', 'paralysis',
      'memory loss', 'slurred speech'
    ],
    emergencyKeywords: ['slurred speech', 'face drooping', 'sudden weakness', 'stroke', 'unconscious', 'continuous seizure'],
    urgentKeywords: ['severe sudden migraine', 'unexplained numbness', 'fainting spell', 'vertigo episode'],
  },
  {
    department: 'General Medicine',
    keywords: [
      'fever', 'cold', 'cough', 'flu', 'throat', 'nausea', 'vomit',
      'stomach', 'belly', 'abdomen', 'fatigue', 'weakness', 'infection',
      'tired', 'general', 'checkup', 'diabetes', 'body ache', 'malaise'
    ],
    emergencyKeywords: ['uncontrolled bleeding', 'unresponsive', 'poisoning', 'severe respiratory failure'],
    urgentKeywords: ['high fever', 'dehydration', 'persistent severe vomiting', 'acute abdominal pain'],
  },
];

/**
 * Smart Symptom Triage Analyzer
 * Analyzes natural language patient complaints and maps to appropriate medical departments,
 * computes urgency levels, and auto-recommends the doctor with shortest wait times.
 */
export function analyzeSymptoms(
  symptomText: string,
  doctors: Doctor[],
  patients: Patient[]
): TriageResult {
  const cleanText = symptomText.toLowerCase().trim();

  if (!cleanText) {
    const defaultDoc = doctors.find((d) => d.status !== 'on_break') || doctors[0] || null;
    return {
      department: defaultDoc?.department || 'General Medicine',
      urgency: 'routine',
      isEmergency: false,
      recommendedDoctor: defaultDoc,
      alternativeDoctors: doctors.filter((d) => d.id !== defaultDoc?.id),
      matchedKeywords: [],
      reasoning: 'General consultation triage.',
    };
  }

  let bestDept = 'General Medicine';
  let highestScore = 0;
  const matchedKeywords: string[] = [];
  let urgency: TriageUrgency = 'routine';
  let isEmergency = false;

  for (const rule of DEPARTMENT_RULES) {
    let score = 0;

    // Check emergency triggers first
    for (const emg of rule.emergencyKeywords) {
      if (cleanText.includes(emg)) {
        isEmergency = true;
        urgency = 'emergency';
        score += 20;
        matchedKeywords.push(emg);
      }
    }

    // Check urgent triggers
    for (const urg of rule.urgentKeywords) {
      if (cleanText.includes(urg)) {
        if (!isEmergency) urgency = 'urgent';
        score += 10;
        matchedKeywords.push(urg);
      }
    }

    // Check general department keywords
    for (const kw of rule.keywords) {
      if (cleanText.includes(kw)) {
        score += 5;
        matchedKeywords.push(kw);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestDept = rule.department;
    }
  }

  // Global emergency keywords
  const globalEmergencyWords = ['unconscious', 'heart attack', 'heavy bleeding', 'stroke', 'not breathing', 'collapsed'];
  for (const gemg of globalEmergencyWords) {
    if (cleanText.includes(gemg)) {
      isEmergency = true;
      urgency = 'emergency';
      matchedKeywords.push(gemg);
    }
  }

  // Find doctors matching the recommended department
  const deptDoctors = doctors.filter(
    (d) => d.department.toLowerCase() === bestDept.toLowerCase() && d.status !== 'on_break'
  );

  const fallbackDoctors = doctors.filter((d) => d.status !== 'on_break');
  const candidateDoctors = deptDoctors.length > 0 ? deptDoctors : fallbackDoctors;

  // Rank candidate doctors by lowest estimated workload (queue length * EMA consult time)
  const ranked = [...candidateDoctors].sort((a, b) => {
    const queueA = patients.filter(
      (p) => p.assignedDoctorId === a.id && (p.status === 'waiting' || p.status === 'recalled')
    ).length;
    const queueB = patients.filter(
      (p) => p.assignedDoctorId === b.id && (p.status === 'waiting' || p.status === 'recalled')
    ).length;
    const scoreA = queueA * a.currentAvgConsultTime;
    const scoreB = queueB * b.currentAvgConsultTime;
    return scoreA - scoreB;
  });

  const recommendedDoctor = ranked[0] || doctors[0] || null;
  const alternativeDoctors = doctors.filter((d) => d.id !== recommendedDoctor?.id);

  let reasoning = `Symptoms match ${bestDept} specialist care.`;
  if (isEmergency) {
    reasoning = `CRITICAL ALERT: Emergency symptoms detected. Immediate prioritization applied.`;
  } else if (urgency === 'urgent') {
    reasoning = `Urgent care recommended for ${bestDept}. Assigned to ${recommendedDoctor?.name || 'available specialist'}.`;
  } else {
    reasoning = `Assigned to ${recommendedDoctor?.name} in ${bestDept} based on shortest estimated wait time.`;
  }

  return {
    department: bestDept,
    urgency,
    isEmergency,
    recommendedDoctor,
    alternativeDoctors,
    matchedKeywords: Array.from(new Set(matchedKeywords)),
    reasoning,
  };
}
