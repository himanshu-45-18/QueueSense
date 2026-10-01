import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  User as UserIcon,
  Stethoscope,
  Shield,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  Loader2,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { cn } from '../lib/utils';
import type { Role } from '../lib/types';

const roles: { value: Role; label: string; icon: typeof UserIcon; desc: string }[] = [
  { value: 'patient', label: 'Patient', icon: UserIcon, desc: 'Check wait time & queue status' },
  { value: 'doctor', label: 'Doctor', icon: Stethoscope, desc: 'Manage room & consultations' },
  { value: 'admin', label: 'Admin / Staff', icon: Shield, desc: 'Manage department queues' },
];

export default function Login() {
  const {
    login,
    signup,
    loginWithGoogle,
    setupRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
  } = useAuth();
  const navigate = useNavigate();

  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<Role>('patient');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Status & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const getDestination = (targetRole: Role) => {
    return targetRole === 'patient'
      ? '/patient'
      : targetRole === 'doctor'
      ? '/doctor'
      : '/admin';
  };

  // Email / Password submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password, role);
      } else {
        await signup(email, password, name, role);
      }
      navigate(getDestination(role));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(role);
      navigate(getDestination(role));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  // Send Phone OTP
  const handleSendPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setError(null);
    setLoading(true);

    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = setupRecaptcha('recaptcha-container');
      }
      // Ensure phone has country code prefix
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber}`;
      const result = await sendPhoneOtp(formattedPhone, recaptchaVerifierRef.current);
      setConfirmationResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP SMS';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode.trim()) return;
    setError(null);
    setLoading(true);

    try {
      await verifyPhoneOtp(confirmationResult, verificationCode, role, name);
      navigate(getDestination(role));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid verification code';
      setError(msg.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Autofill
  const fillDemo = (demoRole: Role) => {
    const emails: Record<Role, string> = {
      patient: 'patient@gmail.com',
      doctor: 'himanshu@gmail.com',
      admin: 'admin@gmail.com',
    };
    setEmail(emails[demoRole]);
    setPassword('123456');
    setRole(demoRole);
    setAuthMethod('email');
    setMode('login');
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-medical-soft px-4 py-12">
      {/* Invisible reCAPTCHA container for Phone Auth */}
      <div id="recaptcha-container" />

      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-medical-gradient shadow-md">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Queue<span className="text-primary">Sense</span>
          </span>
        </Link>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-2xl font-bold">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              Sign in or create an account to access the queue management portal
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select your account role
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((r) => {
                  const Icon = r.icon;
                  const active = role === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-smooth',
                        active
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4',
                          active ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <span
                        className={cn(
                          'text-xs font-semibold',
                          active ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {r.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Google One-Click Sign In */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 border-border/80 bg-card hover:bg-muted/50 py-5"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="text-sm font-medium">Continue with Google</span>
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Auth Methods Tabs */}
            <Tabs
              value={authMethod}
              onValueChange={(val) => {
                setAuthMethod(val as 'email' | 'phone');
                setError(null);
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" className="text-xs font-medium">
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="text-xs font-medium">
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  Phone OTP
                </TabsTrigger>
              </TabsList>

              {/* Email & Password Form */}
              <TabsContent value="email" className="space-y-4 pt-2">
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  {mode === 'signup' && (
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-xs">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="Dr. Sarah Chen / John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@hospital.com"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-xs">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-9"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-medical-gradient mt-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {mode === 'login' ? 'Sign In with Email' : 'Create Account'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="text-center text-xs text-muted-foreground">
                  {mode === 'login' ? (
                    <>
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setError(null);
                        }}
                        className="font-semibold text-primary hover:underline"
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setError(null);
                        }}
                        className="font-semibold text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Phone OTP Form */}
              <TabsContent value="phone" className="space-y-4 pt-2">
                {!confirmationResult ? (
                  <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="phone" className="text-xs">Phone Number (with country code)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 555 123 4567"
                          className="pl-9 font-mono"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                        />
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        We'll send a 6-digit SMS verification code to your phone.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-medical-gradient"
                      disabled={loading || !phoneNumber.trim()}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Send SMS Code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyPhoneOtp} className="space-y-3">
                    <div className="flex items-center gap-2 rounded-xl bg-medical-success/10 p-3 text-xs text-medical-success">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>SMS verification code sent to {phoneNumber}</span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="otp" className="text-xs">Enter 6-Digit OTP Code</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="otp"
                          placeholder="123456"
                          className="pl-9 font-mono text-lg tracking-widest text-center"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setConfirmationResult(null);
                          setVerificationCode('');
                        }}
                        className="flex-1"
                      >
                        Change Number
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-medical-gradient"
                        disabled={loading || verificationCode.length < 6}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Verify & Login'
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            {/* Quick Demo Credentials */}
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/25 p-3">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                One-click test accounts:
              </p>
              <div className="flex gap-2">
                {(Object.keys(roles) as Role[]).map((r) => (
                  <Button
                    key={r}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => fillDemo(r)}
                  >
                    {roles.find((rl) => rl.value === r)?.label.split(' ')[0]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
