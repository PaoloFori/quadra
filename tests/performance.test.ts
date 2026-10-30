import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { exportBackup, restoreBackup } from '@/db/backupService';
import { filterTransactions } from '@/domain/filters';
import { markDuplicates } from '@/domain/importing/dedupe';
import { buildMonthReport } from '@/domain/reports/month';
import { buildYearReport } from '@/domain/reports/year';
import { detectRecurring } from '@/domain/reports/recurring';
import type { Transaction } from '@/domain/types';

const N = 12_000;

function make(i: number): Transaction {
  const month = (i % 24) + 1;
  const year = 2025 + Math.floor((month - 1) / 12);
  const date = `${year}-${String(((month - 1) % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`;
  return {
    id: `t${i}`,
    accountId: i % 2 ? 'bbva' : 'intesa',
    date,
    amountCents: -((i * 37) % 20000) - 100,
    description: `Pagamento carta esercente ${i % 300}`,
    categoryId: i % 5 ? 'groceries' : null,
    hash: `h${i}`,
    isTransfer: false,
    source: 'import',
    createdAt: 0,
    updatedAt: 0,
  };
}

const time = async <T>(fn: () => T | Promise<T>): Promise<number> => {
  const start = performance.now();
  await fn();
  return performance.now() - start;
};

describe(`prestazioni con ${N} movimenti`, () => {
  const txs = Array.from({ length: N }, (_, i) => make(i));

  beforeAll(async () => {
    await db.delete();
    await db.open();
    await db.transactions.bulkAdd(txs);
  });

  it('report e filtri restano rapidi', async () => {
    expect(await time(() => buildMonthReport(txs, '2025-06'))).toBeLessThan(150);
    expect(await time(() => buildYearReport(txs, '2025'))).toBeLessThan(250);
    expect(
      await time(() => filterTransactions(txs, { text: 'esercente 42', minCents: 500 })),
    ).toBeLessThan(400);
    expect(await time(() => detectRecurring(txs))).toBeLessThan(600);
  });

  it('query per intervallo di date usa l’indice', async () => {
    const ms = await time(() =>
      db.transactions.where('date').between('2025-03-01', '2025-03-31', true, true).toArray(),
    );
    expect(ms).toBeLessThan(300);
  });

  it('deduplica di un file molto grande', async () => {
    const rows = txs
      .slice(0, 5000)
      .map((t) => ({ date: t.date, amountCents: t.amountCents, description: t.description }));
    expect(await time(() => markDuplicates('bbva', rows, new Map()))).toBeLessThan(5000);
  });

  it('backup e ripristino completo', async () => {
    const backup = await exportBackup({ kind: 'all' });
    expect(backup.data.transactions).toHaveLength(N);
    expect(await time(() => restoreBackup(backup, 'replace'))).toBeLessThan(5000);
    expect(await db.transactions.count()).toBe(N);
  });
});
