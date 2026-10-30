import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { CategoryBreakdown, SummaryHero } from '@/features/reports/shared';
import { movementsLink } from '@/features/transactions/movementsLink';
import { Screen } from '@/components/Screen';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { budgetsRepo, transactionsRepo } from '@/db/repositories';
import { budgetStatuses, totalRemaining } from '@/domain/reports/budget';
import { expensesByCategory, totalsOf } from '@/domain/reports/totals';
import { monthOf, monthRange, todayIso } from '@/lib/dates';
import { useFormat } from '@/i18n/useFormat';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import type { Transaction } from '@/domain/types';
import { BalancesCard } from '@/features/accounts/BalancesCard';
import { ProgressBar } from '@/components/ProgressBar';

export default function HomePage() {
  const { t } = useTranslation();
  const f = useFormat();
  const month = monthOf(todayIso());
  const monthTxs = useLiveQuery(
    () => transactionsRepo.inRange(monthRange(month).from, monthRange(month).to),
    [month],
  );
  const latest = useLiveQuery(() => transactionsRepo.latest(5), [], []);
  const total = useLiveQuery(transactionsRepo.count, []);
  const budgets = useLiveQuery(budgetsRepo.all, [], []);
  const accounts = useAccounts();
  const categories = useCategoryLookup();
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null);

  const totals = useMemo(() => totalsOf(monthTxs ?? []), [monthTxs]);
  const byCategory = useMemo(() => expensesByCategory(monthTxs ?? []), [monthTxs]);
  const remaining = useMemo(
    () => totalRemaining(budgetStatuses(budgets, monthTxs ?? [])),
    [budgets, monthTxs],
  );
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  return (
    <Screen
      title={t('home.title')}
      action={
        <button
          className="btn-primary !min-w-[44px] !px-3 text-xl"
          aria-label={t('tx.add')}
          onClick={() => setEditing('new')}
        >
          +
        </button>
      }
    >
      <p className="-mt-2 mb-3 px-1 capitalize text-muted">{f.month(month)}</p>
      <div className="mb-3">
        <BalancesCard />
      </div>

      {accounts.length === 0 ? (
        <div className="card space-y-2 text-center">
          <h2 className="text-lg font-bold">{t('home.noAccountsTitle')}</h2>
          <p className="text-muted">{t('home.noAccountsBody')}</p>
        </div>
      ) : total === 0 ? (
        <div className="card space-y-3 text-center">
          <p className="text-muted">{t('home.empty')}</p>
          <button className="btn-primary w-full" onClick={() => setEditing('new')}>
            {t('home.addFirst')}
          </button>
          <Link to="/import" className="btn-secondary w-full">
            {t('home.importFile')}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <SummaryHero
            totals={totals}
            title={t('home.monthBalance')}
            links={{
              income: movementsLink({ type: 'income', ...monthRange(month) }),
              expenses: movementsLink({ type: 'expense', ...monthRange(month) }),
            }}
          />

          <Link to="/budget" className="card block" aria-label={t('home.budgetLeft')}>
            <p className="text-[13px] text-muted">{t('home.budgetLeft')}</p>
            {remaining.limit === 0 ? (
              <p className="text-muted">{t('home.budgetNone')}</p>
            ) : (
              <>
                <p className="mb-2 text-2xl font-bold">
                  {remaining.remaining >= 0 ? (
                    <Amount cents={remaining.remaining} signed={false} neutral />
                  ) : (
                    <span className="text-expense">
                      {t('home.budgetOver', { amount: f.currency(-remaining.remaining) })}
                    </span>
                  )}
                </p>
                <ProgressBar
                  ratio={remaining.spent / remaining.limit}
                  level={
                    remaining.spent >= remaining.limit
                      ? 'over'
                      : remaining.spent / remaining.limit >= 0.8
                        ? 'warning'
                        : 'ok'
                  }
                  label={t('home.budgetLeft')}
                />
              </>
            )}
          </Link>

          {byCategory.length > 0 && (
            <section className="card" aria-label={t('reports.byCategory')}>
              <h2 className="mb-2 font-semibold">{t('reports.byCategory')}</h2>
              <CategoryBreakdown
                byCategory={byCategory}
                linkFor={(categoryId) => movementsLink({ categoryId })}
              />
            </section>
          )}

          <section className="card !p-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t('home.latest')}</h2>
              <Link to="/transactions" className="text-accent">
                {t('home.seeAll')}
              </Link>
            </div>
            <ul>
              {latest.map((tx) => (
                <li key={tx.id} className="border-b border-line/60 last:border-0">
                  <TransactionRow
                    tx={tx}
                    category={tx.categoryId ? categories.byId.get(tx.categoryId) : undefined}
                    categoryLabel={categories.label(tx.categoryId)}
                    account={accountById.get(tx.accountId)}
                    onOpen={setEditing}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
      {editing && (
        <TransactionSheet
          tx={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
