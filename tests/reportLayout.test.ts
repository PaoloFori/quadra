import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { exportBackup, restoreBackup } from '@/db/backupService';
import { getSettings, setSetting } from '@/db/settings';
import { parseBackup } from '@/domain/backup/format';
import { moveBlock, orderBlocks, sanitizeLayouts } from '@/domain/reports/layout';
import { movementItems, takeMovements } from '@/domain/reports/movementsList';
import type { Transaction } from '@/domain/types';

const tx = (id: string, date: string, amountCents: number, categoryId: string | null = 'groceries', isTransfer = false): Transaction => ({
  id, accountId: 'a', date, amountCents, description: id, categoryId, hash: id, isTransfer,
  source: 'manual', createdAt: 0, updatedAt: 0,
});
const name = (id: string | null): string => id ?? '—';

describe('layout dei blocchi', () => {
  it('senza personalizzazione l’ordine è quello di default', () => {
    expect(orderBlocks(['a', 'b', 'c'], undefined).map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });
  it('rispetta ordine e nascosti, ignora id sconosciuti e aggiunge i blocchi nuovi in fondo', () => {
    const r = orderBlocks(['a', 'b', 'c', 'd'], { order: ['c', 'zzz', 'a'], hidden: ['a'] });
    expect(r.map((o) => o.id)).toEqual(['c', 'a', 'b', 'd']);
    expect(r.find((o) => o.id === 'a')?.hidden).toBe(true);
  });
  it('sposta su e giù senza uscire dai bordi', () => {
    expect(moveBlock(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveBlock(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moveBlock(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });
  it('scarta dati salvati con forma sbagliata', () => {
    expect(sanitizeLayouts('x')).toEqual({});
    expect(sanitizeLayouts({ month: { order: ['a', 3], hidden: 'no' }, year: 5 })).toEqual({
      month: { order: ['a'], hidden: [] },
    });
  });
});

describe('elenco movimenti del periodo', () => {
  const rows = [
    tx('t1', '2026-03-01', -1000, 'groceries'),
    tx('t2', '2026-03-02', -5000, 'health'),
    tx('t3', '2026-03-02', -2000, 'groceries'),
    tx('t4', '2026-03-03', 100000, 'salary'),
    tx('t5', '2026-03-03', -300, null, true),
  ];
  it('per giorni: dal più recente, totale del giorno senza giroconti', () => {
    const items = movementItems(rows, 'day', name);
    expect(items[0]).toMatchObject({ kind: 'header', date: '2026-03-03', totalCents: 100000 });
    expect(items.filter((i) => i.kind === 'header')).toHaveLength(3);
  });
  it('per categoria: prima la più costosa', () => {
    const headers = movementItems(rows, 'category', name).filter((i) => i.kind === 'header');
    expect(headers.map((h) => (h.kind === 'header' ? h.categoryId : 'x'))).toEqual([
      'health',
      'groceries',
      null,
      'salary',
    ]);
  });
  it('per importo: il movimento più grande per primo, lista piatta', () => {
    const items = movementItems(rows, 'amount', name);
    expect(items.every((i) => i.kind === 'tx')).toBe(true);
    expect(items[0]).toMatchObject({ tx: { id: 't4' } });
  });
  it('takeMovements conta solo i movimenti e non lascia intestazioni orfane', () => {
    const out = takeMovements(movementItems(rows, 'day', name), 3);
    expect(out.filter((i) => i.kind === 'tx')).toHaveLength(3);
    expect(out.at(-1)?.kind).toBe('tx');
  });
});

describe('layout nei backup', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  it('viene esportato e ripristinato con il backup', async () => {
    await setSetting('reportLayouts', { month: { order: ['b', 'a'], hidden: ['a'] } });
    const file = await parseBackup(JSON.stringify(await exportBackup({ kind: 'all' })));
    expect(file.data.settings.reportLayouts?.month?.hidden).toEqual(['a']);
    await db.settings.clear();
    await restoreBackup(file, 'replace');
    expect((await getSettings()).reportLayouts).toEqual({ month: { order: ['b', 'a'], hidden: ['a'] } });
  });
});
