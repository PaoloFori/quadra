import type { BankProfile, ColumnMapping, DateFormat } from '../types';
import {
  detectDateFormat,
  detectDecimalSeparator,
  detectHeader,
  headerSignature,
  matchProfile,
} from './detect';
import type { ParseOptions } from './parse';
import type { Table } from './table';

export interface FormatAnalysis extends ParseOptions {
  source: 'profile' | 'detected';
  profile?: BankProfile;
  /** Firma normalizzata delle intestazioni, per salvare il profilo. */
  signature: string[];
}

/** Sceglie come leggere un file: profilo salvato → rilevamento dalle intestazioni → null (serve mappatura manuale). */
export function analyzeTable(table: Table, profiles: BankProfile[]): FormatAnalysis | null {
  const saved = matchProfile(table, profiles);
  if (saved) {
    return {
      source: 'profile',
      profile: saved.profile,
      headerRow: saved.headerRow,
      mapping: saved.profile.mapping,
      dateFormat: saved.profile.dateFormat,
      decimalSeparator: saved.profile.decimalSeparator,
      signature: saved.profile.headerSignature,
    };
  }
  const detected = detectHeader(table);
  if (!detected) return null;
  return {
    source: 'detected',
    headerRow: detected.headerRow,
    mapping: detected.mapping,
    dateFormat: detectDateFormat(table, detected.headerRow, detected.mapping.date),
    decimalSeparator: detectDecimalSeparator(table, detected.headerRow, detected.mapping),
    signature: headerSignature(table[detected.headerRow] ?? []),
  };
}

/** Per la mappatura manuale: stessi formati rilevati automaticamente a partire dalla scelta dell'utente. */
export function analyzeManual(
  table: Table,
  headerRow: number,
  mapping: ColumnMapping,
): FormatAnalysis {
  const dateFormat: DateFormat = detectDateFormat(table, headerRow, mapping.date);
  return {
    source: 'detected',
    headerRow,
    mapping,
    dateFormat,
    decimalSeparator: detectDecimalSeparator(table, headerRow, mapping),
    signature: headerSignature(table[headerRow] ?? []),
  };
}
