import Dexie, { type EntityTable } from 'dexie';
import type { Account, BankProfile, Budget, Category, Rule, Transaction } from '@/domain/types';
import { DEFAULT_CATEGORIES, DEFAULT_RULES } from '@/domain/defaults';

export interface SettingRow {
  key: string;
  value: unknown;
}

export class QuadraDb extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  rules!: EntityTable<Rule, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  profiles!: EntityTable<BankProfile, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor(name = 'quadra') {
    super(name);
    // Per cambiare schema: aggiungere db.version(n+1).stores({...}).upgrade(tx => ...) SENZA toccare le versioni precedenti.
    this.version(1).stores({
      transactions: 'id, accountId, date, [accountId+date], categoryId, hash, transferGroupId',
      accounts: 'id',
      categories: 'id',
      rules: 'id',
      budgets: 'id, categoryId',
      profiles: 'id',
      settings: 'key',
    });

    this.on('populate', (tx) => {
      void tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
      void tx.table('rules').bulkAdd(DEFAULT_RULES);
    });
  }
}

export const db = new QuadraDb();
