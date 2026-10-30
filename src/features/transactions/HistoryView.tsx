import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { useCategoryLookup } from '@/db/hooks';
import { lastSpendingByCategory } from '@/domain/history';
import type { Transaction } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';

interface Props {
  transactions: Transaction[];
  onPickCategory: (categoryId: string | null) => void;
}

/** Per ogni categoria: l'ultima volta che hai speso e in cosa. Tap → tutti i movimenti di quella categoria. */
export function HistoryView({ transactions, onPickCategory }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const rows = useMemo(
    () =>
      lastSpendingByCategory(transactions).sort((a, b) =>
        lookup.label(a.categoryId).localeCompare(lookup.label(b.categoryId), undefined, {
          sensitivity: 'base',
        }),
      ),
    [transactions, lookup],
  );

  if (rows.length === 0) return <p className="card text-muted">{t('tx.noResults')}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const cat = r.categoryId ? lookup.byId.get(r.categoryId) : undefined;
        return (
          <li key={r.categoryId ?? 'none'}>
            <button
              className="card flex w-full items-center gap-3 text-left"
              onClick={() => onPickCategory(r.categoryId)}
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${cat?.color ?? '#98989d'}33` }}
              >
                {cat?.icon ?? '❔'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{lookup.label(r.categoryId)}</span>
                <span className="line-clamp-2 break-words text-[14px]">
                  {r.last.note || r.last.description}
                </span>
                <span className="block text-[13px] text-muted">
                  {t('history.last', { date: f.dateLong(r.last.date) })} ·{' '}
                  {t('history.count', { count: r.count })}
                </span>
              </span>
              <span className="text-right">
                <Amount cents={r.last.amountCents} className="block font-semibold" />
                <span className="text-[12px] text-muted">
                  {t('history.total', { amount: f.currency(r.spentCents) })}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
