import { describe, expect, it } from 'vitest';
import { backupReminder } from '@/domain/backup/reminder';

const at = (iso: string): Date => new Date(`${iso}T12:00:00`);

describe('promemoria backup', () => {
  it('niente dati → niente promemoria', () => {
    expect(backupReminder(at('2026-06-01'), undefined, false)).toBe('none');
  });
  it('mai fatto un backup', () => {
    expect(backupReminder(at('2026-06-01'), undefined, true)).toBe('never');
  });
  it('più di 30 giorni → stale; 30 giorni esatti → ok', () => {
    expect(backupReminder(at('2026-06-01'), at('2026-04-30').toISOString(), true)).toBe('stale');
    expect(backupReminder(at('2026-06-01'), at('2026-05-02').toISOString(), true)).toBe('none');
  });
  it('fine anno: dal 15 dicembre finché non si fa un backup', () => {
    expect(backupReminder(at('2026-12-20'), at('2026-12-10').toISOString(), true)).toBe('yearEnd');
    expect(backupReminder(at('2026-12-20'), at('2026-12-16').toISOString(), true)).toBe('none');
    expect(backupReminder(at('2026-12-10'), at('2026-12-01').toISOString(), true)).toBe('none');
  });
});
