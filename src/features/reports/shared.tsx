import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { useCategoryLookup } from '@/db/hooks';
import { savingsRate, type AccountTotals } from '@/domain/reports/accounts';
import type { CategoryTotal, Totals } from '@/domain/reports/totals';
import type { Account } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';
import { CategoryDonut, type Slice } from './charts';

const UNCATEGORIZED_COLOR = '#98989d';

export function useSlices(byCategory: CategoryTotal[]): Slice[] {
  const lookup = useCategoryLookup();
  return useMemo(
    () =>
      byCategory.map((c) => ({
        id: c.categoryId ?? 'none',
        name: lookup.label(c.categoryId),
        value: c.cents,
        color: (c.categoryId && lookup.byId.get(c.categoryId)?.color) || UNCATEGORIZED_COLOR,
      })),
    [byCategory, lookup],
  );
}

/** Ciambella con il totale al centro + una riga per categoria con barra del peso sulle spese. */
export function CategoryBreakdown({ byCategory }: { byCategory: CategoryTotal[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const slices = useSlices(byCategory);
  if (byCategory.length === 0) return <p className="text-muted">{t('reports.noExpenses')}</p>;
  const total = byCategory.reduce((s, c) => s + c.cents, 0);
  const top = byCategory[0]?.cents ?? 1;
  return (
    <>
      <CategoryDonut slices={slices} centerLabel={t('reports.spentTotal')} centerValue={total} />
      <ul className="mt-2">
        {byCategory.map((c, i) => (
          <li key={c.categoryId ?? 'none'} className="border-b border-line/60 py-2.5 last:border-0">
            <div className="flex min-h-[28px] items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px]"
                style={{ backgroundColor: `${slices[i]?.color}26` }}
              >
                {(c.categoryId && lookup.byId.get(c.categoryId)?.icon) || '•'}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{slices[i]?.name}</span>
              <span className="text-[13px] text-muted">{f.percent(c.share).replace('+', '')}</span>
              <Amount cents={-c.cents} signed={false} neutral className="font-semibold" />
            </div>
            <div className="ml-11 mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
              <div
                className="h-full rounded-full"
                style={{ width: `${(c.cents / top) * 100}%`, backgroundColor: slices[i]?.color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export function StatPair({
  label,
  cents,
  tone,
}: {
  label: string;
  cents: number;
  tone: 'income' | 'expense' | 'neutral';
}) {
  const color =
    tone === 'income' ? 'text-income' : tone === 'expense' ? 'text-expense' : 'text-ink';
  return (
    <div className="flex min-h-[32px] items-baseline justify-between gap-3">
      <span className="text-muted">{label}</span>
      <Amount cents={cents} signed={false} neutral className={`text-lg font-bold ${color}`} />
    </div>
  );
}

/** Scheda principale: saldo del periodo, entrate e uscite, quanto è rimasto delle entrate. */
export function SummaryHero({
  totals,
  title,
  subtitle,
}: {
  totals: Totals;
  title?: string;
  subtitle?: string;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const rate = savingsRate(totals);
  return (
    <section className="hero" aria-label={t('reports.summary')}>
      <p className="text-[13px] font-medium text-white/80">{title ?? t('common.balance')}</p>
      <p className="tabular text-4xl font-bold tracking-tight">{f.currencySigned(totals.net)}</p>
      {subtitle && <p className="text-[13px] text-white/75">{subtitle}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {(
          [
            ['income', totals.income, '↓'],
            ['expenses', totals.expenses, '↑'],
          ] as const
        ).map(([key, cents, arrow]) => (
          <div key={key} className="rounded-2xl bg-white/15 p-3">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-white/85">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[11px]"
              >
                {arrow}
              </span>
              {t(`common.${key}`)}
            </p>
            <p className="tabular mt-0.5 text-[17px] font-bold">{f.currency(cents)}</p>
          </div>
        ))}
      </div>
      {rate !== null && (
        <p className="mt-3 text-[13px] text-white/85">
          {t('reports.savings')}: <strong>{f.percent(rate).replace('+', '')}</strong>
        </p>
      )}
    </section>
  );
}

/** Confronto tra i conti nello stesso periodo. */
export function AccountsCompare({ rows }: { rows: AccountTotals[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  const max = Math.max(...rows.map((r) => Math.max(r.income, r.expenses)), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.account.id}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">{r.account.name}</span>
            <span className="text-[12px] text-muted">
              {t('reports.movements', { count: r.count })}
            </span>
          </div>
          {(
            [
              ['income', r.income, 'bg-income'],
              ['expenses', r.expenses, 'bg-expense'],
            ] as const
          ).map(([key, cents, color]) => (
            <div key={key} className="flex items-center gap-2 py-0.5">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${(cents / max) * 100}%` }}
                />
              </div>
              <span className="tabular w-24 text-right text-[13px]">{f.currency(cents)}</span>
            </div>
          ))}
          <p className="mt-0.5 flex justify-between text-[13px]">
            <span className="text-muted">{t('common.balance')}</span>
            <Amount cents={r.net} className="font-semibold" />
          </p>
        </li>
      ))}
    </ul>
  );
}

/** Selettore conto: «Tutti i conti» oppure un conto singolo. Nascosto con un solo conto. */
export function AccountChips({
  accounts,
  value,
  onChange,
}: {
  accounts: Account[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (accounts.length < 2) return null;
  const items = [{ id: 'all', name: t('reports.allAccounts') }, ...accounts];
  return (
    <div
      role="group"
      aria-label={t('reports.accountFilter')}
      className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1"
    >
      {items.map((a) => (
        <button
          key={a.id}
          aria-pressed={value === a.id}
          onClick={() => onChange(a.id)}
          className={`chip ${value === a.id ? 'bg-accent text-white' : 'bg-card text-ink ring-1 ring-line'}`}
        >
          {a.name}
        </button>
      ))}
    </div>
  );
}
