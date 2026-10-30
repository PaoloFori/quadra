import { descriptionKey } from '@/lib/normalize';
import { monthOf } from '@/lib/dates';
import type { Transaction } from '../types';
import { countable } from './totals';

export interface RecurringExpense {
  key: string;
  description: string;
  /** Importo mediano (positivo). */
  cents: number;
  months: number;
  lastDate: string;
}

const MIN_MONTHS = 3;
const AMOUNT_TOLERANCE = 0.1;
const MAX_DAY_SPREAD = 5;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

/**
 * Abbonamenti: stessa descrizione (senza numeri), uscite in almeno 3 mesi diversi,
 * importo stabile (±10%) e giorno del mese simile.
 */
export function detectRecurring(all: readonly Transaction[]): RecurringExpense[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of countable(all)) {
    if (t.amountCents >= 0) continue;
    const key = descriptionKey(t.description || t.note || '');
    if (key.length < 3) continue;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }

  const result: RecurringExpense[] = [];
  for (const [key, txs] of groups) {
    const byMonth = new Map<string, Transaction>();
    for (const t of txs) byMonth.set(monthOf(t.date), t);
    if (byMonth.size < MIN_MONTHS || byMonth.size < txs.length * 0.7) continue;

    const sample = [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
    const amounts = sample.map((t) => -t.amountCents);
    const mid = median(amounts);
    const stable = amounts.every((a) => Math.abs(a - mid) <= mid * AMOUNT_TOLERANCE);
    const days = sample.map((t) => Number(t.date.slice(8, 10)));
    const steady = Math.max(...days) - Math.min(...days) <= MAX_DAY_SPREAD;
    if (!stable || !steady) continue;

    const last = sample[sample.length - 1]!;
    result.push({
      key,
      description: last.description || last.note || key,
      cents: mid,
      months: sample.length,
      lastDate: last.date,
    });
  }
  return result.sort((a, b) => b.cents - a.cents);
}
