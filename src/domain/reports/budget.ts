import type { Budget, Transaction } from '../types';
import { countable, type Totals } from './totals';

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
    const spent = budget.categoryIds.reduce((sum, id) => sum + (spentBy.get(id) ?? 0), 0);
    const ratio = budget.monthlyCents === 0 ? 0 : spent / budget.monthlyCents;
    return { budget, spent, remaining: budget.monthlyCents - spent, ratio, level: levelOf(ratio) };
  });
}

/** True se due budget condividono almeno una categoria: in quel caso sommarli conterebbe due volte le stesse spese. */
export function budgetsOverlap(budgets: readonly Budget[]): boolean {
  const seen = new Set<string>();
  for (const b of budgets)
    for (const id of new Set(b.categoryIds)) {
      if (seen.has(id)) return true;
      seen.add(id);
    }
  return false;
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

export interface SavingsProgress {
  incomeCents: number;
  expensesCents: number;
  /** Entrate meno uscite del periodo: quanto stai mettendo da parte (può essere negativo). */
  savedCents: number;
  targetCents: number;
  /** Quota dell'obiettivo raggiunta, tra 0 e 1 (oltre 1 se hai risparmiato di più). */
  ratio: number;
  /** Quanto manca per arrivare all'obiettivo (0 se già raggiunto). */
  missingCents: number;
  /** Quanto puoi ancora spendere senza rinunciare all'obiettivo: entrate − obiettivo − uscite. */
  canStillSpendCents: number;
  reached: boolean;
}

/** Confronta quanto hai risparmiato nel periodo (entrate − uscite) con l'obiettivo di risparmio. */
export function savingsProgress(totals: Totals, targetCents: number): SavingsProgress {
  const savedCents = totals.income - totals.expenses;
  return {
    incomeCents: totals.income,
    expensesCents: totals.expenses,
    savedCents,
    targetCents,
    ratio: targetCents <= 0 ? 0 : Math.max(savedCents, 0) / targetCents,
    missingCents: Math.max(targetCents - savedCents, 0),
    canStillSpendCents: totals.income - targetCents - totals.expenses,
    reached: savedCents >= targetCents,
  };
}
