import { addDays, daysInMonth, diffDays, shiftMonth } from '@/lib/dates';
import type { Frequency, IsoDate, Recurrence } from './types';

export const FREQUENCIES: readonly Frequency[] = [
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
];

const MONTH_STEP: Partial<Record<Frequency, number>> = { monthly: 1, quarterly: 3, yearly: 12 };
const DAY_STEP: Partial<Record<Frequency, number>> = { weekly: 7, biweekly: 14 };

const pad = (n: number): string => String(n).padStart(2, '0');

/** Scadenza successiva a `date`; per i mesi tiene il giorno di partenza (31 → 28 a febbraio → di nuovo 31). */
export function nextOccurrence(date: IsoDate, frequency: Frequency, anchorDay: number): IsoDate {
  const days = DAY_STEP[frequency];
  if (days) return addDays(date, days);
  const month = shiftMonth(date.slice(0, 7), MONTH_STEP[frequency] ?? 1);
  return `${month}-${pad(Math.min(anchorDay, daysInMonth(month)))}`;
}

export interface DueItem {
  recurrence: Recurrence;
  dueDate: IsoDate;
}

/** Tutte le scadenze fino a oggi non ancora gestite (con un tetto, se l'app resta chiusa per molto). */
export function dueDates(rec: Recurrence, today: IsoDate, cap = 24): IsoDate[] {
  const dates: IsoDate[] = [];
  for (
    let d = rec.nextDue;
    d <= today && dates.length < cap;
    d = nextOccurrence(d, rec.frequency, rec.anchorDay)
  )
    dates.push(d);
  return dates;
}

/** Scadenze da gestire adesso, dalla più vecchia. */
export function dueNow(
  recs: readonly Recurrence[],
  today: IsoDate,
  onlyReminders = true,
): DueItem[] {
  return recs
    .filter((r) => r.active && (!onlyReminders || r.remind))
    .flatMap((recurrence) =>
      dueDates(recurrence, today).map((dueDate) => ({ recurrence, dueDate })),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Prossime scadenze nei `days` giorni da oggi (esclusa oggi e le già scadute). */
export function upcoming(recs: readonly Recurrence[], today: IsoDate, days = 7): DueItem[] {
  return recs
    .filter((r) => r.active && r.nextDue > today && diffDays(today, r.nextDue) <= days)
    .map((recurrence) => ({ recurrence, dueDate: recurrence.nextDue }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
