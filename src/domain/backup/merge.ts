import { canonicalJson } from '@/lib/hash';
import type { BackupData } from '../types';

export interface TableDiff {
  added: number;
  existing: number;
  conflicts: number;
}

export interface RestorePreview {
  transactions: TableDiff;
  categories: TableDiff;
  rules: TableDiff;
  budgets: TableDiff;
  accounts: TableDiff;
  profiles: TableDiff;
}

type Keyed = { id: string };

function diffTable<T extends Keyed>(
  local: readonly T[],
  incoming: readonly T[],
  ignore: ReadonlyArray<keyof T> = [],
): TableDiff {
  const byId = new Map(local.map((x) => [x.id, x]));
  const strip = (x: T): string =>
    canonicalJson(
      Object.fromEntries(Object.entries(x).filter(([k]) => !ignore.includes(k as keyof T))),
    );
  const diff: TableDiff = { added: 0, existing: 0, conflicts: 0 };
  for (const item of incoming) {
    const found = byId.get(item.id);
    if (!found) diff.added++;
    else if (strip(found) === strip(item)) diff.existing++;
    else diff.conflicts++;
  }
  return diff;
}

/** Anteprima del ripristino in modalità "unisci": quanti nuovi, già presenti e in conflitto. */
export function previewMerge(local: BackupData, incoming: BackupData): RestorePreview {
  return {
    transactions: diffTable(local.transactions, incoming.transactions, ['updatedAt']),
    categories: diffTable(local.categories, incoming.categories),
    rules: diffTable(local.rules, incoming.rules),
    budgets: diffTable(local.budgets, incoming.budgets),
    accounts: diffTable(local.accounts, incoming.accounts),
    profiles: diffTable(local.profiles, incoming.profiles),
  };
}

function onlyNew<T extends Keyed>(local: readonly T[], incoming: readonly T[]): T[] {
  const ids = new Set(local.map((x) => x.id));
  return incoming.filter((x) => !ids.has(x.id));
}

/** Solo ciò che nel file manca in locale (le impostazioni locali non vengono toccate). */
export function missingData(local: BackupData, incoming: BackupData): BackupData {
  return {
    accounts: onlyNew(local.accounts, incoming.accounts),
    transactions: onlyNew(local.transactions, incoming.transactions),
    categories: onlyNew(local.categories, incoming.categories),
    rules: onlyNew(local.rules, incoming.rules),
    budgets: onlyNew(local.budgets, incoming.budgets),
    profiles: onlyNew(local.profiles, incoming.profiles),
    settings: local.settings,
  };
}

/** "Unisci": aggiunge solo ciò che manca; in caso di conflitto resta la versione locale. */
export function mergeData(local: BackupData, incoming: BackupData): BackupData {
  const extra = missingData(local, incoming);
  return {
    accounts: [...local.accounts, ...extra.accounts],
    transactions: [...local.transactions, ...extra.transactions],
    categories: [...local.categories, ...extra.categories],
    rules: [...local.rules, ...extra.rules],
    budgets: [...local.budgets, ...extra.budgets],
    profiles: [...local.profiles, ...extra.profiles],
    settings: local.settings,
  };
}
