import type { IsoDate, MonthKey } from '@/domain/types';

const pad = (n: number): string => String(n).padStart(2, '0');

export function toIsoDate(d: Date): IsoDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function monthOf(date: IsoDate): MonthKey {
  return date.slice(0, 7);
}

export function yearOf(date: IsoDate): string {
  return date.slice(0, 4);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(y, m, 0).getDate();
}

export function monthRange(month: MonthKey): { from: IsoDate; to: IsoDate } {
  return { from: `${month}-01`, to: `${month}-${pad(daysInMonth(month))}` };
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Differenza in giorni (b - a), indipendente da ora legale. */
export function diffDays(a: IsoDate, b: IsoDate): number {
  const toUtc = (s: IsoDate): number => {
    const [y, m, d] = s.split('-').map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return toIsoDate(new Date(y, m - 1, d + days));
}
