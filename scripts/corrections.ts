/**
 * Correzioni ai registri a mano, lette da private/correzioni.json (ignorata da git, dati personali):
 *   edit:  [{ match, set, all? }]  cambia campi di una riga (importo, data, descrizione, conto, categoria);
 *                                  con all: true di tutte le righe uguali
 *   split: [{ match, parts }]      divide una riga in più righe (le parti ereditano i campi non indicati)
 *   add:   [{ date, cents, description, account, categoryId? }]  aggiunge righe
 * `match` = { date, cents, description? }: deve trovare esattamente una riga, altrimenti si ferma.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Entry } from './ledger';

interface Match {
  date: string;
  cents: number;
  description?: string;
}
type Fields = Partial<Pick<Entry, 'date' | 'cents' | 'description' | 'account' | 'categoryId'>>;
interface Corrections {
  edit?: { match: Match; set: Fields; all?: boolean }[];
  split?: { match: Match; parts: Fields[] }[];
  add?: Entry[];
}

const FILE = join('private', 'correzioni.json');

function findAll(entries: Entry[], m: Match): number[] {
  return entries
    .map((e, i) => [e, i] as const)
    .filter(
      ([e]) =>
        e.date === m.date &&
        e.cents === m.cents &&
        (m.description === undefined ||
          e.description.toLowerCase() === m.description.toLowerCase()),
    )
    .map(([, i]) => i);
}

function findOne(entries: Entry[], m: Match): number {
  const hits = findAll(entries, m);
  if (hits.length !== 1) {
    throw new Error(
      `Correzione: ${hits.length} righe trovate per ${JSON.stringify(m)} (ne serve una)`,
    );
  }
  return hits[0]!;
}

export function applyCorrections(entries: Entry[]): { entries: Entry[]; applied: number } {
  if (!existsSync(FILE)) return { entries, applied: 0 };
  const c = JSON.parse(readFileSync(FILE, 'utf8')) as Corrections;
  let out = [...entries];
  let applied = 0;
  for (const { match, set, all } of c.edit ?? []) {
    const hits = all ? findAll(out, match) : [findOne(out, match)];
    if (hits.length === 0) throw new Error(`Correzione: nessuna riga per ${JSON.stringify(match)}`);
    for (const i of hits) out[i] = { ...out[i]!, ...set };
    applied++;
  }
  for (const { match, parts } of c.split ?? []) {
    const i = findOne(out, match);
    const base = out[i]!;
    const sum = parts.reduce((s, p) => s + (p.cents ?? 0), 0);
    if (sum !== base.cents)
      throw new Error(`Divisione: le parti non sommano a ${base.cents} (${JSON.stringify(match)})`);
    out = [...out.slice(0, i), ...parts.map((p) => ({ ...base, ...p })), ...out.slice(i + 1)];
    applied++;
  }
  for (const e of c.add ?? []) {
    out.push(e);
    applied++;
  }
  return { entries: out, applied };
}
