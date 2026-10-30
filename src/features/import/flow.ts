import { analyzeTable, type FormatAnalysis } from '@/domain/importing/analyze';
import { parseRows, type ParseResult } from '@/domain/importing/parse';
import { readTable, type Table } from '@/domain/importing/table';
import { profilesRepo } from '@/db/repositories';
import { previewImport, type ImportPreview } from '@/db/importService';
import type { Account, BankProfile } from '@/domain/types';

export class EmptyImportError extends Error {}

export interface LoadedFile {
  table: Table;
  analysis: FormatAnalysis | null;
}

export async function loadFile(file: File): Promise<LoadedFile> {
  const table = await readTable(file.name, await file.arrayBuffer());
  if (table.length === 0) throw new EmptyImportError();
  return { table, analysis: analyzeTable(table, await profilesRepo.all()) };
}

export interface BuiltPreview {
  parsed: ParseResult;
  preview: ImportPreview;
}

export async function buildPreview(
  accountId: string,
  table: Table,
  analysis: FormatAnalysis,
): Promise<BuiltPreview> {
  const parsed = parseRows(table, analysis);
  if (parsed.rows.length === 0) throw new EmptyImportError();
  return { parsed, preview: await previewImport(accountId, parsed) };
}

/** Profilo da salvare quando il formato è nuovo (rilevato o mappato a mano); null se già salvato. */
export function profileToSave(analysis: FormatAnalysis, account: Account): BankProfile | undefined {
  if (analysis.source === 'profile') return undefined;
  return {
    id: `${account.bank}:${analysis.signature.join('|')}`,
    name: account.name,
    bank: account.bank,
    headerSignature: analysis.signature,
    mapping: analysis.mapping,
    dateFormat: analysis.dateFormat,
    decimalSeparator: analysis.decimalSeparator,
  };
}
