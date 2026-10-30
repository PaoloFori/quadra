/**
 * Costruisce da spese<anno>.xlsx un unico backup JSON di Quadra, pronto per Backup → Ripristina.
 * Uso: npm run build-backup [-- file.xlsx ...] (default: gli .xlsx in private/)
 * Output: private/quadra-backup-spese.json (ignorata da git). Nessun dato lascia il computer.
 * I conti creati sono quelli del registro (colonna "banca").
 * Ogni movimento riceve una categoria: regole predefinite + regole personali in private/categorie-personali.json
 * (categorie extra, regole per categoria, descrizioni dei giroconti); ciò che resta va in "Altro" / "Altre entrate".
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBackup } from '@/domain/backup/format';
import { DEFAULT_CATEGORIES, DEFAULT_RULES } from '@/domain/defaults';
import { hashInput } from '@/domain/importing/dedupe';
import { matchCategory } from '@/domain/rules';
import { detectTransfers } from '@/domain/transfers';
import type { Account, Category, Rule, Transaction } from '@/domain/types';
import { normalizeText } from '@/lib/normalize';
import { sha256 } from '@/lib/hash';
import { ledgerFiles, readLedgers, type LedgerAccount } from './ledger';

const ACCOUNTS: Record<LedgerAccount, Account> = {
  bbva: { id: 'bbva', name: 'BBVA', bank: 'other' },
  intesa: { id: 'intesa', name: 'Intesa Sanpaolo', bank: 'other' },
};

interface Personal {
  categories: Category[];
  rules: Record<string, string[]>;
  transferDescriptions: string[];
  /** Prefissi di descrizione → categoria, usati solo quando nessuna regola combacia. */
  fallback?: Record<string, string>;
}
const PERSONAL_FILE = join('private', 'categorie-personali.json');
const personal: Personal = existsSync(PERSONAL_FILE)
  ? (JSON.parse(readFileSync(PERSONAL_FILE, 'utf8')) as Personal)
  : { categories: [], rules: {}, transferDescriptions: [] };

const categories = [...DEFAULT_CATEGORIES, ...personal.categories];
const rules: Rule[] = [
  ...DEFAULT_RULES,
  ...Object.entries(personal.rules).flatMap(([categoryId, patterns]) =>
    patterns.map((pattern) => ({
      id: `personal-${categoryId}-${pattern.trim().replace(/\W+/g, '_')}`,
      pattern,
      categoryId,
      origin: 'user' as const,
    })),
  ),
];
const unknown = rules.filter((r) => !categories.some((c) => c.id === r.categoryId));
if (unknown.length > 0) throw new Error(`Categoria inesistente: ${unknown[0]!.categoryId}`);

const { entries, log } = readLedgers(ledgerFiles(process.argv.slice(2)));
const kindOf = new Map(categories.map((c) => [c.id, c.kind]));
const refundId = kindOf.has('refunds') ? 'refunds' : 'otherIncome';
const transferTexts = new Set(personal.transferDescriptions.map(normalizeText));

/** Una categoria per ogni movimento: regola, poi coerenza col segno, poi "Altro". */
function categoryFor(description: string, cents: number): string {
  const matched =
    matchCategory(description, rules) ??
    Object.entries(personal.fallback ?? {}).find(([prefix]) =>
      normalizeText(description).startsWith(prefix),
    )?.[1] ??
    null;
  const kind = matched ? kindOf.get(matched) : undefined;
  if (matched && cents > 0 && kind === 'expense') return refundId; // soldi che tornano indietro
  if (matched && !(cents < 0 && kind === 'income')) return matched;
  return cents < 0 ? 'other' : 'otherIncome';
}
const now = Date.now();

const seen = new Map<string, number>();
const transactions: Transaction[] = [];
for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
  const hash = await sha256(
    hashInput(e.account, { date: e.date, amountCents: e.cents, description: e.description }),
  );
  const n = seen.get(hash) ?? 0;
  seen.set(hash, n + 1);
  transactions.push({
    id: `${hash}#${n}`,
    accountId: e.account,
    date: e.date,
    amountCents: e.cents,
    description: e.description,
    categoryId: categoryFor(e.description, e.cents),
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

// Giroconti scritti a mano ("giroconto"): si abbinano per importo opposto, senza limite di giorni.
const manual = transactions.filter(
  (t) => !t.isTransfer && transferTexts.has(normalizeText(t.description)),
);
const pending = new Map<number, Transaction[]>();
for (const t of manual) {
  const mate = pending.get(-t.amountCents)?.pop();
  t.isTransfer = true;
  t.categoryId = null;
  if (mate) {
    t.transferGroupId = mate.transferGroupId = `tg-${mate.id}`;
  } else {
    t.transferGroupId = `tg-${t.id}`;
    pending.set(t.amountCents, [...(pending.get(t.amountCents) ?? []), t]);
  }
}

const used = new Set(transactions.map((t) => t.accountId));
const backup = await createBackup(
  {
    accounts: Object.values(ACCOUNTS).filter((a) => used.has(a.id as LedgerAccount)),
    transactions,
    categories,
    rules,
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
const uncategorized = transactions.filter((t) => !t.categoryId && !t.isTransfer).length;
const fallback = transactions.filter(
  (t) => t.categoryId === 'other' || t.categoryId === 'otherIncome',
).length;
console.log(
  `\n${out}: ${transactions.length} movimenti (${[...used].map((a) => `${ACCOUNTS[a as LedgerAccount].name} ${count(a)}`).join(', ')})`,
);
console.log(
  `Giroconti: ${transactions.filter((t) => t.isTransfer).length} movimenti · senza categoria: ${uncategorized} · in "Altro": ${fallback}`,
);
if (log.length > 0) console.log(`Date corrette: ${log.length}`);
