import { Link } from 'react-router-dom';
import {
  Activity,
  Clock,
  Users,
  Stethoscope,
  Award,
  ArrowRight,
  CheckCircle,
  Bell,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const features = [
  {
    icon: Clock,
    title: 'Live Wait-Time Tracking',
    desc: 'Real-time estimated wait times that update as consultations start and end. No more guessing when your turn is coming.',
  },
  {
    icon: Users,
    title: 'Smart Queue Management',
    desc: 'Exponential moving average algorithms predict wait times based on each doctor\'s actual consultation patterns.',
  },
  {
    icon: Bell,
    title: 'Instant Notifications',
    desc: 'Get alerted when your wait time changes, when you\'re next in line, or when a doctor is running late.',
  },
  {
    icon: Award,
    title: 'Gamified Experience',
    desc: 'Earn punctuality points and streak badges for on-time arrivals. Redeem points for priority tokens.',
  },
  {
    icon: ShieldCheck,
    title: 'Emergency Priority',
    desc: 'Emergency patients are automatically prioritized and inserted at the front of the queue.',
  },
];

const stats = [
  { value: '40%', label: 'Less Waiting' },
  { value: '3.2x', label: 'Faster Throughput' },
  { value: '92%', label: 'Patient Satisfaction' },
  { value: '24/7', label: 'Real-Time Updates' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-medical-soft">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-medical-gradient opacity-5" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pb-32 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="fade-in-up">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Activity className="h-4 w-4" />
                Smart Hospital Queue Management
              </div>
              <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Know your wait.
                <br />
                <span className="text-medical-gradient inline-block">
                  Skip the uncertainty.
                </span>
              </h1>
              <p className="mb-8 max-w-lg text-lg text-muted-foreground">
                QueueSense gives patients real-time wait estimates and queue
                positions, while helping doctors and staff manage consultations
                efficiently. A calmer waiting room starts here.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="bg-medical-gradient text-base" asChild>
                  <Link to="/login">
                    <Clock className="mr-2 h-5 w-5" />
                    Check Your Wait Time
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-base" asChild>
                  <Link to="/login">
                    <Stethoscope className="mr-2 h-5 w-5" />
                    Staff Login
                  </Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-medical-success" />
                  No app install needed
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-medical-success" />
                  Real-time updates
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="group relative overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-black">
                {/* Responsive Video of the Medical / Hospital System */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-[400px] w-full object-cover lg:h-[480px] opacity-90 transition-opacity group-hover:opacity-100"
                  poster="https://images.pexels.com/photos/8459996/pexels-photo-8459996.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
                >
                  <source
                    src="https://assets.mixkit.co/videos/preview/mixkit-doctor-talking-to-a-patient-in-a-clinic-41544-large.mp4"
                    type="video/mp4"
                  />
                  {/* Secondary fallback video */}
                  <source
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                    type="video/mp4"
                  />
                </video>

                {/* Top Video Telemetry Overlay */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between rounded-xl bg-black/60 backdrop-blur-md px-3.5 py-2 text-white border border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-medical-success pulse-ring" />
                    <span className="text-xs font-bold tracking-wider uppercase">
                      QueueSense AI Engine
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-white/80">
                    REAL-TIME SYNC
                  </span>
                </div>

                {/* Bottom Video Badge Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-xl bg-black/60 backdrop-blur-md px-3.5 py-2 text-white border border-white/10">
                  <div className="flex items-center gap-2 text-xs">
                    <Stethoscope className="h-4 w-4 text-medical-teal" />
                    <span>Cardiology · Dr. Sarah Chen</span>
                  </div>
                  <span className="rounded-md bg-medical-success/20 px-2 py-0.5 text-[10px] font-bold text-medical-success border border-medical-success/40 uppercase">
                    In Consult
                  </span>
                </div>
              </div>

              {/* Floating wait time card */}
              <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xl sm:block z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-gradient shadow-md">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">12 min</p>
                    <p className="text-xs text-muted-foreground">
                      Live Estimated Wait
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating position card */}
              <div className="absolute -top-4 -right-4 hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xl sm:block z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-foreground">#3</p>
                    <p className="text-xs text-muted-foreground">
                      Live Queue Token
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border/60 bg-card/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-medical-gradient text-3xl font-bold sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything your waiting room needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From patient check-in to consultation tracking, QueueSense handles
            the entire outpatient flow.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="group border-border/60 transition-smooth hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-smooth group-hover:bg-medical-gradient">
                    <Icon className="h-6 w-6 text-primary transition-smooth group-hover:text-white" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-card/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: '01',
                icon: Users,
                title: 'Check In',
                desc: 'Walk-in patients are checked in by reception staff and assigned to the best available doctor automatically.',
              },
              {
                step: '02',
                icon: Clock,
                title: 'Track Wait',
                desc: 'Patients see their live queue position and estimated wait time, which updates in real time.',
              },
              {
                step: '03',
                icon: Stethoscope,
                title: 'Get Consulted',
                desc: 'Doctors manage consultations with one tap, and the system recalculates everyone\'s wait instantly.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="relative">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-medical-gradient text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-3xl font-bold text-border">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-medical-gradient p-8 text-center shadow-xl sm:p-16">
          <TrendingDown className="mx-auto mb-4 h-12 w-12 text-white" />
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to reduce wait times?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-lg text-white/80">
            Join QueueSense and transform your outpatient experience today.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="text-base"
            asChild
          >
            <Link to="/login">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
