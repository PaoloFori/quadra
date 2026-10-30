import { toCsv } from '@/lib/csv';
import { centsToPlain } from '@/lib/money';
import type { Transaction } from '../types';

export const CSV_HEADER = [
  'date',
  'account',
  'amount',
  'description',
  'category',
  'note',
  'transfer',
];

/** CSV indipendente dalla lingua: importo con punto, categoria = id stabile, giroconto 1/0. */
export function transactionsToCsv(txs: readonly Transaction[]): string {
  const rows = [...txs]
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((t) => [
      t.date,
      t.accountId,
      centsToPlain(t.amountCents),
      t.description,
      t.categoryId ?? '',
      t.note ?? '',
      t.isTransfer ? '1' : '0',
    ]);
  return toCsv([CSV_HEADER, ...rows]);
}
