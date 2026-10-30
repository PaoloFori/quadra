import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { QuadraDb } from '@/db/database';

/** Crea un database come lo faceva la versione 1 (con i due conti predefiniti). */
async function legacyDb(name: string, withTx: boolean): Promise<void> {
  const old = new Dexie(name);
  old.version(1).stores({
    transactions: 'id, accountId, date, [accountId+date], categoryId, hash, transferGroupId',
    accounts: 'id',
    categories: 'id',
    rules: 'id',
    budgets: 'id, categoryId',
    profiles: 'id',
    settings: 'key',
  });
  await old.open();
  await old.table('accounts').bulkAdd([
    { id: 'bbva', name: 'BBVA', bank: 'bbva' },
    { id: 'intesa', name: 'Intesa Sanpaolo', bank: 'intesa' },
    { id: 'mio', name: 'Contanti', bank: 'other' },
  ]);
  if (withTx)
    await old.table('transactions').add({ id: 't1', accountId: 'bbva', date: '2026-01-01' });
  old.close();
}

describe('migrazione v2: conti predefiniti', () => {
  it('toglie i conti predefiniti vuoti e lascia quelli dell’utente', async () => {
    await legacyDb('legacy-empty', false);
    const db = new QuadraDb('legacy-empty');
    expect((await db.accounts.toArray()).map((a) => a.id)).toEqual(['mio']);
    db.close();
  });

  it('non tocca un conto predefinito che ha già movimenti', async () => {
    await legacyDb('legacy-used', true);
    const db = new QuadraDb('legacy-used');
    expect((await db.accounts.toArray()).map((a) => a.id).sort()).toEqual(['bbva', 'mio']);
    db.close();
  });
});
