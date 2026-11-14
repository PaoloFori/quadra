import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { SectionTitle } from '@/components/ui';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { filterByAccount } from '@/domain/reports/accounts';
import { movementItems, takeMovements, type MovementsSort } from '@/domain/reports/movementsList';
import type { IsoDate, Transaction } from '@/domain/types';
import { oneOf, usePersistentState } from '@/lib/persistentState';
import { useFormat } from '@/i18n/useFormat';
import { movementsLink } from '@/features/transactions/movementsLink';
import { TransactionRow } from '@/features/transactions/TransactionRow';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';

const SORTS: MovementsSort[] = ['day', 'category', 'amount'];
const PAGE = 40;

interface Props {
  /** Estremi del periodo (inclusi); senza `from` si parte dal primo movimento. */
  from?: IsoDate;
  to: IsoDate;
  accountId: string;
  /** Per il link «Filtra e cerca»: il conto solo se è stato scelto (non «tutti»). */
  scopeAccountId?: string;
}

/** I movimenti del periodo mostrato, per giorni (default), categorie o importo. Blocco dei Resoconti. */
export function PeriodMovements({ from, to, accountId, scopeAccountId }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const accounts = useAccounts();
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const [sort, setSort] = usePersistentState<MovementsSort>(
    'reports.movementsSort',
    'day',
    oneOf(SORTS),
  );
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const raw = useLiveQuery(() => transactionsRepo.inRange(from ?? '0000-01-01', to), [from, to]);
  const items = useMemo(
    () =>
      raw
        ? movementItems(filterByAccount(raw, accountId), sort, (id) => lookup.label(id))
        : undefined,
    [raw, accountId, sort, lookup],
  );
  const total = items?.filter((i) => i.kind === 'tx').length ?? 0;
  const visible = items ? takeMovements(items, shown) : [];

  return (
    <section className="card space-y-3" aria-label={t('reports.movements.title')}>
      <SectionTitle
        title={t('reports.movements.title')}
        subtitle={t('reports.movements.count', { count: total })}
      />
      <div role="group" aria-label={t('reports.movements.sortBy')} className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button
            key={s}
            aria-pressed={sort === s}
            className={`chip ${sort === s ? 'chip-on' : ''}`}
            onClick={() => {
              setSort(s);
              setShown(PAGE);
            }}
          >
            {t(`reports.movements.sort.${s}`)}
          </button>
        ))}
      </div>
      {items && total === 0 && <p className="text-[14px] text-muted">{t('reports.noData')}</p>}
      <ul className="space-y-2">
        {visible.map((it) =>
          it.kind === 'header' ? (
            <li
              key={`h-${it.key}`}
              className="flex items-baseline justify-between gap-3 pt-2 text-[13px] font-semibold text-muted"
            >
              <span className="capitalize">
                {it.date
                  ? f.dayHeader(it.date)
                  : it.key === '__transfer'
                    ? t('tx.transfer')
                    : `${(it.categoryId && lookup.byId.get(it.categoryId)?.icon) || '❔'} ${lookup.label(it.categoryId ?? null)}`}
              </span>
              <Amount cents={it.totalCents} className="text-[13px]" />
            </li>
          ) : (
            <li key={it.tx.id}>
              <TransactionRow
                tx={it.tx}
                category={it.tx.categoryId ? lookup.byId.get(it.tx.categoryId) : undefined}
                categoryLabel={lookup.label(it.tx.categoryId)}
                account={accountById.get(it.tx.accountId)}
                onOpen={setEditing}
              />
            </li>
          ),
        )}
      </ul>
      {items && total > shown && (
        <button className="btn-secondary w-full" onClick={() => setShown((n) => n + PAGE)}>
          {t('reports.showMore', { count: Math.min(PAGE, total - shown) })}
        </button>
      )}
      <Link
        className="btn-secondary w-full text-center"
        to={movementsLink({ accountId: scopeAccountId, from, to })}
      >
        {t('reports.movements.filter')}
      </Link>
      {editing && <TransactionSheet tx={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
