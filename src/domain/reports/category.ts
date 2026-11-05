import { descriptionKey } from '@/lib/normalize';
import { daysInMonth, monthOf, shiftMonth } from '@/lib/dates';
import type { IsoDate, MonthKey, Transaction } from '../types';

export interface MerchantTotal {
  key: string;
  /** Descrizione più frequente tra quelle raggruppate. */
  label: string;
  count: number;
  cents: number;
}

export interface CategoryReport {
  /** «Uscita» se la categoria raccoglie soprattutto spese, «entrata» se raccoglie entrate. */
  kind: 'expense' | 'income';
  count: number;
  totalCents: number;
  thisMonthCents: number;
  previousMonthCents: number;
  /** Media mensile sui mesi trascorsi dal primo movimento (al massimo gli ultimi 12). */
  avgMonthlyCents: number;
  avgPerMovementCents: number;
  /** Ultimi 12 mesi, il corrente per ultimo. */
  months: Array<{ month: MonthKey; cents: number }>;
  /** Quota sul totale di spese (o entrate) di tutti i movimenti. */
  share: number | null;
  topMerchants: MerchantTotal[];
  biggest: Transaction[];
  recent: Transaction[];
  firstDate?: IsoDate;
}

const monthsBetween = (from: MonthKey, to: MonthKey): number =>
  (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
  Number(to.slice(5, 7)) -
  Number(from.slice(5, 7));

function topMerchantsOf(
  mine: readonly Transaction[],
  value: (t: Transaction) => number,
): MerchantTotal[] {
  const groups = new Map<string, { labels: Map<string, number>; count: number; cents: number }>();
  for (const t of mine) {
    const text = t.note || t.description;
    const key = descriptionKey(text) || text.toLowerCase();
    const g = groups.get(key) ?? { labels: new Map(), count: 0, cents: 0 };
    g.labels.set(text, (g.labels.get(text) ?? 0) + 1);
    g.count += 1;
    g.cents += value(t);
    groups.set(key, g);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      label: [...g.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key,
      count: g.count,
      cents: g.cents,
    }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5);
}

/** Analisi di una singola categoria (`null` = senza categoria). I giroconti non contano. */
export function buildCategoryReport(
  all: readonly Transaction[],
  categoryId: string | null,
  today: IsoDate,
): CategoryReport {
  const real = all.filter((t) => !t.isTransfer);
  const mine = real.filter((t) => t.categoryId === categoryId);
  const net = mine.reduce((s, t) => s + t.amountCents, 0);
  const kind: CategoryReport['kind'] = net > 0 ? 'income' : 'expense';
  // importi dal punto di vista della categoria: positivi nel verso che la caratterizza
  const value = (t: Transaction): number => (kind === 'expense' ? -t.amountCents : t.amountCents);

  const byMonth = new Map<MonthKey, number>();
  for (const t of mine)
    byMonth.set(monthOf(t.date), (byMonth.get(monthOf(t.date)) ?? 0) + value(t));

  const current = monthOf(today);
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = shiftMonth(current, i - 11);
    return { month, cents: byMonth.get(month) ?? 0 };
  });

  const sorted = [...mine].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = sorted[0]?.date;
  const span = firstDate ? Math.min(12, monthsBetween(monthOf(firstDate), current) + 1) : 1;
  const totalCents = mine.reduce((s, t) => s + value(t), 0);

  const kindTotal = real
    .filter((t) => (kind === 'expense' ? t.amountCents < 0 : t.amountCents > 0))
    .reduce((s, t) => s + Math.abs(t.amountCents), 0);

  const topMerchants = topMerchantsOf(mine, value);

  return {
    kind,
    count: mine.length,
    totalCents,
    thisMonthCents: byMonth.get(current) ?? 0,
    previousMonthCents: byMonth.get(shiftMonth(current, -1)) ?? 0,
    avgMonthlyCents: Math.round(months.slice(12 - span).reduce((s, m) => s + m.cents, 0) / span),
    avgPerMovementCents: mine.length === 0 ? 0 : Math.round(totalCents / mine.length),
    months,
    share: kindTotal === 0 ? null : Math.max(totalCents, 0) / kindTotal,
    topMerchants,
    biggest: [...mine].sort((a, b) => value(b) - value(a)).slice(0, 5),
    recent: [...mine].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    firstDate,
  };
}

export interface CategoryPeriod {
  from: IsoDate;
  to: IsoDate;
  /** Periodo di confronto (mese prima, anno prima). */
  previous: { from: IsoDate; to: IsoDate };
  /** `day`: un punto per giorno del mese; `month`: un punto per mese dell'anno. */
  granularity: 'day' | 'month';
}

export interface CategoryPeriodReport {
  kind: 'expense' | 'income';
  count: number;
  totalCents: number;
  previousCents: number;
  avgPerMovementCents: number;
  /** Quota sul totale di spese (o entrate) dello stesso periodo. */
  share: number | null;
  /** Giorni (1…31) o mesi (YYYY-MM) del periodo, con l'importo della categoria. */
  series: Array<{ key: string; cents: number }>;
  topMerchants: MerchantTotal[];
  biggest: Transaction[];
  /** Tutti i movimenti del periodo, i più recenti per primi. */
  items: Transaction[];
}

/** Analisi di una categoria dentro un solo mese o anno (`all` può essere già filtrato per conto). */
export function buildCategoryPeriodReport(
  all: readonly Transaction[],
  categoryId: string | null,
  period: CategoryPeriod,
): CategoryPeriodReport {
  const real = all.filter((t) => !t.isTransfer);
  const within = (t: Transaction, r: { from: IsoDate; to: IsoDate }): boolean =>
    t.date >= r.from && t.date <= r.to;
  const mineAll = real.filter((t) => t.categoryId === categoryId);
  const kind: CategoryReport['kind'] =
    mineAll.reduce((s, t) => s + t.amountCents, 0) > 0 ? 'income' : 'expense';
  const value = (t: Transaction): number => (kind === 'expense' ? -t.amountCents : t.amountCents);

  const mine = mineAll.filter((t) => within(t, period));
  const totalCents = mine.reduce((s, t) => s + value(t), 0);
  const previousCents = mineAll
    .filter((t) => within(t, period.previous))
    .reduce((s, t) => s + value(t), 0);
  const kindTotal = real
    .filter(
      (t) => within(t, period) && (kind === 'expense' ? t.amountCents < 0 : t.amountCents > 0),
    )
    .reduce((s, t) => s + Math.abs(t.amountCents), 0);

  const buckets = new Map<string, number>();
  for (const t of mine) {
    const key =
      period.granularity === 'day' ? String(Number(t.date.slice(8, 10))) : monthOf(t.date);
    buckets.set(key, (buckets.get(key) ?? 0) + value(t));
  }
  const keys =
    period.granularity === 'day'
      ? Array.from({ length: daysInMonth(monthOf(period.from)) }, (_, i) => String(i + 1))
      : Array.from(
          { length: 12 },
          (_, i) => `${period.from.slice(0, 4)}-${String(i + 1).padStart(2, '0')}`,
        );

  return {
    kind,
    count: mine.length,
    totalCents,
    previousCents,
    avgPerMovementCents: mine.length === 0 ? 0 : Math.round(totalCents / mine.length),
    share: kindTotal === 0 ? null : Math.max(totalCents, 0) / kindTotal,
    series: keys.map((key) => ({ key, cents: buckets.get(key) ?? 0 })),
    topMerchants: topMerchantsOf(mine, value),
    biggest: [...mine].sort((a, b) => value(b) - value(a)).slice(0, 5),
    items: [...mine].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
