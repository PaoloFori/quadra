import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { DailyPoint } from '@/domain/reports/month';
import type { MonthTotals } from '@/domain/reports/year';
import { useFormat } from '@/i18n/useFormat';

export interface Slice {
  id: string;
  name: string;
  value: number;
  color: string;
}

export function CategoryDonut({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: Slice[];
  centerLabel?: string;
  centerValue?: number;
}) {
  const f = useFormat();
  return (
    <div
      className="relative h-52"
      role="img"
      aria-label={slices.map((s) => `${s.name}: ${f.currency(s.value)}`).join(', ')}
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="66%"
            outerRadius="96%"
            paddingAngle={2}
            cornerRadius={4}
            stroke="none"
          >
            {slices.map((s) => (
              <Cell key={s.id} fill={s.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => f.currency(Number(v))} />
        </PieChart>
      </ResponsiveContainer>
      {centerValue !== undefined && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[12px] text-muted">{centerLabel}</span>
          <span className="tabular text-xl font-bold">{f.currency(centerValue)}</span>
        </div>
      )}
    </div>
  );
}

export function DailyChart({ data }: { data: DailyPoint[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <div className="h-56" role="img" aria-label={t('reports.dailyTrend')}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            formatter={(v) => f.currency(Number(v))}
            labelFormatter={(d) => `${t('reports.day')} ${d}`}
          />
          <Area
            type="monotone"
            dataKey="previousCumulative"
            name={t('reports.previousMonth')}
            stroke="rgb(var(--muted))"
            fill="none"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            name={t('common.expenses')}
            stroke="rgb(var(--expense))"
            fill="rgb(var(--expense))"
            fillOpacity={0.15}
            strokeWidth={2}
          />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
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
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={0} />
          <YAxis hide />
          <Tooltip formatter={(v) => f.currency(Number(v))} />
          <Bar
            dataKey="income"
            name={t('common.income')}
            fill="rgb(var(--income))"
            radius={[3, 3, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            name={t('common.expenses')}
            fill="rgb(var(--expense))"
            radius={[3, 3, 0, 0]}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CumulativeChart({ data }: { data: { name: string; value: number }[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <div className="h-48" role="img" aria-label={t('reports.cumulative')}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 16, right: 16, top: 8, bottom: 0 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={10} interval={0} />
          <YAxis hide />
          <Tooltip formatter={(v) => f.currency(Number(v))} />
          <Area
            type="monotone"
            dataKey="value"
            name={t('reports.cumulative')}
            stroke="rgb(var(--accent))"
            fill="rgb(var(--accent))"
            fillOpacity={0.15}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
