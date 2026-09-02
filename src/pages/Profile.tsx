import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Shield,
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import type { User } from '../lib/types';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  const handleTogglePref = (
    key: keyof User['notificationPrefs'],
    checked: boolean
  ) => {
    updateUser({
      notificationPrefs: {
        ...user.notificationPrefs,
        [key]: checked,
      },
    });
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-medical-soft px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-medical-gradient shadow-md">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Profile & Settings
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your account credentials and notification preferences
              </p>
            </div>
          </div>
        </div>

        {/* Account Details Card */}
        <Card className="border-border/70 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your personal details and assigned system role (read-only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-border/80 bg-muted/20 p-4">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <AvatarFallback className="bg-medical-gradient text-xl font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
                  <Badge
                    variant="outline"
                    className="capitalize border-primary/40 bg-primary/10 text-primary font-semibold text-xs"
                  >
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border/70 p-3.5 bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Full Name
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">{user.name}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3.5 bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Email Address
                </p>
                <p className="mt-1 text-sm font-bold text-foreground truncate">{user.email}</p>
              </div>

              <div className="rounded-xl border border-border/70 p-3.5 bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Account Role
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold capitalize text-foreground">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences Card */}
        <Card className="border-border/70 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control when and how QueueSense notifies you about queue and consultation updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Toggle: Wait Time Changes */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 p-4 transition-smooth hover:bg-muted/20">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="toggle-wait-changes"
                    className="text-sm font-bold text-foreground cursor-pointer"
                  >
                    Wait Time Changes
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive instant alerts when your estimated consultation wait time changes
                  </p>
                </div>
              </div>
              <Switch
                id="toggle-wait-changes"
                checked={user.notificationPrefs.waitTimeChanges}
                onCheckedChange={(checked) =>
                  handleTogglePref('waitTimeChanges', checked)
                }
              />
            </div>

            {/* Toggle: You're Next */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 p-4 transition-smooth hover:bg-muted/20">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-medical-success/10 text-medical-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="toggle-you-are-next"
                    className="text-sm font-bold text-foreground cursor-pointer"
                  >
                    You're Next in Line
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Get prioritized alert when the patient ahead finishes and you are next to enter
                  </p>
                </div>
              </div>
              <Switch
                id="toggle-you-are-next"
                checked={user.notificationPrefs.youAreNext}
                onCheckedChange={(checked) =>
                  handleTogglePref('youAreNext', checked)
                }
              />
            </div>

            {/* Toggle: Doctor Running Late */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 p-4 transition-smooth hover:bg-muted/20">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-medical-warning/10 text-medical-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <Label
                    htmlFor="toggle-doctor-late"
                    className="text-sm font-bold text-foreground cursor-pointer"
                  >
                    Doctor Running Late
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive advisory notices if emergencies delay the doctor or consults run over schedule
                  </p>
                </div>
              </div>
              <Switch
                id="toggle-doctor-late"
                checked={user.notificationPrefs.doctorLate}
                onCheckedChange={(checked) =>
                  handleTogglePref('doctorLate', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Actions / Sign Out Card */}
        <Card className="border-border/70 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">
              Session Management
            </CardTitle>
            <CardDescription>
              Sign out from your active session on this device
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-foreground">Signed in as {user.email}</p>
              <p className="text-xs text-muted-foreground">Click below to end your session securely</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="gap-2 shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
