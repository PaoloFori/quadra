import { describe, expect, it } from 'vitest';
import { parseAmount } from '@/domain/statements/lines';
import {
  compareStatement,
  parseStatement,
  UnsupportedStatementError,
  type PdfItem,
  type PdfPage,
  type Statement,
} from '@/domain/statements';

const item = (str: string, x: number, y: number, w = str.length * 5): PdfItem => ({ str, x, y, w });

/** Pagina nello stile degli estratti modo1: data, chiave, concetto, valuta, importo, saldo. */
function modo1Page(
  rows: { op: string; val: string; amount: string; saldo: string; text: string; detail: string }[],
): PdfPage {
  const items: PdfItem[] = [
    item('CHIAVE', 113, 579),
    item('IMPORTI', 411, 579, 36),
    item('SALDO', 496, 579),
  ];
  rows.forEach((r, i) => {
    const y = 545 - i * 38;
    items.push(
      item(r.op, 48, y),
      item('00929', 116, y),
      item(r.text, 155, y + 11),
      item(`1111222233334444 ${r.detail}`, 155, y - 11),
      item(r.val, 340, y),
      item(r.amount, 460 - r.amount.length * 5, y, r.amount.length * 5),
      item(r.saldo, 511, y),
    );
  });
  items.push(item('Prodotto coperto dal Fondo di garanzia', 38, 84));
  return { items };
}

const MODO1_ROWS = [
  {
    op: '2026-10-29',
    val: '2026-10-29',
    amount: '-10,5',
    saldo: '30.222,34',
    text: 'Pagamento con carta in ristoranti',
    detail: 'ESERCENTE UNO',
  },
  {
    op: '2026-10-26',
    val: '2026-10-24',
    amount: '700',
    saldo: '30.232,84',
    text: 'Bonifici',
    detail: '',
  },
  {
    op: '2026-10-22',
    val: '2026-10-22',
    amount: '-15',
    saldo: '29.532,84',
    text: 'Pagamento con carta',
    detail: 'ESERCENTE DUE',
  },
];

/** Pagina nello stile degli estratti modo2: due date, descrizione, colonne Addebiti/Accrediti. */
function modo2Pages(): PdfPage[] {
  const header = [
    item('Data Operazione', 23, 684),
    item('Addebiti', 398, 684, 32),
    item('Accrediti', 498, 684, 33),
  ];
  const line = (
    op: string,
    val: string,
    desc: string,
    y: number,
    amount: string,
    credit: boolean,
  ) => [
    item(op, 23, y, 39),
    item(val, 94, y, 39),
    item(desc, 162, y),
    credit
      ? item(amount, 532 - amount.length * 5, y, amount.length * 5)
      : item(amount, 432 - amount.length * 5, y, amount.length * 5),
  ];
  return [
    {
      items: [
        item('Dettaglio movimenti del conto corrente.', 8, 724),
        item('Saldo iniziale al', 23, 699),
        item('30.06.2026', 109, 699),
        item('+1\u0019 000, 00', 480, 699, 50),
        ...header,
        ...line('01.07.2026', '28.06.2026', 'Prelievo carta debito', 673, '70, 00', false),
        item('PRESSO ESERCENTE TRE', 162, 662),
        item('MEDIANTE LA CARTA 4138', 162, 651),
        ...line(
          '06.07.2026',
          '06.07.2026',
          'Bonifico a Vostro favore',
          640,
          '1\u0019 793, 33',
          true,
        ),
        item('MITT.: AZIENDA ESEMPIO', 162, 629),
        item('Totali', 300, 600),
        item('70, 00', 410, 600, 25),
        item('1\u0019 793, 33', 497, 600, 35),
        item('Saldo finale al', 23, 580),
        item('30.09.2026', 109, 580),
        item('+2\u0019 723, 33', 480, 580, 50),
      ],
    },
  ];
}

describe('parseAmount', () => {
  it('legge importi con migliaia, segni e spazi', () => {
    expect(parseAmount('-10,5')).toBe(-1050);
    expect(parseAmount('75')).toBe(7500);
    expect(parseAmount('30.222,34')).toBe(3022234);
    expect(parseAmount('- 1\u0019 039, 06')).toBe(-103906);
    expect(parseAmount('+3\u0019 292, 90')).toBe(329290);
  });
  it('rifiuta date e testo', () => {
    expect(parseAmount('30.06.2026')).toBeNull();
    expect(parseAmount('2026-10-17')).toBeNull();
    expect(parseAmount('HYATT')).toBeNull();
  });
});

describe('parseStatement', () => {
  it('legge un estratto modo1 e ne controlla i saldi', () => {
    const s = parseStatement([modo1Page(MODO1_ROWS)]);
    expect(s.format).toBe('modo1');
    expect(s.entries.map((e) => [e.date, e.valueDate, e.cents])).toEqual([
      ['2026-10-29', '2026-10-29', -1050],
      ['2026-10-26', '2026-10-24', 70000],
      ['2026-10-22', '2026-10-22', -1500],
    ]);
    expect(s.entries[0]!.description).toBe('Pagamento con carta in ristoranti · ESERCENTE UNO');
    expect(s.from).toBe('2026-10-22');
    expect(s.to).toBe('2026-10-29');
    expect(s.warnings).toEqual([]);
  });

  it('segnala una lettura che non quadra con i saldi', () => {
    const rows = MODO1_ROWS.map((r, i) => (i === 1 ? { ...r, saldo: '30.000,00' } : r));
    expect(parseStatement([modo1Page(rows)]).warnings).toContain('balances');
  });

  it('legge un estratto modo2 e ne controlla i totali', () => {
    const s = parseStatement(modo2Pages());
    expect(s.format).toBe('modo2');
    expect(s.entries.map((e) => [e.date, e.valueDate, e.cents])).toEqual([
      ['2026-07-01', '2026-06-28', -7000],
      ['2026-07-06', '2026-07-06', 179333],
    ]);
    expect(s.entries[0]!.description).toBe('Prelievo carta debito · PRESSO ESERCENTE TRE');
    expect(s.from).toBe('2026-06-28'); // la valuta più vecchia, prima dell'inizio del trimestre
    expect(s.to).toBe('2026-09-30');
    expect(s.warnings).toEqual([]);
  });

  it('segnala se i totali scritti nell’estratto non coincidono', () => {
    const pages = modo2Pages();
    pages[0]!.items.find((i) => i.str === '+2\u0019 723, 33')!.str = '+9\u0019 999, 99';
    expect(parseStatement(pages).warnings).toContain('totals');
  });

  it('rifiuta i formati che non conosce', () => {
    const other: PdfPage = { items: [item('Estratto conto Altra Banca', 10, 10)] };
    expect(() => parseStatement([other])).toThrow(UnsupportedStatementError);
    expect(() => parseStatement([])).toThrow(UnsupportedStatementError);
  });
});

const statement = (entries: Statement['entries']): Statement => ({
  format: 'modo1',
  entries,
  from: '2026-10-01',
  to: '2026-10-31',
  warnings: [],
});
const e = (date: string, cents: number, valueDate = date) => ({
  date,
  valueDate,
  cents,
  description: `riga ${cents}`,
});
const tx = (id: string, date: string, amountCents: number) => ({
  id,
  date,
  amountCents,
  description: `mov ${id}`,
});

describe('compareStatement', () => {
  it('tutto torna: date uguali all’operazione o alla valuta', () => {
    const c = compareStatement(
      statement([e('2026-10-10', -1000, '2026-10-07'), e('2026-10-12', 5000)]),
      [tx('a', '2026-10-07', -1000), tx('b', '2026-10-12', 5000)],
    );
    expect(c.matched).toHaveLength(2);
    expect(c.clean).toBe(true);
    expect(c.totals).toEqual({
      statementIn: 5000,
      statementOut: 1000,
      quadraIn: 5000,
      quadraOut: 1000,
    });
  });

  it('trova ciò che manca in Quadra e suggerisce l’altro conto', () => {
    const c = compareStatement(
      statement([e('2026-10-10', -1000), e('2026-10-11', -2500)]),
      [tx('a', '2026-10-10', -1000)],
      [{ ...tx('z', '2026-10-11', -2500), accountName: 'Conto B' }],
    );
    expect(c.missingInQuadra).toHaveLength(1);
    expect(c.missingInQuadra[0]!.entry.cents).toBe(-2500);
    expect(c.missingInQuadra[0]!.elsewhere?.accountName).toBe('Conto B');
    expect(c.clean).toBe(false);
  });

  it('segnala un importo scritto male (stessa data e segno)', () => {
    const c = compareStatement(statement([e('2026-10-13', -2859)]), [tx('a', '2026-10-13', -2889)]);
    expect(c.amountDiffs).toHaveLength(1);
    expect(c.amountDiffs[0]!.diffCents).toBe(-30);
    expect(c.missingInQuadra).toHaveLength(0);
    expect(c.notInStatement).toHaveLength(0);
  });

  it('segnala una data lontana ma importo uguale', () => {
    const c = compareStatement(statement([e('2026-10-20', -1000)]), [tx('a', '2026-10-14', -1000)]);
    expect(c.dateDiffs).toHaveLength(1);
    expect(c.dateDiffs[0]!.days).toBe(6);
  });

  it('oltre i dieci giorni sono due cose diverse', () => {
    const c = compareStatement(statement([e('2026-10-30', -1000)]), [tx('a', '2026-10-05', -1000)]);
    expect(c.dateDiffs).toHaveLength(0);
    expect(c.missingInQuadra).toHaveLength(1);
    expect(c.notInStatement).toHaveLength(1);
  });

  it('segnala i movimenti in più e quelli degli ultimi giorni come forse non addebitati', () => {
    const c = compareStatement(statement([e('2026-10-10', -1000)]), [
      tx('a', '2026-10-10', -1000),
      tx('old', '2026-10-05', -700),
      tx('recent', '2026-10-30', -300),
    ]);
    expect(c.notInStatement.map((n) => [n.tx.id, n.pending])).toEqual([
      ['old', false],
      ['recent', true],
    ]);
  });

  it('ignora i movimenti fuori dal periodo dell’estratto', () => {
    const c = compareStatement(statement([e('2026-10-10', -1000)]), [
      tx('a', '2026-10-10', -1000),
      tx('sep', '2026-09-20', -999),
    ]);
    expect(c.quadraCount).toBe(1);
    expect(c.clean).toBe(true);
  });

  it('abbina uno a uno gli importi uguali, preferendo la data più precisa', () => {
    const c = compareStatement(
      statement([e('2026-10-13', -1577, '2026-10-08'), e('2026-10-15', -1577, '2026-10-12')]),
      [tx('first', '2026-10-13', -1577), tx('second', '2026-10-15', -1577)],
    );
    expect(c.matched.map((m) => [m.entry.date, m.tx.id])).toEqual(
      expect.arrayContaining([
        ['2026-10-13', 'first'],
        ['2026-10-15', 'second'],
      ]),
    );
    expect(c.dateDiffs).toHaveLength(0);
  });

  it('avverte se il conto scelto sembra sbagliato', () => {
    const entries = Array.from({ length: 6 }, (_, i) => e('2026-10-10', -(i + 1) * 100));
    expect(compareStatement(statement(entries), []).likelyWrongAccount).toBe(true);
  });

  it('un avviso di lettura impedisce di dire che tutto torna', () => {
    const s = { ...statement([e('2026-10-10', -1000)]), warnings: ['totals' as const] };
    expect(compareStatement(s, [tx('a', '2026-10-10', -1000)]).clean).toBe(false);
  });
});
