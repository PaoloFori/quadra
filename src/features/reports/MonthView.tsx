import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { SectionTitle } from '@/components/ui';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { ALL_ACCOUNTS, filterByAccount, totalsByAccount } from '@/domain/reports/accounts';
import { detectRecurring } from '@/domain/reports/recurring';
import { buildMonthReport, type MonthReport } from '@/domain/reports/month';
import type { MonthKey } from '@/domain/types';
import { daysInMonth, monthOf, monthRange, shiftMonth, todayIso } from '@/lib/dates';
import { useFormat } from '@/i18n/useFormat';
import { DailyChart } from './charts';
import { categoryLink, movementsLink } from '@/features/transactions/movementsLink';
import { totalsOf } from '@/domain/reports/totals';
import { monthlyTrend, monthsSinceFirst } from '@/domain/reports/projections';
import { ComparisonCard } from './Compare';
import { YearBars } from './charts';
import { AccountsCompare, CategoryBreakdown, ChipGroup, MetricsGrid, TopExpenses } from './shared';

interface Props {
  month: MonthKey;
  accountId: string;
  onReport: (report: MonthReport | undefined) => void;
}

export function MonthView({ month, accountId, onReport }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const accounts = useAccounts();
  const scope = accountId === ALL_ACCOUNTS ? undefined : accountId;
  const rawTxs = useLiveQuery(
    () => transactionsRepo.inRange(monthRange(shiftMonth(month, -1)).from, monthRange(month).to),
    [month],
  );
  // Gli abbonamenti si cercano su 6 mesi: query separata e indicizzata
  const rawHistory = useLiveQuery(
    () => transactionsRepo.inRange(monthRange(shiftMonth(month, -5)).from, monthRange(month).to),
    [month],
  );

  // Arco del grafico (6, 12, 24 mesi o tutto) e cosa confrontare; si parte da 13 mesi per avere sempre l'anno scorso
  const [span, setSpan] = useState<6 | 12 | 24 | 0>(6);
  const [compareWith, setCompareWith] = useState<'both' | 'previous' | 'lastYear'>('both');
  const rawCompare = useLiveQuery(
    () =>
      transactionsRepo.inRange(
        span === 0 ? '0000-01-01' : monthRange(shiftMonth(month, -Math.max(12, span - 1))).from,
        monthRange(month).to,
      ),
    [month, span],
  );
  const compareTxs = useMemo(
    () => rawCompare && filterByAccount(rawCompare, accountId),
    [rawCompare, accountId],
  );
  const comparison = useMemo(() => {
    if (!compareTxs) return undefined;
    const of = (m: MonthKey) => totalsOf(compareTxs.filter((x) => monthOf(x.date) === m));
    const row = (m: MonthKey) => ({ label: f.month(m), totals: of(m) });
    return {
      rows: [
        row(month),
        ...(compareWith !== 'lastYear' ? [row(shiftMonth(month, -1))] : []),
        ...(compareWith !== 'previous' ? [row(shiftMonth(month, -12))] : []),
      ],
      trend: monthlyTrend(
        compareTxs,
        month,
        span === 0 ? monthsSinceFirst(compareTxs, `${month}-01`) : span,
      ),
    };
  }, [compareTxs, month, f, span, compareWith]);
  const txs = useMemo(() => rawTxs && filterByAccount(rawTxs, accountId), [rawTxs, accountId]);
  const history = useMemo(
    () => rawHistory && filterByAccount(rawHistory, accountId),
    [rawHistory, accountId],
  );
  const perAccount = useMemo(
    () =>
      rawTxs
        ? totalsByAccount(
            rawTxs.filter((t) => monthOf(t.date) === month),
            accounts,
          )
        : [],
    [rawTxs, accounts, month],
  );

  const report = useMemo(() => {
    if (!txs) return undefined;
    const today = todayIso();
    return buildMonthReport(
      txs,
      month,
      monthOf(today) === month ? Number(today.slice(8, 10)) : undefined,
    );
  }, [txs, month]);
  const recurring = useMemo(() => detectRecurring(history ?? []), [history]);

  useEffect(() => onReport(report), [report, onReport]);

  if (!report) return <p className="p-6 text-center text-muted">{t('common.loading')}</p>;
  if (!report.hasData) return <p className="card text-muted">{t('reports.noData')}</p>;

  const today = todayIso();
  const elapsedDays = monthOf(today) === month ? Number(today.slice(8, 10)) : daysInMonth(month);

  return (
    <div className="masonry">
      <MetricsGrid
        totals={report.totals}
        links={{
          income: movementsLink({ type: 'income', accountId: scope, ...monthRange(month) }),
          expenses: movementsLink({ type: 'expense', accountId: scope, ...monthRange(month) }),
        }}
        average={{
          label: t('reports.avgDay'),
          cents: Math.round(report.totals.expenses / elapsedDays),
        }}
      />

      {comparison && (
        <ComparisonCard
          title={t('reports.compareTitle')}
          rows={comparison.rows}
          controls={
            <ChipGroup
              label={t('reports.compareWith')}
              value={compareWith}
              onChange={setCompareWith}
              options={[
                { value: 'both', text: t('reports.compareBoth') },
                { value: 'previous', text: t('reports.comparePrevious') },
                { value: 'lastYear', text: t('reports.compareLastYear') },
              ]}
            />
          }
        />
      )}

      {comparison && (
        <section className="card space-y-3">
          <SectionTitle title={t('reports.incomeExpensesTrend')} />
          <ChipGroup
            label={t('reports.span')}
            value={span}
            onChange={setSpan}
            options={[
              { value: 6, text: t('reports.months', { count: 6 }) },
              { value: 12, text: t('reports.months', { count: 12 }) },
              { value: 24, text: t('reports.months', { count: 24 }) },
              { value: 0, text: t('reports.spanAll') },
            ]}
          />
          <YearBars months={comparison.trend} label={t('reports.incomeExpensesTrend')} />
        </section>
      )}

      {accountId === ALL_ACCOUNTS && accounts.length > 1 && (
        <section className="card space-y-4">
          <SectionTitle title={t('reports.byAccount')} />
          <AccountsCompare rows={perAccount} />
        </section>
      )}

      <section className="card space-y-3">
        <SectionTitle title={t('reports.byCategory')} />
        <CategoryBreakdown
          byCategory={report.byCategory}
          collapsible
          linkFor={(id) => categoryLink(id, { month, accountId: scope })}
        />
      </section>

      <section className="card space-y-3">
        <SectionTitle title={t('reports.dailyTrend')} />
        <DailyChart data={report.daily} />
      </section>

      <TopExpenses txs={report.topExpenses} />

      {recurring.length > 0 && (
        <section className="card">
          <SectionTitle title={t('reports.recurring')} />
          <ul className="mt-1">
            {recurring.map((r) => (
              <li
                key={r.key}
                className="flex min-h-[52px] items-center justify-between gap-3 border-t border-line first:border-0"
              >
                <span className="min-w-0">
                  <span className="line-clamp-1 font-medium">{r.description}</span>
                  <span className="text-[13px] text-muted">
                    {t('reports.recurringMonths', { count: r.months })}
                  </span>
                </span>
                <Amount cents={-r.cents} className="text-[16px]" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
