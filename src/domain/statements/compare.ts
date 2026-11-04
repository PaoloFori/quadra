import { addDays, diffDays } from '@/lib/dates';
import type { IsoDate, Transaction } from '@/domain/types';
import type { Statement, StatementEntry } from './types';

/** Movimento di un altro conto con lo stesso importo: probabilmente è stato registrato sul conto sbagliato. */
export interface ElsewhereHint {
  accountName: string;
  date: IsoDate;
  description: string;
}

export type CheckedTx = Pick<Transaction, 'id' | 'date' | 'amountCents' | 'description'>;

export interface StatementCheck {
  from: IsoDate;
  to: IsoDate;
  statementCount: number;
  quadraCount: number;
  /** Righe dell'estratto trovate in Quadra con stesso importo e data compatibile. */
  matched: { entry: StatementEntry; tx: CheckedTx }[];
  /** Stesso importo ma data lontana (oltre ai giorni normali tra operazione e valuta). */
  dateDiffs: { entry: StatementEntry; tx: CheckedTx; days: number }[];
  /** Importo diverso, ma data e segno fanno pensare alla stessa spesa: possibile errore di battitura. */
  amountDiffs: { entry: StatementEntry; tx: CheckedTx; diffCents: number }[];
  /** Nell'estratto ma non in Quadra. */
  missingInQuadra: { entry: StatementEntry; elsewhere?: ElsewhereHint }[];
  /** In Quadra (nel periodo) ma non nell'estratto; `pending` se è degli ultimi giorni e potrebbe non essere ancora addebitata. */
  notInStatement: { tx: CheckedTx; pending: boolean }[];
  totals: {
    statementIn: number;
    statementOut: number;
    quadraIn: number;
    quadraOut: number;
  };
  /** Pochissime corrispondenze: probabilmente il conto scelto non è quello dell'estratto. */
  likelyWrongAccount: boolean;
  /** Tutto torna: niente di mancante, di sbagliato o in più. */
  clean: boolean;
}

/** Giorni di tolleranza oltre le date scritte dalla banca (operazione e valuta). */
const DATE_SLACK = 10;
const AMOUNT_SLACK = 3;
/** Per suggerire il conto giusto la data deve essere più vicina. */
const HINT_SLACK = 5;
const PENDING_DAYS = 3;
const MARGIN_DAYS = 5;

/** Distanza in giorni tra una data e l'intervallo [valuta, operazione] di una riga (0 se ci cade dentro). */
function distance(entry: StatementEntry, date: IsoDate): number {
  const lo = entry.date < entry.valueDate ? entry.date : entry.valueDate;
  const hi = entry.date < entry.valueDate ? entry.valueDate : entry.date;
  if (date < lo) return diffDays(date, lo);
  if (date > hi) return diffDays(hi, date);
  return 0;
}

/** Distanza dalla data più vicina tra operazione e valuta: a parità, vince la corrispondenza più precisa. */
function edge(entry: StatementEntry, date: IsoDate): number {
  return Math.min(Math.abs(diffDays(entry.date, date)), Math.abs(diffDays(entry.valueDate, date)));
}

/**
 * Confronta un estratto conto con i movimenti di un conto: importi e date.
 * `others` sono i movimenti degli altri conti, usati solo per suggerire dove è finita una riga mancante.
 */
export function compareStatement(
  statement: Statement,
  transactions: CheckedTx[],
  others: (CheckedTx & { accountName: string })[] = [],
): StatementCheck {
  const { from, to } = statement;
  // Qualche giorno prima dell'inizio: la banca può registrare dopo la data in cui hai speso.
  const candidates = transactions.filter(
    (t) => t.date >= addDays(from, -MARGIN_DAYS) && t.date <= to,
  );
  const inPeriod = candidates.filter((t) => t.date >= from);
  const free = new Set(candidates.map((t) => t.id));
  const byId = new Map(candidates.map((t) => [t.id, t]));
  const left = new Set(statement.entries.map((_, i) => i));

  const matched: StatementCheck['matched'] = [];
  const dateDiffs: StatementCheck['dateDiffs'] = [];
  const amountDiffs: StatementCheck['amountDiffs'] = [];

  /** Associa le righe ancora libere con lo stesso importo a distanza minima, fino a `maxDays`. */
  const pair = (
    maxDays: number,
    onPair: (i: number, tx: CheckedTx, dist: number) => void,
  ): void => {
    const candidates: { i: number; id: string; dist: number; edge: number }[] = [];
    for (const i of left) {
      const e = statement.entries[i]!;
      for (const id of free) {
        const t = byId.get(id)!;
        if (t.amountCents !== e.cents) continue;
        const dist = distance(e, t.date);
        if (dist <= maxDays) candidates.push({ i, id, dist, edge: edge(e, t.date) });
      }
    }
    candidates.sort((a, b) => a.dist - b.dist || a.edge - b.edge || a.i - b.i);
    for (const c of candidates) {
      if (!left.has(c.i) || !free.has(c.id)) continue;
      left.delete(c.i);
      free.delete(c.id);
      onPair(c.i, byId.get(c.id)!, c.dist);
    }
  };

  pair(0, (i, tx) => matched.push({ entry: statement.entries[i]!, tx }));
  pair(DATE_SLACK, (i, tx, dist) =>
    dateDiffs.push({ entry: statement.entries[i]!, tx, days: dist }),
  );

  // Importo diverso: stesso segno, data vicina e differenza contenuta (es. 15,13 scritto 15,31).
  const near: { i: number; id: string; diff: number; dist: number }[] = [];
  for (const i of left) {
    const e = statement.entries[i]!;
    for (const id of free) {
      const t = byId.get(id)!;
      if (Math.sign(t.amountCents) !== Math.sign(e.cents)) continue;
      const dist = distance(e, t.date);
      const diff = Math.abs(t.amountCents - e.cents);
      if (
        dist <= AMOUNT_SLACK &&
        diff <= Math.max(Math.abs(e.cents), Math.abs(t.amountCents)) * 0.25
      ) {
        near.push({ i, id, diff, dist });
      }
    }
  }
  near.sort((a, b) => a.diff - b.diff || a.dist - b.dist);
  for (const c of near) {
    if (!left.has(c.i) || !free.has(c.id)) continue;
    left.delete(c.i);
    free.delete(c.id);
    const tx = byId.get(c.id)!;
    amountDiffs.push({
      entry: statement.entries[c.i]!,
      tx,
      diffCents: tx.amountCents - statement.entries[c.i]!.cents,
    });
  }

  const missingInQuadra = [...left]
    .sort((a, b) => a - b)
    .map((i) => {
      const entry = statement.entries[i]!;
      const hit = others.find(
        (o) => o.amountCents === entry.cents && distance(entry, o.date) <= HINT_SLACK,
      );
      return {
        entry,
        elsewhere: hit && {
          accountName: hit.accountName,
          date: hit.date,
          description: hit.description,
        },
      };
    });

  const notInStatement = inPeriod
    .filter((t) => free.has(t.id))
    .map((t) => ({ tx: t, pending: diffDays(t.date, to) <= PENDING_DAYS }));

  const sumBy = (xs: number[], sign: 1 | -1): number =>
    xs.filter((c) => Math.sign(c) === sign).reduce((s, c) => s + Math.abs(c), 0);
  const stCents = statement.entries.map((e) => e.cents);
  // Somme di Quadra: i movimenti del periodo più quelli appena prima che la banca ha abbinato.
  const qCents = candidates
    .filter((t) => t.date >= from || !free.has(t.id))
    .map((t) => t.amountCents);

  const total = statement.entries.length;
  const clean =
    missingInQuadra.length === 0 &&
    amountDiffs.length === 0 &&
    dateDiffs.length === 0 &&
    notInStatement.every((n) => n.pending) &&
    statement.warnings.length === 0;
  return {
    from,
    to,
    statementCount: total,
    quadraCount: candidates.filter((t) => t.date >= from || !free.has(t.id)).length,
    matched,
    dateDiffs,
    amountDiffs,
    missingInQuadra,
    notInStatement,
    totals: {
      statementIn: sumBy(stCents, 1),
      statementOut: sumBy(stCents, -1),
      quadraIn: sumBy(qCents, 1),
      quadraOut: sumBy(qCents, -1),
    },
    likelyWrongAccount: total >= 5 && matched.length + dateDiffs.length < total * 0.2,
    clean,
  };
}
