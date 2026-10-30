import type { Account } from './types';

export interface AccountBalance {
  account: Account;
  balanceCents: number;
}

export function accountBalances(
  accounts: readonly Account[],
  sums: ReadonlyMap<string, number>,
): AccountBalance[] {
  return accounts.map((account) => ({
    account,
    balanceCents: (account.openingBalanceCents ?? 0) + (sums.get(account.id) ?? 0),
  }));
}

/** Saldo di partenza che fa tornare il saldo attuale al valore indicato dall'utente. */
export function openingFor(targetCents: number, movementsSumCents: number): number {
  return targetCents - movementsSumCents;
}
