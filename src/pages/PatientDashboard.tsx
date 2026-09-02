import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Stethoscope,
  Award,
  Flame,
  Gift,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  Sparkles,
  Activity,
  PlusCircle,
  Check,
  Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { formatDuration, formatMinutes, formatTime } from '../lib/format';
import { estimateWaitTime } from '../lib/queueEngine';
import { analyzeSymptoms } from '../lib/symptomTriage';
import { downloadPatientReport } from '../lib/pdf';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { patients, doctors, checkInPatient, redeemReward } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());

  // Check-in form states
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [symptomInput, setSymptomInput] = useState('');
  const [isOnTimeArrival, setIsOnTimeArrival] = useState(true);
  const [patientNameInput, setPatientNameInput] = useState(user?.name || '');
  const [activeCheckInId, setActiveCheckInId] = useState<string | null>(null);

  // Live ticking clock for real-time wait updates
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate('/login');
    if (user?.name && !patientNameInput) {
      setPatientNameInput(user.name);
    }
  }, [user, navigate, patientNameInput]);

  // Patient records are identified only by the authenticated account or explicit link.
  const patient = useMemo(() => {
    if (!user) return null;
    const ownPatients = patients.filter((p) => p.userId === user.id);
    return ownPatients.find((p) => p.id === activeCheckInId) || [...ownPatients]
      .sort((a, b) => b.checkInTime - a.checkInTime)[0] || null;
  }, [activeCheckInId, patients, user]);

  const doctor = useMemo(() => {
    if (!patient?.assignedDoctorId) return null;
    return doctors.find((d) => d.id === patient.assignedDoctorId) || null;
  }, [doctors, patient]);

  // Live-calculated wait time using the pure function
  const liveWaitTime = useMemo(() => {
    if (!patient || !doctor) return 0;
    if (patient.status === 'in_consult' || patient.status === 'completed') return 0;
    return estimateWaitTime(patient, doctor, now);
  }, [patient, doctor, now]);

  // Real-time AI symptom triage analysis as patient types
  const triageResult = useMemo(() => {
    return analyzeSymptoms(symptomInput, doctors, patients);
  }, [symptomInput, doctors, patients]);

  const handleSelfCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (doctors.length === 0 || !triageResult.recommendedDoctor) return;
    const finalName = patientNameInput.trim() || user?.name || 'Patient';
    const dept = triageResult.department;
    const docId = triageResult.recommendedDoctor?.id || doctors[0]?.id;

    const newPatient = checkInPatient(
      finalName,
      dept,
      isOnTimeArrival,
      symptomInput,
      docId,
      triageResult.isEmergency,
      user?.id
    );

    setActiveCheckInId(newPatient.id);
    setShowCheckInForm(false);
    setSymptomInput('');
  };

  const handleRedeem = (rewardName: string, cost: number) => {
    if (!patient) return;
    redeemReward(patient.id, cost, rewardName);
  };

  if (!user) return null;

  // Patient is not currently checked in — show interactive Symptom Triage Check-In
  if (!patient || (patient.status === 'completed' && showCheckInForm) || showCheckInForm) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Check in to join the queue and get automated doctor allotment based on your symptoms
            </p>
          </div>
          {patient && patient.status === 'completed' && (
            <Badge variant="outline" className="text-xs bg-medical-success/10 text-medical-success border-medical-success/30">
              Previous Visit Completed
            </Badge>
          )}
        </div>

        <Card className="border-primary/30 shadow-lg">
          <CardHeader className="bg-primary/5 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-gradient shadow-md text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Smart Symptom Triage & Check-In</CardTitle>
                <CardDescription>
                  Describe your symptoms in natural language — our AI will classify your department and allot the best available doctor
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSelfCheckIn} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="p-name">Your Full Name</Label>
                  <Input
                    id="p-name"
                    value={patientNameInput}
                    onChange={(e) => setPatientNameInput(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Arrival Punctuality</Label>
                  <div className="flex gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant={isOnTimeArrival ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsOnTimeArrival(true)}
                      className="flex-1 text-xs"
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      On Time (+20 pts)
                    </Button>
                    <Button
                      type="button"
                      variant={!isOnTimeArrival ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIsOnTimeArrival(false)}
                      className="flex-1 text-xs"
                    >
                      Late Arrival (0 pts)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Symptom Description Box */}
              <div className="space-y-2">
                <Label htmlFor="symptoms" className="flex items-center justify-between">
                  <span>Describe your symptoms or medical concern</span>
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Real-time Smart Analysis
                  </span>
                </Label>
                <Textarea
                  id="symptoms"
                  placeholder="e.g., 'Sharp pain in left chest with high blood pressure', 'Child running high fever since last night', or 'Twisted ankle after playing basketball'..."
                  rows={3}
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  className="resize-none"
                  required
                />
              </div>

              {/* Live Triage Recommendation Box */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      AI Triage Recommendation
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant="outline"
                      className="border-primary/40 bg-primary/10 text-primary text-xs font-semibold"
                    >
                      Dept: {triageResult.department}
                    </Badge>
                    <Badge
                      variant={
                        triageResult.isEmergency
                          ? 'destructive'
                          : triageResult.urgency === 'urgent'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-xs"
                    >
                      {triageResult.isEmergency
                        ? 'Emergency'
                        : triageResult.urgency === 'urgent'
                        ? 'Urgent'
                        : 'Routine'}
                    </Badge>
                  </div>
                </div>

                <p className="text-sm font-medium text-foreground">
                  {triageResult.reasoning}
                </p>

                <div className="pt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Allotted Doctor (Auto-Recommended)
                    </Label>
                    <div className="mt-1 flex items-center gap-2 rounded-lg border bg-card p-2.5">
                      <Stethoscope className="h-4 w-4 text-primary" />
                      <div className="flex-1 truncate">
                        <p className="text-xs font-bold text-foreground">
                          {triageResult.recommendedDoctor?.name || 'No specialist available'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {triageResult.recommendedDoctor?.department} · Avg {formatMinutes(triageResult.recommendedDoctor?.currentAvgConsultTime || 600)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                {patient && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCheckInForm(false)}
                  >
                    View Active Queue Status
                  </Button>
                )}
                <Button type="submit" size="lg" className="bg-medical-gradient px-8" disabled={!triageResult.recommendedDoctor}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Check In & Join Live Queue
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const queueLength = doctor
    ? patients.filter(
        (p) =>
          p.assignedDoctorId === doctor.id &&
          (p.status === 'waiting' || p.status === 'recalled')
      ).length
    : 0;

  const totalQueueForProgress = queueLength + 1;
  const progressPercent =
    patient.status === 'in_consult'
      ? 90
      : Math.max(
          10,
          Math.round(
            ((totalQueueForProgress - patient.queuePosition) /
              totalQueueForProgress) *
              100
          )
        );

  const hasEmergencyAhead = doctor
    ? patients.some(
        (p) =>
          p.assignedDoctorId === doctor.id &&
          p.isEmergency &&
          p.queuePosition < patient.queuePosition &&
          p.status === 'waiting'
      )
    : false;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {patient.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {patient.department} · Checked in at {formatTime(patient.checkInTime)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCheckInForm(true)}
            className="text-xs"
          >
            <PlusCircle className="mr-1.5 h-3.5 w-3.5 text-primary" />
            New Check-In
          </Button>

          <Badge
            variant={patient.status === 'in_consult' ? 'default' : 'secondary'}
            className="w-fit"
          >
            {patient.status === 'in_consult' && (
              <span className="mr-1.5 flex h-2 w-2 rounded-full bg-medical-success pulse-ring" />
            )}
            {patient.status === 'in_consult'
              ? 'In Consultation'
              : patient.status === 'no_show'
              ? 'No-Show'
              : 'Waiting'}
          </Badge>
        </div>
      </div>

      {/* Emergency Alert Banner */}
      {(hasEmergencyAhead || patient.isEmergency) && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 fade-in-up">
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">
              {patient.isEmergency
                ? 'You have emergency priority status'
                : 'Emergency patient ahead of you in queue'}
            </p>
            <p className="text-sm text-destructive/80">
              {patient.isEmergency
                ? 'You will be seen immediately before regular queue patients.'
                : 'An emergency case has been prioritized. Your wait time may temporarily extend.'}
            </p>
          </div>
        </div>
      )}

      {/* Symptoms Summary Bar */}
      {patient.symptoms && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span>
              <strong>Reported Symptoms:</strong> {patient.symptoms}
            </span>
          </div>
          {patient.triageUrgency && (
            <Badge variant="outline" className="capitalize text-[11px]">
              {patient.triageUrgency} Care
            </Badge>
          )}
        </div>
      )}

      {patient.status === 'completed' && patient.consultationReport && (
        <Card className="border-medical-success/30 shadow-sm">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-medical-success" />
                Consultation Report
              </CardTitle>
              <CardDescription>
                Completed with {patient.consultationReport.doctorName} on {formatTime(patient.consultationReport.consultationDate)}
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => downloadPatientReport(patient.consultationReport!)}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div><p className="font-medium">Diagnosis</p><p className="text-muted-foreground">{patient.consultationReport.diagnosis || 'Not recorded'}</p></div>
            <div><p className="font-medium">Consultation time</p><p className="text-muted-foreground">{patient.consultationReport.durationMinutes} minutes</p></div>
            <div><p className="font-medium">Clinical notes</p><p className="text-muted-foreground">{patient.consultationReport.clinicalNotes || 'Not recorded'}</p></div>
            <div><p className="font-medium">Medicines</p><p className="text-muted-foreground">{patient.consultationReport.prescriptions.length ? patient.consultationReport.prescriptions.map((medicine) => medicine.name).join(', ') : 'None prescribed'}</p></div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main: Wait Time + Progress */}
        <div className="space-y-6 lg:col-span-2">
          {/* Live Wait Time Card */}
          <Card className="overflow-hidden border-primary/20 shadow-md">
            <CardContent className="p-0">
              <div className="bg-medical-gradient p-6 text-white">
                <div className="flex items-center gap-2 text-white/80">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    Live Estimated Wait Time
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight sm:text-6xl">
                    {formatDuration(liveWaitTime)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  {patient.status === 'in_consult'
                    ? 'You are currently being seen by your doctor in the consultation room'
                    : patient.status === 'no_show'
                    ? 'You were marked as no-show'
                    : liveWaitTime === 0
                    ? patient.queuePosition === 0
                      ? 'You are next in line. Please remain ready for your consultation.'
                      : 'You will be called shortly'
                    : 'Calculated in real-time using doctor consultation pace'}
                </p>
              </div>
              <div className="p-6">
                {/* Progress Bar */}
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">
                    Queue Progress
                  </span>
                  <span className="font-semibold text-primary">
                    {progressPercent}%
                  </span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Checked in</span>
                  <span>In consultation</span>
                  <span>Completed</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Queue Position + Doctor Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {patient.status === 'in_consult'
                      ? 'Now'
                      : `#${patient.queuePosition + 1}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {patient.status === 'waiting'
                      ? 'Position in queue'
                      : 'Queue position'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Stethoscope className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {doctor?.name || 'Assigned Specialist'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {doctor?.department || patient.department}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Track Visualization */}
          {patient.status === 'waiting' && doctor && (
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-base">Queue Track</CardTitle>
                <CardDescription>
                  Live visual queue tracking ahead of you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {patients
                    .filter(
                      (p) =>
                        p.assignedDoctorId === doctor.id &&
                        (p.status === 'waiting' ||
                          p.status === 'in_consult' ||
                          p.status === 'recalled')
                    )
                    .sort((a, b) => a.queuePosition - b.queuePosition)
                    .map((p, idx) => {
                      const isMe = p.id === patient.id;
                      const isAhead = p.queuePosition < patient.queuePosition;
                      const isCurrent = p.status === 'in_consult';
                      return (
                        <div key={p.id} className="flex items-center gap-2">
                          {idx > 0 && (
                            <div
                              className={`h-1 w-6 rounded-full ${
                                isAhead ? 'bg-primary' : 'bg-border'
                              }`}
                            />
                          )}
                          <div
                            className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border-2 text-xs font-bold transition-smooth ${
                              isMe
                                ? 'border-primary bg-primary text-primary-foreground scale-110 shadow-lg'
                                : isCurrent
                                ? 'border-medical-success bg-medical-success/10 text-medical-success'
                                : isAhead
                                ? 'border-primary/40 bg-primary/5 text-primary'
                                : 'border-border bg-muted text-muted-foreground'
                            }`}
                          >
                            {isCurrent ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : (
                              <span>{p.queuePosition + 1}</span>
                            )}
                          </div>
                          {isMe && (
                            <Badge className="ml-1 bg-primary text-[10px]">You</Badge>
                          )}
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Real Gamification & Point Rewards */}
        <div className="space-y-6">
          {/* Points Card (starts from real 0 or earned points) */}
          <Card className="border-accent/30 shadow-sm">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-foreground">Your Reward Points</h3>
                </div>
                <Badge variant="outline" className="border-accent/40 text-accent text-xs">
                  Active
                </Badge>
              </div>
              <div className="text-center py-2">
                <p className="text-5xl font-extrabold text-accent">{patient.points || 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Punctuality & visit points earned
                </p>
              </div>
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs">
                <TrendingUp className="h-4 w-4 text-medical-success" />
                <span className="text-medical-success font-semibold">
                  +{patient.isOnTime ? 20 : 0} pts
                </span>
                <span className="text-muted-foreground">for on-time check-in</span>
              </div>
            </CardContent>
          </Card>

          {/* Badges Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-5 w-5 text-medical-warning" />
                Badges & Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {patient.badges.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No badges yet. Arrive on-time and complete your consultation to earn badges!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {patient.badges.map((badge) => (
                    <Badge
                      key={badge}
                      variant="secondary"
                      className="gap-1.5 border-accent/30 bg-accent/10 text-accent text-xs"
                    >
                      <Flame className="h-3 w-3" />
                      {badge}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rewards Redemption Card */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="h-5 w-5 text-primary" />
                Redeem Rewards
              </CardTitle>
              <CardDescription className="text-xs">
                Use your earned points to unlock hospital perks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                { label: 'Priority Token', cost: 100, desc: 'Fast-track queue priority' },
                { label: 'Express Check-in', cost: 50, desc: 'Express check-in on next visit' },
                { label: 'Hospital Cafe Voucher', cost: 20, desc: 'Free beverage at hospital cafeteria' },
              ].map((reward) => {
                const canAfford = (patient.points || 0) >= reward.cost;
                return (
                  <div
                    key={reward.label}
                    className={`flex items-center justify-between rounded-xl border p-3 transition-smooth ${
                      canAfford
                        ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
                        : 'border-border opacity-60'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-foreground">{reward.label}</p>
                      <p className="text-[11px] text-muted-foreground">{reward.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-accent">{reward.cost} pts</p>
                      <Button
                        size="sm"
                        variant={canAfford ? 'default' : 'outline'}
                        disabled={!canAfford}
                        onClick={() => handleRedeem(reward.label, reward.cost)}
                        className="mt-1 h-7 text-[11px] px-2.5"
                      >
                        Redeem
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Visit Info */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Check-in Time
                </span>
                <span className="font-semibold">{formatTime(patient.checkInTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Stethoscope className="h-3.5 w-3.5" />
                  Specialist
                </span>
                <span className="font-semibold">{doctor?.name || 'Unassigned'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
