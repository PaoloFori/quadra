import { describe, expect, it } from 'vitest';
import { dueDates, dueNow, nextOccurrence, upcoming } from '@/domain/recurrence';
import type { Recurrence } from '@/domain/types';

const rec = (over: Partial<Recurrence> = {}): Recurrence => ({
  id: 'r1',
  title: 'Stipendio',
  accountId: 'a',
  amountCents: 150000,
  categoryId: 'salary',
  frequency: 'monthly',
  nextDue: '2026-10-27',
  anchorDay: 27,
  remind: true,
  active: true,
  createdAt: 0,
  ...over,
});

describe('prossima scadenza', () => {
  it('settimanale e ogni due settimane', () => {
    expect(nextOccurrence('2026-10-05', 'weekly', 5)).toBe('2026-10-12');
    expect(nextOccurrence('2026-10-05', 'biweekly', 5)).toBe('2026-10-19');
  });
  it('mensile, trimestrale e annuale', () => {
    expect(nextOccurrence('2026-10-27', 'monthly', 27)).toBe('2026-11-27');
    expect(nextOccurrence('2026-11-27', 'quarterly', 27)).toBe('2027-02-27');
    expect(nextOccurrence('2026-10-27', 'yearly', 27)).toBe('2027-10-27');
  });
  it('il 31 non si perde dopo un mese corto', () => {
    const feb = nextOccurrence('2026-01-31', 'monthly', 31);
    expect(feb).toBe('2026-02-28');
    expect(nextOccurrence(feb, 'monthly', 31)).toBe('2026-03-31');
  });
  it('29 febbraio: negli anni non bisestili cade il 28', () => {
    expect(nextOccurrence('2024-02-29', 'yearly', 29)).toBe('2025-02-28');
    expect(nextOccurrence('2027-02-28', 'yearly', 29)).toBe('2028-02-29');
  });
});

describe('scadenze', () => {
  it('più scadenze arretrate se l’app è rimasta chiusa', () => {
    expect(dueDates(rec({ nextDue: '2026-08-27' }), '2026-10-30')).toEqual([
      '2026-08-27',
      '2026-09-27',
      '2026-10-27',
    ]);
  });
  it('niente se la prossima è nel futuro', () => {
    expect(dueDates(rec({ nextDue: '2026-11-27' }), '2026-10-30')).toEqual([]);
  });
  it('da registrare: solo quelle con avviso e attive', () => {
    const recs = [
      rec({ id: 'a' }),
      rec({ id: 'b', remind: false }),
      rec({ id: 'c', active: false }),
    ];
    expect(dueNow(recs, '2026-10-30').map((d) => d.recurrence.id)).toEqual(['a']);
    expect(dueNow(recs, '2026-10-30', false).map((d) => d.recurrence.id)).toEqual(['a', 'b']);
  });
  it('in arrivo: entro 7 giorni, esclusi oggi e i giorni passati', () => {
    const recs = [
      rec({ id: 'oggi', nextDue: '2026-10-30' }),
      rec({ id: 'tra3', nextDue: '2026-11-02' }),
      rec({ id: 'tra20', nextDue: '2026-11-19' }),
    ];
    expect(upcoming(recs, '2026-10-30').map((d) => d.recurrence.id)).toEqual(['tra3']);
  });
});
