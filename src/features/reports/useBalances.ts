import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { monthEndBalances, type MonthBalance } from '@/domain/reports/balance';
import { ALL_ACCOUNTS, filterByAccount } from '@/domain/reports/accounts';
import { monthRange, todayIso } from '@/lib/dates';
import { monthsSinceFirst } from '@/domain/reports/projections';
import type { MonthKey } from '@/domain/types';

/**
 * Saldo a inizio e fine di ciascuno degli ultimi `count` mesi fino a `lastMonth` (0 = dal primo movimento),
 * per tutti i conti o uno solo. Legge tutti i movimenti fino a quel mese: il saldo dipende da tutto lo storico.
 */
export function useMonthBalances(
  accountId: string,
  lastMonth: MonthKey,
  count: number,
): MonthBalance[] | undefined {
  const accounts = useAccounts();
  // il saldo arriva al massimo a oggi: i movimenti con data futura non fanno ancora parte del saldo
  const monthEnd = monthRange(lastMonth).to;
  const today = todayIso();
  const to = monthEnd < today ? monthEnd : today;
  const raw = useLiveQuery(() => transactionsRepo.inRange('0000-01-01', to), [to]);
  return useMemo(() => {
    if (!raw) return undefined;
    const txs = filterByAccount(raw, accountId);
    const openingCents = accounts
      .filter((a) => accountId === ALL_ACCOUNTS || a.id === accountId)
      .reduce((sum, a) => sum + (a.openingBalanceCents ?? 0), 0);
    const months = count === 0 ? monthsSinceFirst(txs, `${lastMonth}-01`) : Math.max(count, 1);
    return monthEndBalances(openingCents, txs, lastMonth, months);
  }, [raw, accounts, accountId, lastMonth, count]);
}
