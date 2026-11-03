import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import {
  autoRegisterDue,
  createRecurrence,
  makeRecurring,
  registerOccurrence,
  skipOccurrence,
} from '@/db/recurrenceService';
import { addManualTransaction, updateTransaction } from '@/db/transactionService';

const salary = {
  title: 'Stipendio',
  accountId: 'a',
  amountCents: 150000,
  categoryId: 'salary',
  frequency: 'monthly' as const,
  nextDue: '2026-10-27',
  remind: true,
};

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('ricorrenze', () => {
  it('registrare una scadenza crea il movimento e porta avanti la data', async () => {
    const rec = await createRecurrence(salary);
    const tx = await registerOccurrence(rec, {
      dueDate: '2026-10-27',
      date: '2026-10-27',
      amountCents: 150000,
    });
    expect(tx).toMatchObject({ recurrenceId: rec.id, dueDate: '2026-10-27', amountCents: 150000 });
    expect((await db.recurrences.get(rec.id))?.nextDue).toBe('2026-11-27');
  });

  it('un mese con importo diverso cambia solo quel movimento, non la ricorrenza', async () => {
    const rec = await createRecurrence(salary);
    await registerOccurrence(rec, {
      dueDate: '2026-10-27',
      date: '2026-10-27',
      amountCents: 150000,
    });
    const next = (await db.recurrences.get(rec.id))!;
    const bigger = await registerOccurrence(next, {
      dueDate: '2026-11-27',
      date: '2026-11-28',
      amountCents: 170000,
    });
    expect(bigger.amountCents).toBe(170000);
    const after = (await db.recurrences.get(rec.id))!;
    expect(after.amountCents).toBe(150000); // l'importo abituale resta
    expect(after.nextDue).toBe('2026-12-27');
  });

  it('modificare un movimento già registrato non tocca gli altri né la ricorrenza', async () => {
    const rec = await createRecurrence(salary);
    const a = await registerOccurrence(rec, {
      dueDate: '2026-10-27',
      date: '2026-10-27',
      amountCents: 150000,
    });
    const next = (await db.recurrences.get(rec.id))!;
    const b = await registerOccurrence(next, {
      dueDate: '2026-11-27',
      date: '2026-11-27',
      amountCents: 150000,
    });
    await updateTransaction(b.id, {
      accountId: b.accountId,
      date: b.date,
      amountCents: 170000,
      categoryId: b.categoryId,
      note: b.note,
    });
    expect((await db.transactions.get(a.id))?.amountCents).toBe(150000);
    expect((await db.transactions.get(b.id))?.amountCents).toBe(170000);
    expect((await db.recurrences.get(rec.id))?.amountCents).toBe(150000);
  });

  it('registrare due volte la stessa scadenza non duplica', async () => {
    const rec = await createRecurrence(salary);
    const o = { dueDate: '2026-10-27', date: '2026-10-27', amountCents: 150000 };
    await registerOccurrence(rec, o);
    await registerOccurrence(rec, o);
    expect(await db.transactions.count()).toBe(1);
  });

  it('«Salta» va avanti senza creare movimenti', async () => {
    const rec = await createRecurrence(salary);
    await skipOccurrence(rec, '2026-10-27');
    expect(await db.transactions.count()).toBe(0);
    expect((await db.recurrences.get(rec.id))?.nextDue).toBe('2026-11-27');
  });

  it('senza avviso si registra da sola, arretrati compresi; con avviso aspetta', async () => {
    await createRecurrence({
      ...salary,
      title: 'Affitto',
      amountCents: -60000,
      remind: false,
      nextDue: '2026-08-05',
    });
    await createRecurrence(salary);
    const count = await autoRegisterDue('2026-10-30');
    expect(count).toBe(3); // 5 ago, 5 set, 5 ott
    const all = await db.transactions.toArray();
    expect(all.every((t) => t.note === 'Affitto')).toBe(true);
    expect((await db.recurrences.toArray()).find((r) => r.title === 'Affitto')?.nextDue).toBe(
      '2026-11-05',
    );
  });

  it('rendere ricorrente un movimento esistente', async () => {
    const tx = await addManualTransaction({
      accountId: 'a',
      date: '2026-10-31',
      amountCents: -999,
      categoryId: 'subscriptions',
      note: 'Netflix',
    });
    const rec = await makeRecurring(tx, { frequency: 'monthly', remind: true });
    expect(rec.nextDue).toBe('2026-11-30');
    expect(rec.anchorDay).toBe(31);
    expect((await db.transactions.get(tx.id))?.recurrenceId).toBe(rec.id);
  });
});
