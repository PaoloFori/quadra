import type { ColumnMapping, DateFormat, IsoDate } from '../types';
import { isValidIsoDate } from '@/lib/dates';
import { parseLocaleAmount } from '@/lib/money';
import type { Table } from './table';

export interface ParsedRow {
  date: IsoDate;
  valueDate?: IsoDate;
  amountCents: number;
  description: string;
  balanceCents?: number;
}

export interface ParseOptions {
  mapping: ColumnMapping;
  dateFormat: DateFormat;
  decimalSeparator: ',' | '.';
  headerRow: number;
}

export interface ParseResult {
  rows: ParsedRow[];
  /** Righe ignorate (footer, totali, righe senza data o importo valido). */
  skipped: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function parseDate(raw: string, format: DateFormat): IsoDate | null {
  const text = raw.trim().split(/[ T]/)[0] ?? '';
  const parts = text.split(/[-/.]/);
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const [a, b, c] = parts.map(Number) as [number, number, number];
  let year: number, month: number, day: number;
  if (/^\d{4}$/.test(parts[0]!)) [year, month, day] = [a, b, c];
  else if (format === 'mdy') [month, day, year] = [a, b, c];
  else [day, month, year] = [a, b, c];
  if (year < 100) year += 2000;
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isValidIsoDate(iso) ? iso : null;
}

function rowAmount(row: string[], mapping: ColumnMapping, decimal: ',' | '.'): number | null {
  const cell = (col: number | undefined): string =>
    col === undefined ? '' : (row[col] ?? '').trim();
  if (mapping.amount !== undefined)
    return cell(mapping.amount) === '' ? null : parseLocaleAmount(cell(mapping.amount), decimal);
  const debit = cell(mapping.debit) === '' ? 0 : parseLocaleAmount(cell(mapping.debit), decimal);
  const credit = cell(mapping.credit) === '' ? 0 : parseLocaleAmount(cell(mapping.credit), decimal);
  if (
    debit === null ||
    credit === null ||
    (cell(mapping.debit) === '' && cell(mapping.credit) === '')
  )
    return null;
  return Math.abs(credit) - Math.abs(debit);
}

export function parseRows(table: Table, options: ParseOptions): ParseResult {
  const { mapping, dateFormat, decimalSeparator, headerRow } = options;
  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const row of table.slice(headerRow + 1)) {
    const date = parseDate(row[mapping.date] ?? '', dateFormat);
    const amountCents = rowAmount(row, mapping, decimalSeparator);
    if (!date || amountCents === null) {
      skipped++;
      continue;
    }
    const description = mapping.description
      .map((c) => (row[c] ?? '').trim())
      .filter((s) => s !== '')
      .join(' ')
      .replace(/\s+/g, ' ');
    const parsed: ParsedRow = { date, amountCents, description };
    const valueDate =
      mapping.valueDate === undefined ? null : parseDate(row[mapping.valueDate] ?? '', dateFormat);
    if (valueDate) parsed.valueDate = valueDate;
    if (mapping.balance !== undefined) {
      const balance = parseLocaleAmount(row[mapping.balance] ?? '', decimalSeparator);
      if (balance !== null) parsed.balanceCents = balance;
    }
    rows.push(parsed);
  }
  return { rows, skipped };
}
