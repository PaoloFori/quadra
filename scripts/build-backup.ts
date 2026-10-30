/**
 * Costruisce da spese<anno>.xlsx un unico backup JSON di Quadra, pronto per Backup → Ripristina.
 * Uso: npm run build-backup [-- file.xlsx ...] (default: gli .xlsx in private/)
 * Output: private/quadra-backup-spese.json (ignorata da git). Nessun dato lascia il computer.
 * I conti creati sono quelli del registro (colonna "banca"); le categorie vengono assegnate con le regole predefinite.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBackup } from '@/domain/backup/format';
import { DEFAULT_CATEGORIES, DEFAULT_RULES } from '@/domain/defaults';
import { hashInput } from '@/domain/importing/dedupe';
import { matchCategory } from '@/domain/rules';
import { detectTransfers } from '@/domain/transfers';
import type { Account, Transaction } from '@/domain/types';
import { sha256 } from '@/lib/hash';
import { ledgerFiles, readLedgers, type LedgerAccount } from './ledger';

const ACCOUNTS: Record<LedgerAccount, Account> = {
  bbva: { id: 'bbva', name: 'BBVA', bank: 'other' },
  intesa: { id: 'intesa', name: 'Intesa Sanpaolo', bank: 'other' },
};

const { entries, log } = readLedgers(ledgerFiles(process.argv.slice(2)));
const kindOf = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c.kind]));
const now = Date.now();

const seen = new Map<string, number>();
const transactions: Transaction[] = [];
for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
  const hash = await sha256(
    hashInput(e.account, { date: e.date, amountCents: e.cents, description: e.description }),
  );
  const n = seen.get(hash) ?? 0;
  seen.set(hash, n + 1);
  const matched = matchCategory(e.description, DEFAULT_RULES);
  const wrongKind = e.cents < 0 && matched !== null && kindOf.get(matched) === 'income';
  transactions.push({
    id: `${hash}#${n}`,
    accountId: e.account,
    date: e.date,
    amountCents: e.cents,
    description: e.description,
    categoryId: matched && !wrongKind ? matched : null,
    hash,
    isTransfer: false,
    source: 'import',
    createdAt: now,
    updatedAt: now,
  });
}

// Giroconti tra i conti: stessa logica dell'import dell'app.
const byId = new Map(transactions.map((t) => [t.id, t]));
for (const pair of detectTransfers(transactions)) {
  for (const id of [pair.outId, pair.inId]) {
    const t = byId.get(id)!;
    t.isTransfer = true;
    t.transferGroupId = `tg-${pair.outId}`;
    t.categoryId = null;
  }
}

const used = new Set(transactions.map((t) => t.accountId));
const backup = await createBackup(
  {
    accounts: Object.values(ACCOUNTS).filter((a) => used.has(a.id as LedgerAccount)),
    transactions,
    categories: DEFAULT_CATEGORIES,
    rules: DEFAULT_RULES,
    budgets: [],
    profiles: [],
    settings: { language: 'auto' },
  },
  { kind: 'all' },
);

mkdirSync('private', { recursive: true });
const out = join('private', 'quadra-backup-spese.json');
writeFileSync(out, JSON.stringify(backup, null, 2), 'utf8');

const count = (id: string): number => transactions.filter((t) => t.accountId === id).length;
const categorized = transactions.filter((t) => t.categoryId).length;
console.log(
  `\n${out}: ${transactions.length} movimenti (${[...used].map((a) => `${ACCOUNTS[a as LedgerAccount].name} ${count(a)}`).join(', ')})`,
);
console.log(
  `Giroconti: ${transactions.filter((t) => t.isTransfer).length / 2} coppie · categorizzati: ${categorized}/${transactions.length}`,
);
if (log.length > 0) console.log(`Date corrette: ${log.length}`);
