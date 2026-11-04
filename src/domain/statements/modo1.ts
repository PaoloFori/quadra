import type { IsoDate } from '@/domain/types';
import { parseAmount, toLines } from './lines';
import type { PdfPage, ReadWarning, Statement, StatementEntry } from './types';
import { UnsupportedStatementError } from './types';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const CARD = /\b\d{16}\b\s*/g;

const pageText = (p: PdfPage): string => p.items.map((i) => i.str).join(' ');

/** Estratto modo1: colonne data operazione, chiave, concetto, data valuta, importi, saldo. */
export function isModo1(pages: PdfPage[]): boolean {
  const text = pages.map(pageText).join(' ');
  return (
    /CHIAVE/.test(text) &&
    /IMPORTI/.test(text) &&
    /SALDO/.test(text) &&
    /\d{4}-\d{2}-\d{2}/.test(text)
  );
}

interface Row {
  entry: StatementEntry;
  balance: number | null;
}

function parsePage(page: PdfPage): Row[] {
  const lines = toLines(page.items);
  const headerY = lines.find((l) => l.items.some((i) => i.str.trim() === 'IMPORTI'))?.y;
  if (headerY === undefined) return [];
  // Il piè di pagina («Prodotto coperto…») chiude la tabella.
  const footerY =
    lines.find((l) => /^Prodotto coperto/.test(l.items[0]?.str ?? ''))?.y ?? -Infinity;

  const body = lines.filter((l) => l.y < headerY - 3 && l.y > footerY);
  const dateRows: { y: number; row: Row }[] = [];
  for (const l of body) {
    const first = l.items[0];
    const valueItem = l.items.find((i) => i.x > 300 && ISO.test(i.str.trim()));
    if (!first || !ISO.test(first.str.trim()) || !valueItem) continue;
    const numbers = l.items
      .filter((i) => i.x > valueItem.x + 40)
      .map((i) => parseAmount(i.str))
      .filter((n): n is number => n !== null);
    if (numbers.length === 0) continue;
    dateRows.push({
      y: l.y,
      row: {
        entry: {
          date: first.str.trim(),
          valueDate: valueItem.str.trim(),
          cents: numbers[0]!,
          description: '',
        },
        balance: numbers[1] ?? null,
      },
    });
  }
  if (dateRows.length === 0) return [];

  // Le righe di testo (concetto, carta/esercente) si attaccano alla riga con data più vicina.
  const above = new Map<number, string[]>();
  const below = new Map<number, string[]>();
  body.forEach((l) => {
    const text = l.items
      .filter((i) => i.x >= 150 && i.x < 335)
      .map((i) => i.str.trim())
      .join(' ');
    if (!text) return;
    let best = 0;
    dateRows.forEach((d, idx) => {
      if (Math.abs(d.y - l.y) < Math.abs(dateRows[best]!.y - l.y)) best = idx;
    });
    const target = dateRows[best]!;
    const bucket = l.y >= target.y - 1 ? above : below;
    bucket.set(best, [...(bucket.get(best) ?? []), text]);
  });
  dateRows.forEach((d, idx) => {
    const concept = (above.get(idx) ?? []).join(' ');
    const detail = (below.get(idx) ?? []).join(' ').replace(CARD, '').trim();
    d.row.entry.description = [concept, detail].filter(Boolean).join(' · ');
  });
  return dateRows.map((d) => d.row);
}

export function parseModo1(pages: PdfPage[]): Statement {
  const rows = pages.flatMap(parsePage);
  if (rows.length === 0) throw new UnsupportedStatementError();

  // Controllo di lettura: il saldo di ogni riga è il saldo della successiva più il suo importo
  // (le righe sono dalla più recente alla più vecchia).
  const warnings: ReadWarning[] = [];
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i]!;
    const b = rows[i + 1]!;
    if (a.balance !== null && b.balance !== null && a.balance - a.entry.cents !== b.balance) {
      warnings.push('balances');
      break;
    }
  }

  const entries = rows.map((r) => r.entry);
  const dates: IsoDate[] = entries.flatMap((e) => [e.date, e.valueDate]);
  return {
    format: 'modo1',
    entries,
    from: dates.reduce((a, b) => (b < a ? b : a)),
    to: entries.reduce((a, e) => (e.date > a ? e.date : a), entries[0]!.date),
    warnings,
  };
}
