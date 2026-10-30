import type { TFunction } from 'i18next';
import type { PdfDoc } from '@/domain/export/pdf';
import type { MonthReport } from '@/domain/reports/month';
import type { YearReport } from '@/domain/reports/year';
import type { CategoryTotal } from '@/domain/reports/totals';
import type { Formatters } from '@/lib/format';

interface Ctx {
  t: TFunction;
  f: Formatters;
  label: (categoryId: string | null) => string;
  color: (categoryId: string | null) => string;
}

/** Il PDF usa un font standard senza il meno tipografico: si torna al trattino. */
const signed = (f: Formatters, cents: number): string =>
  f.currencySigned(cents).replace('\u2212', '-');

const categoryRows = (rows: CategoryTotal[], { f, label, color }: Ctx) =>
  rows.map((c) => ({
    label: `${label(c.categoryId)} (${f.percent(c.share).replace('+', '')})`,
    value: f.currency(c.cents),
    bar: { ratio: c.share, color: color(c.categoryId) },
  }));

const changeText = (f: Formatters, diff: number, pct: number | null): string =>
  `${signed(f, diff)}${pct === null ? '' : ` (${f.percent(pct)})`}`;

export function monthPdfDoc(r: MonthReport, ctx: Ctx): PdfDoc {
  const { t, f } = ctx;
  return {
    title: `Quadra · ${t('reports.monthly')}`,
    subtitle: f.month(r.month),
    sections: [
      {
        heading: t('reports.summary'),
        rows: [
          { label: t('common.income'), value: f.currency(r.totals.income) },
          { label: t('common.expenses'), value: f.currency(r.totals.expenses) },
          { label: t('common.balance'), value: signed(f, r.totals.net) },
          {
            label: t('reports.vsPrevious'),
            value: changeText(f, r.expensesChange.diff, r.expensesChange.pct),
          },
        ],
      },
      { heading: t('reports.byCategory'), rows: categoryRows(r.byCategory, ctx) },
      {
        heading: t('reports.top5'),
        rows: r.top5.map((tx) => ({
          label: `${f.date(tx.date)} · ${tx.note || tx.description}`,
          value: f.currency(-tx.amountCents),
        })),
      },
    ],
  };
}

export function yearPdfDoc(r: YearReport, ctx: Ctx): PdfDoc {
  const { t, f } = ctx;
  return {
    title: `Quadra · ${t('reports.yearly')}`,
    subtitle: r.year,
    sections: [
      {
        heading: t('reports.summary'),
        rows: [
          { label: t('common.income'), value: f.currency(r.totals.income) },
          { label: t('common.expenses'), value: f.currency(r.totals.expenses) },
          { label: t('common.balance'), value: signed(f, r.totals.net) },
          { label: t('reports.avgMonthly'), value: f.currency(r.averageMonthlyExpenses) },
          ...(r.mostExpensive
            ? [
                {
                  label: t('reports.mostExpensive'),
                  value: `${f.month(r.mostExpensive.month)} · ${f.currency(r.mostExpensive.expenses)}`,
                },
              ]
            : []),
          ...(r.lightest
            ? [
                {
                  label: t('reports.lightest'),
                  value: `${f.month(r.lightest.month)} · ${f.currency(r.lightest.expenses)}`,
                },
              ]
            : []),
          {
            label: t('reports.vsPreviousYear'),
            value: changeText(f, r.expensesChange.diff, r.expensesChange.pct),
          },
        ],
      },
      {
        heading: t('reports.byMonth'),
        rows: r.months
          .filter((m) => m.hasData)
          .map((m) => ({
            label: f.month(m.month),
            value: `${f.currency(m.expenses)} / ${f.currency(m.income)}`,
          })),
      },
      { heading: t('reports.byCategory'), rows: categoryRows(r.byCategory, ctx) },
    ],
  };
}
