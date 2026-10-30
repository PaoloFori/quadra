import { yearOf } from '@/lib/dates';
import type { MonthKey, Transaction } from '../types';
import { compare, expensesByCategory, totalsOf, type CategoryTotal, type Totals } from './totals';

export interface MonthTotals extends Totals {
  month: MonthKey;
  hasData: boolean;
}

export interface YearReport {
  year: string;
  totals: Totals;
  previousTotals: Totals;
  months: MonthTotals[];
  byCategory: CategoryTotal[];
  /** Spesa media sui mesi che hanno almeno un movimento. */
  averageMonthlyExpenses: number;
  mostExpensive: MonthTotals | null;
  lightest: MonthTotals | null;
  expensesChange: { diff: number; pct: number | null };
  incomeChange: { diff: number; pct: number | null };
  hasData: boolean;
}

export function buildYearReport(all: readonly Transaction[], year: string): YearReport {
  const previousYear = String(Number(year) - 1);
  const current = all.filter((t) => yearOf(t.date) === year);
  const previous = all.filter((t) => yearOf(t.date) === previousYear);

  const months: MonthTotals[] = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`;
    const txs = current.filter((t) => t.date.startsWith(month));
    return { month, hasData: txs.length > 0, ...totalsOf(txs) };
  });
  const withData = months.filter((m) => m.hasData);
  const totals = totalsOf(current);
  const previousTotals = totalsOf(previous);
  const byExpenses = [...withData].sort((a, b) => b.expenses - a.expenses);

  return {
    year,
    totals,
    previousTotals,
    months,
    byCategory: expensesByCategory(current),
    averageMonthlyExpenses:
      withData.length === 0 ? 0 : Math.round(totals.expenses / withData.length),
    mostExpensive: byExpenses[0] ?? null,
    lightest: byExpenses[byExpenses.length - 1] ?? null,
    expensesChange: compare(totals.expenses, previousTotals.expenses),
    incomeChange: compare(totals.income, previousTotals.income),
    hasData: current.length > 0,
  };
}
