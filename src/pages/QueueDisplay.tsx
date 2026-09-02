import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tv,
  Clock,
  Users,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Coffee,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatDuration, formatMinutes, formatClock } from '../lib/format';
import { estimateWaitTime } from '../lib/queueEngine';

export default function QueueDisplay() {
  const { user, loading } = useAuth();
  const { doctors, patients } = useApp();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());

  // Protect Queue Display: require authentication
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Tick clock every second for live wait times and TV header clock
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const totalWaiting = useMemo(
    () => patients.filter((p) => p.status === 'waiting' || p.status === 'recalled').length,
    [patients]
  );

  const totalInConsult = useMemo(
    () => patients.filter((p) => p.status === 'in_consult').length,
    [patients]
  );

  const activeDoctors = useMemo(
    () => doctors.filter((d) => d.status !== 'on_break').length,
    [doctors]
  );

  return (
    <div className="min-h-screen bg-medical-soft px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* TV Display Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-card p-6 shadow-md md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-medical-gradient shadow-lg">
              <Tv className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-medical-success pulse-ring" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Live Public Queue Board
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                Outpatient Department Queue
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/40 px-4 py-2">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {formatClock(now)}
                </p>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  {new Date(now).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-2 text-xs font-medium">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-center">
                <p className="text-lg font-bold text-primary">{activeDoctors}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Doctors On Duty</p>
              </div>
              <div className="rounded-xl border border-medical-success/20 bg-medical-success/5 px-3 py-2 text-center">
                <p className="text-lg font-bold text-medical-success">{totalInConsult}</p>
                <p className="text-[10px] text-muted-foreground uppercase">In Consultation</p>
              </div>
              <div className="rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-center">
                <p className="text-lg font-bold text-accent">{totalWaiting}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Patients Waiting</p>
              </div>
            </div>
          </div>
        </div>

        {/* Doctor Queue Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-2">
          {doctors.map((doctor) => {
            const queue = patients
              .filter(
                (p) =>
                  p.assignedDoctorId === doctor.id &&
                  (p.status === 'waiting' ||
                    p.status === 'in_consult' ||
                    p.status === 'recalled')
              )
              .sort((a, b) => a.queuePosition - b.queuePosition);

            const currentPatient = queue.find((p) => p.status === 'in_consult');
            const waitingPatients = queue.filter(
              (p) => p.status === 'waiting' || p.status === 'recalled'
            );

            return (
              <Card
                key={doctor.id}
                className="overflow-hidden border-border/80 shadow-lg transition-smooth hover:border-primary/40"
              >
                {/* Doctor Header */}
                <CardHeader className="border-b border-border/50 bg-card p-5 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Stethoscope className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-foreground">
                          {doctor.name}
                        </CardTitle>
                        <p className="text-sm font-medium text-muted-foreground">
                          {doctor.department}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <Badge
                        variant={
                          doctor.status === 'in_consult'
                            ? 'default'
                            : doctor.status === 'on_break'
                            ? 'outline'
                            : 'secondary'
                        }
                        className={
                          doctor.status === 'in_consult'
                            ? 'bg-medical-success/15 text-medical-success border-medical-success/30 px-3 py-1 font-semibold text-xs'
                            : doctor.status === 'on_break'
                            ? 'border-medical-warning text-medical-warning bg-medical-warning/10 px-3 py-1 text-xs'
                            : 'bg-primary/10 text-primary border-primary/20 px-3 py-1 text-xs'
                        }
                      >
                        {doctor.status === 'in_consult' ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-medical-success pulse-ring" />
                            In Consultation
                          </span>
                        ) : doctor.status === 'on_break' ? (
                          <span className="flex items-center gap-1.5">
                            <Coffee className="h-3 w-3" />
                            On Break
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3" />
                            Available
                          </span>
                        )}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Avg: {formatMinutes(doctor.currentAvgConsultTime)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  {/* Current Active Consultation */}
                  {currentPatient ? (
                    <div className="rounded-xl border-2 border-medical-success/40 bg-medical-success/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 px-2 items-center justify-center rounded-lg bg-medical-success text-xs font-bold text-white uppercase tracking-wider">
                            Now Serving
                          </span>
                          <span className="text-base font-bold text-foreground">
                            {currentPatient.name}
                          </span>
                          {currentPatient.isEmergency && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Emergency
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-medical-success">
                          In Room
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                      No patient currently in examination room
                    </div>
                  )}

                  {/* Waiting Queue List */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Upcoming Queue ({waitingPatients.length})</span>
                      <span>Estimated Wait</span>
                    </div>

                    {waitingPatients.length === 0 ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-6 text-center text-muted-foreground">
                        <Users className="mb-1.5 h-6 w-6 opacity-40" />
                        <p className="text-sm font-medium">No patients currently waiting</p>
                        <p className="text-xs text-muted-foreground">
                          Next walk-in will be assigned here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {waitingPatients.map((patient) => {
                          const waitSec = estimateWaitTime(patient, doctor, now);
                          const isNext = patient.queuePosition === (currentPatient ? 1 : 0);

                          return (
                            <div
                              key={patient.id}
                              className={`flex items-center justify-between rounded-xl border p-3 transition-smooth ${
                                patient.isEmergency
                                  ? 'border-destructive/50 bg-destructive/10 ring-1 ring-destructive'
                                  : isNext
                                  ? 'border-primary/40 bg-primary/5 shadow-sm'
                                  : 'border-border/70 bg-card hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold ${
                                    patient.isEmergency
                                      ? 'bg-destructive text-white shadow-sm'
                                      : isNext
                                      ? 'bg-primary text-white shadow-sm'
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {patient.isEmergency ? (
                                    <AlertTriangle className="h-4 w-4" />
                                  ) : (
                                    `#${patient.queuePosition + 1}`
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-foreground">
                                      {patient.name}
                                    </span>
                                    {patient.isEmergency && (
                                      <Badge
                                        variant="destructive"
                                        className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider animate-pulse"
                                      >
                                        Urgent / Emergency
                                      </Badge>
                                    )}
                                    {isNext && !patient.isEmergency && (
                                      <Badge
                                        variant="outline"
                                        className="h-5 border-primary/40 bg-primary/10 px-1.5 text-[10px] font-semibold text-primary"
                                      >
                                        Next
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Position {patient.queuePosition + 1}
                                    {patient.symptoms && ` · ${patient.symptoms}`}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`text-base font-bold tabular-nums ${
                                    patient.isEmergency
                                      ? 'text-destructive font-black'
                                      : isNext
                                      ? 'text-primary'
                                      : 'text-foreground'
                                  }`}
                                >
                                  {formatDuration(waitSec)}
                                </span>
                                <p className="text-[10px] text-muted-foreground uppercase">
                                  {waitSec <= 0 ? 'Ready' : 'est. wait'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Public Notice Footer */}
        <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            Please watch the board for your name and token number. Wait times are calculated in real time based on actual consultation pace.
          </p>
          <p className="mt-1">
            If you need urgent assistance or feel unwell, please inform the reception staff immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
