import { diffDays } from '@/lib/dates';
import type { Transaction } from './types';

export type TransferCandidate = Pick<
  Transaction,
  'id' | 'accountId' | 'date' | 'amountCents' | 'isTransfer'
>;

export interface TransferPair {
  outId: string;
  inId: string;
}

export const MAX_TRANSFER_DAYS = 3;

/**
 * Giroconti: stesso importo, segno opposto, conti diversi, date vicine.
 * Abbinamento greedy per vicinanza di data, ogni movimento usato una sola volta.
 */
export function detectTransfers(
  items: TransferCandidate[],
  maxDays = MAX_TRANSFER_DAYS,
): TransferPair[] {
  const free = items.filter((t) => !t.isTransfer && t.amountCents !== 0);
  const outgoing = free.filter((t) => t.amountCents < 0);
  const incomingByAmount = new Map<number, TransferCandidate[]>();
  for (const t of free.filter((x) => x.amountCents > 0)) {
    const list = incomingByAmount.get(t.amountCents) ?? [];
    list.push(t);
    incomingByAmount.set(t.amountCents, list);
  }

  const options = outgoing.flatMap((out) =>
    (incomingByAmount.get(-out.amountCents) ?? [])
      .filter((inc) => inc.accountId !== out.accountId)
      .map((inc) => ({ out, inc, gap: Math.abs(diffDays(out.date, inc.date)) }))
      .filter((o) => o.gap <= maxDays),
  );
  options.sort((a, b) => a.gap - b.gap || a.out.date.localeCompare(b.out.date));

  const used = new Set<string>();
  const pairs: TransferPair[] = [];
  for (const { out, inc } of options) {
    if (used.has(out.id) || used.has(inc.id)) continue;
    used.add(out.id);
    used.add(inc.id);
    pairs.push({ outId: out.id, inId: inc.id });
  }
  return pairs;
}
