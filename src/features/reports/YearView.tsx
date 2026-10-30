import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Delta } from '@/components/Delta';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { ALL_ACCOUNTS, filterByAccount, totalsByAccount } from '@/domain/reports/accounts';
import { yearOf } from '@/lib/dates';
import { buildYearReport, type YearReport } from '@/domain/reports/year';
import { useFormat } from '@/i18n/useFormat';
import { CumulativeChart, YearBars } from './charts';
import { AccountsCompare, CategoryBreakdown, SummaryHero } from './shared';

interface Props {
  year: string;
  accountId: string;
  onReport: (report: YearReport | undefined) => void;
}

export function YearView({ year, accountId, onReport }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const accounts = useAccounts();
  const rawTxs = useLiveQuery(
    () => transactionsRepo.inRange(`${Number(year) - 1}-01-01`, `${year}-12-31`),
    [year],
  );
  const txs = useMemo(() => rawTxs && filterByAccount(rawTxs, accountId), [rawTxs, accountId]);
  const report = useMemo(() => (txs ? buildYearReport(txs, year) : undefined), [txs, year]);
  const perAccount = useMemo(
    () =>
      rawTxs
        ? totalsByAccount(
            rawTxs.filter((t) => yearOf(t.date) === year),
            accounts,
          )
        : [],
    [rawTxs, accounts, year],
  );
  const cumulative = useMemo(() => {
    const months = report?.months ?? [];
    return months.map((m, i) => ({
      name: f.monthShort(m.month),
      value: months.slice(0, i + 1).reduce((sum, x) => sum + x.net, 0),
    }));
  }, [report, f]);

  useEffect(() => onReport(report), [report, onReport]);

  if (!report) return <p className="p-6 text-center text-muted">{t('common.loading')}</p>;
  if (!report.hasData) return <p className="card text-muted">{t('reports.noData')}</p>;

  return (
    <div className="space-y-3">
      <SummaryHero totals={report.totals} />

      <section className="card space-y-1">
        <p className="flex justify-between gap-3">
          <span className="text-muted">{t('reports.avgMonthly')}</span>
          <span className="tabular font-medium">{f.currency(report.averageMonthlyExpenses)}</span>
        </p>
        {report.mostExpensive && (
          <p className="flex justify-between gap-3">
            <span className="text-muted">{t('reports.mostExpensive')}</span>
            <span className="tabular text-right font-medium">
              {f.month(report.mostExpensive.month)} · {f.currency(report.mostExpensive.expenses)}
            </span>
          </p>
        )}
        {report.lightest && (
          <p className="flex justify-between gap-3">
            <span className="text-muted">{t('reports.lightest')}</span>
            <span className="tabular text-right font-medium">
              {f.month(report.lightest.month)} · {f.currency(report.lightest.expenses)}
            </span>
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">{t('reports.vsPreviousYear')}</h2>
        <p className="flex justify-between">
          <span className="text-muted">{t('common.expenses')}</span>
          <Delta {...report.expensesChange} />
        </p>
        <p className="flex justify-between">
          <span className="text-muted">{t('common.income')}</span>
          <Delta {...report.incomeChange} higherIsBad={false} />
        </p>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t('reports.byMonth')}</h2>
        <YearBars months={report.months} />
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">{t('reports.cumulative')}</h2>
        <CumulativeChart data={cumulative} />
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
    </div>
  );
}
