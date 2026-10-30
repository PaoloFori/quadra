import { beforeEach, describe, expect, it } from 'vitest';
import { accountBalances, openingFor } from '@/domain/balances';
import { lastSpendingByCategory, similarTransactions } from '@/domain/history';
import { db } from '@/db/database';
import { setAccountBalance, getAccountBalances } from '@/db/accountService';
import { addManualTransaction } from '@/db/transactionService';
import type { Transaction } from '@/domain/types';

let n = 0;
const tx = (date: string, amountCents: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`,
  accountId: 'bbva',
  date,
  amountCents,
  description: 'x',
  categoryId: 'groceries',
  hash: 'h',
  isTransfer: false,
  source: 'import',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('saldi', () => {
  it('saldo = apertura + movimenti', () => {
    const [a] = accountBalances(
      [{ id: 'bbva', name: 'BBVA', bank: 'bbva', openingBalanceCents: 1000 }],
      new Map([['bbva', -250]]),
    );
    expect(a?.balanceCents).toBe(750);
  });
  it('openingFor fa tornare il saldo desiderato', () => {
    expect(openingFor(50000, -12000)).toBe(62000);
  });
  it('impostare il saldo aggiorna il conto e resta coerente con nuovi movimenti', async () => {
    await db.delete();
    await db.open();
    await addManualTransaction({
      accountId: 'bbva',
      date: '2026-01-01',
      amountCents: -2000,
      categoryId: null,
      note: 'a',
    });
    await setAccountBalance('bbva', 100000);
    expect((await getAccountBalances()).find((b) => b.account.id === 'bbva')?.balanceCents).toBe(
      100000,
    );
    await addManualTransaction({
      accountId: 'bbva',
      date: '2026-01-02',
      amountCents: -500,
      categoryId: null,
      note: 'b',
    });
    expect((await getAccountBalances()).find((b) => b.account.id === 'bbva')?.balanceCents).toBe(
      99500,
    );
  });
});

describe('storico', () => {
  beforeEach(() => void (n = 0));
  it('ultima spesa per categoria, dalla più recente, senza giroconti né entrate', () => {
    const res = lastSpendingByCategory([
      tx('2026-03-01', -1000),
      tx('2026-03-10', -500),
      tx('2026-04-01', -300, { categoryId: 'fuel' }),
      tx('2026-05-01', 9000, { categoryId: 'salary' }),
      tx('2026-06-01', -100, { isTransfer: true }),
    ]);
    expect(res.map((r) => r.categoryId)).toEqual(['fuel', 'groceries']);
    expect(res[1]).toMatchObject({ count: 2, spentCents: 1500 });
    expect(res[1]?.last.date).toBe('2026-03-10');
  });
  it('simili: stesso esercente prima, altrimenti stessa categoria', () => {
    const base = tx('2026-03-10', -500, { description: 'Spesa Lidl Telomare' });
    const all = [
      base,
      tx('2026-02-01', -400, { description: 'spesa lidl legnaro' }),
      tx('2026-02-05', -90, { description: 'Conad' }),
    ];
    expect(similarTransactions(all, base).map((t) => t.description)).toEqual([
      'spesa lidl legnaro',
    ]);
    const lone = tx('2026-03-11', -10, { description: 'zzz' });
    expect(similarTransactions([lone, ...all], lone).length).toBe(3);
  });
});
