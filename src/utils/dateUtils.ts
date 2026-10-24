export function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const str = String(s).trim();
  // YYYY-MM-DD
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  // DD/MM/YYYY or DD-MM-YYYY
  m = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(s?: string | null): string {
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatDateRange(from?: string | null, to?: string | null): string {
  if (!from && !to) return 'No timeline set';
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function getToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return next;
}

export function daysDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function isTaskOverdue(item: { to: string; status: string }): boolean {
  if (item.status === 'Completed') return false;
  const toDate = parseDate(item.to);
  if (!toDate) return false;
  return toDate < getToday();
}
