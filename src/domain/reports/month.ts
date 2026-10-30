import { daysInMonth, monthOf, shiftMonth } from '@/lib/dates';
import type { MonthKey, Transaction } from '../types';
import {
  compare,
  countable,
  expensesByCategory,
  totalsOf,
  type CategoryTotal,
  type Totals,
} from './totals';

export interface DailyPoint {
  day: number;
  cumulative: number;
  previousCumulative: number;
}

export interface MonthReport {
  month: MonthKey;
  totals: Totals;
  previousTotals: Totals;
  expensesChange: { diff: number; pct: number | null };
  incomeChange: { diff: number; pct: number | null };
  byCategory: CategoryTotal[];
  daily: DailyPoint[];
  top5: Transaction[];
  hasData: boolean;
}

function cumulativeByDay(txs: readonly Transaction[], days: number): number[] {
  const perDay = new Array<number>(days).fill(0);
  for (const t of countable(txs)) {
    if (t.amountCents < 0) perDay[Number(t.date.slice(8, 10)) - 1]! -= t.amountCents;
  }
  let running = 0;
  return perDay.map((v) => (running += v));
}

/**
 * Resoconto di un mese. `lastDay` limita la serie giornaliera (mese in corso: fino a oggi);
 * la serie del mese precedente resta completa per il confronto.
 */
export function buildMonthReport(
  all: readonly Transaction[],
  month: MonthKey,
  lastDay?: number,
): MonthReport {
  const previousMonth = shiftMonth(month, -1);
  const current = all.filter((t) => monthOf(t.date) === month);
  const previous = all.filter((t) => monthOf(t.date) === previousMonth);
  const totals = totalsOf(current);
  const previousTotals = totalsOf(previous);

  const days = daysInMonth(month);
  const cur = cumulativeByDay(current, days);
  const prev = cumulativeByDay(previous, daysInMonth(previousMonth));
  const shown = Math.min(lastDay ?? days, days);
  const daily = cur.slice(0, shown).map((cumulative, i) => ({
    day: i + 1,
    cumulative,
    previousCumulative: prev[Math.min(i, prev.length - 1)] ?? 0,
  }));

  const top5 = countable(current)
    .filter((t) => t.amountCents < 0)
    .sort((a, b) => a.amountCents - b.amountCents)
    .slice(0, 5);

  return {
    month,
    totals,
    previousTotals,
    expensesChange: compare(totals.expenses, previousTotals.expenses),
    incomeChange: compare(totals.income, previousTotals.income),
    byCategory: expensesByCategory(current),
    daily,
    top5,
    hasData: current.length > 0,
  };
}
