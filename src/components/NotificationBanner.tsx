import { useEffect } from 'react';
import { Bell, X, AlertTriangle, Clock, CheckCircle, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

export function NotificationBanner() {
  const { notifications, dismissNotification } = useApp();

  useEffect(() => {
    const timers = notifications.map((n) =>
      setTimeout(() => dismissNotification(n.id), 8000)
    );
    return () => timers.forEach(clearTimeout);
  }, [notifications, dismissNotification]);

  if (notifications.length === 0) return null;

  const visible = notifications.slice(-3);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {visible.map((n) => {
        const Icon =
          n.type === 'emergency'
            ? AlertTriangle
            : n.type === 'you_are_next'
            ? CheckCircle
            : n.type === 'wait_changed'
            ? Clock
            : n.type === 'doctor_late'
            ? AlertTriangle
            : Info;
        const color =
          n.type === 'emergency'
            ? 'border-destructive bg-destructive/10 text-destructive'
            : n.type === 'you_are_next'
            ? 'border-medical-success bg-medical-success/10 text-medical-success'
            : n.type === 'wait_changed'
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground';
        return (
          <div
            key={n.id}
            className={cn(
              'slide-in-right flex items-start gap-3 rounded-xl border p-3 shadow-lg',
              color
            )}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-medium">{n.message}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => dismissNotification(n.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
