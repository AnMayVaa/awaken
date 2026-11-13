/** Local-date helpers. All "dates" in game state are local YYYY-MM-DD strings. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // noon avoids DST edge cases
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function diffDays(a: string, b: string): number {
  // b - a in whole days
  return Math.round((fromDateKey(b).getTime() - fromDateKey(a).getTime()) / 86400000);
}

export function today(): string {
  return toDateKey(new Date());
}

/** Monday-based week id: the date key of that week's Monday */
export function weekId(key: string = today()): string {
  const d = fromDateKey(key);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - dow);
  return toDateKey(d);
}

export function weekEnd(weekKey: string): Date {
  const d = fromDateKey(weekKey);
  d.setDate(d.getDate() + 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function msUntilMidnight(now = new Date()): number {
  const m = new Date(now);
  m.setHours(24, 0, 0, 0);
  return m.getTime() - now.getTime();
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatHM(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
}

export function shortDate(key: string): string {
  const d = fromDateKey(key);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
