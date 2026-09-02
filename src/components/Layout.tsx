import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  LogIn,
  Stethoscope,
  User as UserIcon,
  Settings,
  LogOut,
  FileBarChart,
  Tv,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const dashboardLink =
    user?.role === 'patient'
      ? '/patient'
      : user?.role === 'doctor'
      ? '/doctor'
      : '/admin';

  const navItems = [
    { label: 'Dashboard', href: dashboardLink, icon: LayoutDashboard, show: !!user },
    { label: 'Queue Display', href: '/queue-display', icon: Tv, show: true },
    { label: 'Reports', href: '/reports', icon: FileBarChart, show: user?.role === 'admin' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 transition-smooth hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-medical-gradient shadow-md">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Queue<span className="text-primary">Sense</span>
          </span>
        </Link>

        <nav className="flex max-w-[45vw] items-center gap-1 overflow-x-auto md:max-w-none">
          {navItems.filter((n) => n.show).map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-smooth sm:px-3 sm:text-sm',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link to="/login">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  Staff Login
                </Link>
              </Button>
              <Button size="sm" asChild className="bg-medical-gradient">
                <Link to="/login">
                  <UserIcon className="mr-1.5 h-4 w-4" />
                  Check Wait Time
                </Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">
                    {user.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs font-medium capitalize text-primary">
                    {user.role}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={dashboardLink}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/queue-display">
                    <Tv className="mr-2 h-4 w-4" />
                    Queue Display
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <Settings className="mr-2 h-4 w-4" />
                    Profile & Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            <span>QueueSense — Smart Hospital Queue Management</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Mock data for demonstration</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
