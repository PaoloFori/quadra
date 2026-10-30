/**
 * Lettura dei registri mensili fatti a mano (un foglio per mese: spesa | data | banca | motivo).
 * Condivisa da convert-ledger (CSV) e build-backup (JSON di ripristino). Nessun dato lascia il computer.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as XLSX from 'xlsx';

const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
export type LedgerAccount = 'bbva' | 'intesa';

export interface Entry {
  date: string;
  cents: number;
  description: string;
  account: LedgerAccount;
}

const rome = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' });
const text = (cell: unknown): string => (cell == null ? '' : String(cell).trim());

function accountOf(bank: string, description: string): LedgerAccount {
  const b = bank.toLowerCase();
  if (b === 'intesa' || (b !== 'bbva' && /intesa/i.test(description))) return 'intesa';
  // Righe senza banca (es. periodo all'estero): per scelta dell'utente sono tutte BBVA.
  return 'bbva';
}

/** Porta una data fuori dal mese del foglio dentro di esso, tenendo lo stesso giorno. */
function fixDate(iso: string, sheetMonth: string): { date: string; fixed: boolean } {
  if (iso.startsWith(sheetMonth)) return { date: iso, fixed: false };
  const candidate = `${sheetMonth}-${iso.slice(8, 10)}`;
  const valid = new Date(`${candidate}T00:00:00Z`).toISOString().startsWith(candidate);
  return { date: valid ? candidate : iso, fixed: valid };
}

function readSheet(
  rows: unknown[][],
  sheetMonth: string,
  sheetName: string,
  log: string[],
): { entries: Entry[]; sheetTotal?: number } {
  const entries: Entry[] = [];
  let currentDate = '';
  let sheetTotal: number | undefined;
  for (const row of rows.slice(1)) {
    const labelIdx = row.findIndex((c) => /^tot(ale)?:?$/i.test(text(c)));
    if (labelIdx >= 0 && typeof row[labelIdx + 1] === 'number')
      sheetTotal = row[labelIdx + 1] as number;
    if (row[1] instanceof Date) {
      const { date, fixed } = fixDate(rome.format(row[1]), sheetMonth);
      if (fixed) log.push(`${sheetName}: data ${rome.format(row[1])} spostata a ${date}`);
      currentDate = date;
    }
    if (typeof row[0] !== 'number' || !currentDate) continue;
    // Se "motivo" è vuoto ma "banca" contiene testo (es. luglio 2026), il testo è la descrizione.
    const bankCell = text(row[2]);
    const motive = text(row[3]);
    const shifted = motive === '' && bankCell !== '' && !/^(bbva|intesa)$/i.test(bankCell);
    const description = shifted ? bankCell : motive;
    entries.push({
      date: currentDate,
      cents: Math.round(row[0] * 100),
      description,
      account: accountOf(shifted ? '' : bankCell, description),
    });
  }
  return { entries, sheetTotal };
}

/** File passati da riga di comando o, di default, gli spese<anno>.xlsx in private/. */
export function ledgerFiles(args: string[]): string[] {
  const files =
    args.length > 0
      ? args
      : readdirSync('private')
          .filter((f) => /^spese\d{4}\.xlsx$/.test(f))
          .map((f) => join('private', f));
  if (files.length === 0) throw new Error('Nessun file spese<anno>.xlsx trovato in private/');
  return files;
}

export function readLedgers(files: string[]): { entries: Entry[]; log: string[] } {
  const entries: Entry[] = [];
  const log: string[] = [];
  for (const file of files) {
    const wb = XLSX.read(readFileSync(file), { type: 'buffer', cellDates: true });
    const year = file.match(/(\d{4})\.xlsx$/)?.[1];
    if (!year) throw new Error(`Anno non riconosciuto nel nome del file: ${file}`);
    for (const name of wb.SheetNames) {
      const m = MONTHS.indexOf(name);
      if (m < 0) continue; // foglio "totale"
      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, {
        header: 1,
        raw: true,
        defval: '',
        blankrows: false,
      });
      const sheet = readSheet(
        rows,
        `${year}-${String(m + 1).padStart(2, '0')}`,
        `${year} ${name}`,
        log,
      );
      const sum = sheet.entries.reduce((s, e) => s + e.cents, 0);
      const check =
        sheet.sheetTotal === undefined
          ? ''
          : Math.abs(sum - Math.round(sheet.sheetTotal * 100)) <= 1
            ? ' ✓ totale del foglio'
            : ` ✗ totale del foglio ${sheet.sheetTotal.toFixed(2)}`;
      console.log(
        `${year} ${name}: ${String(sheet.entries.length).padStart(3)} movimenti, somma ${(sum / 100).toFixed(2)}${check}`,
      );
      entries.push(...sheet.entries);
    }
  }
  return { entries, log };
}
