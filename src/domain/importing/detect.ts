import type { BankProfile, ColumnMapping, DateFormat } from '../types';
import { normalizeText } from '@/lib/normalize';
import { parseLocaleAmount } from '@/lib/money';
import type { Table } from './table';

type Field = 'date' | 'valueDate' | 'amount' | 'debit' | 'credit' | 'description' | 'balance';

const SYNONYMS: Record<Field, string[]> = {
  date: [
    'data',
    'data operazione',
    'data contabile',
    'data registrazione',
    'data movimento',
    'fecha',
    'fecha operacion',
    'date',
    'booking date',
    'transaction date',
  ],
  valueDate: ['data valuta', 'fecha valor', 'value date'],
  amount: [
    'importo',
    'importo eur',
    'importo in eur',
    'ammontare',
    'amount',
    'importe',
    'movimento',
  ],
  debit: ['dare', 'addebito', 'addebiti', 'uscite', 'debit', 'debito', 'cargo'],
  credit: ['avere', 'accredito', 'accrediti', 'entrate', 'credit', 'credito', 'abono'],
  description: [
    'descrizione',
    'descrizione operazione',
    'causale',
    'dettagli',
    'dettaglio',
    'operazione',
    'concetto',
    'concepto',
    'description',
    'details',
    'narrative',
  ],
  balance: ['saldo', 'saldo contabile', 'saldo disponibile', 'disponible', 'balance'],
};

const FIELDS = Object.keys(SYNONYMS) as Field[];
const HEADER_SCAN_ROWS = 40;

function normalizeHeader(cell: string): string {
  return normalizeText(cell)
    .replace(/[()€:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 2 = corrispondenza esatta, 1 = contiene la parola, 0 = nessuna. */
function score(header: string, field: Field): number {
  const words = header.split(' ');
  return SYNONYMS[field].reduce((best, syn) => {
    if (header === syn) return 2;
    return words.includes(syn) ? Math.max(best, 1) : best;
  }, 0);
}

function assignColumns(headers: string[]): Partial<Record<Field, number[]>> {
  const result: Partial<Record<Field, Array<{ col: number; s: number }>>> = {};
  headers.forEach((h, col) => {
    if (!h) return;
    const ranked = FIELDS.map((f) => ({ f, s: score(h, f) })).sort((a, b) => b.s - a.s);
    const top = ranked[0];
    if (top && top.s > 0) (result[top.f] ??= []).push({ col, s: top.s });
  });
  return Object.fromEntries(
    Object.entries(result).map(([f, list]) => [
      f,
      list.sort((a, b) => b.s - a.s || a.col - b.col).map((x) => x.col),
    ]),
  );
}

export interface HeaderMatch {
  headerRow: number;
  headers: string[];
  mapping: ColumnMapping;
}

function toMapping(cols: Partial<Record<Field, number[]>>): ColumnMapping | null {
  const date = cols.date?.[0];
  const description = cols.description;
  const hasAmount =
    cols.amount?.[0] !== undefined ||
    (cols.debit?.[0] !== undefined && cols.credit?.[0] !== undefined);
  if (date === undefined || !description?.length || !hasAmount) return null;
  const mapping: ColumnMapping = {
    date,
    description: [...description].sort((a, b) => a - b),
  };
  if (cols.valueDate?.[0] !== undefined) mapping.valueDate = cols.valueDate[0];
  if (cols.amount?.[0] !== undefined) mapping.amount = cols.amount[0];
  else {
    mapping.debit = cols.debit![0]!;
    mapping.credit = cols.credit![0]!;
  }
  if (cols.balance?.[0] !== undefined) mapping.balance = cols.balance[0];
  return mapping;
}

export function headerSignature(row: string[]): string[] {
  return row.map(normalizeHeader).filter((h) => h !== '');
}

/** Cerca la riga d'intestazione (saltando eventuali righe iniziali) e propone la mappatura colonne. */
export function detectHeader(table: Table): HeaderMatch | null {
  for (let i = 0; i < Math.min(table.length, HEADER_SCAN_ROWS); i++) {
    const row = table[i]!;
    const headers = row.map(normalizeHeader);
    const mapping = toMapping(assignColumns(headers));
    if (mapping) return { headerRow: i, headers, mapping };
  }
  return null;
}

/** Riconosce un profilo salvato confrontando la firma delle intestazioni. */
export function matchProfile(
  table: Table,
  profiles: BankProfile[],
): { profile: BankProfile; headerRow: number } | null {
  for (const profile of profiles) {
    const sig = profile.headerSignature.join('|');
    const headerRow = table
      .slice(0, HEADER_SCAN_ROWS)
      .findIndex((r) => headerSignature(r).join('|') === sig);
    if (headerRow >= 0) return { profile, headerRow };
  }
  return null;
}

function sampleColumn(table: Table, headerRow: number, col: number, size = 30): string[] {
  return table
    .slice(headerRow + 1, headerRow + 1 + size)
    .map((r) => r[col] ?? '')
    .filter((c) => c !== '');
}

export function detectDateFormat(table: Table, headerRow: number, col: number): DateFormat {
  const samples = sampleColumn(table, headerRow, col);
  if (samples.some((s) => /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(s))) return 'ymd';
  const parts = samples.map((s) => s.split(/[-/.]/).map(Number));
  if (parts.some((p) => (p[1] ?? 0) > 12)) return 'mdy';
  return 'dmy';
}

export function detectDecimalSeparator(
  table: Table,
  headerRow: number,
  mapping: ColumnMapping,
): ',' | '.' {
  const cols = [mapping.amount, mapping.debit, mapping.credit].filter(
    (c): c is number => c !== undefined,
  );
  const samples = cols.flatMap((c) => sampleColumn(table, headerRow, c));
  const ok = (sep: ',' | '.'): number =>
    samples.filter((s) => parseLocaleAmount(s, sep) !== null).length;
  const comma = samples.filter((s) => /,\d{1,2}$/.test(s)).length;
  const dot = samples.filter((s) => /\.\d{1,2}$/.test(s)).length;
  if (comma !== dot) return comma > dot ? ',' : '.';
  return ok(',') >= ok('.') ? ',' : '.';
}
