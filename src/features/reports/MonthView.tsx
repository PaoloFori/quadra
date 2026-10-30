import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { Delta } from '@/components/Delta';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { ALL_ACCOUNTS, filterByAccount, totalsByAccount } from '@/domain/reports/accounts';
import { detectRecurring } from '@/domain/reports/recurring';
import { buildMonthReport, type MonthReport } from '@/domain/reports/month';
import type { MonthKey } from '@/domain/types';
import { monthOf, monthRange, shiftMonth, todayIso } from '@/lib/dates';
import { useFormat } from '@/i18n/useFormat';
import { DailyChart } from './charts';
import { AccountsCompare, CategoryBreakdown, SummaryHero } from './shared';

interface Props {
  month: MonthKey;
  accountId: string;
  onReport: (report: MonthReport | undefined) => void;
}

export function MonthView({ month, accountId, onReport }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const accounts = useAccounts();
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

  return (
    <div className="space-y-3">
      <SummaryHero totals={report.totals} />

      <section className="card">
        <h2 className="mb-1 font-semibold">{t('reports.vsPrevious')}</h2>
        <p className="flex justify-between">
          <span className="text-muted">{t('common.expenses')}</span>
          <Delta {...report.expensesChange} />
        </p>
        <p className="flex justify-between">
          <span className="text-muted">{t('common.income')}</span>
          <Delta {...report.incomeChange} higherIsBad={false} />
        </p>
      </section>

      {accountId === ALL_ACCOUNTS && accounts.length > 1 && (
        <section className="card">
          <h2 className="mb-3 font-semibold">{t('reports.byAccount')}</h2>
          <AccountsCompare rows={perAccount} />
        </section>
      )}

      <section className="card">
        <h2 className="mb-2 font-semibold">{t('reports.byCategory')}</h2>
        <CategoryBreakdown byCategory={report.byCategory} />
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t('reports.dailyTrend')}</h2>
        <DailyChart data={report.daily} />
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">{t('reports.top5')}</h2>
        <ol>
          {report.top5.map((tx) => (
            <li
              key={tx.id}
              className="flex min-h-[44px] items-center justify-between gap-3 border-b border-line/60 last:border-0"
            >
              <span className="min-w-0">
                <span className="line-clamp-1">{tx.note || tx.description}</span>
                <span className="text-[13px] text-muted">{f.date(tx.date)}</span>
              </span>
              <Amount cents={tx.amountCents} className="font-medium" />
            </li>
          ))}
        </ol>
      </section>

      {recurring.length > 0 && (
        <section className="card">
          <h2 className="mb-1 font-semibold">{t('reports.recurring')}</h2>
          <ul>
            {recurring.map((r) => (
              <li
                key={r.key}
                className="flex min-h-[44px] items-center justify-between gap-3 border-b border-line/60 last:border-0"
              >
                <span className="min-w-0">
                  <span className="line-clamp-1">{r.description}</span>
                  <span className="text-[13px] text-muted">
                    {t('reports.recurringMonths', { count: r.months })}
                  </span>
                </span>
                <Amount cents={-r.cents} className="font-medium" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
