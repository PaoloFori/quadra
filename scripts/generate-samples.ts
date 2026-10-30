/** Genera i due CSV di esempio in samples/ (deterministici). Uso: npm run samples */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

interface Row {
  date: string; // ISO
  description: string;
  cents: number;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = rng(42);
const pick = <T>(list: T[]): T => list[Math.floor(rand() * list.length)]!;
const between = (min: number, max: number): number =>
  Math.round((min + rand() * (max - min)) * 100);
const iso = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const MONTHS: Array<[number, number]> = [
  [2026, 4],
  [2026, 5],
  [2026, 6],
  [2026, 7],
  [2026, 8],
  [2026, 9],
];
const modo1: Row[] = [];
const modo2: Row[] = [];

for (const [y, m] of MONTHS) {
  // Modo2: conto principale
  modo2.push({
    date: iso(y, m, 27),
    description: 'Accredito emolumenti stipendio ACME SRL',
    cents: 215000,
  });
  modo2.push({
    date: iso(y, m, 1),
    description: 'Bonifico a favore di Rossi Anna affitto',
    cents: -68000,
  });
  modo2.push({
    date: iso(y, m, 5),
    description: 'Addebito SDD Enel Energia bolletta',
    cents: -between(45, 95),
  });
  modo2.push({ date: iso(y, m, 9), description: 'Addebito SDD Vodafone Italia', cents: -2999 });
  modo2.push({ date: iso(y, m, 15), description: 'Canone conto commissioni', cents: -200 });
  modo2.push({ date: iso(y, m, 3), description: 'Giroconto verso Modo1', cents: -30000 });
  modo2.push({
    date: iso(y, m, 12),
    description: 'Pagamento POS Farmacia Centrale',
    cents: -between(8, 40),
  });
  modo2.push({
    date: iso(y, m, 16),
    description: 'Pagamento POS Carrefour supermercato',
    cents: -between(20, 70),
  });
  modo2.push({
    date: iso(y, m, 22),
    description: 'Pagamento POS Caffè Torino',
    cents: -between(2, 9),
  });
  if (m % 2 === 0)
    modo2.push({
      date: iso(y, m, 20),
      description: 'Pagamento POS Zara Milano',
      cents: -between(30, 120),
    });

  // Modo1: conto per le spese quotidiane
  modo1.push({ date: iso(y, m, 4), description: 'Giroconto da Modo2', cents: 30000 });
  modo1.push({ date: iso(y, m, 7), description: 'Netflix.com', cents: -1299 });
  modo1.push({ date: iso(y, m, 11), description: 'Spotify AB', cents: -1099 });
  for (let i = 0; i < 8; i++) {
    modo1.push({
      date: iso(y, m, 2 + i * 3),
      description: `Pagamento carta ${pick(['Esselunga', 'Coop', 'Lidl', 'Conad'])} Milano`,
      cents: -between(18, 85),
    });
  }
  for (let i = 0; i < 2; i++) {
    modo1.push({
      date: iso(y, m, 6 + i * 11),
      description: 'Pagamento carta ENI Station benzina',
      cents: -between(35, 60),
    });
  }
  for (let i = 0; i < 6; i++) {
    modo1.push({
      date: iso(y, m, 3 + i * 4),
      description: `Pagamento carta ${pick(['Pizzeria Da Gigi', 'Ristorante Il Borgo', 'Bar Roma', 'McDonald'])}`,
      cents: -between(6, 48),
    });
  }
  for (let i = 0; i < 2; i++) {
    modo1.push({
      date: iso(y, m, 8 + i * 9),
      description: pick(['Trenitalia biglietto', 'Taxi Milano', 'ATM Milano abbonamento']),
      cents: -between(4, 35),
    });
  }
  modo1.push({ date: iso(y, m, 25), description: 'Libreria Città Milano', cents: -between(12, 40) });
  modo1.push({ date: iso(y, m, 14), description: 'Amazon EU SARL', cents: -between(10, 90) });
  modo1.push({
    date: iso(y, m, 18),
    description: 'Prelievo bancomat ATM',
    cents: -between(20, 100),
  });
  // Due caffè identici lo stesso giorno: movimenti legittimi da non deduplicare
  modo1.push({ date: iso(y, m, 21), description: 'Pagamento carta Bar Roma caffe', cents: -130 });
  modo1.push({ date: iso(y, m, 21), description: 'Pagamento carta Bar Roma caffe', cents: -130 });
}

const fmt = (cents: number): string => {
  const abs = Math.abs(cents);
  const int = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cents < 0 ? '-' : ''}${int},${String(abs % 100).padStart(2, '0')}`;
};
const dmy = (d: string): string => d.split('-').reverse().join('/');
const byDate = (a: Row, b: Row): number => a.date.localeCompare(b.date);

function withBalance(rows: Row[], opening: number): Array<Row & { balance: number }> {
  let balance = opening;
  return [...rows].sort(byDate).map((r) => ({ ...r, balance: (balance += r.cents) }));
}

const modo1Rows = withBalance(modo1, 300000).reverse(); // Modo1: più recenti prima
const modo1Csv = [
  'Modo1 - Movimenti conto',
  'Titolare;Paolo',
  'Periodo;01/04/2026 - 30/09/2026',
  '',
  'Data;Data valuta;Descrizione;Importo;Saldo',
  ...modo1Rows.map(
    (r) => `${dmy(r.date)};${dmy(r.date)};${r.description};${fmt(r.cents)};${fmt(r.balance)}`,
  ),
  '',
  `Totale movimenti;${modo1Rows.length}`,
].join('\r\n');

const modo2Rows = withBalance(modo2, 450000);
const modo2Csv = [
  'Modo2 - Lista movimenti',
  'Data;Operazione;Dettagli;Conto o carta;Contabilizzazione;Categoria;Valuta;Importo',
  ...modo2Rows.map(
    (r) =>
      `${dmy(r.date)};${r.description.split(' ')[0]};"${r.description}";Conto 1000/00123456;CONTABILIZZATO;;EUR;${fmt(r.cents)}`,
  ),
  '',
  `Totale operazioni;${modo2Rows.length}`,
].join('\r\n');

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'samples');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'modo1-esempio.csv'), modo1Csv, 'utf8');
// Windows-1252: come gli export reali di molte banche italiane
writeFileSync(join(dir, 'modo2-esempio.csv'), Buffer.from(modo2Csv, 'latin1'));
console.log(`Modo1: ${modo1Rows.length} movimenti, Modo2: ${modo2Rows.length} movimenti`);
