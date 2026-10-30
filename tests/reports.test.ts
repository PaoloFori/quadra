import { describe, expect, it } from 'vitest';
import { filterByAccount, savingsRate, totalsByAccount } from '@/domain/reports/accounts';
import { budgetStatuses, levelOf } from '@/domain/reports/budget';
import { buildMonthReport } from '@/domain/reports/month';
import { detectRecurring } from '@/domain/reports/recurring';
import { compare, expensesByCategory, totalsOf } from '@/domain/reports/totals';
import { buildYearReport } from '@/domain/reports/year';
import type { Transaction } from '@/domain/types';

let n = 0;
const tx = (date: string, amountCents: number, over: Partial<Transaction> = {}): Transaction => ({
  id: `t${n++}`,
  accountId: 'bbva',
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
    expect(report.top5.map((t) => t.amountCents)).toEqual([-4000, -1000, -500]);
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
      [{ id: 'b', categoryId: 'groceries', monthlyCents: 10000 }],
      [tx('2026-03-01', -8500)],
    );
    expect(s).toMatchObject({ spent: 8500, remaining: 1500, level: 'warning' });
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
