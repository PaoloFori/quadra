import { normalizeText } from '@/lib/normalize';
import type { IsoDate, Transaction } from './types';

export interface TransactionFilter {
  text: string;
  /** `null` = senza categoria; undefined = qualsiasi. */
  categoryId?: string | null;
  accountId?: string;
  from?: IsoDate;
  to?: IsoDate;
  /** Soglie sull'importo assoluto, in centesimi. */
  minCents?: number;
  maxCents?: number;
}

export const EMPTY_FILTER: TransactionFilter = { text: '' };

export function isFilterActive(f: TransactionFilter): boolean {
  return Object.entries(f).some(([k, v]) =>
    k === 'text' ? String(v).trim() !== '' : v !== undefined,
  );
}

export function filterTransactions(
  txs: readonly Transaction[],
  f: TransactionFilter,
): Transaction[] {
  const query = normalizeText(f.text);
  return txs.filter((t) => {
    if (f.categoryId !== undefined && t.categoryId !== f.categoryId) return false;
    if (f.accountId && t.accountId !== f.accountId) return false;
    if (f.from && t.date < f.from) return false;
    if (f.to && t.date > f.to) return false;
    const abs = Math.abs(t.amountCents);
    if (f.minCents !== undefined && abs < f.minCents) return false;
    if (f.maxCents !== undefined && abs > f.maxCents) return false;
    if (query && !normalizeText(`${t.description} ${t.note ?? ''}`).includes(query)) return false;
    return true;
  });
}
