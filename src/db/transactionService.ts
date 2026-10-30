import { hashInput } from '@/domain/importing/dedupe';
import { learnRule, matchCategory } from '@/domain/rules';
import type { Transaction } from '@/domain/types';
import { sha256 } from '@/lib/hash';
import { db } from './database';
import { newId } from './repositories';

export interface ManualInput {
  accountId: string;
  date: string;
  /** Con segno: negativo = uscita. */
  amountCents: number;
  categoryId: string | null;
  note: string;
}

export async function addManualTransaction(input: ManualInput): Promise<Transaction> {
  const now = Date.now();
  const tx: Transaction = {
    id: newId(),
    accountId: input.accountId,
    date: input.date,
    amountCents: input.amountCents,
    description: '',
    note: input.note.trim() || undefined,
    categoryId: input.categoryId,
    hash: await sha256(
      hashInput(input.accountId, {
        date: input.date,
        amountCents: input.amountCents,
        description: input.note,
      }),
    ),
    isTransfer: false,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
  };
  await db.transactions.add(tx);
  return tx;
}

export type EditableFields = Pick<
  Transaction,
  'accountId' | 'date' | 'amountCents' | 'categoryId' | 'note'
> &
  Partial<Pick<Transaction, 'description'>>;

export async function updateTransaction(id: string, changes: EditableFields): Promise<void> {
  await db.transactions.update(id, {
    ...changes,
    note: changes.note?.trim() || undefined,
    updatedAt: Date.now(),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

/**
 * Salva la nuova categoria e impara dalla correzione: crea/aggiorna una regola "descrizione contiene X → categoria"
 * e, se richiesto, la applica ai movimenti ancora senza categoria. Restituisce quanti movimenti simili sono stati categorizzati.
 */
export async function recategorize(
  tx: Transaction,
  categoryId: string,
  applyToSimilar: boolean,
): Promise<number> {
  const text = tx.description || tx.note || '';
  return db.transaction('rw', db.transactions, db.rules, async () => {
    await db.transactions.update(tx.id, { categoryId, updatedAt: Date.now() });
    const rules = await db.rules.toArray();
    const updated = learnRule(rules, text, categoryId, newId());
    const changed = updated.filter(
      (r) => !rules.find((o) => o.id === r.id && o.categoryId === r.categoryId),
    );
    await db.rules.bulkPut(changed);
    if (!applyToSimilar || changed.length === 0) return 0;
    const similar = await db.transactions
      .filter(
        (t) =>
          t.id !== tx.id &&
          t.categoryId === null &&
          !t.isTransfer &&
          matchCategory(t.description || t.note || '', changed) === categoryId,
      )
      .primaryKeys();
    await db.transactions.bulkUpdate(
      similar.map((key) => ({ key, changes: { categoryId, updatedAt: Date.now() } })),
    );
    return similar.length;
  });
}

export async function setTransfer(tx: Transaction, isTransfer: boolean): Promise<void> {
  const groupId = tx.transferGroupId;
  await db.transaction('rw', db.transactions, async () => {
    const ids = groupId
      ? await db.transactions.where('transferGroupId').equals(groupId).primaryKeys()
      : [tx.id];
    const changes = isTransfer
      ? { isTransfer: true, transferGroupId: groupId ?? newId(), categoryId: null }
      : { isTransfer: false, transferGroupId: undefined };
    await db.transactions.bulkUpdate(
      ids.map((key) => ({ key, changes: { ...changes, updatedAt: Date.now() } })),
    );
  });
}
