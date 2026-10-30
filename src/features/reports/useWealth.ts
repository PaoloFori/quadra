import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAccountBalances } from '@/db/accountService';
import { transactionsRepo } from '@/db/repositories';
import type { AccountBalance } from '@/domain/balances';
import { ALL_ACCOUNTS, filterByAccount } from '@/domain/reports/accounts';
import {
  lastFullMonths,
  projectWealth,
  trend,
  wealthSeries,
  type Trend,
  type WealthProjection,
} from '@/domain/reports/projections';
import { todayIso } from '@/lib/dates';

export interface Wealth {
  accounts: AccountBalance[];
  currentCents: number;
  flows: Trend;
  projection: WealthProjection;
}

/** Patrimonio attuale, storico degli ultimi mesi e proiezione, per tutti i conti o uno solo. */
export function useWealth(accountId: string = ALL_ACCOUNTS): Wealth | null | undefined {
  const balances = useLiveQuery(getAccountBalances, []);
  const all = useLiveQuery(transactionsRepo.all, []);
  return useMemo(() => {
    if (!balances || !all) return undefined;
    const today = todayIso();
    const mine = balances.filter((b) => accountId === ALL_ACCOUNTS || b.account.id === accountId);
    if (balances.length === 0) return null;
    const currentCents = mine.reduce((s, b) => s + b.balanceCents, 0);
    const txs = filterByAccount(all, accountId);
    const flows = trend(currentCents, lastFullMonths(txs, today));
    return {
      accounts: mine,
      currentCents,
      flows,
      projection: projectWealth(wealthSeries(currentCents, txs, today), flows.avgSavingCents),
    };
  }, [balances, all, accountId]);
}
