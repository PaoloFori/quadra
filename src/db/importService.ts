import { addDays } from '@/lib/dates';
import { hashesOf, markDuplicates, type Candidate } from '@/domain/importing/dedupe';
import type { ParseResult } from '@/domain/importing/parse';
import { detectTransfers, MAX_TRANSFER_DAYS, type TransferPair } from '@/domain/transfers';
import { matchCategory } from '@/domain/rules';
import type { BankProfile, Category, Rule, Transaction } from '@/domain/types';
import { db } from './database';
import { newId } from './repositories';

export interface ImportPreview {
  accountId: string;
  candidates: Candidate[];
  newCount: number;
  duplicateCount: number;
  skipped: number;
  /** Giroconti rilevati in cui almeno un lato è nuovo. */
  transferPairs: TransferPair[];
  fromDate?: string;
  toDate?: string;
}

async function existingHashCounts(hashes: string[]): Promise<Map<string, number>> {
  const rows = await db.transactions
    .where('hash')
    .anyOf([...new Set(hashes)])
    .toArray();
  return rows.reduce(
    (map, t) => map.set(t.hash, (map.get(t.hash) ?? 0) + 1),
    new Map<string, number>(),
  );
}

async function findTransferPairs(accountId: string, fresh: Candidate[]): Promise<TransferPair[]> {
  if (fresh.length === 0) return [];
  const dates = fresh.map((c) => c.date).sort();
  const from = addDays(dates[0]!, -MAX_TRANSFER_DAYS);
  const to = addDays(dates[dates.length - 1]!, MAX_TRANSFER_DAYS);
  const nearby = await db.transactions.where('date').between(from, to, true, true).toArray();
  const items = [
    ...nearby.filter((t) => t.accountId !== accountId),
    ...fresh.map((c) => ({
      id: c.id,
      accountId,
      date: c.date,
      amountCents: c.amountCents,
      isTransfer: false,
    })),
  ];
  const freshIds = new Set(fresh.map((c) => c.id));
  return detectTransfers(items).filter((p) => freshIds.has(p.outId) || freshIds.has(p.inId));
}

export async function previewImport(
  accountId: string,
  parsed: ParseResult,
): Promise<ImportPreview> {
  const hashes = await hashesOf(accountId, parsed.rows);
  const candidates = await markDuplicates(accountId, parsed.rows, await existingHashCounts(hashes));
  const fresh = candidates.filter((c) => c.isNew);
  const dates = candidates.map((c) => c.date).sort();
  return {
    accountId,
    candidates,
    newCount: fresh.length,
    duplicateCount: candidates.length - fresh.length,
    skipped: parsed.skipped,
    transferPairs: await findTransferPairs(accountId, fresh),
    fromDate: dates[0],
    toDate: dates[dates.length - 1],
  };
}

function autoCategory(
  description: string,
  amountCents: number,
  rules: Rule[],
  categories: Map<string, Category>,
): string | null {
  const id = matchCategory(description, rules);
  const kind = id ? categories.get(id)?.kind : undefined;
  if (!id || !kind) return null;
  if (amountCents < 0 && kind === 'income') return null;
  return id;
}

export interface CommitOptions {
  markTransfers: boolean;
  profile?: BankProfile;
}

export async function commitImport(
  preview: ImportPreview,
  options: CommitOptions,
): Promise<number> {
  const [rules, categories] = await Promise.all([db.rules.toArray(), db.categories.toArray()]);
  const byId = new Map(categories.map((c) => [c.id, c]));
  const now = Date.now();
  const rows: Transaction[] = preview.candidates
    .filter((c) => c.isNew)
    .map((c) => ({
      id: c.id,
      accountId: preview.accountId,
      date: c.date,
      valueDate: c.valueDate,
      amountCents: c.amountCents,
      description: c.description,
      categoryId: autoCategory(c.description, c.amountCents, rules, byId),
      hash: c.hash,
      balanceCents: c.balanceCents,
      isTransfer: false,
      source: 'import' as const,
      createdAt: now,
      updatedAt: now,
    }));

  await db.transaction('rw', db.transactions, db.profiles, async () => {
    await db.transactions.bulkPut(rows);
    if (options.markTransfers) {
      for (const pair of preview.transferPairs) {
        const transferGroupId = newId();
        await db.transactions.update(pair.outId, {
          isTransfer: true,
          transferGroupId,
          categoryId: null,
        });
        await db.transactions.update(pair.inId, {
          isTransfer: true,
          transferGroupId,
          categoryId: null,
        });
      }
    }
    if (options.profile) await db.profiles.put(options.profile);
  });
  return rows.length;
}
