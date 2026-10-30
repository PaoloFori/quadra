/** Tipi di dominio condivisi. Importi in centesimi interi (negativo = uscita), date ISO `YYYY-MM-DD`. */

export type IsoDate = string;
export type MonthKey = string; // YYYY-MM

export type BankKind = string;

export interface Account {
  id: string;
  name: string;
  bank: BankKind;
  /** Saldo di partenza: il saldo mostrato = questo + somma dei movimenti del conto. */
  openingBalanceCents?: number;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: IsoDate;
  valueDate?: IsoDate;
  amountCents: number;
  description: string;
  note?: string;
  categoryId: string | null;
  /** Hash di conto|data|importo|descrizione normalizzata (senza indice d'occorrenza). */
  hash: string;
  balanceCents?: number;
  isTransfer: boolean;
  transferGroupId?: string;
  source: 'manual' | 'import';
  createdAt: number;
  updatedAt: number;
}

export type CategoryKind = 'expense' | 'income' | 'both';

export interface Category {
  id: string;
  kind: CategoryKind;
  color: string;
  icon: string;
  builtin: boolean;
  /** Presente solo per categorie create o rinominate dall'utente. */
  name?: string;
}

export interface Rule {
  id: string;
  /** Testo già normalizzato (minuscolo, senza accenti) cercato nella descrizione. */
  pattern: string;
  categoryId: string;
  origin: 'user' | 'learned';
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyCents: number;
}

/** Ordine dei campi nella data; il separatore (/ - .) è indifferente. */
export type DateFormat = 'dmy' | 'ymd' | 'mdy';

export interface ColumnMapping {
  date: number;
  valueDate?: number;
  /** Importo unico con segno… */
  amount?: number;
  /** …oppure colonne dare/avere separate. */
  debit?: number;
  credit?: number;
  /** Una o più colonne, unite con uno spazio (es. Operazione + Dettagli). */
  description: number[];
  balance?: number;
}

export interface BankProfile {
  id: string;
  name: string;
  bank: BankKind;
  /** Intestazioni normalizzate del file, usate per riconoscere di nuovo il formato. */
  headerSignature: string[];
  mapping: ColumnMapping;
  dateFormat: DateFormat;
  decimalSeparator: ',' | '.';
}

export type LanguagePref = 'auto' | 'it' | 'en';

export interface Settings {
  language: LanguagePref;
  /** Id del tema (vedi lib/themes). */
  theme?: string;
  lastBackupAt?: string;
  lastYearEndReminder?: number;
}

export interface BackupData {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  rules: Rule[];
  budgets: Budget[];
  profiles: BankProfile[];
  settings: Settings;
}
