import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analyzeTable } from '@/domain/importing/analyze';
import { markDuplicates } from '@/domain/importing/dedupe';
import { parseDate, parseRows } from '@/domain/importing/parse';
import { readTable, xlsxCellToText } from '@/domain/importing/table';
import { parseLocaleAmount } from '@/lib/money';
import { detectTransfers } from '@/domain/transfers';

const sample = (name: string): ArrayBuffer => {
  const buf = readFileSync(`samples/${name}`);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

describe('parseLocaleAmount', () => {
  it.each([
    ['1.234,56', ',', 123456],
    ['-12,5', ',', -1250],
    ['€ 7,00', ',', 700],
    ['1,234.56', '.', 123456],
    ['(10,00)', ',', -1000],
    ['10,00-', ',', -1000],
  ] as const)('%s', (raw, sep, expected) => {
    expect(parseLocaleAmount(raw, sep)).toBe(expected);
  });
  it('rifiuta testo non numerico', () => {
    expect(parseLocaleAmount('totale', ',')).toBeNull();
  });
});

describe('parseDate', () => {
  it('gg/mm/aaaa e ISO', () => {
    expect(parseDate('05/03/2026', 'dmy')).toBe('2026-03-05');
    expect(parseDate('2026-03-05', 'dmy')).toBe('2026-03-05');
    expect(parseDate('05.03.26', 'dmy')).toBe('2026-03-05');
  });
  it('rifiuta date impossibili e footer', () => {
    expect(parseDate('31/02/2026', 'dmy')).toBeNull();
    expect(parseDate('Totale movimenti', 'dmy')).toBeNull();
  });
});

describe('import BBVA (UTF-8, intestazioni e footer)', () => {
  it('rileva formato e legge tutte le righe', async () => {
    const table = await readTable('bbva-esempio.csv', sample('bbva-esempio.csv'));
    const analysis = analyzeTable(table, []);
    expect(analysis).not.toBeNull();
    expect(analysis!.dateFormat).toBe('dmy');
    expect(analysis!.decimalSeparator).toBe(',');
    const { rows, skipped } = parseRows(table, analysis!);
    expect(rows).toHaveLength(156);
    expect(skipped).toBe(1); // solo il footer "Totale movimenti" (le righe vuote sono già scartate dal CSV)
    expect(rows.every((r) => r.balanceCents !== undefined && r.valueDate)).toBe(true);
  });
});

describe('import Intesa (Windows-1252, descrizione su due colonne)', () => {
  it('decodifica gli accenti e unisce Operazione + Dettagli', async () => {
    const table = await readTable('intesa-esempio.csv', sample('intesa-esempio.csv'));
    const analysis = analyzeTable(table, [])!;
    const { rows } = parseRows(table, analysis);
    expect(rows).toHaveLength(57);
    expect(rows.some((r) => r.description.includes('Caffè'))).toBe(true);
    expect(rows.find((r) => r.description.includes('stipendio'))!.amountCents).toBe(215000);
  });
});

describe('dare/avere', () => {
  it('calcola importo da colonne separate', () => {
    const table = [
      ['Data', 'Descrizione', 'Dare', 'Avere', 'Saldo'],
      ['01/02/2026', 'Spesa', '12,50', '', '100,00'],
      ['02/02/2026', 'Stipendio', '', '1.500,00', '1.600,00'],
    ];
    const analysis = analyzeTable(table, [])!;
    const { rows } = parseRows(table, analysis);
    expect(rows.map((r) => r.amountCents)).toEqual([-1250, 150000]);
  });
});

describe('XLSX', () => {
  it('normalizza date e numeri come un CSV italiano', () => {
    expect(xlsxCellToText(new Date(Date.UTC(2026, 2, 5)))).toBe('2026-03-05');
    expect(xlsxCellToText(-12.5)).toBe('-12,5');
  });
});

describe('deduplica', () => {
  const rows = [
    { date: '2026-03-01', amountCents: -130, description: 'Bar Roma caffe' },
    { date: '2026-03-01', amountCents: -130, description: 'BAR  roma caffè' },
  ];

  it('mantiene distinti due movimenti identici nello stesso giorno', async () => {
    const result = await markDuplicates('bbva', rows, new Map());
    expect(new Set(result.map((r) => r.id)).size).toBe(2);
    expect(result.every((r) => r.isNew)).toBe(true);
  });

  it('re-importare lo stesso file non aggiunge nulla', async () => {
    const first = await markDuplicates('bbva', rows, new Map());
    const existing = new Map([[first[0]!.hash, 2]]);
    const again = await markDuplicates('bbva', rows, existing);
    expect(again.filter((r) => r.isNew)).toHaveLength(0);
  });

  it('aggiunge solo l’occorrenza in più', async () => {
    const first = await markDuplicates('bbva', rows, new Map());
    const existing = new Map([[first[0]!.hash, 1]]);
    const again = await markDuplicates('bbva', rows, existing);
    expect(again.map((r) => r.isNew)).toEqual([false, true]);
  });

  it('conti diversi → hash diversi', async () => {
    const [a] = await markDuplicates('bbva', rows.slice(0, 1), new Map());
    const [b] = await markDuplicates('intesa', rows.slice(0, 1), new Map());
    expect(a!.hash).not.toBe(b!.hash);
  });
});

describe('giroconti', () => {
  const t = (id: string, accountId: string, date: string, amountCents: number) => ({
    id,
    accountId,
    date,
    amountCents,
    isTransfer: false,
  });

  it('abbina importi opposti su conti diversi entro 3 giorni', () => {
    const pairs = detectTransfers([
      t('a', 'intesa', '2026-03-03', -30000),
      t('b', 'bbva', '2026-03-04', 30000),
    ]);
    expect(pairs).toEqual([{ outId: 'a', inId: 'b' }]);
  });
  it('ignora stesso conto, date lontane e importi diversi', () => {
    expect(
      detectTransfers([t('a', 'bbva', '2026-03-03', -100), t('b', 'bbva', '2026-03-03', 100)]),
    ).toEqual([]);
    expect(
      detectTransfers([t('a', 'intesa', '2026-03-03', -100), t('b', 'bbva', '2026-03-09', 100)]),
    ).toEqual([]);
    expect(
      detectTransfers([t('a', 'intesa', '2026-03-03', -100), t('b', 'bbva', '2026-03-03', 101)]),
    ).toEqual([]);
  });
  it('usa ogni movimento una sola volta, preferendo la data più vicina', () => {
    const pairs = detectTransfers([
      t('o1', 'intesa', '2026-03-03', -500),
      t('i1', 'bbva', '2026-03-03', 500),
      t('i2', 'bbva', '2026-03-05', 500),
    ]);
    expect(pairs).toEqual([{ outId: 'o1', inId: 'i1' }]);
  });
  it('trova i giroconti dei CSV di esempio', async () => {
    const load = async (name: string, accountId: string) => {
      const table = await readTable(name, sample(name));
      const { rows } = parseRows(table, analyzeTable(table, [])!);
      const result = await markDuplicates(accountId, rows, new Map());
      return result.map((r) => ({
        id: r.id,
        accountId,
        date: r.date,
        amountCents: r.amountCents,
        isTransfer: false,
      }));
    };
    const all = [
      ...(await load('bbva-esempio.csv', 'bbva')),
      ...(await load('intesa-esempio.csv', 'intesa')),
    ];
    expect(detectTransfers(all)).toHaveLength(6);
  });
});
