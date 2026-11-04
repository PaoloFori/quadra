/**
 * Prova da terminale del controllo estratti conto: legge un PDF e lo confronta con i movimenti di un conto
 * di un backup di Quadra. Uso: npm run check-statement -- <estratto.pdf> <backup.json> <idConto>
 * Nessun dato lascia il computer.
 */
import { readFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseBackup } from '@/domain/backup/format';
import { compareStatement, parseStatement } from '@/domain/statements';
import { toPdfPage } from '@/lib/pdfText';

const [pdfFile, backupFile, accountId] = process.argv.slice(2);
if (!pdfFile || !backupFile || !accountId)
  throw new Error('Uso: check-statement <pdf> <backup.json> <idConto>');

const doc = await pdfjs.getDocument({
  data: new Uint8Array(readFileSync(pdfFile)),
  useSystemFonts: true,
  verbosity: 0,
}).promise;
const pages = [];
for (let n = 1; n <= doc.numPages; n++) {
  pages.push(toPdfPage((await (await doc.getPage(n)).getTextContent()).items));
}

const statement = parseStatement(pages);
const { data } = await parseBackup(readFileSync(backupFile, 'utf8'));
const own = data.transactions.filter((t) => t.accountId === accountId);
const names = new Map(data.accounts.map((a) => [a.id, a.name]));
const others = data.transactions
  .filter((t) => t.accountId !== accountId)
  .map((t) => ({ ...t, accountName: names.get(t.accountId) ?? t.accountId }));
const check = compareStatement(statement, own, others);

const eur = (c: number): string => (c / 100).toFixed(2);
console.log(
  `${statement.format}: ${statement.entries.length} righe, ${statement.from} → ${statement.to}, avvisi: ${statement.warnings.join(',') || 'nessuno'}`,
);
console.log(`Quadra nel periodo: ${check.quadraCount} movimenti`);
console.log(
  `Corrispondono: ${check.matched.length} · data diversa: ${check.dateDiffs.length} · importo diverso: ${check.amountDiffs.length}`,
);
for (const m of check.missingInQuadra)
  console.log(
    `MANCA IN QUADRA  ${m.entry.date} ${eur(m.entry.cents)} ${m.entry.description}${m.elsewhere ? `  [su ${m.elsewhere.accountName}: ${m.elsewhere.date} ${m.elsewhere.description}]` : ''}`,
  );
for (const n of check.notInStatement)
  console.log(
    `NON IN ESTRATTO  ${n.tx.date} ${eur(n.tx.amountCents)} ${n.tx.description}${n.pending ? ' (forse non ancora addebitata)' : ''}`,
  );
for (const d of check.dateDiffs)
  console.log(
    `DATA DIVERSA     ${d.entry.date}/${d.entry.valueDate} vs ${d.tx.date} ${eur(d.entry.cents)} ${d.tx.description} (${d.days} gg)`,
  );
for (const d of check.amountDiffs)
  console.log(
    `IMPORTO DIVERSO  ${d.entry.date} estratto ${eur(d.entry.cents)} vs Quadra ${eur(d.tx.amountCents)} ${d.tx.description}`,
  );
console.log(JSON.stringify(check.totals), check.clean ? 'TUTTO TORNA' : 'DA CONTROLLARE');
