import type { Account, BankProfile, Budget, Category, Rule, Transaction } from '@/domain/types';
import { db } from './database';

export const newId = (): string => crypto.randomUUID();

export const transactionsRepo = {
  all: (): Promise<Transaction[]> => db.transactions.orderBy('date').reverse().toArray(),
  inRange: (from: string, to: string): Promise<Transaction[]> =>
    db.transactions.where('date').between(from, to, true, true).toArray(),
  get: (id: string): Promise<Transaction | undefined> => db.transactions.get(id),
  put: (tx: Transaction): Promise<string> => db.transactions.put(tx),
  update: (id: string, changes: Partial<Transaction>): Promise<number> =>
    db.transactions.update(id, { ...changes, updatedAt: Date.now() }),
  remove: (id: string): Promise<void> => db.transactions.delete(id),
  count: (): Promise<number> => db.transactions.count(),
};

export const accountsRepo = {
  all: (): Promise<Account[]> => db.accounts.toArray(),
  put: (account: Account): Promise<string> => db.accounts.put(account),
};

export const categoriesRepo = {
  all: (): Promise<Category[]> => db.categories.toArray(),
  put: (c: Category): Promise<string> => db.categories.put(c),
  remove: async (id: string): Promise<void> => {
    await db.transaction('rw', db.categories, db.transactions, db.rules, db.budgets, async () => {
      await db.transactions.where('categoryId').equals(id).modify({ categoryId: null });
      await db.rules.where('categoryId').equals(id).delete();
      await db.budgets.where('categoryId').equals(id).delete();
      await db.categories.delete(id);
    });
  },
};

export const rulesRepo = {
  all: (): Promise<Rule[]> => db.rules.toArray(),
  put: (r: Rule): Promise<string> => db.rules.put(r),
  remove: (id: string): Promise<void> => db.rules.delete(id),
};

export const budgetsRepo = {
  all: (): Promise<Budget[]> => db.budgets.toArray(),
  put: (b: Budget): Promise<string> => db.budgets.put(b),
  remove: (id: string): Promise<void> => db.budgets.delete(id),
};

export const profilesRepo = {
  all: (): Promise<BankProfile[]> => db.profiles.toArray(),
  put: (p: BankProfile): Promise<string> => db.profiles.put(p),
};
