export function formatDuration(secs: number): string {
  if (secs < 60) return `${Math.round(secs)}s`;
  const minutes = Math.round(secs / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}m` : `${hours}h`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / Math.pow(1024, i);
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function shortDate(isoDate: string, locale?: string): string {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

export function shortMonth(month: string, locale?: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString(locale, {
    month: 'short',
  });
}

export function weekdayNames(locale?: string): string[] {
  const monday = new Date(2024, 0, 1);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getFullYear(), 0, monday.getDate() + i).toLocaleDateString(
      locale,
      { weekday: 'short' }
    )
  );
}

export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}
