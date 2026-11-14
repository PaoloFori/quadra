import type { IsoDate, Transaction } from '../types';

export type MovementsSort = 'day' | 'category' | 'amount';

export type MovementItem =
  | { kind: 'header'; key: string; date?: IsoDate; categoryId?: string | null; totalCents: number }
  | { kind: 'tx'; tx: Transaction };

const byNewest = (a: Transaction, b: Transaction): number =>
  b.date.localeCompare(a.date) || b.createdAt - a.createdAt;

/**
 * Elenco dei movimenti di un periodo pronto da mostrare.
 * - `day`: dal più recente, un'intestazione (con il totale) per ogni giorno;
 * - `category`: un gruppo per categoria, dal più costoso, movimenti dal più recente;
 * - `amount`: elenco piatto, dal movimento più grande (in valore assoluto).
 * I giroconti non entrano nei totali delle intestazioni.
 */
export function movementItems(
  rows: readonly Transaction[],
  sort: MovementsSort,
  categoryName: (id: string | null) => string,
): MovementItem[] {
  if (sort === 'amount') {
    return [...rows]
      .sort((a, b) => Math.abs(b.amountCents) - Math.abs(a.amountCents) || byNewest(a, b))
      .map((tx) => ({ kind: 'tx', tx }));
  }
  const groups = new Map<
    string,
    { header: MovementItem & { kind: 'header' }; txs: Transaction[] }
  >();
  for (const tx of [...rows].sort(byNewest)) {
    const key =
      sort === 'day' ? tx.date : tx.isTransfer ? '__transfer' : (tx.categoryId ?? '__none');
    let g = groups.get(key);
    if (!g) {
      g = {
        header:
          sort === 'day'
            ? { kind: 'header', key, date: tx.date, totalCents: 0 }
            : {
                kind: 'header',
                key,
                categoryId: tx.isTransfer ? null : tx.categoryId,
                totalCents: 0,
              },
        txs: [],
      };
      groups.set(key, g);
    }
    if (!tx.isTransfer) g.header.totalCents += tx.amountCents;
    g.txs.push(tx);
  }
  let list = [...groups.values()];
  if (sort === 'category') {
    list = list.sort(
      (a, b) =>
        a.header.totalCents - b.header.totalCents ||
        categoryName(a.header.categoryId ?? null).localeCompare(
          categoryName(b.header.categoryId ?? null),
        ),
    );
  }
  return list.flatMap((g) => [g.header, ...g.txs.map((tx): MovementItem => ({ kind: 'tx', tx }))]);
}

/** Primi `count` movimenti dell'elenco (le intestazioni non contano e non restano orfane in fondo). */
export function takeMovements(items: readonly MovementItem[], count: number): MovementItem[] {
  const out: MovementItem[] = [];
  let txs = 0;
  for (const it of items) {
    if (it.kind === 'tx') {
      if (txs === count) break;
      txs++;
    } else if (txs === count) break;
    out.push(it);
  }
  return out;
}
