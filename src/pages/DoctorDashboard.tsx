import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Play,
  Square,
  UserX,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
  Activity,
  CheckCircle,
  FileText,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { formatMinutes, formatTime, formatDuration } from '../lib/format';
import { estimateWaitTime } from '../lib/queueEngine';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const {
    doctors,
    patients,
    checkInPatient,
    startConsultation,
    endConsultation,
    markPatientNoShow,
    insertEmergencyPatient,
  } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [walkInDialog, setWalkInDialog] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInSymptoms, setWalkInSymptoms] = useState('');
  const [emergencyDialog, setEmergencyDialog] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyDept, setEmergencyDept] = useState('');
  const [reportDialog, setReportDialog] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [medicines, setMedicines] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const doctor = useMemo(() => {
    if (user?.linkedDoctorId) {
      const found = doctors.find((d) => d.id === user.linkedDoctorId);
      if (found) return found;
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0].toLowerCase();
      const match = doctors.find((d) => d.name.toLowerCase().includes(prefix));
      if (match) return match;
    }
    return doctors[0] || null;
  }, [doctors, user]);

  const myPatients = useMemo(() => {
    if (!doctor) return [];
    return patients
      .filter(
        (p) =>
          p.assignedDoctorId === doctor.id &&
          (p.status === 'waiting' ||
            p.status === 'in_consult' ||
            p.status === 'recalled')
      )
      .sort((a, b) => a.queuePosition - b.queuePosition);
  }, [patients, doctor]);

  const currentPatient = useMemo(
    () => myPatients.find((p) => p.status === 'in_consult') || null,
    [myPatients]
  );

  const upcomingPatients = useMemo(
    () => myPatients.filter((p) => p.status === 'waiting' || p.status === 'recalled'),
    [myPatients]
  );

  const completedToday = useMemo(
    () =>
      patients.filter(
        (p) =>
          p.assignedDoctorId === doctor?.id && p.status === 'completed'
      ).length,
    [patients, doctor]
  );

  const avgConsultMinutes = doctor
    ? Math.round(doctor.currentAvgConsultTime / 60)
    : 0;

  if (!user) return null;

  if (!doctor) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold">No doctor profile found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleWalkInCheckIn = () => {
    if (!walkInName.trim()) return;
    checkInPatient(
      walkInName.trim(),
      doctor.department,
      true,
      walkInSymptoms.trim(),
      doctor.id
    );
    setWalkInName('');
    setWalkInSymptoms('');
    setWalkInDialog(false);
  };

  const handleEmergency = () => {
    if (!emergencyName.trim()) return;
    insertEmergencyPatient(
      emergencyName,
      emergencyDept || doctor.department,
      doctor.id
    );
    setEmergencyName('');
    setEmergencyDept('');
    setEmergencyDialog(false);
  };

  // Immediate 1-click End Consultation
  const handleDirectEndConsultation = () => {
    if (!currentPatient || !doctor) return;
    endConsultation(doctor.id, currentPatient.id);
  };

  // End Consultation with Clinical Report
  const handleSaveReportAndEnd = () => {
    if (!currentPatient || !doctor) return;
    const targetPatientId = currentPatient.id;
    const reportData = (diagnosis || clinicalNotes || medicines)
      ? {
          symptoms: currentPatient.symptoms || '',
          diagnosis,
          clinicalNotes,
          prescriptions: medicines.trim()
            ? medicines.split(',').map((name) => ({
                name: name.trim(),
                dosage: 'As directed',
                frequency: 'As directed',
                duration: 'As directed',
              }))
            : [],
        }
      : undefined;

    endConsultation(doctor.id, targetPatientId, reportData);
    setDiagnosis('');
    setClinicalNotes('');
    setMedicines('');
    setReportDialog(false);
  };

  const elapsedConsult = currentPatient && doctor.currentConsultStartedAt
    ? Math.max(0, Math.round((now - doctor.currentConsultStartedAt) / 1000))
    : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {doctor.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {doctor.department} ·{' '}
            <Badge
              variant={currentPatient ? 'default' : 'secondary'}
              className="ml-1"
            >
              {currentPatient
                ? 'In Consultation'
                : doctor.status === 'on_break'
                ? 'On Break'
                : 'Available'}
            </Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWalkInDialog(true)}
            className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Patient to Queue
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmergencyDialog(true)}
          >
            <AlertTriangle className="mr-1.5 h-4 w-4 text-destructive" />
            Insert Emergency
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingPatients.length}</p>
              <p className="text-xs text-muted-foreground">In Queue</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-medical-success/10">
              <CheckCircle className="h-5 w-5 text-medical-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedToday}</p>
              <p className="text-xs text-muted-foreground">Done Today</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
              <Clock className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgConsultMinutes}m</p>
              <p className="text-xs text-muted-foreground">Avg Consult</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-medical-warning/10">
              <TrendingUp className="h-5 w-5 text-medical-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{doctor.totalConsults}</p>
              <p className="text-xs text-muted-foreground">Total Consults</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Consultation Card */}
          <Card
            className={
              currentPatient
                ? 'border-medical-success/40 shadow-lg bg-medical-success/5'
                : 'border-border/60'
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Current Consultation
              </CardTitle>
              <CardDescription>
                {currentPatient
                  ? 'Patient currently in doctor\'s room'
                  : 'No active consultation'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentPatient ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-card border border-border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-medical-success/10">
                        <span className="text-lg font-bold text-medical-success">
                          {currentPatient.name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{currentPatient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {currentPatient.department} · In Room
                        </p>
                        {currentPatient.symptoms && (
                          <p className="mt-1 text-xs text-primary font-medium">
                            Symptoms: {currentPatient.symptoms}
                          </p>
                        )}
                      </div>
                      {currentPatient.isEmergency && (
                        <Badge variant="destructive" className="ml-2">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Emergency
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-extrabold text-medical-success font-mono">
                        {formatDuration(elapsedConsult)}
                      </p>
                      <p className="text-xs text-muted-foreground">Consultation Time</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDirectEndConsultation}
                      className="flex-1 bg-medical-gradient py-6 text-base"
                    >
                      <Square className="mr-2 h-5 w-5" />
                      End Consultation
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setReportDialog(true)}
                      className="border-primary text-primary hover:bg-primary/10 py-6"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Add Prescription & End
                    </Button>
                  </div>
                </div>
              ) : upcomingPatients.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-foreground">
                    Next patient is waiting. Click <span className="font-bold text-primary">Start Consultation</span> to call them in.
                  </p>
                  <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-lg font-bold text-primary">
                        {upcomingPatients[0].name[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-base">
                        {upcomingPatients[0].name}
                        {upcomingPatients[0].isEmergency && (
                          <Badge variant="destructive" className="ml-2">
                            Emergency
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {upcomingPatients[0].department} · Checked in {formatTime(upcomingPatients[0].checkInTime)}
                      </p>
                      {upcomingPatients[0].symptoms && (
                        <p className="mt-0.5 text-xs text-primary font-medium">
                          Symptoms: {upcomingPatients[0].symptoms}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() =>
                        startConsultation(doctor.id, upcomingPatients[0].id)
                      }
                      className="bg-medical-gradient px-6 py-5 text-base shadow-md"
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Start Consultation
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Activity className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No patients in queue. New patient check-ins will appear here automatically.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setWalkInDialog(true)}
                    className="border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Check in Walk-In Patient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Queue */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Waiting Patients Queue
                <Badge variant="secondary" className="ml-1">
                  {upcomingPatients.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingPatients.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Queue is empty.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingPatients.map((p, idx) => {
                    const wait = estimateWaitTime(p, doctor, now);
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-smooth hover:bg-muted/50 ${
                          idx === 0 && !currentPatient
                            ? 'border-primary/40 bg-primary/5 shadow-sm'
                            : 'border-border'
                        }`}
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                            p.isEmergency
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {p.isEmergency ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {p.name}
                            {p.isEmergency && (
                              <Badge variant="destructive" className="ml-2 text-xs">
                                Emergency
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {p.department} · Checked in {formatTime(p.checkInTime)}
                          </p>
                          {p.symptoms && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-xs">
                              {p.symptoms}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatMinutes(wait)}
                          </p>
                          <p className="text-xs text-muted-foreground">est. wait</p>
                        </div>
                        {!currentPatient && idx === 0 ? (
                          <Button
                            size="sm"
                            className="bg-medical-gradient"
                            onClick={() => startConsultation(doctor.id, p.id)}
                          >
                            <Play className="mr-1 h-3.5 w-3.5" />
                            Start
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => markPatientNoShow(p.id)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Efficiency */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Efficiency Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-medical-gradient p-4 text-white">
                <p className="text-sm text-white/80">Average Consultation Time</p>
                <p className="text-3xl font-bold">
                  {avgConsultMinutes}
                  <span className="text-lg font-normal"> min</span>
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Calculated automatically per consultation
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed today</span>
                  <span className="font-semibold">{completedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total consults</span>
                  <span className="font-semibold">{doctor.totalConsults}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queue length</span>
                  <span className="font-semibold">{upcomingPatients.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setWalkInDialog(true)}
              >
                <UserPlus className="mr-2 h-4 w-4 text-primary" />
                Add Patient to Queue
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setEmergencyDialog(true)}
              >
                <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                Insert Emergency Patient
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/reports')}
              >
                <FileText className="mr-2 h-4 w-4 text-primary" />
                View Patient Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Walk-In Check-In Dialog */}
      <Dialog open={walkInDialog} onOpenChange={setWalkInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Patient to Doctor's Queue</DialogTitle>
            <DialogDescription>
              Directly check in a patient for {doctor.name} ({doctor.department}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="walkin-name">Patient Name</Label>
              <Input
                id="walkin-name"
                placeholder="e.g. Rahul Sharma"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="walkin-symptoms">Symptoms (optional)</Label>
              <Input
                id="walkin-symptoms"
                placeholder="e.g. Chest pain, breathlessness, routine consultation"
                value={walkInSymptoms}
                onChange={(e) => setWalkInSymptoms(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWalkInDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-medical-gradient"
              onClick={handleWalkInCheckIn}
              disabled={!walkInName.trim()}
            >
              Add to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Optional Report Dialog */}
      <Dialog open={reportDialog} onOpenChange={setReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Clinical Report (Optional)</DialogTitle>
            <DialogDescription>
              Add prescription notes before finishing the consultation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Input id="diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Enter diagnosis (e.g. Mild Hypertension)" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinical-notes">Clinical Notes</Label>
              <Input id="clinical-notes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Treatment notes and observations" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicines">Medicines / Prescription</Label>
              <Input id="medicines" value={medicines} onChange={(e) => setMedicines(e.target.value)} placeholder="Comma-separated (e.g. Paracetamol 500mg, Amoxicillin)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportDialog(false)}>Cancel</Button>
            <Button className="bg-medical-gradient" onClick={handleSaveReportAndEnd}>Save & End Consultation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emergency Dialog */}
      <Dialog open={emergencyDialog} onOpenChange={setEmergencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Emergency Patient</DialogTitle>
            <DialogDescription>
              This patient will be inserted at the front of your queue, ahead of
              all waiting patients.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emg-name">Patient Name</Label>
              <Input
                id="emg-name"
                placeholder="Enter patient name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emg-dept">Department (optional)</Label>
              <Input
                id="emg-dept"
                placeholder={doctor.department}
                value={emergencyDept}
                onChange={(e) => setEmergencyDept(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEmergencyDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleEmergency}
              disabled={!emergencyName.trim()}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Insert Emergency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
