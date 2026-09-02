import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ConsultationReport, Doctor, Patient } from './types';
import { formatDuration, formatTime } from './format';

export function downloadOperationsReport(doctors: Doctor[], patients: Patient[]) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text('QueueSense Operations Report', 14, 18);
  pdf.setFontSize(10);
  pdf.text(`Generated ${new Date().toLocaleString()}`, 14, 25);
  pdf.setFontSize(18);
  pdf.text('QueueSense Operations Report', 14, 18);
  pdf.setFontSize(10);
  pdf.text(`Generated ${new Date().toLocaleString()}`, 14, 25);
  autoTable(pdf, {
    startY: 32,
    head: [['Doctor', 'Department', 'Queue', 'Completed', 'Avg consult']],
    body: doctors.map((doctor) => [
      doctor.name,
      doctor.department,
      patients.filter((p) => p.assignedDoctorId === doctor.id && (p.status === 'waiting' || p.status === 'recalled')).length,
      patients.filter((p) => p.assignedDoctorId === doctor.id && p.status === 'completed').length,
      formatDuration(doctor.currentAvgConsultTime),
    ]),
  });
  pdf.save(`queuesense-operations-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadPatientActivityReport(doctors: Doctor[], patients: Patient[]) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text('QueueSense Patient Report', 14, 18);
  pdf.setFontSize(10);
  pdf.text(`Generated ${new Date().toLocaleString()}`, 14, 25);
  autoTable(pdf, {
    startY: 32,
    head: [['Patient', 'Department', 'Doctor', 'Status', 'Check-in', 'Emergency']],
    body: patients.map((patient) => [
      patient.name,
      patient.department,
      doctors.find((doctor) => doctor.id === patient.assignedDoctorId)?.name || 'Unassigned',
      patient.status,
      formatTime(patient.checkInTime),
      patient.isEmergency ? 'Yes' : 'No',
    ]),
  });
  pdf.save(`queuesense-patients-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadPatientReport(report: ConsultationReport) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text('QueueSense Consultation Report', 14, 18);
  pdf.setFontSize(10);
  pdf.text(`Patient: ${report.patientName}`, 14, 28);
  pdf.text(`Doctor: ${report.doctorName} | Department: ${report.department}`, 14, 35);
  pdf.text(`Consultation: ${formatTime(report.consultationDate)} | Duration: ${report.durationMinutes} minutes`, 14, 42);
  autoTable(pdf, {
    startY: 50,
    head: [['Field', 'Details']],
    body: [
      ['Symptoms', report.symptoms || 'Not recorded'],
      ['Diagnosis', report.diagnosis || 'Not recorded'],
      ['Clinical notes', report.clinicalNotes || 'Not recorded'],
      ['Follow-up', report.followUpDays ? `${report.followUpDays} days` : 'Not specified'],
      ['Advice', report.advice || 'Not recorded'],
      ['Medicines', report.prescriptions.length ? report.prescriptions.map((medicine) => `${medicine.name} - ${medicine.dosage}, ${medicine.frequency} for ${medicine.duration}`).join('\n') : 'None prescribed'],
    ],
    styles: { cellWidth: 'wrap' },
  });
  pdf.save(`queuesense-consultation-${report.patientName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
}
