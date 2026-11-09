import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Delta } from '@/components/Delta';
import { SectionTitle } from '@/components/ui';
import { compare, type Totals } from '@/domain/reports/totals';
import type { MonthTotals } from '@/domain/reports/year';
import { useFormat } from '@/i18n/useFormat';

const TOOLTIP_STYLE = {
  background: 'rgb(var(--raised))',
  border: '1.5px solid rgb(var(--line))',
  borderRadius: 12,
  color: 'rgb(var(--ink))',
} as const;
/** Il periodo scelto è il più forte; quelli di confronto sono via via più tenui. */
const SERIES_COLORS = ['rgb(var(--accent))', 'rgb(var(--muted))', 'rgb(var(--line-strong))'];

export interface PeriodRow {
  label: string;
  totals: Totals;
}

type Metric = 'income' | 'expenses' | 'net';
const METRICS: Metric[] = ['expenses', 'income', 'net'];

/**
 * Confronto tra il periodo scelto (prima riga) e uno o due periodi passati: barre di entrate, uscite e
 * risparmio affiancate, la tabella dei valori e le variazioni rispetto a ciascun periodo di confronto.
 */
export function ComparisonCard({
  title,
  rows,
  controls,
}: {
  title: string;
  rows: PeriodRow[];
  controls?: ReactNode;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const metricName = (m: Metric): string =>
    m === 'income'
      ? t('common.income')
      : m === 'expenses'
        ? t('common.expenses')
        : t('reports.savings');
  const data = (['income', 'expenses', 'net'] as const).map((m) => ({
    name: metricName(m),
    ...Object.fromEntries(rows.map((r, i) => [`p${i}`, r.totals[m]])),
  }));
  const [now, ...others] = rows;

  return (
    <section className="card space-y-3">
      <SectionTitle title={title} />
      {controls}
      <div className="h-56" role="img" aria-label={title}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }} barGap={3}>
            <XAxis
              dataKey="name"
              stroke="rgb(var(--faint))"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'rgb(var(--tile))' }}
              formatter={(v) => f.currency(Number(v))}
            />
            {rows.map((r, i) => (
              <Bar
                key={r.label}
                dataKey={`p${i}`}
                name={r.label}
                fill={SERIES_COLORS[i] ?? SERIES_COLORS[2]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <table className="w-full text-[14px]">
        <thead>
          <tr className="label-caps text-faint">
            <th className="py-2 text-left font-medium" />
            {(['income', 'expenses', 'net'] as const).map((m) => (
              <th key={m} className="py-2 text-right font-medium">
                {metricName(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className="border-t border-line">
              <td className="py-2.5 pr-2 font-medium capitalize">
                <span
                  aria-hidden="true"
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SERIES_COLORS[i] ?? SERIES_COLORS[2] }}
                />
                {r.label}
              </td>
              <td className="tabular py-2.5 text-right text-income">
                {f.number(Math.round(r.totals.income / 100))}
              </td>
              <td className="tabular py-2.5 text-right">
                {f.number(Math.round(r.totals.expenses / 100))}
              </td>
              <td className="tabular py-2.5 text-right">
                {f.number(Math.round(r.totals.net / 100))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {now &&
        others.map((o) => (
          <div key={o.label} className="space-y-1">
            <p className="label-caps">{t('reports.vsLabel', { period: o.label })}</p>
            <p className="flex justify-between">
              <span className="text-muted">{t('common.expenses')}</span>
              <Delta {...compare(now.totals.expenses, o.totals.expenses)} />
            </p>
            <p className="flex justify-between">
              <span className="text-muted">{t('common.income')}</span>
              <Delta {...compare(now.totals.income, o.totals.income)} higherIsBad={false} />
            </p>
            <p className="flex justify-between">
              <span className="text-muted">{t('reports.savings')}</span>
              <Delta {...compare(now.totals.net, o.totals.net)} higherIsBad={false} />
            </p>
          </div>
        ))}
    </section>
  );
}

/** Anno scelto contro l'anno prima, mese per mese: entrate, uscite o risparmio a scelta. */
export function YearVsPrevious({
  year,
  months,
  previousMonths,
}: {
  year: string;
  months: MonthTotals[];
  previousMonths: MonthTotals[];
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const [metric, setMetric] = useState<Metric>('expenses');
  const label = (m: Metric): string =>
    m === 'income'
      ? t('common.income')
      : m === 'expenses'
        ? t('common.expenses')
        : t('reports.savings');
  const previousYear = String(Number(year) - 1);
  const data = months.map((m, i) => ({
    name: f.monthShort(m.month),
    now: m[metric],
    before: previousMonths[i]?.[metric] ?? 0,
  }));

  return (
    <section className="card space-y-3">
      <SectionTitle title={t('reports.yearVsPrevious', { year, previous: previousYear })} />
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t('reports.metric')}
        data-no-swipe
      >
        {METRICS.map((m) => (
          <button
            key={m}
            className={metric === m ? 'chip chip-on' : 'chip'}
            aria-pressed={metric === m}
            onClick={() => setMetric(m)}
          >
            {label(m)}
          </button>
        ))}
      </div>
      <div
        className="h-56"
        role="img"
        aria-label={t('reports.yearVsPrevious', { year, previous: previousYear })}
      >
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }} barGap={2}>
            <XAxis
              dataKey="name"
              stroke="rgb(var(--faint))"
              tickLine={false}
              axisLine={false}
              fontSize={10}
              interval={0}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: 'rgb(var(--tile))' }}
              formatter={(v) => f.currency(Number(v))}
            />
            <Bar dataKey="now" name={year} fill={SERIES_COLORS[0]} radius={[3, 3, 0, 0]} />
            <Bar
              dataKey="before"
              name={previousYear}
              fill={SERIES_COLORS[1]}
              radius={[3, 3, 0, 0]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'rgb(var(--muted))' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
