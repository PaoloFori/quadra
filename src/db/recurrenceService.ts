import { dueDates, nextOccurrence } from '@/domain/recurrence';
import type { Frequency, IsoDate, Recurrence, Transaction } from '@/domain/types';
import { db } from './database';
import { newId } from './repositories';
import { buildManualTransaction } from './transactionService';

export interface NewRecurrence {
  title: string;
  accountId: string;
  amountCents: number;
  categoryId: string | null;
  frequency: Frequency;
  /** Prima scadenza ancora da gestire. */
  nextDue: IsoDate;
  /** Giorno del mese di riferimento; se manca è quello della prima scadenza. */
  anchorDay?: number;
  remind: boolean;
}

export async function createRecurrence(input: NewRecurrence): Promise<Recurrence> {
  const rec: Recurrence = {
    id: newId(),
    ...input,
    title: input.title.trim(),
    anchorDay: input.anchorDay ?? Number(input.nextDue.slice(8, 10)),
    active: true,
    createdAt: Date.now(),
  };
  await db.recurrences.add(rec);
  return rec;
}

/** Rende ricorrente un movimento già inserito: la prossima scadenza è un periodo dopo la sua data. */
export async function makeRecurring(
  tx: Transaction,
  options: { frequency: Frequency; remind: boolean },
): Promise<Recurrence> {
  const anchorDay = Number(tx.date.slice(8, 10));
  const rec = await createRecurrence({
    title: tx.note || tx.description,
    accountId: tx.accountId,
    amountCents: tx.amountCents,
    categoryId: tx.categoryId,
    frequency: options.frequency,
    nextDue: nextOccurrence(tx.date, options.frequency, anchorDay),
    anchorDay,
    remind: options.remind,
  });
  await db.transactions.update(tx.id, { recurrenceId: rec.id, dueDate: tx.date });
  return rec;
}

export interface Occurrence {
  /** La scadenza che si sta registrando. */
  dueDate: IsoDate;
  /** Data e importo del movimento: possono differire dall'abituale solo per questa volta. */
  date: IsoDate;
  amountCents: number;
  note?: string;
}

/** Registra una scadenza come movimento e porta avanti la ricorrenza. Le altre volte restano invariate. */
export async function registerOccurrence(rec: Recurrence, o: Occurrence): Promise<Transaction> {
  // l'hash si calcola prima: dentro una transazione del database non si può aspettare altro
  const fresh = await buildManualTransaction({
    accountId: rec.accountId,
    date: o.date,
    amountCents: o.amountCents,
    categoryId: rec.categoryId,
    note: o.note ?? rec.title,
    recurrenceId: rec.id,
    dueDate: o.dueDate,
  });
  return db.transaction('rw', db.transactions, db.recurrences, async () => {
    const already = await db.transactions
      .where('recurrenceId')
      .equals(rec.id)
      .filter((t) => t.dueDate === o.dueDate)
      .first();
    if (!already) await db.transactions.add(fresh);
    await advance(rec, o.dueDate);
    return already ?? fresh;
  });
}

/** «Salta»: questa volta non conta, la ricorrenza va avanti. */
export async function skipOccurrence(rec: Recurrence, dueDate: IsoDate): Promise<void> {
  await advance(rec, dueDate);
}

async function advance(rec: Recurrence, handled: IsoDate): Promise<void> {
  const fresh = (await db.recurrences.get(rec.id)) ?? rec;
  if (fresh.nextDue > handled) return; // già portata avanti
  await db.recurrences.update(rec.id, {
    nextDue: nextOccurrence(handled, fresh.frequency, fresh.anchorDay),
  });
}

/** Registra da sole le scadenze senza avviso arrivate fino a oggi. Restituisce quante. */
export async function autoRegisterDue(today: IsoDate): Promise<number> {
  const recs = (await db.recurrences.toArray()).filter((r) => r.active && !r.remind);
  let count = 0;
  for (const rec of recs) {
    for (const dueDate of dueDates(rec, today)) {
      await registerOccurrence(rec, { dueDate, date: dueDate, amountCents: rec.amountCents });
      count++;
    }
  }
  return count;
}
