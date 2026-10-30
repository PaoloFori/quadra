import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Badge, LabelCaps, MetricCard, SectionTitle } from '@/components/ui';
import { WealthChart } from '@/components/WealthChart';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { budgetsRepo, transactionsRepo } from '@/db/repositories';
import { budgetStatuses, levelOf, totalRemaining } from '@/domain/reports/budget';
import { savingsRate } from '@/domain/reports/accounts';
import { expensesByCategory, totalsOf } from '@/domain/reports/totals';
import type { Transaction } from '@/domain/types';
import { BalancesCard } from '@/features/accounts/BalancesCard';
import { CategoryBreakdown, DOT } from '@/features/reports/shared';
import { useWealth } from '@/features/reports/useWealth';
import { movementsLink } from '@/features/transactions/movementsLink';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { useFormat } from '@/i18n/useFormat';
import { monthOf, monthRange, todayIso } from '@/lib/dates';

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
  const wealth = useWealth();
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null);

  const totals = useMemo(() => totalsOf(monthTxs ?? []), [monthTxs]);
  const byCategory = useMemo(() => expensesByCategory(monthTxs ?? []), [monthTxs]);
  const remaining = useMemo(
    () => totalRemaining(budgetStatuses(budgets, monthTxs ?? [])),
    [budgets, monthTxs],
  );
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const rate = savingsRate(totals);
  const range = monthRange(month);

  return (
    <Screen
      title={t('home.overview')}
      eyebrow={f.month(month)}
      action={
        <button
          className="btn-primary !min-h-[44px] !rounded-full"
          aria-label={t('tx.add')}
          onClick={() => setEditing('new')}
        >
          + {t('home.newTx')}
        </button>
      }
    >
      <BalancesCard />

      {accounts.length === 0 ? (
        <div className="card space-y-2 text-center">
          <h2 className="font-display text-[20px] font-medium">{t('home.noAccountsTitle')}</h2>
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
        <>
          <div className="grid grid-cols-2 gap-3">
            <Link to={movementsLink({ type: 'income', ...range })} className="block">
              <MetricCard label={t('common.income')} dot={DOT.income}>
                <span className="text-income">{f.currency(totals.income)}</span>
              </MetricCard>
            </Link>
            <Link to={movementsLink({ type: 'expense', ...range })} className="block">
              <MetricCard label={t('common.expenses')} dot={DOT.expenses}>
                {f.currency(totals.expenses)}
              </MetricCard>
            </Link>
          </div>

          <section className="card space-y-3" aria-label={t('reports.savings')}>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <LabelCaps>{t('reports.savings')}</LabelCaps>
                <p className="font-display text-[28px] font-medium leading-8 tracking-[-0.03em]">
                  <Amount cents={totals.net} />
                </p>
              </div>
              {rate !== null && <Badge accent>{f.percent(rate).replace('+', '')}</Badge>}
            </div>
            <ProgressBar
              ratio={rate === null ? 0 : Math.max(rate, 0)}
              level="ok"
              label={t('reports.savings')}
            />
          </section>

          {byCategory.length > 0 && (
            <section className="card space-y-4" aria-label={t('home.topCategories')}>
              <SectionTitle
                title={t('home.topCategories')}
                trailing={
                  <span className="text-[13px] capitalize text-muted">{f.month(month)}</span>
                }
              />
              <CategoryBreakdown
                byCategory={byCategory}
                collapsible
                linkFor={(categoryId) => movementsLink({ categoryId })}
              />
            </section>
          )}

          {wealth && wealth.projection.values.length > 1 && (
            <section className="card space-y-3">
              <SectionTitle
                title={t('home.wealthTrend')}
                subtitle={
                  wealth.projection.delta.months > 0
                    ? `${wealth.projection.delta.cents >= 0 ? '↑' : '↓'} ${f.currency(Math.abs(wealth.projection.delta.cents))} · ${t('wealth.goalMonths', { count: wealth.projection.delta.months })}`
                    : undefined
                }
              />
              <WealthChart
                values={wealth.projection.values}
                labels={wealth.projection.months.map((m) => f.monthShort(m))}
                projectedFrom={wealth.projection.projectedFrom}
                label={t('home.wealthTrend')}
              />
              <p className="text-[12px] text-faint">{t('wealth.dashedHint')}</p>
            </section>
          )}

          <Link to="/budget" className="card block space-y-2" aria-label={t('home.budgetLeft')}>
            <LabelCaps>{t('home.budgetLeft')}</LabelCaps>
            {remaining.limit === 0 ? (
              <p className="text-muted">{t('home.budgetNone')}</p>
            ) : (
              <>
                <p className="font-display text-[24px] font-medium tracking-[-0.03em]">
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
                  level={levelOf(remaining.spent / remaining.limit)}
                  label={t('home.budgetLeft')}
                />
              </>
            )}
          </Link>

          <section className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{t('home.latest')}</h2>
              <Link to="/transactions" className="text-[14px] text-accent">
                {t('home.seeAll')}
              </Link>
            </div>
            <ul className="space-y-2">
              {latest.map((tx) => (
                <li key={tx.id}>
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
        </>
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
