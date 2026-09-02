import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileBarChart,
  Download,
  Clock,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../components/ui/chart';
import { formatMinutes, formatDuration, formatTime } from '../lib/format';
import { downloadOperationsReport, downloadPatientActivityReport } from '../lib/pdf';

const chartConfig = {
  avgMinutes: {
    label: 'Avg Consult (mins)',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function Reports() {
  const { user } = useAuth();
  const { doctors, patients } = useApp();
  const navigate = useNavigate();

  // Admin only: redirect to /login if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
  }, [user, navigate]);

  // Summary stats calculations
  const totalServedToday = useMemo(
    () => patients.filter((p) => p.status === 'completed').length,
    [patients]
  );

  const avgWaitTimeSec = useMemo(() => {
    const waitingPatients = patients.filter(
      (p) => p.status === 'waiting' || p.status === 'recalled'
    );
    if (waitingPatients.length === 0) return 0;
    const totalWait = waitingPatients.reduce(
      (sum, p) => sum + p.estimatedWaitTime,
      0
    );
    return Math.round(totalWait / waitingPatients.length);
  }, [patients]);

  const noShowCount = useMemo(
    () => patients.filter((p) => p.status === 'no_show').length,
    [patients]
  );

  const totalEmergencies = useMemo(
    () => patients.filter((p) => p.isEmergency).length,
    [patients]
  );

  // Bar chart data for consultation times
  const chartData = useMemo(() => {
    return doctors.map((doc) => ({
      doctor: doc.name.replace('Dr. ', ''),
      fullName: doc.name,
      department: doc.department,
      avgMinutes: Math.round(doc.currentAvgConsultTime / 60),
    }));
  }, [doctors]);

  // Doctor Table Data
  const doctorTableData = useMemo(() => {
    return doctors.map((doc) => {
      const currentQueueLength = patients.filter(
        (p) =>
          p.assignedDoctorId === doc.id &&
          (p.status === 'waiting' || p.status === 'recalled')
      ).length;

      return {
        ...doc,
        currentQueueLength,
      };
    });
  }, [doctors, patients]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-medical-soft px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-medical-gradient shadow-md">
              <FileBarChart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Analytics & Reports
              </h1>
              <p className="text-sm text-muted-foreground">
                Operational queue performance, consultation metrics, and throughput
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => downloadOperationsReport(doctors, patients)} className="bg-medical-gradient shadow-md transition-smooth hover:opacity-90">
              <Stethoscope className="mr-2 h-4 w-4" /> Doctor Report (PDF)
            </Button>
            <Button variant="outline" onClick={() => downloadPatientActivityReport(doctors, patients)}>
              <Download className="mr-2 h-4 w-4" /> Patient Report (PDF)
            </Button>
          </div>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-success/10 text-medical-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  {totalServedToday}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Patients Served Today
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  {formatMinutes(avgWaitTimeSec)}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Average Queue Wait Time
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-warning/10 text-medical-warning">
                <UserX className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  {noShowCount}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  No-Show Count
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground sm:text-3xl">
                  {totalEmergencies}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Emergencies Handled
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart: Average Consultation Time Per Doctor */}
        <Card className="border-border/70 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Average Consultation Time per Doctor
              </CardTitle>
              <CardDescription>
                Calculated using dynamic Exponential Moving Average (EMA) algorithm
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit mt-2 sm:mt-0 text-xs font-medium text-muted-foreground">
              Values in minutes
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart
                data={chartData}
                margin={{ top: 16, right: 16, bottom: 24, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.6)" />
                <XAxis
                  dataKey="doctor"
                  tickLine={false}
                  tickMargin={12}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(val) => `Dr. ${val}`}
                />
                <YAxis
                  unit="m"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickMargin={8}
                />
                <ChartTooltip
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name, item) => (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {item.payload.fullName} ({item.payload.department}):
                          </span>
                          <span className="font-bold text-primary">{value} minutes</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="avgMinutes"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Doctor Summary Table */}
        <Card className="border-border/70 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Doctor Performance & Queue Metrics
            </CardTitle>
            <CardDescription>
              Detailed breakdown of consultations, average durations, and current workload
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="font-semibold">Doctor Name</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Total Consults</TableHead>
                    <TableHead className="text-right font-semibold">Avg Consult Time</TableHead>
                    <TableHead className="text-right font-semibold">Current Queue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doctorTableData.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {doc.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.department}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            doc.status === 'in_consult'
                              ? 'default'
                              : doc.status === 'on_break'
                              ? 'outline'
                              : 'secondary'
                          }
                          className={
                            doc.status === 'in_consult'
                              ? 'bg-medical-success/15 text-medical-success border-medical-success/30 text-xs'
                              : doc.status === 'on_break'
                              ? 'border-medical-warning text-medical-warning bg-medical-warning/10 text-xs'
                              : 'bg-primary/10 text-primary border-primary/20 text-xs'
                          }
                        >
                          {doc.status === 'in_consult'
                            ? 'In Consult'
                            : doc.status === 'on_break'
                            ? 'On Break'
                            : 'Available'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {doc.totalConsults}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary tabular-nums">
                        {formatMinutes(doc.currentAvgConsultTime)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        <Badge variant="outline" className="font-mono">
                          {doc.currentQueueLength} patients
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
