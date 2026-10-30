import { useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { Screen } from '@/components/Screen';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { filterTransactions, isFilterActive, type TransactionFilter } from '@/domain/filters';
import type { IsoDate, Transaction } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';
import { filterFromParams } from './movementsLink';
import { HistoryView } from './HistoryView';
import { FilterSheet } from './FilterSheet';
import { TransactionRow } from './TransactionRow';
import { TransactionSheet } from './TransactionSheet';

interface DayItem {
  kind: 'day';
  date: IsoDate;
  totalCents: number;
}
type Item = DayItem | { kind: 'tx'; tx: Transaction };

/** Righe in ordine di data, con un'intestazione (e il totale) per ogni giorno. */
function withDayHeaders(rows: readonly Transaction[]): Item[] {
  const sorted = [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt,
  );
  const items: Item[] = [];
  let day: DayItem | undefined;
  for (const tx of sorted) {
    if (!day || day.date !== tx.date) {
      day = { kind: 'day', date: tx.date, totalCents: 0 };
      items.push(day);
    }
    if (!tx.isTransfer) day.totalCents += tx.amountCents;
    items.push({ kind: 'tx', tx });
  }
  return items;
}

/** Si rimonta quando cambiano i parametri dell'indirizzo, così i filtri arrivano dai link di Home e Resoconti. */
export default function TransactionsPage() {
  const [params] = useSearchParams();
  return <TransactionsView key={params.toString()} initial={filterFromParams(params)} />;
}

const TYPES = [undefined, 'income', 'expense'] as const;

function TransactionsView({ initial }: { initial: TransactionFilter }) {
  const { t } = useTranslation();
  const f = useFormat();
  const transactions = useLiveQuery(transactionsRepo.all, []);
  const accounts = useAccounts();
  const categories = useCategoryLookup();
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const [filter, setFilter] = useState<TransactionFilter>(initial);
  const deferredFilter = useDeferredValue(filter);
  const [view, setView] = useState<'list' | 'history'>('list');
  const [editing, setEditing] = useState<Transaction | 'new' | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const rows = useMemo(
    () => filterTransactions(transactions ?? [], deferredFilter),
    [transactions, deferredFilter],
  );
  const items = useMemo(() => withDayHeaders(rows), [rows]);
  const total = useMemo(
    () => rows.reduce((sum, r) => (r.isTransfer ? sum : sum + r.amountCents), 0),
    [rows],
  );
  const active = isFilterActive(filter);

  // filtri attivi tolti con un tocco (il tipo ha i suoi chip fissi)
  const chips: Array<[string, string]> = [];
  if (filter.categoryId !== undefined)
    chips.push(['categoryId', categories.label(filter.categoryId)]);
  if (filter.accountId) chips.push(['accountId', accountById.get(filter.accountId)?.name ?? '']);
  if (filter.from || filter.to)
    chips.push([
      'period',
      `${filter.from ? f.date(filter.from) : '…'} – ${filter.to ? f.date(filter.to) : '…'}`,
    ]);

  const listRef = useRef<HTMLDivElement>(null);
  const [listTop, setListTop] = useState(0);
  const hasRows = rows.length > 0;
  useLayoutEffect(() => setListTop(listRef.current?.offsetTop ?? 0), [hasRows, chips.length]);
  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: (i) => (items[i]?.kind === 'day' ? 44 : 80),
    overscan: 12,
    scrollMargin: listTop,
  });

  return (
    <Screen
      title={t('nav.transactions')}
      subtitle={t('tx.subtitle')}
      action={
        <button
          className="btn-primary !min-h-[44px] !rounded-full"
          aria-label={t('tx.add')}
          onClick={() => setEditing('new')}
        >
          + {t('home.newTx')}
        </button>
      }
    >
      <div className="flex gap-2" role="group" aria-label={t('nav.transactions')}>
        {(['list', 'history'] as const).map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`chip ${view === v ? 'chip-on' : ''}`}
          >
            {t(`history.${v === 'list' ? 'list' : 'tab'}`)}
          </button>
        ))}
        <Link to="/import" className="chip ml-auto">
          {t('import.action')}
        </Link>
      </div>

      {view === 'history' && (
        <HistoryView
          transactions={transactions ?? []}
          onPickCategory={(categoryId) => {
            setFilter({ text: '', categoryId });
            setView('list');
          }}
        />
      )}

      {view === 'list' && (
        <>
          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              className="input !pl-11 !pr-14"
              placeholder={t('tx.search')}
              aria-label={t('tx.search')}
              value={filter.text}
              onChange={(e) => setFilter({ ...filter, text: e.target.value })}
            />
            <button
              className={`absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl ${active ? 'bg-accent text-on-accent' : 'text-muted'}`}
              aria-label={t('tx.filters')}
              onClick={() => setFiltersOpen(true)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                <circle cx="16" cy="7" r="2" />
                <circle cx="8" cy="17" r="2" />
              </svg>
            </button>
          </div>

          <div className="-mx-6 flex gap-2 overflow-x-auto px-6">
            {TYPES.map((type) => (
              <button
                key={type ?? 'all'}
                aria-pressed={filter.type === type}
                onClick={() => setFilter({ ...filter, type })}
                className={`chip ${filter.type === type ? 'chip-on' : ''}`}
              >
                {t(
                  type === 'income'
                    ? 'common.income'
                    : type === 'expense'
                      ? 'common.expenses'
                      : 'tx.allTypes',
                )}
              </button>
            ))}
            {chips.map(([key, label]) => (
              <button
                key={key}
                className="chip chip-on"
                aria-label={`${t('tx.removeFilter')}: ${label}`}
                onClick={() =>
                  setFilter(
                    key === 'period'
                      ? { ...filter, from: undefined, to: undefined }
                      : { ...filter, [key]: undefined },
                  )
                }
              >
                {label} ✕
              </button>
            ))}
          </div>

          {active && (
            <p className="flex items-center justify-between px-1 text-[13px] text-muted">
              <span>{t('tx.results', { count: rows.length })}</span>
              <Amount cents={total} className="text-[15px]" />
            </p>
          )}
          {transactions && rows.length === 0 && (
            <p className="card text-muted">{active ? t('tx.noResults') : t('home.empty')}</p>
          )}
          <div ref={listRef} hidden={!hasRows}>
            <ul style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((v) => {
                const item = items[v.index]!;
                return (
                  <li
                    key={item.kind === 'day' ? `d${item.date}` : item.tx.id}
                    ref={virtualizer.measureElement}
                    data-index={v.index}
                    className="absolute inset-x-0 top-0"
                    style={{
                      transform: `translateY(${v.start - virtualizer.options.scrollMargin}px)`,
                    }}
                  >
                    {item.kind === 'day' ? (
                      <div className="flex items-baseline justify-between px-1 pb-2 pt-4">
                        <span className="label-caps">{f.dayHeader(item.date)}</span>
                        <Amount
                          cents={item.totalCents}
                          neutral
                          className="!text-[13px] !text-faint"
                        />
                      </div>
                    ) : (
                      <div className="pb-2">
                        <TransactionRow
                          tx={item.tx}
                          category={
                            item.tx.categoryId ? categories.byId.get(item.tx.categoryId) : undefined
                          }
                          categoryLabel={categories.label(item.tx.categoryId)}
                          account={accountById.get(item.tx.accountId)}
                          onOpen={setEditing}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {editing && (
        <TransactionSheet
          tx={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {filtersOpen && (
        <FilterSheet value={filter} onApply={setFilter} onClose={() => setFiltersOpen(false)} />
      )}
    </Screen>
  );
}
