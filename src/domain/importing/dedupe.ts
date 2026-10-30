import { sha256 } from '@/lib/hash';
import { normalizeText } from '@/lib/normalize';
import type { ParsedRow } from './parse';

export interface Candidate extends ParsedRow {
  /** `hash#n`: n = ordine di apparizione tra righe identiche dello stesso file. */
  id: string;
  hash: string;
  isNew: boolean;
}

export function hashInput(accountId: string, row: ParsedRow): string {
  return `${accountId}|${row.date}|${row.amountCents}|${normalizeText(row.description)}`;
}

/**
 * Deduplica robusta: se nel DB esistono già E righe con lo stesso hash, nel file solo le occorrenze
 * con indice >= E sono nuove. Due movimenti identici nello stesso giorno restano distinti,
 * e re-importare lo stesso file non aggiunge nulla.
 */
export async function markDuplicates(
  accountId: string,
  rows: ParsedRow[],
  existingCountByHash: ReadonlyMap<string, number>,
): Promise<Candidate[]> {
  const seen = new Map<string, number>();
  const result: Candidate[] = [];
  for (const row of rows) {
    const hash = await sha256(hashInput(accountId, row));
    const n = seen.get(hash) ?? 0;
    seen.set(hash, n + 1);
    result.push({
      ...row,
      hash,
      id: `${hash}#${n}`,
      isNew: n >= (existingCountByHash.get(hash) ?? 0),
    });
  }
  return result;
}

export async function hashesOf(accountId: string, rows: ParsedRow[]): Promise<string[]> {
  return Promise.all(rows.map((r) => sha256(hashInput(accountId, r))));
}
