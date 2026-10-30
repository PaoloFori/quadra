import type { Account, Transaction } from '../types';
import { totalsOf, type Totals } from './totals';

export interface AccountTotals extends Totals {
  account: Account;
  count: number;
}

/** Id usato nei filtri per dire "tutti i conti insieme". */
export const ALL_ACCOUNTS = 'all';

export function filterByAccount(txs: readonly Transaction[], accountId: string): Transaction[] {
  return accountId === ALL_ACCOUNTS ? [...txs] : txs.filter((t) => t.accountId === accountId);
}

/** Entrate, uscite e saldo di ogni conto sullo stesso periodo (giroconti esclusi, come nei resoconti). */
export function totalsByAccount(
  txs: readonly Transaction[],
  accounts: readonly Account[],
): AccountTotals[] {
  return accounts.map((account) => {
    const own = txs.filter((t) => t.accountId === account.id);
    return { account, count: own.length, ...totalsOf(own) };
  });
}

/** Quota di risparmio: quanto resta delle entrate; null senza entrate. */
export function savingsRate(totals: Totals): number | null {
  return totals.income === 0 ? null : totals.net / totals.income;
}
