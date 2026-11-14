import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { ProgressBar } from '@/components/ProgressBar';
import { Badge, LabelCaps, MetricCard, SectionTitle } from '@/components/ui';
import { WealthChart } from '@/components/WealthChart';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { budgetsRepo, transactionsRepo } from '@/db/repositories';
import { savingsRate } from '@/domain/reports/accounts';
import { budgetStatuses, levelOf, totalRemaining } from '@/domain/reports/budget';
import { buildMonthReport } from '@/domain/reports/month';
import { expensesByCategory, totalsOf } from '@/domain/reports/totals';
import { buildYearReport } from '@/domain/reports/year';
import type { Transaction } from '@/domain/types';
import { DailyChart, YearBars } from '@/features/reports/charts';
import { CategoryBreakdown, DOT } from '@/features/reports/shared';
import { useWealth } from '@/features/reports/useWealth';
import { categoryLink, movementsLink } from '@/features/transactions/movementsLink';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { useFormat } from '@/i18n/useFormat';
import { monthOf, monthRange, shiftMonth, todayIso } from '@/lib/dates';

/** Ogni widget carica da solo i suoi dati: se è nascosto dalla personalizzazione non costa nulla. */

function useMonthTxs(month: string, withPrevious = false): Transaction[] | undefined {
  return useLiveQuery(
    () =>
      transactionsRepo.inRange(
        monthRange(withPrevious ? shiftMonth(month, -1) : month).from,
        monthRange(month).to,
      ),
    [month, withPrevious],
  );
}

export function MonthSummaryWidget() {
  const { t } = useTranslation();
  const f = useFormat();
  const month = monthOf(todayIso());
  const txs = useMonthTxs(month);
  const totals = useMemo(() => totalsOf(txs ?? []), [txs]);
  const rate = savingsRate(totals);
  const range = monthRange(month);
  return (
    <div className="space-y-3">
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
    </div>
  );
}

export function MonthChartWidget() {
  const { t } = useTranslation();
  const f = useFormat();
  const today = todayIso();
  const month = monthOf(today);
  const txs = useMonthTxs(month, true);
  const report = useMemo(
    () => (txs ? buildMonthReport(txs, month, Number(today.slice(8, 10))) : undefined),
    [txs, month, today],
  );
  if (!report) return null;
  return (
    <section className="card space-y-3">
      <SectionTitle
        title={t('reports.dailyTrend')}
        trailing={<span className="text-[13px] capitalize text-muted">{f.month(month)}</span>}
      />
      <DailyChart data={report.daily} />
    </section>
  );
}

export function YearChartWidget() {
  const { t } = useTranslation();
  const year = todayIso().slice(0, 4);
  const txs = useLiveQuery(
    () => transactionsRepo.inRange(`${year}-01-01`, `${year}-12-31`),
    [year],
  );
  const report = useMemo(() => (txs ? buildYearReport(txs, year) : undefined), [txs, year]);
  if (!report) return null;
  return (
    <section className="card space-y-3">
      <SectionTitle
        title={t('home.yearChart')}
        trailing={<span className="text-[13px] text-muted">{year}</span>}
      />
      <YearBars months={report.months} label={t('home.yearChart')} />
    </section>
  );
}

export function CategoriesWidget() {
  const { t } = useTranslation();
  const f = useFormat();
  const month = monthOf(todayIso());
  const txs = useMonthTxs(month);
  const byCategory = useMemo(() => expensesByCategory(txs ?? []), [txs]);
  if (byCategory.length === 0) return null;
  return (
    <section className="card space-y-4" aria-label={t('home.topCategories')}>
      <SectionTitle
        title={t('home.topCategories')}
        trailing={<span className="text-[13px] capitalize text-muted">{f.month(month)}</span>}
      />
      <CategoryBreakdown
        byCategory={byCategory}
        collapsible
        linkFor={(id) => categoryLink(id, { month })}
      />
    </section>
  );
}

export function WealthTrendWidget() {
  const { t } = useTranslation();
  const f = useFormat();
  const wealth = useWealth();
  if (!wealth || wealth.projection.values.length < 2) return null;
  const { projection } = wealth;
  return (
    <section className="card space-y-3">
      <SectionTitle
        title={t('home.wealthTrend')}
        subtitle={
          projection.delta.months > 0
            ? `${projection.delta.cents >= 0 ? '↑' : '↓'} ${f.currency(Math.abs(projection.delta.cents))} · ${t('wealth.goalMonths', { count: projection.delta.months })}`
            : undefined
        }
      />
      <WealthChart
        values={projection.values}
        labels={projection.months.map((m) => f.monthShort(m))}
        projectedFrom={projection.projectedFrom}
        label={t('home.wealthTrend')}
      />
      <p className="text-[12px] text-faint">{t('wealth.dashedHint')}</p>
    </section>
  );
}

export function BudgetWidget() {
  const { t } = useTranslation();
  const f = useFormat();
  const month = monthOf(todayIso());
  const txs = useMonthTxs(month);
  const budgets = useLiveQuery(budgetsRepo.all, [], []);
  const remaining = useMemo(
    () => totalRemaining(budgetStatuses(budgets, txs ?? [])),
    [budgets, txs],
  );
  return (
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
  );
}

export function LatestWidget() {
  const { t } = useTranslation();
  const latest = useLiveQuery(() => transactionsRepo.latest(5), [], []);
  const accounts = useAccounts();
  const categories = useCategoryLookup();
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const [editing, setEditing] = useState<Transaction | null>(null);
  return (
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
      {editing && <TransactionSheet tx={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
