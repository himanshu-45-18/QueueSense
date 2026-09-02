import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Users,
  Stethoscope,
  AlertTriangle,
  Activity,
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { formatMinutes, formatTime } from '../lib/format';
import { suggestDoctor } from '../lib/queueEngine';
import type { Doctor } from '../lib/types';

export default function AdminDashboard() {
  const { user } = useAuth();
  const {
    doctors,
    patients,
    events,
    checkInPatient,
    reassignPatientToDoctor,
    triggerEmergencyOverride,
  getSuggestedDoctor,
  markPatientNoShow,
  startConsultation,
    endConsultation,
  pushNotification,
  dismissNotification,
    notifications,
  insertEmergencyPatient,
  } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [checkInDialog, setCheckInDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newDept, setNewDept] = useState('');
  const [newDoctorId, setNewDoctorId] = useState('');
  const [newOnTime, setNewOnTime] = useState(true);
  const [suggestedDoc, setSuggestedDoc] = useState<Doctor | null>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate suggested doctor when dialog opens or symptoms change
  useEffect(() => {
    if (checkInDialog) {
      setSuggestedDoc(getSuggestedDoctor(newSymptoms));
    }
  }, [checkInDialog, newSymptoms, doctors, patients, getSuggestedDoctor]);

  const totalWaiting = patients.filter(
    (p) => p.status === 'waiting' || p.status === 'recalled'
  ).length;
  const totalInConsult = patients.filter((p) => p.status === 'in_consult').length;
  const totalCompleted = patients.filter((p) => p.status === 'completed').length;
  const totalNoShow = patients.filter((p) => p.status === 'no_show').length;

  const doctorQueues = useMemo(() => {
    return doctors.map((doc) => {
      const queue = patients
        .filter(
          (p) =>
            p.assignedDoctorId === doc.id &&
            (p.status === 'waiting' ||
              p.status === 'in_consult' ||
              p.status === 'recalled')
        )
        .sort((a, b) => a.queuePosition - b.queuePosition);
      return { doctor: doc, queue };
    });
  }, [doctors, patients]);

  if (!user) return null;

  const handleCheckIn = () => {
    if (!newName.trim()) return;
    const dept = newDept || suggestedDoc?.department || 'General Medicine';
    const docId = newDoctorId || suggestedDoc?.id;
    checkInPatient(newName, dept, newOnTime, newSymptoms, docId);
    setNewName('');
    setNewSymptoms('');
    setNewDept('');
    setNewDoctorId('');
    setNewOnTime(true);
    setCheckInDialog(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage patient check-ins, doctor queues, and system overrides
          </p>
        </div>
        <Button
          className="bg-medical-gradient"
          onClick={() => setCheckInDialog(true)}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Check In Patient
        </Button>
      </div>

      {/* System Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalWaiting}</p>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-medical-success/10">
              <Stethoscope className="h-5 w-5 text-medical-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalInConsult}</p>
              <p className="text-xs text-muted-foreground">In Consult</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10">
              <CheckCircle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10">
              <UserPlus className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalNoShow}</p>
              <p className="text-xs text-muted-foreground">No-Shows</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-medical-warning/10">
              <Activity className="h-5 w-5 text-medical-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{doctors.length}</p>
              <p className="text-xs text-muted-foreground">Doctors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Doctor Queues Side by Side */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                All Doctor Queues
              </CardTitle>
              <CardDescription>
                Side-by-side view of each doctor's current queue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {doctorQueues.map(({ doctor: doc, queue }) => (
                  <div
                    key={doc.id}
                    className="rounded-xl border border-border/60 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.department}
                        </p>
                      </div>
                      <Badge
                        variant={doc.status === 'in_consult' ? 'default' : 'secondary'}
                        className={
                          doc.status === 'in_consult'
                            ? 'bg-medical-success/10 text-medical-success border-medical-success/30'
                            : ''
                        }
                      >
                        {doc.status === 'in_consult'
                          ? 'Busy'
                          : doc.status === 'on_break'
                          ? 'Break'
                          : 'Available'}
                      </Badge>
                    </div>
                    <div className="mb-3 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {queue.length} in queue
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatMinutes(doc.currentAvgConsultTime)} avg
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {queue.slice(0, 5).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
                        >
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              p.status === 'in_consult'
                                ? 'bg-medical-success/20 text-medical-success'
                                : p.isEmergency
                                ? 'bg-destructive/10 text-destructive'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {p.isEmergency ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              p.queuePosition + 1
                            )}
                          </span>
                          <span className="flex-1 truncate text-xs font-medium">
                            {p.name}
                          </span>
                          {p.status === 'in_consult' && (
                            <Badge className="bg-medical-success/10 text-medical-success text-xs">
                              Now
                            </Badge>
                          )}
                        </div>
                      ))}
                      {queue.length > 5 && (
                        <p className="pt-1 text-center text-xs text-muted-foreground">
                          +{queue.length - 5} more...
                        </p>
                      )}
                      {queue.length === 0 && (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          Queue empty
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Recent Queue Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.slice(-10).reverse().map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${
                        evt.type === 'emergency'
                          ? 'bg-destructive/10 text-destructive'
                          : evt.type === 'consult_start'
                          ? 'bg-medical-success/10 text-medical-success'
                          : evt.type === 'consult_end'
                          ? 'bg-accent/10 text-accent'
                          : evt.type === 'no_show'
                          ? 'bg-medical-warning/10 text-medical-warning'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {evt.type === 'emergency' ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : evt.type === 'consult_start' ? (
                        <Activity className="h-3.5 w-3.5" />
                      ) : evt.type === 'no_show' ? (
                        <UserPlus className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {evt.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(evt.timestamp)}
                        {evt.duration ? ` · ${Math.round(evt.duration)}s` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start bg-medical-gradient"
                onClick={() => setCheckInDialog(true)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Check In Walk-in Patient
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/queue-display')}
              >
                <Activity className="mr-2 h-4 w-4 text-primary" />
                Public Queue Display
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/reports')}
              >
                <TrendingUp className="mr-2 h-4 w-4 text-accent" />
                View Reports
              </Button>
            </CardContent>
          </Card>

          {/* All Patients List with Reassign */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Waiting Patients</CardTitle>
              <CardDescription>Reassign or manage patients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {patients
                  .filter((p) => p.status === 'waiting' || p.status === 'recalled')
                  .map((p) => {
                    const doc = doctors.find((d) => d.id === p.assignedDoctorId);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-lg border border-border/40 p-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {p.name}
                            {p.isEmergency && (
                              <Badge variant="destructive" className="ml-1.5 text-xs">
                                EMG
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc?.name || 'Unassigned'} · Pos #{p.queuePosition + 1}
                          </p>
                        </div>
                        <Select
                          value={p.assignedDoctorId || ''}
                          onValueChange={(val) =>
                            reassignPatientToDoctor(p.id, val)
                          }
                        >
                          <SelectTrigger className="h-8 w-24 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {doctors.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name.split(' ').slice(-1)[0]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => triggerEmergencyOverride(p.id)}
                          title={p.isEmergency ? 'Remove emergency priority' : 'Mark as emergency'}
                          aria-label={p.isEmergency ? 'Remove emergency priority' : 'Mark as emergency'}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                {patients.filter((p) => p.status === 'waiting').length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No waiting patients.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check-in Dialog */}
      <Dialog open={checkInDialog} onOpenChange={setCheckInDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Check In Walk-in Patient</DialogTitle>
            <DialogDescription>
              The system will suggest the best doctor based on shortest
              predicted wait time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ci-name">Patient Name</Label>
              <Input
                id="ci-name"
                placeholder="Enter patient name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-symptoms">Symptoms / Reason for Visit</Label>
              <Input
                id="ci-symptoms"
                placeholder="e.g., Chest discomfort, High fever, Sprained ankle, Skin rash..."
                value={newSymptoms}
                onChange={(e) => setNewSymptoms(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ci-dept">Department</Label>
                <Input
                  id="ci-dept"
                  placeholder={suggestedDoc?.department || 'General Medicine'}
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Allot Doctor</Label>
                <Select
                  value={newDoctorId || suggestedDoc?.id || ''}
                  onValueChange={(val) => setNewDoctorId(val)}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>On-time arrival?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newOnTime ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewOnTime(true)}
                >
                  Yes, on time
                </Button>
                <Button
                  type="button"
                  variant={!newOnTime ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewOnTime(false)}
                >
                  Late arrival
                </Button>
              </div>
            </div>
            {suggestedDoc && (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-medical-gradient">
                  <Stethoscope className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    Suggested Specialist: {suggestedDoc.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {suggestedDoc.department} ·{' '}
                    {formatMinutes(suggestedDoc.currentAvgConsultTime)} avg ·{' '}
                    {patients.filter(
                      (p) =>
                        p.assignedDoctorId === suggestedDoc.id &&
                        p.status === 'waiting'
                    ).length}{' '}
                    in queue
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-medical-gradient"
              onClick={handleCheckIn}
              disabled={!newName.trim()}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Check In Patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
