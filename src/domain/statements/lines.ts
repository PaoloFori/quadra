import type { PdfItem } from './types';

const Y_TOLERANCE = 2;

/** Raggruppa i frammenti in righe visive (dall'alto verso il basso), ognuna ordinata da sinistra a destra. */
export function toLines(items: PdfItem[]): { y: number; items: PdfItem[] }[] {
  const sorted = items.filter((i) => i.str.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; items: PdfItem[] }[] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= Y_TOLERANCE) last.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x);
  return lines;
}

/**
 * Importo scritto in euro: «-1.234,50», «75», «+3 292, 90» (con spazi e caratteri di controllo come
 * separatore delle migliaia). Restituisce i centesimi, o null se non è un importo.
 */
export function parseAmount(raw: string): number | null {
  const compact = raw.replace(/[^\d,.+-]/g, '');
  if (!/^[+-]?(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(compact)) return null;
  const negative = compact.startsWith('-');
  const [intPart = '', decPart = ''] = compact.replace(/^[+-]/, '').split(',');
  const digits = intPart.replace(/\./g, '');
  const cents = Number(digits) * 100 + Number(decPart.padEnd(2, '0').slice(0, 2));
  return negative ? -cents : cents;
}
