import { parseAmount, toLines } from './lines';
import type { PdfItem, PdfPage, ReadWarning, Statement, StatementEntry } from './types';
import { UnsupportedStatementError } from './types';

const DMY = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const toIso = (s: string): string => s.replace(DMY, '$3-$2-$1');
const pageText = (p: PdfPage): string => p.items.map((i) => i.str).join(' ');
/** Righe di dettaglio che non servono a riconoscere il movimento. */
const NOISE = /^(EFFETTUATO IL|MEDIANTE LA CARTA|COD\.DISP|BENEF\.|BIC\. ORD)/;

/** Estratto conto modo2 (mensile o trimestrale): «Dettaglio movimenti del conto corrente». */
export function isModo2(pages: PdfPage[]): boolean {
  const text = pages.map(pageText).join(' ');
  return (
    /Dettaglio movimenti del conto corrente/.test(text) &&
    /Addebiti/.test(text) &&
    /Accrediti/.test(text)
  );
}

const rightEdge = (i: PdfItem): number => i.x + i.w;

interface Summary {
  openingDate?: string;
  closingDate?: string;
  opening?: number;
  closing?: number;
  credits?: number;
  debits?: number;
}

/** Riepilogo in prima pagina: saldo iniziale/finale e totali, per controllare la lettura. */
function readSummary(pages: PdfPage[]): Summary {
  const out: Summary = {};
  for (const page of pages) {
    for (const line of toLines(page.items)) {
      const label = line.items.map((i) => i.str).join(' ');
      const amount = line.items.map((i) => parseAmount(i.str)).find((n) => n !== null) ?? null;
      const date = line.items.find((i) => DMY.test(i.str.trim()))?.str.trim();
      if (/^Saldo iniziale al/.test(label) && out.opening === undefined && amount !== null) {
        out.opening = amount;
        out.openingDate = date ?? label.match(/(\d{2}\.\d{2}\.\d{4})/)?.[1];
      } else if (/^Saldo finale al/.test(label) && out.closing === undefined && amount !== null) {
        out.closing = amount;
        out.closingDate = date;
      } else if (/^Totale accrediti/.test(label) && amount !== null) out.credits = amount;
      else if (/^Totale addebiti/.test(label) && amount !== null) out.debits = Math.abs(amount);
    }
  }
  return out;
}

export function parseModo2(pages: PdfPage[]): Statement {
  const entries: StatementEntry[] = [];
  const extra: string[][] = [];
  let totals: { debits: number; credits: number } | null = null;
  let current = -1;
  let done = false;

  for (const page of pages) {
    if (done) break;
    const lines = toLines(page.items);
    const header = lines.find((l) => l.items.some((i) => i.str.trim() === 'Data Operazione'));
    if (!header) continue;
    const debitHead = header.items.find((i) => i.str.trim() === 'Addebiti');
    const creditHead = header.items.find((i) => i.str.trim() === 'Accrediti');
    if (!debitHead || !creditHead) continue;
    const split = (rightEdge(debitHead) + rightEdge(creditHead)) / 2;

    for (const line of lines.filter((l) => l.y < header.y - 3)) {
      const text = line.items.map((i) => i.str.trim()).join(' ');
      if (/^Pagina \d+ di \d+/.test(text)) continue;
      if (/^Totali\b/.test(text)) {
        const [d, c] = line.items.map((i) => parseAmount(i.str)).filter((n) => n !== null);
        if (d != null && c != null) totals = { debits: d, credits: c };
        done = true;
        break;
      }
      const first = line.items[0];
      const valueItem = line.items.find((i) => i.x > 60 && i.x < 150 && DMY.test(i.str.trim()));
      if (first && DMY.test(first.str.trim()) && valueItem) {
        const amountItem = line.items.find((i) => i.x > 380 && parseAmount(i.str) !== null);
        if (!amountItem) continue;
        const abs = Math.abs(parseAmount(amountItem.str)!);
        const credit = rightEdge(amountItem) > split;
        entries.push({
          date: toIso(first.str.trim()),
          valueDate: toIso(valueItem.str.trim()),
          cents: credit ? abs : -abs,
          description: line.items
            .filter((i) => i.x >= 150 && i.x < 380)
            .map((i) => i.str.trim())
            .join(' '),
        });
        extra.push([]);
        current = entries.length - 1;
      } else if (current >= 0 && first && first.x >= 150 && first.x < 380) {
        if (!NOISE.test(text)) extra[current]!.push(text.replace(/^\S{15,}\s+/, ''));
      }
    }
  }
  if (entries.length === 0) throw new UnsupportedStatementError();
  entries.forEach((e, i) => {
    const more = extra[i]!.join(' ');
    if (more) e.description = `${e.description} · ${more}`;
  });

  const summary = readSummary(pages);
  const warnings: ReadWarning[] = [];
  const sum = (sign: 1 | -1): number =>
    entries.filter((e) => Math.sign(e.cents) === sign).reduce((s, e) => s + Math.abs(e.cents), 0);
  const expectDebits = totals?.debits ?? summary.debits;
  const expectCredits = totals?.credits ?? summary.credits;
  if (
    (expectDebits !== undefined && sum(-1) !== Math.abs(expectDebits)) ||
    (expectCredits !== undefined && sum(1) !== expectCredits) ||
    (summary.opening !== undefined &&
      summary.closing !== undefined &&
      summary.opening + sum(1) - sum(-1) !== summary.closing)
  ) {
    warnings.push('totals');
  }

  const dates = entries.flatMap((e) => [e.date, e.valueDate]).sort();
  const closing = summary.closingDate ? toIso(summary.closingDate) : undefined;
  const opening = summary.openingDate ? toIso(summary.openingDate) : undefined;
  return {
    format: 'modo2',
    entries,
    // Il periodo è quello scritto nell'estratto (il giorno dopo il saldo iniziale, fino al saldo finale).
    from: opening && opening < dates[0]! ? nextDay(opening) : dates[0]!,
    to: closing && closing > dates[dates.length - 1]! ? closing : dates[dates.length - 1]!,
    warnings,
  };
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
}
