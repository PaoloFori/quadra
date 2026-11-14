import { describe, expect, it } from 'vitest';
import { filterByAccount, savingsRate, totalsByAccount } from '@/domain/reports/accounts';
import { budgetStatuses, budgetsOverlap, levelOf } from '@/domain/reports/budget';
import { buildCategoryReport } from '@/domain/reports/category';
import { buildMonthReport } from '@/domain/reports/month';
import { detectRecurring } from '@/domain/reports/recurring';
import { compare, expensesByCategory, totalsOf } from '@/domain/reports/totals';
import { buildYearReport } from '@/domain/reports/year';
import type { Transaction } from '@/domain/types';

let n = 0;
const tx = (date: string, amountCents: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`,
  accountId: 'modo1',
  date,
  amountCents,
  description: 'x',
  categoryId: 'groceries',
  hash: 'h',
  isTransfer: false,
  source: 'import',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe('totali', () => {
  it('escludono i giroconti da entrate e uscite', () => {
    const t = totalsOf([
      tx('2026-03-01', 100000),
      tx('2026-03-02', -2500),
      tx('2026-03-03', -30000, { isTransfer: true }),
    ]);
    expect(t).toEqual({ income: 100000, expenses: 2500, net: 97500 });
  });
  it('raggruppa per categoria con quote', () => {
    const r = expensesByCategory([
      tx('2026-03-01', -300),
      tx('2026-03-02', -100, { categoryId: null }),
    ]);
    expect(r[0]).toMatchObject({ categoryId: 'groceries', cents: 300, share: 0.75 });
    expect(r[1]?.categoryId).toBeNull();
  });
  it('compare gestisce precedente a zero', () => {
    expect(compare(150, 100)).toEqual({ diff: 50, pct: 0.5 });
    expect(compare(10, 0).pct).toBeNull();
  });
});

describe('resoconto mensile', () => {
  const data = [
    tx('2026-03-02', -1000),
    tx('2026-03-02', -500, { categoryId: 'fuel' }),
    tx('2026-03-10', -4000),
    tx('2026-03-27', 200000, { categoryId: 'salary' }),
    tx('2026-02-05', -2000),
    tx('2026-02-20', -1000),
  ];
  const report = buildMonthReport(data, '2026-03');

  it('totali e confronto col mese precedente', () => {
    expect(report.totals).toEqual({ income: 200000, expenses: 5500, net: 194500 });
    expect(report.previousTotals.expenses).toBe(3000);
    expect(report.expensesChange.diff).toBe(2500);
    expect(report.expensesChange.pct).toBeCloseTo(0.8333, 3);
  });
  it('andamento giornaliero cumulato', () => {
    expect(report.daily).toHaveLength(31);
    expect(report.daily[1]?.cumulative).toBe(1500);
    expect(report.daily[30]?.cumulative).toBe(5500);
    expect(report.daily[4]?.previousCumulative).toBe(2000);
  });
  it('top 5 ordinato per importo', () => {
    expect(report.topExpenses.map((t) => t.amountCents)).toEqual([-4000, -1000, -500]);
  });
  it('limita la serie al giorno indicato', () => {
    expect(buildMonthReport(data, '2026-03', 10).daily).toHaveLength(10);
  });
});

describe('resoconto annuale', () => {
  const data = [
    tx('2026-01-10', -1000),
    tx('2026-01-12', 100000, { categoryId: 'salary' }),
    tx('2026-02-10', -5000),
    tx('2026-04-10', -2000),
    tx('2025-01-10', -3000),
  ];
  const r = buildYearReport(data, '2026');
  it('totali per mese, media su mesi con dati, mese più caro e più leggero', () => {
    expect(r.months).toHaveLength(12);
    expect(r.totals.expenses).toBe(8000);
    expect(r.averageMonthlyExpenses).toBe(2667);
    expect(r.mostExpensive?.month).toBe('2026-02');
    expect(r.lightest?.month).toBe('2026-01');
  });
  it('confronto con anno precedente', () => {
    expect(r.previousTotals.expenses).toBe(3000);
    expect(r.expensesChange.diff).toBe(5000);
  });
  it('anno vuoto', () => {
    const e = buildYearReport([], '2030');
    expect(e.hasData).toBe(false);
    expect(e.mostExpensive).toBeNull();
  });
});

describe('abbonamenti ricorrenti', () => {
  const sub = (month: string, cents = -1299, day = '07') =>
    tx(`2026-${month}-${day}`, cents, { description: `Netflix.com ${month}123` });
  it('rileva importi stabili in 3+ mesi', () => {
    const found = detectRecurring([
      sub('01'),
      sub('02'),
      sub('03'),
      tx('2026-02-03', -4500, { description: 'Supermercato' }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ cents: 1299, months: 3 });
  });
  it('scarta importi variabili, pochi mesi e giroconti', () => {
    expect(detectRecurring([sub('01'), sub('02', -5000), sub('03')])).toHaveLength(0);
    expect(detectRecurring([sub('01'), sub('02')])).toHaveLength(0);
    expect(
      detectRecurring(['01', '02', '03'].map((m) => ({ ...sub(m), isTransfer: true }))),
    ).toHaveLength(0);
  });
});

describe('budget', () => {
  it('livelli all’80% e al 100%', () => {
    expect(levelOf(0.79)).toBe('ok');
    expect(levelOf(0.8)).toBe('warning');
    expect(levelOf(1)).toBe('over');
  });
  it('calcola speso e residuo per categoria', () => {
    const [s] = budgetStatuses(
      [{ id: 'b', categoryIds: ["groceries"], monthlyCents: 10000 }],
      [tx('2026-03-01', -8500)],
    );
    expect(s).toMatchObject({ spent: 8500, remaining: 1500, level: 'warning' });
  });
});

describe('budget con più categorie', () => {
  const t2 = (cat: string, cents: number): Transaction => ({ ...tx('2026-03-01', cents), categoryId: cat });
  it('somma le spese di tutte le categorie del budget con un solo limite', () => {
    const [s] = budgetStatuses(
      [{ id: 'c', name: 'Casa', categoryIds: ['bills', 'rent'], monthlyCents: 100000 }],
      [t2('bills', -20000), t2('rent', -70000), t2('groceries', -5000)],
    );
    expect(s).toMatchObject({ spent: 90000, remaining: 10000, level: 'warning' });
  });
  it('budget sovrapposti: ognuno conta le sue categorie, e l’overlap è rilevato', () => {
    const budgets = [
      { id: 'a', name: 'Tutto', categoryIds: ['bills', 'rent', 'groceries'], monthlyCents: 200000 },
      { id: 'b', name: 'Casa', categoryIds: ['bills', 'rent'], monthlyCents: 100000 },
    ];
    const [all, home] = budgetStatuses(budgets, [t2('bills', -20000), t2('groceries', -5000)]);
    expect(all?.spent).toBe(25000);
    expect(home?.spent).toBe(20000);
    expect(budgetsOverlap(budgets)).toBe(true);
    expect(budgetsOverlap([budgets[1]!])).toBe(false);
  });
});

describe('resoconti per conto', () => {
  const mk = (accountId: string, amountCents: number, isTransfer = false): Transaction => ({
    id: `${accountId}${amountCents}${isTransfer}`,
    accountId,
    date: '2026-03-10',
    amountCents,
    description: 'x',
    categoryId: null,
    hash: 'h',
    isTransfer,
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
  });
  const txs = [mk('a', 100000), mk('a', -20000), mk('b', -5000), mk('b', -7000, true)];

  it('filtra per conto o li tiene tutti', () => {
    expect(filterByAccount(txs, 'all')).toHaveLength(4);
    expect(filterByAccount(txs, 'b')).toHaveLength(2);
  });
  it('totali per conto, giroconti esclusi', () => {
    const rows = totalsByAccount(txs, [
      { id: 'a', name: 'A', bank: 'other' },
      { id: 'b', name: 'B', bank: 'other' },
    ]);
    expect(rows.map((r) => [r.income, r.expenses, r.net])).toEqual([
      [100000, 20000, 80000],
      [0, 5000, -5000],
    ]);
  });
  it('quota di risparmio', () => {
    expect(savingsRate({ income: 100000, expenses: 20000, net: 80000 })).toBe(0.8);
    expect(savingsRate({ income: 0, expenses: 5, net: -5 })).toBeNull();
  });
});

describe('analisi di una categoria', () => {
  const mk = (
    date: string,
    amountCents: number,
    description: string,
    categoryId: string | null = 'groceries',
    isTransfer = false,
  ): Transaction => ({
    id: `${date}${amountCents}${description}`,
    accountId: 'a',
    date,
    amountCents,
    description,
    categoryId,
    hash: 'h',
    isTransfer,
    source: 'manual',
    createdAt: 0,
    updatedAt: 0,
  });
  const txs = [
    mk('2026-08-03', -3000, 'spesa lidl 123'),
    mk('2026-09-04', -4000, 'spesa lidl 456'),
    mk('2026-10-05', -2000, 'spesa auchan'),
    mk('2026-10-07', -1000, 'spesa lidl 789'),
    mk('2026-10-08', 500, 'rimborso', 'groceries'),
    mk('2026-10-09', -9999, 'altro', 'fuel'),
    mk('2026-10-10', -7000, 'giroconto', 'groceries', true),
  ];
  const r = buildCategoryReport(txs, 'groceries', '2026-10-20');

  it('totali, mese corrente e precedente (rimborsi e giroconti inclusi/esclusi)', () => {
    expect(r.kind).toBe('expense');
    expect(r.count).toBe(5);
    expect(r.totalCents).toBe(9500); // 3000+4000+2000+1000-500
    expect(r.thisMonthCents).toBe(2500);
    expect(r.previousMonthCents).toBe(4000);
  });
  it('media mensile dai mesi trascorsi dal primo movimento', () => {
    expect(r.avgMonthlyCents).toBe(Math.round(9500 / 3));
    expect(r.months).toHaveLength(12);
    expect(r.months[11]).toEqual({ month: '2026-10', cents: 2500 });
  });
  it('raggruppa gli esercenti ignorando i numeri', () => {
    expect(r.topMerchants[0]).toMatchObject({ count: 3, cents: 8000 });
    expect(r.topMerchants[0]?.label).toContain('lidl');
  });
  it('quota sul totale delle spese', () => {
    expect(r.share).toBeCloseTo(9500 / (9500 + 500 + 9999), 1);
  });
  it('una categoria senza movimenti ha tutto a zero', () => {
    const empty = buildCategoryReport(txs, 'health', '2026-10-20');
    expect(empty.count).toBe(0);
    expect(empty.avgMonthlyCents).toBe(0);
  });
});
