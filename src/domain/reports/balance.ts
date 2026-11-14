import { monthOf, shiftMonth } from '@/lib/dates';
import type { MonthKey, Transaction } from '../types';

export interface MonthBalance {
  month: MonthKey;
  /** Saldo prima del primo movimento del mese. */
  startCents: number;
  /** Saldo dopo l'ultimo movimento del mese (per il mese in corso: fin qui). */
  endCents: number;
}

/**
 * Saldo all'inizio e alla fine di ciascuno degli ultimi `count` mesi fino a `lastMonth`.
 *
 * Il saldo è quello del conto: saldo di partenza + tutti i movimenti fino a quel giorno, giroconti compresi
 * (spostano i soldi tra conti, quindi cambiano il saldo di un singolo conto; su «tutti i conti» si annullano).
 * `txs` deve contenere TUTTI i movimenti dall'inizio fino alla fine di `lastMonth`.
 */
export function monthEndBalances(
  openingCents: number,
  txs: readonly Pick<Transaction, 'date' | 'amountCents'>[],
  lastMonth: MonthKey,
  count: number,
): MonthBalance[] {
  const perMonth = new Map<MonthKey, number>();
  for (const t of txs) {
    const m = monthOf(t.date);
    if (m <= lastMonth) perMonth.set(m, (perMonth.get(m) ?? 0) + t.amountCents);
  }
  const first = shiftMonth(lastMonth, -(Math.max(count, 1) - 1));
  let running = openingCents;
  for (const [m, sum] of perMonth) if (m < first) running += sum;

  const result: MonthBalance[] = [];
  for (let i = 0; i < Math.max(count, 1); i++) {
    const month = shiftMonth(first, i);
    const startCents = running;
    running += perMonth.get(month) ?? 0;
    result.push({ month, startCents, endCents: running });
  }
  return result;
}
