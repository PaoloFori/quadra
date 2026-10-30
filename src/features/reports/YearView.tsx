import { useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Delta } from '@/components/Delta';
import { transactionsRepo } from '@/db/repositories';
import { buildYearReport, type YearReport } from '@/domain/reports/year';
import { useFormat } from '@/i18n/useFormat';
import { YearBars } from './charts';
import { CategoryBreakdown, StatPair } from './shared';

interface Props {
  year: string;
  onReport: (report: YearReport | undefined) => void;
}

export function YearView({ year, onReport }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const txs = useLiveQuery(
    () => transactionsRepo.inRange(`${Number(year) - 1}-01-01`, `${year}-12-31`),
    [year],
  );
  const report = useMemo(() => (txs ? buildYearReport(txs, year) : undefined), [txs, year]);

  useEffect(() => onReport(report), [report, onReport]);

  if (!report) return <p className="p-6 text-center text-muted">{t('common.loading')}</p>;
  if (!report.hasData) return <p className="card text-muted">{t('reports.noData')}</p>;

  return (
    <div className="space-y-3">
      <section className="card space-y-1" aria-label={t('reports.summary')}>
        <StatPair label={t('common.income')} cents={report.totals.income} tone="income" />
        <StatPair label={t('common.expenses')} cents={report.totals.expenses} tone="expense" />
        <StatPair label={t('common.balance')} cents={report.totals.net} tone="neutral" />
      </section>

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
        <h2 className="mb-2 font-semibold">{t('reports.byCategory')}</h2>
        <CategoryBreakdown byCategory={report.byCategory} />
      </section>
    </div>
  );
}
