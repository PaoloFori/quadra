/**
 * Converte i registri mensili fatti a mano (un foglio per mese: spesa | data | banca | motivo) in CSV
 * importabili da Quadra, uno per conto. Uso: npm run convert-ledger [-- file.xlsx ...] (default: gli .xlsx in private/)
 * Output in private/ (ignorata da git). Nessun dato lascia il computer.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ledgerFiles, readLedgers } from './ledger';

const fmt = (cents: number): string => {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
};
const csvCell = (s: string): string => (/[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

const { entries: all, log } = readLedgers(ledgerFiles(process.argv.slice(2)));

mkdirSync('private', { recursive: true });
for (const account of ['bbva', 'intesa'] as const) {
  const rows = all
    .filter((e) => e.account === account)
    .sort((a, b) => a.date.localeCompare(b.date));
  const lines = [
    'Data;Descrizione;Importo',
    ...rows.map(
      (e) => `${e.date.split('-').reverse().join('/')};${csvCell(e.description)};${fmt(e.cents)}`,
    ),
  ];
  writeFileSync(join('private', `spese-${account}.csv`), lines.join('\r\n'), 'utf8');
  console.log(`private/spese-${account}.csv: ${rows.length} movimenti`);
}
if (log.length > 0) console.log(`\nDate corrette (${log.length}):\n${log.join('\n')}`);
