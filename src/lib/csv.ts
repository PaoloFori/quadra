const DELIMITERS = [';', ',', '\t', '|'] as const;

/** Sceglie il separatore più frequente (fuori dalle virgolette) nelle prime righe. */
export function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '')
    .slice(0, 15);
  const score = (d: string): number =>
    lines.reduce((sum, line) => sum + splitLine(line, d).length - 1, 0);
  return DELIMITERS.reduce((best, d) => (score(d) > score(best) ? d : best), ';');
}

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      cells.push(current);
      current = '';
    } else current += ch;
  }
  cells.push(current);
  return cells;
}

/** Parser CSV tollerante: righe vuote scartate, virgolette con a-capo gestite. */
export function parseCsv(text: string, delimiter = detectDelimiter(text)): string[][] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[] = [];
  let buffer = '';
  let quoted = false;
  for (const ch of clean) {
    if (ch === '"') quoted = !quoted;
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (buffer !== '') rows.push(buffer);
      buffer = '';
    } else buffer += ch;
  }
  if (buffer !== '') rows.push(buffer);
  return rows
    .map((line) => splitLine(line, delimiter).map((c) => c.trim()))
    .filter((cells) => cells.some((c) => c !== ''));
}

/** Decodifica UTF-8 e, se non valido, Windows-1252 (tipico degli export bancari italiani). */
export function decodeText(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function toCsv(rows: string[][], delimiter = ','): string {
  const esc = (cell: string): string =>
    /["\n\r]/.test(cell) || cell.includes(delimiter) ? `"${cell.replace(/"/g, '""')}"` : cell;
  return rows.map((r) => r.map(esc).join(delimiter)).join('\r\n');
}
