import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { addManualTransaction, recategorize, setTransfer } from '@/db/transactionService';
import { derivePattern, learnRule, matchCategory } from '@/domain/rules';
import type { Rule } from '@/domain/types';

const rule = (pattern: string, categoryId: string, origin: Rule['origin'] = 'user'): Rule => ({
  id: pattern,
  pattern,
  categoryId,
  origin,
});

describe('matchCategory', () => {
  it('usa la regola più specifica', () => {
    const rules = [rule('amazon', 'shopping'), rule('amazon prime', 'subscriptions')];
    expect(matchCategory('AMAZON PRIME IT', rules)).toBe('subscriptions');
    expect(matchCategory('Amazon EU', rules)).toBe('shopping');
  });
  it('ignora accenti e maiuscole; nessun match → null', () => {
    expect(matchCategory('Caffè Torino', [rule('caffe', 'restaurants')])).toBe('restaurants');
    expect(matchCategory('xyz', [rule('caffe', 'restaurants')])).toBeNull();
  });
});

describe('apprendimento', () => {
  it('ricava un pattern saltando le parole generiche', () => {
    expect(derivePattern('Pagamento POS Panificio Rossi 12345')).toBe('panificio rossi');
    expect(derivePattern('POS 1234')).toBeNull();
  });
  it('aggiorna la regola esistente invece di duplicarla', () => {
    const first = learnRule([], 'Panificio Rossi', 'groceries', 'r1');
    const second = learnRule(first, 'PANIFICIO ROSSI Milano', 'restaurants', 'r2');
    expect(second).toHaveLength(1);
    expect(second[0]?.categoryId).toBe('restaurants');
  });
});

describe('recategorize su database', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('impara e applica ai movimenti simili senza categoria', async () => {
    const base = { accountId: 'bbva', date: '2026-03-01', amountCents: -500, categoryId: null };
    const a = await addManualTransaction({ ...base, note: 'Panificio Rossi' });
    const b = await addManualTransaction({
      ...base,
      note: 'Panificio Rossi centro',
      date: '2026-03-02',
    });
    const other = await addManualTransaction({ ...base, note: 'Cinema', date: '2026-03-03' });
    expect(await recategorize(a, 'groceries', true)).toBe(1);
    expect((await db.transactions.get(b.id))?.categoryId).toBe('groceries');
    expect((await db.transactions.get(other.id))?.categoryId).toBeNull();
    expect(await db.rules.filter((r) => r.pattern === 'panificio rossi').count()).toBe(1);
  });

  it('setTransfer marca/smarca l’intera coppia', async () => {
    const base = { accountId: 'bbva', date: '2026-03-01', categoryId: null, note: 'g' };
    const out = await addManualTransaction({ ...base, amountCents: -100 });
    await setTransfer(out, true);
    expect((await db.transactions.get(out.id))?.isTransfer).toBe(true);
    await setTransfer((await db.transactions.get(out.id))!, false);
    expect((await db.transactions.get(out.id))?.isTransfer).toBe(false);
  });
});
