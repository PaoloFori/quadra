import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/database';
import { commitImport, previewImport } from '@/db/importService';
import { analyzeTable } from '@/domain/importing/analyze';
import { parseRows } from '@/domain/importing/parse';
import { readTable } from '@/domain/importing/table';

async function load(name: string) {
  const buf = readFileSync(`samples/${name}`);
  const table = await readTable(
    name,
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
  );
  return parseRows(table, analyzeTable(table, [])!);
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('import su database', () => {
  it('importa, rileva giroconti e applica le regole', async () => {
    const bbva = await previewImport('bbva', await load('bbva-esempio.csv'));
    expect(bbva.newCount).toBe(156);
    await commitImport(bbva, { markTransfers: true });

    const intesa = await previewImport('intesa', await load('intesa-esempio.csv'));
    expect(intesa.transferPairs).toHaveLength(6);
    await commitImport(intesa, { markTransfers: true });

    expect(await db.transactions.count()).toBe(213);
    expect(await db.transactions.filter((t) => t.isTransfer).count()).toBe(12);
    const netflix = await db.transactions.filter((t) => t.description.includes('Netflix')).first();
    expect(netflix?.categoryId).toBe('subscriptions');
    const salary = await db.transactions.filter((t) => t.description.includes('stipendio')).first();
    expect(salary?.categoryId).toBe('salary');
  });

  it('secondo import dello stesso file: tutto già presente', async () => {
    const file = await load('bbva-esempio.csv');
    await commitImport(await previewImport('bbva', file), { markTransfers: false });
    const again = await previewImport('bbva', file);
    expect(again.newCount).toBe(0);
    expect(again.duplicateCount).toBe(156);
    expect(await commitImport(again, { markTransfers: false })).toBe(0);
    expect(await db.transactions.count()).toBe(156);
  });

  it('i due caffè identici dello stesso giorno restano due movimenti', async () => {
    await commitImport(await previewImport('bbva', await load('bbva-esempio.csv')), {
      markTransfers: false,
    });
    const coffees = await db.transactions
      .filter((t) => t.description.includes('caffe') && t.date === '2026-05-21')
      .toArray();
    expect(coffees).toHaveLength(2);
  });
});
