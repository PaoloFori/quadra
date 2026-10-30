import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { DailyPoint } from '@/domain/reports/month';
import type { MonthTotals } from '@/domain/reports/year';
import { useFormat } from '@/i18n/useFormat';

const TOOLTIP_STYLE = {
  background: 'rgb(var(--raised))',
  border: '1.5px solid rgb(var(--line))',
  borderRadius: 12,
  color: 'rgb(var(--ink))',
} as const;

export function DailyChart({ data }: { data: DailyPoint[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <div className="h-56" role="img" aria-label={t('reports.dailyTrend')}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <XAxis
            dataKey="day"
            stroke="rgb(var(--faint))"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => f.currency(Number(v))}
            labelFormatter={(d) => `${t('reports.day')} ${d}`}
          />
          <Area
            type="monotone"
            dataKey="previousCumulative"
            name={t('reports.previousMonth')}
            stroke="rgb(var(--faint))"
            fill="none"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            name={t('common.expenses')}
            stroke="rgb(var(--accent))"
            fill="rgb(var(--accent))"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, color: 'rgb(var(--muted))' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function YearBars({ months }: { months: MonthTotals[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  const data = months.map((m) => ({
    name: f.monthShort(m.month),
    income: m.income,
    expenses: m.expenses,
  }));
  return (
    <div className="h-56" role="img" aria-label={t('reports.byMonth')}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <XAxis
            dataKey="name"
            stroke="rgb(var(--faint))"
            tickLine={false}
            axisLine={false}
            fontSize={10}
            interval={0}
          />
          <YAxis hide />
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => f.currency(Number(v))} />
          <Bar
            dataKey="income"
            name={t('common.income')}
            fill="rgb(var(--accent))"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name={t('common.expenses')}
            fill="#ff7a66"
            radius={[3, 3, 0, 0]}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'rgb(var(--muted))' }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
