import { diffDays, toIsoDate } from '@/lib/dates';

export type ReminderKind = 'none' | 'never' | 'stale' | 'yearEnd';

export const STALE_AFTER_DAYS = 30;
/** Dal 15 dicembre in poi chiediamo un backup di fine anno. */
const YEAR_END_FROM = { month: 12, day: 15 };

export function backupReminder(
  now: Date,
  lastBackupAt: string | undefined,
  hasData: boolean,
): ReminderKind {
  if (!hasData) return 'none';
  const last = lastBackupAt ? new Date(lastBackupAt) : null;

  const inYearEnd =
    now.getMonth() + 1 === YEAR_END_FROM.month && now.getDate() >= YEAR_END_FROM.day;
  if (inYearEnd) {
    const yearEndStart = new Date(now.getFullYear(), YEAR_END_FROM.month - 1, YEAR_END_FROM.day);
    if (!last || last < yearEndStart) return 'yearEnd';
  }
  if (!last) return 'never';
  return diffDays(toIsoDate(last), toIsoDate(now)) > STALE_AFTER_DAYS ? 'stale' : 'none';
}
