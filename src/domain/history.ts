import { descriptionKey } from '@/lib/normalize';
import { derivePattern } from './rules';
import type { Transaction } from './types';

export interface CategoryHistory {
  categoryId: string | null;
  last: Transaction;
  count: number;
  /** Somma delle uscite (positiva). */
  spentCents: number;
}

/** Per ogni categoria: ultima spesa, quante spese e quanto in totale. Dalla più recente. Giroconti esclusi. */
export function lastSpendingByCategory(txs: readonly Transaction[]): CategoryHistory[] {
  const map = new Map<string | null, CategoryHistory>();
  for (const t of txs) {
    if (t.isTransfer || t.amountCents >= 0) continue;
    const current = map.get(t.categoryId);
    if (!current) {
      map.set(t.categoryId, {
        categoryId: t.categoryId,
        last: t,
        count: 1,
        spentCents: -t.amountCents,
      });
    } else {
      current.count++;
      current.spentCents -= t.amountCents;
      if (t.date > current.last.date) current.last = t;
    }
  }
  return [...map.values()].sort((a, b) => b.last.date.localeCompare(a.last.date));
}

/** Le ultime volte che hai speso in modo simile: stesso esercente (pattern della descrizione), altrimenti stessa categoria. */
export function similarTransactions(
  all: readonly Transaction[],
  tx: Transaction,
  limit = 5,
): Transaction[] {
  const text = tx.note || tx.description;
  const pattern = derivePattern(text);
  const others = all.filter((t) => t.id !== tx.id && !t.isTransfer);
  const byMerchant = pattern
    ? others.filter((t) => descriptionKey(`${t.description} ${t.note ?? ''}`).includes(pattern))
    : [];
  const pool =
    byMerchant.length > 0
      ? byMerchant
      : tx.categoryId
        ? others.filter((t) => t.categoryId === tx.categoryId)
        : [];
  return [...pool].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
