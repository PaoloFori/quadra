import { accountBalances, openingFor, type AccountBalance } from '@/domain/balances';
import { db } from './database';
import { transactionsRepo } from './repositories';

export async function getAccountBalances(): Promise<AccountBalance[]> {
  const [accounts, sums] = await Promise.all([
    db.accounts.toArray(),
    transactionsRepo.sumsByAccount(),
  ]);
  return accountBalances(accounts, sums);
}

/** L'utente dice "su questo conto ho X": calcola il saldo di partenza che lo rende vero adesso. */
export async function setAccountBalance(accountId: string, targetCents: number): Promise<void> {
  const sums = await transactionsRepo.sumsByAccount();
  await db.accounts.update(accountId, {
    openingBalanceCents: openingFor(targetCents, sums.get(accountId) ?? 0),
  });
}
