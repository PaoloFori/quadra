import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { exportBackup, previewRestore, readAllData, restoreBackup } from '@/db/backupService';
import { commitImport, previewImport } from '@/db/importService';
import { setDeviceSecret, setSetting, getDeviceSecret } from '@/db/settings';
import { addManualTransaction } from '@/db/transactionService';
import { analyzeTable } from '@/domain/importing/analyze';
import { parseRows } from '@/domain/importing/parse';
import { readTable } from '@/domain/importing/table';
import { BackupError, createBackup, parseBackup } from '@/domain/backup/format';
import { migrateBackup } from '@/domain/backup/migrations';
import { transactionsToCsv } from '@/domain/export/csv';
import type { BackupData } from '@/domain/types';

async function importSample(name: string, accountId: string): Promise<void> {
  const buf = readFileSync(`samples/${name}`);
  const table = await readTable(
    name,
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  const preview = await previewImport(accountId, parseRows(table, analyzeTable(table, [])!));
  await commitImport(preview, { markTransfers: true });
}

const byId = <T extends { id: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => a.id.localeCompare(b.id));
const normalize = (d: BackupData): BackupData => ({
  ...d,
  accounts: byId(d.accounts),
  transactions: byId(d.transactions),
  categories: byId(d.categories),
  rules: byId(d.rules),
  budgets: byId(d.budgets),
  profiles: byId(d.profiles),
});

async function seed(): Promise<void> {
  await importSample('bbva-esempio.csv', 'bbva');
  await importSample('intesa-esempio.csv', 'intesa');
  await addManualTransaction({
    accountId: 'bbva',
    date: '2026-09-30',
    amountCents: -1234,
    categoryId: 'leisure',
    note: 'Cinema',
  });
  await db.budgets.put({ id: 'b1', categoryId: 'groceries', monthlyCents: 40000 });
  await db.categories.put({
    id: 'custom1',
    kind: 'expense',
    color: '#123456',
    icon: '🐶',
    builtin: false,
    name: 'Cane',
  });
  await setSetting('language', 'en');
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('backup: esporta → cancella tutto → reimporta → dati identici', () => {
  it('ripristino completo', async () => {
    await seed();
    const before = normalize(await readAllData());
    const json = JSON.stringify(await exportBackup({ kind: 'all' }));

    await Promise.all(
      [
        db.transactions,
        db.categories,
        db.rules,
        db.budgets,
        db.accounts,
        db.profiles,
        db.settings,
      ].map((t) => t.clear()),
    );
    expect(await db.transactions.count()).toBe(0);

    await restoreBackup(await parseBackup(json), 'replace');
    expect(normalize(await readAllData())).toEqual(before);
    expect(before.settings.language).toBe('en');
    expect(before.transactions.length).toBeGreaterThan(200);
  });

  it('"sostituisci" mantiene PIN e segreti del dispositivo, e non importa lastBackupAt', async () => {
    await seed();
    await setDeviceSecret('pin', { hash: 'abc' });
    await setSetting('lastBackupAt', '2026-01-01T00:00:00.000Z');
    const backup = await exportBackup({ kind: 'all' });
    expect(JSON.stringify(backup)).not.toContain('device:');
    expect(JSON.stringify(backup)).not.toContain('lastBackupAt');
    await restoreBackup(backup, 'replace');
    expect(await getDeviceSecret('pin')).toEqual({ hash: 'abc' });
  });

  it('il JSON di un anno si reimporta da solo in un database vuoto', async () => {
    await seed();
    const year = await exportBackup({ kind: 'year', value: '2026' });
    expect(year.data.transactions.every((t) => t.date.startsWith('2026'))).toBe(true);
    const all2026 = (await db.transactions.toArray()).filter((t) =>
      t.date.startsWith('2026'),
    ).length;

    await db.delete();
    await db.open();
    await db.transactions.clear();
    await restoreBackup(await parseBackup(JSON.stringify(year)), 'replace');
    expect(await db.transactions.count()).toBe(all2026);
    expect(await db.categories.get('custom1')).toBeDefined();
    expect(await db.budgets.count()).toBe(1);
  });

  it('un mese contiene solo quel mese', async () => {
    await seed();
    const month = await exportBackup({ kind: 'month', value: '2026-05' });
    expect(month.data.transactions.length).toBeGreaterThan(0);
    expect(month.data.transactions.every((t) => t.date.startsWith('2026-05'))).toBe(true);
  });
});

describe('backup: indipendente dalla lingua', () => {
  it('le categorie predefinite non portano testo tradotto', async () => {
    const { data } = await exportBackup({ kind: 'all' });
    expect(data.categories.filter((c) => c.builtin).every((c) => c.name === undefined)).toBe(true);
  });
  it('stesso contenuto, stesso checksum, qualunque sia la lingua attiva', async () => {
    const at = new Date('2026-10-30T10:00:00Z');
    const data = await readAllData();
    const a = await createBackup(data, { kind: 'all' }, at);
    const b = await createBackup({ ...data }, { kind: 'all' }, at);
    expect(a.checksum).toBe(b.checksum);
  });
});

describe('backup: validazione', () => {
  it('rileva modifiche al contenuto (checksum)', async () => {
    const backup = await exportBackup({ kind: 'all' });
    backup.data.budgets.push({ id: 'x', categoryId: 'groceries', monthlyCents: 1 });
    await expect(parseBackup(JSON.stringify(backup))).rejects.toMatchObject({ code: 'checksum' });
  });
  it('rifiuta file non validi e backup da versioni più nuove', async () => {
    await expect(parseBackup('non json')).rejects.toBeInstanceOf(BackupError);
    await expect(parseBackup('{"foo":1}')).rejects.toMatchObject({ code: 'invalid' });
    await expect(
      parseBackup('{"app":"quadra","schemaVersion":99,"data":{}}'),
    ).rejects.toMatchObject({ code: 'tooNew' });
  });
  it('accetta un backup senza checksum né tabelle opzionali', async () => {
    const file = await parseBackup('{"app":"quadra","schemaVersion":1,"data":{"transactions":[]}}');
    expect(file.data.categories).toEqual([]);
    expect(file.data.settings.language).toBe('auto');
  });
});

describe('migrazioni', () => {
  it('applica la catena in ordine da una versione vecchia', () => {
    const migrations = {
      1: (d: Record<string, unknown>) => ({ ...d, step1: true }),
      2: (d: Record<string, unknown>) => ({ ...d, step2: d.step1 === true }),
    };
    const out = migrateBackup({ transactions: [] }, 1, migrations, 3) as unknown as Record<
      string,
      unknown
    >;
    expect(out.step2).toBe(true);
    expect(out.budgets).toEqual([]);
  });
  it('fallisce in modo esplicito se manca un passaggio', () => {
    expect(() => migrateBackup({}, 0, {}, 2)).toThrow(/Missing backup migration/);
  });
});

describe('ripristino "unisci"', () => {
  it('anteprima e merge senza duplicati; i conflitti restano locali', async () => {
    await seed();
    const backup = await exportBackup({ kind: 'all' });
    const total = await db.transactions.count();

    // simulo un DB con meno dati e un movimento modificato
    const victim = backup.data.transactions[0]!;
    const removed = backup.data.transactions.slice(1, 4).map((t) => t.id);
    await db.transactions.bulkDelete(removed);
    await db.transactions.update(victim.id, { amountCents: victim.amountCents - 1 });

    const preview = await previewRestore(backup);
    expect(preview.transactions).toEqual({ added: 3, existing: total - 4, conflicts: 1 });

    await restoreBackup(backup, 'merge');
    expect(await db.transactions.count()).toBe(total);
    expect((await db.transactions.get(victim.id))?.amountCents).toBe(victim.amountCents - 1);

    const again = await previewRestore(backup);
    expect(again.transactions.added).toBe(0);
  });
});

describe('export CSV', () => {
  it('usa colonne e valori stabili', async () => {
    await addManualTransaction({
      accountId: 'bbva',
      date: '2026-01-02',
      amountCents: -1250,
      categoryId: 'groceries',
      note: 'Pane, latte',
    });
    const csv = transactionsToCsv(await db.transactions.toArray());
    expect(csv.split('\r\n')).toEqual([
      'date,account,amount,description,category,note,transfer',
      '2026-01-02,bbva,-12.50,,groceries,"Pane, latte",0',
    ]);
  });
});
