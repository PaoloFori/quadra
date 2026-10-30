import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { useCategoryLookup } from '@/db/hooks';
import type { CategoryTotal } from '@/domain/reports/totals';
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

export function CategoryBreakdown({ byCategory }: { byCategory: CategoryTotal[] }) {
  const { t } = useTranslation();
  const f = useFormat();
  const slices = useSlices(byCategory);
  if (byCategory.length === 0) return <p className="text-muted">{t('reports.noExpenses')}</p>;
  return (
    <>
      <CategoryDonut slices={slices} />
      <ul className="mt-2">
        {byCategory.map((c, i) => (
          <li
            key={c.categoryId ?? 'none'}
            className="flex min-h-[44px] items-center gap-3 border-b border-line/60 py-1 last:border-0"
          >
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: slices[i]?.color }}
            />
            <span className="min-w-0 flex-1 truncate">{slices[i]?.name}</span>
            <span className="text-[13px] text-muted">{f.percent(c.share).replace('+', '')}</span>
            <Amount cents={-c.cents} signed={false} neutral className="font-medium" />
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
