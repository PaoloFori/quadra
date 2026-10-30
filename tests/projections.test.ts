import { describe, expect, it } from 'vitest';
import {
  lastFullMonths,
  projectWealth,
  savingsGoal,
  trend,
  wealthSeries,
} from '@/domain/reports/projections';
import type { Transaction } from '@/domain/types';

let n = 0;
const tx = (date: string, amountCents: number, isTransfer = false): Transaction => ({
  id: `t${n++}`,
  accountId: 'a',
  date,
  amountCents,
  description: 'x',
  categoryId: null,
  hash: 'h',
  isTransfer,
  source: 'manual',
  createdAt: 0,
  updatedAt: 0,
});

describe('patrimonio nel tempo', () => {
  it('ricostruisce i fine mese all’indietro dal saldo di oggi', () => {
    const txs = [tx('2026-08-10', 100000), tx('2026-09-05', -20000), tx('2026-10-02', -5000)];
    const s = wealthSeries(500000, txs, '2026-10-20', 3);
    expect(s.map((p) => p.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(s.map((p) => p.cents)).toEqual([525000, 505000, 500000]);
  });
  it('un giroconto tra i propri conti non cambia il patrimonio totale', () => {
    const txs = [tx('2026-09-05', -30000, true), tx('2026-09-05', 30000, true)];
    const s = wealthSeries(100000, txs, '2026-10-20', 2);
    expect(s[0]?.cents).toBe(100000);
  });
});

describe('proiezioni', () => {
  const txs = [
    tx('2026-07-05', 200000),
    tx('2026-07-10', -150000),
    tx('2026-08-05', 200000),
    tx('2026-08-10', -170000),
    tx('2026-09-05', 200000),
    tx('2026-09-10', -160000),
    tx('2026-10-05', 999999), // mese in corso: escluso
  ];
  it('usa solo gli ultimi 3 mesi completi', () => {
    const flows = lastFullMonths(txs, '2026-10-20');
    expect(flows.map((f) => f.month)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(flows.map((f) => f.net)).toEqual([50000, 30000, 40000]);
  });
  it('trend: risparmio medio e stima a 6 e 12 mesi', () => {
    const t = trend(1000000, lastFullMonths(txs, '2026-10-20'));
    expect(t.avgSavingCents).toBe(40000);
    expect(t.in6Months).toBe(1240000);
    expect(t.in12Months).toBe(1480000);
    expect(t.sufficientHistory).toBe(true);
  });
  it('storico insufficiente se mancano mesi con movimenti', () => {
    expect(trend(0, lastFullMonths([tx('2026-09-05', 100)], '2026-10-20')).sufficientHistory).toBe(
      false,
    );
  });
});

describe('obiettivo di risparmio', () => {
  const base = { currentCents: 100000, avgIncomeCents: 200000, today: '2026-10-20' };
  it('quanto mettere da parte e quanto si può spendere', () => {
    const g = savingsGoal({ ...base, targetCents: 700000, targetDate: '2027-04-20' });
    expect(g.monthsRemaining).toBe(6);
    expect(g.requiredPerMonthCents).toBe(100000);
    expect(g.maxSpendPerMonthCents).toBe(100000);
    expect(g.feasible).toBe(true);
  });
  it('non sostenibile se serve più delle entrate', () => {
    const g = savingsGoal({ ...base, targetCents: 2500000, targetDate: '2027-04-20' });
    expect(g.feasible).toBe(false);
  });
  it('data passata o troppo vicina', () => {
    expect(savingsGoal({ ...base, targetCents: 1, targetDate: '2026-10-01' }).status).toBe('past');
    expect(savingsGoal({ ...base, targetCents: 500000, targetDate: '2026-11-05' }).status).toBe(
      'tooSoon',
    );
  });
  it('già raggiunto: niente da mettere da parte', () => {
    const g = savingsGoal({ ...base, targetCents: 50000, targetDate: '2027-04-20' });
    expect(g.reached).toBe(true);
    expect(g.requiredPerMonthCents).toBe(0);
  });
});

describe('grafico patrimonio con proiezione', () => {
  const series = [
    { month: '2026-08', cents: 100 },
    { month: '2026-09', cents: 200 },
    { month: '2026-10', cents: 300 },
  ];
  it('aggiunge una coda stimata e calcola la variazione', () => {
    const p = projectWealth(series, 50, 2);
    expect(p.values).toEqual([100, 200, 300, 350, 400]);
    expect(p.months.slice(-2)).toEqual(['2026-11', '2026-12']);
    expect(p.projectedFrom).toBe(3);
    expect(p.delta).toEqual({ cents: 200, months: 2 });
  });
});
