import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Delta } from '@/components/Delta';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { ALL_ACCOUNTS, filterByAccount, totalsByAccount } from '@/domain/reports/accounts';
import { monthRange, yearOf } from '@/lib/dates';
import { buildYearReport, type YearReport } from '@/domain/reports/year';
import { useFormat } from '@/i18n/useFormat';
import { YearBars } from './charts';
import { WealthChart } from '@/components/WealthChart';
import { movementsLink } from '@/features/transactions/movementsLink';
import { AccountsCompare, CategoryBreakdown, MetricsGrid } from './shared';
import { SectionTitle } from '@/components/ui';

interface Props {
  year: string;
  accountId: string;
  onReport: (report: YearReport | undefined) => void;
}

export function YearView({ year, accountId, onReport }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const accounts = useAccounts();
  const scope = accountId === ALL_ACCOUNTS ? undefined : accountId;
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

  const monthsWithData = report.months.filter((m) => m.hasData);

  return (
    <div className="space-y-4">
      <MetricsGrid
        totals={report.totals}
        links={{
          income: movementsLink({
            type: 'income',
            accountId: scope,
            from: `${year}-01-01`,
            to: `${year}-12-31`,
          }),
          expenses: movementsLink({
            type: 'expense',
            accountId: scope,
            from: `${year}-01-01`,
            to: `${year}-12-31`,
          }),
        }}
        average={{ label: t('reports.avgMonth'), cents: report.averageMonthlyExpenses }}
      />

      <section className="card space-y-1">
        <SectionTitle title={t('reports.vsPreviousYear')} />
        <p className="flex justify-between pt-2">
          <span className="text-muted">{t('common.expenses')}</span>
          <Delta {...report.expensesChange} />
        </p>
        <p className="flex justify-between">
          <span className="text-muted">{t('common.income')}</span>
          <Delta {...report.incomeChange} higherIsBad={false} />
        </p>
        {report.mostExpensive && (
          <p className="flex justify-between gap-3 pt-2">
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

      <section className="card space-y-3">
        <SectionTitle title={t('reports.byMonth')} />
        <YearBars months={report.months} />
        <table className="w-full text-[14px]">
          <thead>
            <tr className="label-caps text-faint">
              <th className="py-2 text-left font-medium">{t('reports.month')}</th>
              <th className="py-2 text-right font-medium">{t('common.income')}</th>
              <th className="py-2 text-right font-medium">{t('common.expenses')}</th>
            </tr>
          </thead>
          <tbody>
            {monthsWithData.map((m) => (
              <tr key={m.month} className="border-t border-line">
                <td className="py-2.5 font-medium">
                  <Link
                    to={movementsLink({
                      accountId: scope,
                      from: `${m.month}-01`,
                      to: monthRange(m.month).to,
                    })}
                    className="block capitalize"
                  >
                    {f.monthShort(m.month)}
                  </Link>
                </td>
                <td className="tabular py-2.5 text-right text-income">
                  {f.number(Math.round(m.income / 100))}
                </td>
                <td className="tabular py-2.5 text-right">
                  {f.number(Math.round(m.expenses / 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card space-y-3">
        <SectionTitle title={t('reports.cumulative')} />
        <WealthChart
          values={cumulative.map((c) => c.value)}
          labels={cumulative.map((c) => c.name)}
          label={t('reports.cumulative')}
        />
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
    </div>
  );
}
