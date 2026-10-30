import type { Transaction } from '../types';

export interface Totals {
  income: number;
  /** Positivo: quanto è stato speso. */
  expenses: number;
  net: number;
}

export interface CategoryTotal {
  categoryId: string | null;
  cents: number;
  share: number;
}

/** Movimenti che contano per entrate/uscite: i giroconti sono sempre esclusi. */
export const countable = (txs: readonly Transaction[]): Transaction[] =>
  txs.filter((t) => !t.isTransfer);

export function totalsOf(txs: readonly Transaction[]): Totals {
  let income = 0;
  let expenses = 0;
  for (const t of countable(txs)) {
    if (t.amountCents > 0) income += t.amountCents;
    else expenses -= t.amountCents;
  }
  return { income, expenses, net: income - expenses };
}

/** Spese per categoria, dalla più alta; `share` rispetto al totale delle spese. */
export function expensesByCategory(txs: readonly Transaction[]): CategoryTotal[] {
  const sums = new Map<string | null, number>();
  for (const t of countable(txs)) {
    if (t.amountCents < 0) sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) - t.amountCents);
  }
  const total = [...sums.values()].reduce((a, b) => a + b, 0);
  return [...sums.entries()]
    .map(([categoryId, cents]) => ({ categoryId, cents, share: total === 0 ? 0 : cents / total }))
    .sort((a, b) => b.cents - a.cents);
}

/** Variazione rispetto al periodo precedente; `pct` è null se il precedente è zero. */
export function compare(current: number, previous: number): { diff: number; pct: number | null } {
  return { diff: current - previous, pct: previous === 0 ? null : (current - previous) / previous };
}
