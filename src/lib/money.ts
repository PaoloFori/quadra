/** Converte un importo decimale in centesimi interi evitando errori di virgola mobile. */
export function toCents(value: number): number {
  return Math.round(Number((value * 100).toPrecision(15)));
}

export function centsToDecimal(cents: number): number {
  return cents / 100;
}

/** Decimale con punto, sempre 2 cifre (per export CSV). */
export function centsToPlain(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Interpreta "12,34", "-1.234,56", "12.34" ecc. dato il separatore decimale atteso. Restituisce null se non valido. */
export function parseLocaleAmount(raw: string, decimal: ',' | '.'): number | null {
  let s = raw.replace(/[\s€$£]/g, '').replace(/^\+/, '');
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith('-')) {
    negative = !negative;
    s = s.slice(1);
  }
  const thousands = decimal === ',' ? '.' : ',';
  s = s.split(thousands).join('').replace(decimal, '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const cents = toCents(Number(s));
  return negative ? -cents : cents;
}

/** Importo digitato dall'utente: accetta sia "12,50" sia "12.50" (la tastiera iOS segue la lingua). */
export function parseUserAmount(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;
  const cents = parseLocaleAmount(text, text.includes(',') ? ',' : '.');
  return cents === null || cents === 0 ? null : Math.abs(cents);
}
