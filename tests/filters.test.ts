import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER, filterTransactions, isFilterActive } from '@/domain/filters';
import type { Transaction } from '@/domain/types';

const tx = (over: Partial<Transaction>): Transaction => ({
  id: 'x',
  accountId: 'bbva',
  date: '2026-03-10',
  amountCents: -1000,
  description: 'Esselunga Milano',
  categoryId: 'groceries',
  hash: 'h',
  isTransfer: false,
  source: 'import',
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

const data = [
  tx({ id: '1' }),
  tx({
    id: '2',
    accountId: 'intesa',
    date: '2026-04-02',
    amountCents: 215000,
    description: 'Stipendio',
    categoryId: 'salary',
  }),
  tx({ id: '3', description: 'Caffè', amountCents: -130, categoryId: null, note: 'colazione' }),
];

describe('filterTransactions', () => {
  it('cerca ignorando maiuscole e accenti, anche nella nota', () => {
    expect(filterTransactions(data, { text: 'CAFFE' }).map((t) => t.id)).toEqual(['3']);
    expect(filterTransactions(data, { text: 'colazione' }).map((t) => t.id)).toEqual(['3']);
  });
  it('filtra per conto, categoria (anche nessuna), date e importo assoluto', () => {
    expect(filterTransactions(data, { text: '', accountId: 'intesa' })).toHaveLength(1);
    expect(filterTransactions(data, { text: '', categoryId: null }).map((t) => t.id)).toEqual([
      '3',
    ]);
    expect(filterTransactions(data, { text: '', from: '2026-04-01' }).map((t) => t.id)).toEqual([
      '2',
    ]);
    expect(
      filterTransactions(data, { text: '', minCents: 1000, maxCents: 5000 }).map((t) => t.id),
    ).toEqual(['1']);
  });
  it('isFilterActive', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive({ text: ' ' })).toBe(false);
    expect(isFilterActive({ text: '', categoryId: null })).toBe(true);
  });
});

describe('filtro per tipo', () => {
  const rows = [
    tx({ id: 'u', amountCents: -500 }),
    tx({ id: 'e', amountCents: 900, categoryId: 'salary' }),
    tx({ id: 'g', amountCents: -300, isTransfer: true, categoryId: null }),
    tx({ id: 'g2', amountCents: 300, isTransfer: true, categoryId: null }),
  ];
  it('uscite ed entrate escludono i giroconti', () => {
    expect(filterTransactions(rows, { ...EMPTY_FILTER, type: 'expense' }).map((r) => r.id)).toEqual(
      ['u'],
    );
    expect(filterTransactions(rows, { ...EMPTY_FILTER, type: 'income' }).map((r) => r.id)).toEqual([
      'e',
    ]);
  });
  it('è un filtro attivo', () => {
    expect(isFilterActive({ ...EMPTY_FILTER, type: 'income' })).toBe(true);
  });
});
