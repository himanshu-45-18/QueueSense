// Time formatting utilities

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return 'Now';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

export function formatMinutes(seconds: number): string {
  if (seconds <= 0) return '0 min';
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins === 0 ? `${hrs}h` : `${hrs}h ${remMins}m`;
}

export function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatClock(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
