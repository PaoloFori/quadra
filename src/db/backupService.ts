import { createBackup, type BackupFile, type BackupRange } from '@/domain/backup/format';
import { missingData, previewMerge, type RestorePreview } from '@/domain/backup/merge';
import type { BackupData } from '@/domain/types';
import { db } from './database';
import { getSettings, setSetting } from './settings';

export async function readAllData(): Promise<BackupData> {
  const [accounts, transactions, categories, rules, budgets, profiles, settings] =
    await Promise.all([
      db.accounts.toArray(),
      db.transactions.toArray(),
      db.categories.toArray(),
      db.rules.toArray(),
      db.budgets.toArray(),
      db.profiles.toArray(),
      getSettings(),
    ]);
  // lastBackupAt descrive questo dispositivo, non i dati: non viaggia nei backup.
  const { lastBackupAt: _ignored, ...portable } = settings;
  void _ignored;
  return { accounts, transactions, categories, rules, budgets, profiles, settings: portable };
}

export async function exportBackup(range: BackupRange): Promise<BackupFile> {
  return createBackup(await readAllData(), range);
}

/** Da chiamare quando l'utente ha salvato il file (alimenta il promemoria dei 30 giorni). */
export async function markBackupDone(now: Date = new Date()): Promise<void> {
  await setSetting('lastBackupAt', now.toISOString());
}

export async function previewRestore(file: BackupFile): Promise<RestorePreview> {
  return previewMerge(await readAllData(), file.data);
}

async function writeAll(data: BackupData): Promise<void> {
  await db.accounts.bulkPut(data.accounts);
  await db.transactions.bulkPut(data.transactions);
  await db.categories.bulkPut(data.categories);
  await db.rules.bulkPut(data.rules);
  await db.budgets.bulkPut(data.budgets);
  await db.profiles.bulkPut(data.profiles);
  await db.settings.bulkPut(Object.entries(data.settings).map(([key, value]) => ({ key, value })));
}

export type RestoreMode = 'merge' | 'replace';

export async function restoreBackup(file: BackupFile, mode: RestoreMode): Promise<void> {
  const tables = [
    db.accounts,
    db.transactions,
    db.categories,
    db.rules,
    db.budgets,
    db.profiles,
    db.settings,
  ];
  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      // I segreti del dispositivo (PIN, Face ID) e lastBackupAt restano: non fanno parte dei dati.
      const keep = (await db.settings.toArray()).filter(
        (s) => s.key.startsWith('device:') || s.key === 'lastBackupAt',
      );
      await Promise.all(tables.map((t) => t.clear()));
      await db.settings.bulkPut(keep);
      await writeAll(file.data);
    } else {
      await writeAll(missingData(await readAllData(), file.data));
    }
  });
}
