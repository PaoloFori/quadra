import type { Budget, Transaction } from '../types';
import { countable } from './totals';

export type BudgetLevel = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  ratio: number;
  level: BudgetLevel;
}

export const WARNING_RATIO = 0.8;

export function levelOf(ratio: number): BudgetLevel {
  if (ratio >= 1) return 'over';
  return ratio >= WARNING_RATIO ? 'warning' : 'ok';
}

/** Stato dei budget sulle spese del mese passato (`monthTxs` già filtrate per mese). */
export function budgetStatuses(
  budgets: readonly Budget[],
  monthTxs: readonly Transaction[],
): BudgetStatus[] {
  const spentBy = new Map<string | null, number>();
  for (const t of countable(monthTxs)) {
    if (t.amountCents < 0)
      spentBy.set(t.categoryId, (spentBy.get(t.categoryId) ?? 0) - t.amountCents);
  }
  return budgets.map((budget) => {
    const spent = spentBy.get(budget.categoryId) ?? 0;
    const ratio = budget.monthlyCents === 0 ? 0 : spent / budget.monthlyCents;
    return { budget, spent, remaining: budget.monthlyCents - spent, ratio, level: levelOf(ratio) };
  });
}

export function totalRemaining(statuses: readonly BudgetStatus[]): {
  limit: number;
  spent: number;
  remaining: number;
} {
  const limit = statuses.reduce((s, b) => s + b.budget.monthlyCents, 0);
  const spent = statuses.reduce((s, b) => s + b.spent, 0);
  return { limit, spent, remaining: limit - spent };
}
