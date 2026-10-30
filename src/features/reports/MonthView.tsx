import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { SectionTitle } from '@/components/ui';
import { Delta } from '@/components/Delta';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { ALL_ACCOUNTS, filterByAccount, totalsByAccount } from '@/domain/reports/accounts';
import { detectRecurring } from '@/domain/reports/recurring';
import { buildMonthReport, type MonthReport } from '@/domain/reports/month';
import type { MonthKey } from '@/domain/types';
import { daysInMonth, monthOf, monthRange, shiftMonth, todayIso } from '@/lib/dates';
import { useFormat } from '@/i18n/useFormat';
import { DailyChart } from './charts';
import { movementsLink } from '@/features/transactions/movementsLink';
import { AccountsCompare, CategoryBreakdown, MetricsGrid } from './shared';

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
    <div className="space-y-4">
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

      <section className="card space-y-1">
        <SectionTitle title={t('reports.vsPrevious')} />
        <p className="flex justify-between pt-2">
          <span className="text-muted">{t('common.expenses')}</span>
          <Delta {...report.expensesChange} />
        </p>
        <p className="flex justify-between">
          <span className="text-muted">{t('common.income')}</span>
          <Delta {...report.incomeChange} higherIsBad={false} />
        </p>
      </section>

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
          linkFor={(categoryId) => movementsLink({ categoryId, accountId: scope })}
        />
      </section>

      <section className="card space-y-3">
        <SectionTitle title={t('reports.dailyTrend')} />
        <DailyChart data={report.daily} />
      </section>

      <section className="card">
        <SectionTitle title={t('reports.top5')} />
        <ol className="mt-1">
          {report.top5.map((tx) => (
            <li
              key={tx.id}
              className="flex min-h-[52px] items-center justify-between gap-3 border-t border-line first:border-0"
            >
              <span className="min-w-0">
                <span className="line-clamp-1 font-medium">{tx.note || tx.description}</span>
                <span className="text-[13px] text-muted">{f.date(tx.date)}</span>
              </span>
              <Amount cents={tx.amountCents} className="text-[16px]" />
            </li>
          ))}
        </ol>
      </section>

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
