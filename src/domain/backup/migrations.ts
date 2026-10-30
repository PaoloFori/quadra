import type { BackupData } from '../types';

export const CURRENT_SCHEMA_VERSION = 1;

type Raw = Record<string, unknown>;
type Migration = (data: Raw) => Raw;

/**
 * Catena di migrazioni: la chiave N porta un backup dalla versione N alla N+1.
 * Per cambiare il formato: incrementare CURRENT_SCHEMA_VERSION e aggiungere qui la funzione pura.
 * Esempio: `1: (d) => ({ ...d, budgets: (d.budgets as Raw[]).map(...) })`
 */
export const MIGRATIONS: Record<number, Migration> = {};

const EMPTY: BackupData = {
  accounts: [],
  transactions: [],
  categories: [],
  rules: [],
  budgets: [],
  profiles: [],
  settings: { language: 'auto' },
};

export function migrateBackup(
  data: Raw,
  fromVersion: number,
  migrations: Record<number, Migration> = MIGRATIONS,
  target = CURRENT_SCHEMA_VERSION,
): BackupData {
  let current = data;
  for (let v = fromVersion; v < target; v++) {
    const step = migrations[v];
    if (!step) throw new Error(`Missing backup migration ${v} -> ${v + 1}`);
    current = step(current);
  }
  // Campi mancanti (es. backup di mese/anno senza qualche tabella) → vuoti.
  return { ...EMPTY, ...current } as BackupData;
}
