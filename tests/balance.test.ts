import { describe, expect, it } from 'vitest';
import { monthEndBalances } from '@/domain/reports/balance';

const tx = (date: string, amountCents: number) => ({ date, amountCents });

describe('saldo a fine mese', () => {
  const txs = [
    tx('2026-01-10', 100_000), // stipendio
    tx('2026-01-20', -30_000),
    tx('2026-02-05', -10_000),
    tx('2026-04-01', 50_000), // marzo senza movimenti
  ];

  it('parte dal saldo iniziale e somma i movimenti mese per mese', () => {
    const r = monthEndBalances(20_000, txs, '2026-02', 2);
    expect(r).toEqual([
      { month: '2026-01', startCents: 20_000, endCents: 90_000 },
      { month: '2026-02', startCents: 90_000, endCents: 80_000 },
    ]);
  });

  it('conta anche i movimenti dei mesi precedenti alla finestra mostrata', () => {
    const [only] = monthEndBalances(0, txs, '2026-02', 1);
    expect(only).toEqual({ month: '2026-02', startCents: 70_000, endCents: 60_000 });
  });

  it('un mese senza movimenti tiene il saldo precedente', () => {
    const r = monthEndBalances(0, txs, '2026-04', 2);
    expect(r[0]).toEqual({ month: '2026-03', startCents: 60_000, endCents: 60_000 });
    expect(r[1]).toEqual({ month: '2026-04', startCents: 60_000, endCents: 110_000 });
  });

  it('ignora i movimenti dopo l\'ultimo mese e passa l\'anno', () => {
    const r = monthEndBalances(0, [tx('2025-12-31', 500), tx('2026-01-02', 200), tx('2026-03-01', 999)], '2026-01', 2);
    expect(r).toEqual([
      { month: '2025-12', startCents: 0, endCents: 500 },
      { month: '2026-01', startCents: 500, endCents: 700 },
    ]);
  });
});
