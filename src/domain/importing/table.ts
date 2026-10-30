import { decodeText, parseCsv } from '@/lib/csv';

export type Table = string[][];

export class UnsupportedFileError extends Error {}

function isoFromDate(d: Date): string {
  // SheetJS può restituire date sfasate di qualche ora per il fuso: +12h e lettura UTC le riallinea.
  const shifted = new Date(d.getTime() + 12 * 3_600_000);
  return shifted.toISOString().slice(0, 10);
}

/** Celle XLSX → testo: date in ISO, numeri col separatore decimale italiano (come un CSV). */
export function xlsxCellToText(cell: unknown): string {
  if (cell instanceof Date) return isoFromDate(cell);
  if (typeof cell === 'number') return String(cell).replace('.', ',');
  return cell == null ? '' : String(cell).trim();
}

async function readXlsx(bytes: ArrayBuffer): Promise<Table> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ''];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: '',
    blankrows: false,
  });
  return rows.map((r) => r.map(xlsxCellToText)).filter((r) => r.some((c) => c !== ''));
}

export async function readTable(name: string, bytes: ArrayBuffer): Promise<Table> {
  const lower = name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return readXlsx(bytes);
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return parseCsv(decodeText(bytes));
  throw new UnsupportedFileError(name);
}
