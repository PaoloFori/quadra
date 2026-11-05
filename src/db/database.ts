import Dexie, { type EntityTable } from 'dexie';
import type {
  Account,
  BankProfile,
  Budget,
  Category,
  Recurrence,
  Rule,
  Transaction,
} from '@/domain/types';
import { DEFAULT_CATEGORIES, DEFAULT_RULES, LEGACY_CATEGORY_COLORS } from '@/domain/defaults';

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
  recurrences!: EntityTable<Recurrence, 'id'>;
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

    // v2: Quadra non crea più conti da sola (nessuna modifica allo schema).
    this.version(2).stores({});

    // v3: ricorrenze (stipendio, affitto, abbonamenti…) e indice per trovare i movimenti che ne nascono.
    this.version(3).stores({
      transactions:
        'id, accountId, date, [accountId+date], categoryId, hash, transferGroupId, recurrenceId',
      recurrences: 'id, nextDue',
    });

    // v4: colori più distinti per le categorie predefinite (solo quelle che hanno ancora il colore di una volta).
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        for (const c of DEFAULT_CATEGORIES) {
          const stored = await tx.table('categories').get(c.id);
          if (stored && stored.color === LEGACY_CATEGORY_COLORS[c.id]) {
            await tx.table('categories').update(c.id, { color: c.color });
          }
        }
      });

    this.on('populate', (tx) => {
      void tx.table('categories').bulkAdd(DEFAULT_CATEGORIES);
      void tx.table('rules').bulkAdd(DEFAULT_RULES);
    });
  }
}

export const db = new QuadraDb();
