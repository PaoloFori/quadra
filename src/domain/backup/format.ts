import { canonicalJson, sha256 } from '@/lib/hash';
import { monthOf, yearOf } from '@/lib/dates';
import type { BackupData, Settings } from '../types';
import { migrateBackup, CURRENT_SCHEMA_VERSION } from './migrations';

export type BackupRange =
  { kind: 'all' } | { kind: 'month'; value: string } | { kind: 'year'; value: string };

export interface BackupFile {
  app: 'quadra';
  schemaVersion: number;
  createdAt: string;
  range: BackupRange;
  checksum: string;
  data: BackupData;
}

export class BackupError extends Error {
  constructor(readonly code: 'invalid' | 'checksum' | 'tooNew') {
    super(code);
  }
}

export const checksumOf = async (data: BackupData): Promise<string> =>
  `sha256:${await sha256(canonicalJson(data))}`;

function inRange(date: string, range: BackupRange): boolean {
  if (range.kind === 'all') return true;
  return range.kind === 'month' ? monthOf(date) === range.value : yearOf(date) === range.value;
}

/** Costruisce il file. Per mese/anno: solo quei movimenti, ma tutto il resto (categorie, regole…) per reimportarlo da solo. */
export async function createBackup(
  data: BackupData,
  range: BackupRange,
  now: Date = new Date(),
): Promise<BackupFile> {
  const scoped: BackupData = {
    ...data,
    transactions: data.transactions.filter((t) => inRange(t.date, range)),
  };
  return {
    app: 'quadra',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    range,
    checksum: await checksumOf(scoped),
    data: scoped,
  };
}

/** Legge un file di backup: valida struttura, versione e checksum, poi migra alla versione corrente. */
export async function parseBackup(text: string): Promise<BackupFile> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupError('invalid');
  }
  if (
    !isRecord(raw) ||
    raw.app !== 'quadra' ||
    typeof raw.schemaVersion !== 'number' ||
    !isRecord(raw.data)
  ) {
    throw new BackupError('invalid');
  }
  if (raw.schemaVersion > CURRENT_SCHEMA_VERSION) throw new BackupError('tooNew');

  // Il checksum si verifica sul contenuto così com'è nel file (prima della migrazione).
  if (typeof raw.checksum === 'string') {
    const actual = `sha256:${await sha256(canonicalJson(raw.data))}`;
    if (actual !== raw.checksum) throw new BackupError('checksum');
  }

  const data = migrateBackup(raw.data, raw.schemaVersion);
  const defaults: Settings = { language: 'auto' };
  const settings: Settings = { ...defaults, ...(data.settings ?? {}) };
  return {
    app: 'quadra',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    range: isRange(raw.range) ? raw.range : { kind: 'all' },
    checksum: typeof raw.checksum === 'string' ? raw.checksum : '',
    data: { ...data, settings },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isRange(v: unknown): v is BackupRange {
  return (
    isRecord(v) &&
    (v.kind === 'all' || ((v.kind === 'month' || v.kind === 'year') && typeof v.value === 'string'))
  );
}

export function backupFilename(range: BackupRange, now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 10);
  const scope = range.kind === 'all' ? `completo-${stamp}` : range.value;
  return `quadra-backup-${scope}.json`;
}
