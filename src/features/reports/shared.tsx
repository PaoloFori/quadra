import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { DonutChart, type DonutSlice } from '@/components/DonutChart';
import { IconTile, MetricCard } from '@/components/ui';
import { useCategoryLookup } from '@/db/hooks';
import { savingsRate, type AccountTotals } from '@/domain/reports/accounts';
import type { CategoryTotal, Totals } from '@/domain/reports/totals';
import type { Account } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';

const UNCATEGORIZED_COLOR = '#6e766f';
/** Colori dei puntini (come la palette dei grafici): entrate lime, uscite corallo. */
export const DOT = { income: '#c6f04d', expenses: '#ff7a66', saving: '#c6f04d', other: '#b7a6f6' };

export function useSlices(byCategory: CategoryTotal[]): DonutSlice[] {
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

/** Contenuto di una riga: diventa un link solo se c'è una destinazione. */
export function RowLink({
  to,
  className,
  children,
}: {
  to?: string;
  className: string;
  children: ReactNode;
}) {
  return to ? (
    <Link to={to} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

/**
 * Ciambella con le categorie principali a destra; l'elenco completo (con barre) è sempre aperto,
 * oppure a tendina con `collapsible`. Ogni categoria porta ai suoi movimenti se c'è `linkFor`.
 */
export function CategoryBreakdown({
  byCategory,
  linkFor,
  collapsible = false,
}: {
  byCategory: CategoryTotal[];
  linkFor?: (categoryId: string | null) => string;
  collapsible?: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const slices = useSlices(byCategory);
  const [open, setOpen] = useState(!collapsible);
  if (byCategory.length === 0) return <p className="text-muted">{t('reports.noExpenses')}</p>;
  const top = byCategory[0]?.cents ?? 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-5">
        <DonutChart slices={slices} centerLabel={t('reports.spentTotal')} />
        <ul className="min-w-0 flex-1 space-y-1">
          {byCategory.slice(0, 5).map((c, i) => (
            <li key={c.categoryId ?? 'none'}>
              <RowLink
                to={linkFor?.(c.categoryId)}
                className="flex min-h-[32px] items-center gap-2 text-[13px]"
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: slices[i]?.color }}
                />
                <span className="min-w-0 flex-1 truncate">{slices[i]?.name}</span>
                <span className="text-muted">{f.percent(c.share).replace('+', '')}</span>
              </RowLink>
            </li>
          ))}
        </ul>
      </div>

      {collapsible && (
        <button
          className="btn-secondary w-full"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open
            ? t('reports.hideCategories')
            : t('reports.showCategories', { count: byCategory.length })}
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
      )}

      <ul hidden={!open}>
        {byCategory.map((c, i) => (
          <li key={c.categoryId ?? 'none'} className="border-t border-line py-2.5 first:border-0">
            <RowLink to={linkFor?.(c.categoryId)} className="flex min-h-[40px] items-center gap-3">
              <IconTile color={slices[i]?.color}>
                {(c.categoryId && lookup.byId.get(c.categoryId)?.icon) || '•'}
              </IconTile>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{slices[i]?.name}</span>
                <span
                  className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-tile"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(c.cents / top) * 100}%`,
                      backgroundColor: slices[i]?.color,
                    }}
                  />
                </span>
              </span>
              <span className="text-right">
                <Amount cents={-c.cents} signed={false} neutral className="block text-[16px]" />
                <span className="text-[12px] text-muted">
                  {f.percent(c.share).replace('+', '')}
                </span>
              </span>
              {linkFor && <span className="text-faint">›</span>}
            </RowLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Entrate, uscite e risparmio del periodo + una media; entrate e uscite aprono i movimenti. */
export function MetricsGrid({
  totals,
  links,
  average,
}: {
  totals: Totals;
  links?: { income: string; expenses: string };
  average?: { label: string; cents: number };
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const rate = savingsRate(totals);
  return (
    <section className="grid grid-cols-2 gap-3" aria-label={t('reports.summary')}>
      <RowLink to={links?.income} className="block">
        <MetricCard label={t('common.income')} dot={DOT.income}>
          <span className="text-income">{f.currency(totals.income)}</span>
        </MetricCard>
      </RowLink>
      <RowLink to={links?.expenses} className="block">
        <MetricCard label={t('common.expenses')} dot={DOT.expenses}>
          {f.currency(totals.expenses)}
        </MetricCard>
      </RowLink>
      <MetricCard
        label={t('reports.savings')}
        dot={DOT.saving}
        badge={rate === null ? undefined : f.percent(rate).replace('+', '')}
      >
        <Amount cents={totals.net} className="text-[20px]" />
      </MetricCard>
      {average && (
        <MetricCard label={average.label} dot={DOT.other}>
          {f.currency(average.cents)}
        </MetricCard>
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
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.account.id}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">{r.account.name}</span>
            <span className="text-[12px] text-muted">
              {t('reports.movements', { count: r.count })}
            </span>
          </div>
          {(
            [
              ['income', r.income, DOT.income],
              ['expenses', r.expenses, DOT.expenses],
            ] as const
          ).map(([key, cents, color]) => (
            <div key={key} className="flex items-center gap-2 py-0.5">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-tile" aria-hidden>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(cents / max) * 100}%`, backgroundColor: color }}
                />
              </div>
              <span className="tabular w-24 text-right text-[13px]">{f.currency(cents)}</span>
            </div>
          ))}
          <p className="mt-1 flex justify-between text-[13px]">
            <span className="text-muted">{t('common.balance')}</span>
            <Amount cents={r.net} />
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
      className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1"
    >
      {items.map((a) => (
        <button
          key={a.id}
          aria-pressed={value === a.id}
          onClick={() => onChange(a.id)}
          className={`chip ${value === a.id ? 'chip-on' : ''}`}
        >
          {a.name}
        </button>
      ))}
    </div>
  );
}
