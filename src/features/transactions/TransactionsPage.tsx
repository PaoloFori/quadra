import { useDeferredValue, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { Screen } from '@/components/Screen';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import {
  EMPTY_FILTER,
  filterTransactions,
  isFilterActive,
  type TransactionFilter,
} from '@/domain/filters';
import type { Transaction } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';
import { filterFromParams } from './movementsLink';
import { HistoryView } from './HistoryView';
import { FilterSheet } from './FilterSheet';
import { TransactionRow } from './TransactionRow';
import { TransactionSheet } from './TransactionSheet';

const ROW_HEIGHT = 74;

/** Si rimonta quando cambiano i parametri dell'indirizzo, così i filtri arrivano dai link di Home e Resoconti. */
export default function TransactionsPage() {
  const [params] = useSearchParams();
  return <TransactionsView key={params.toString()} initial={filterFromParams(params)} />;
}

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
  const total = useMemo(
    () => rows.reduce((sum, r) => (r.isTransfer ? sum : sum + r.amountCents), 0),
    [rows],
  );
  const active = isFilterActive(filter);
  const chips: Array<[string, string]> = [];
  if (filter.categoryId !== undefined)
    chips.push(['categoryId', categories.label(filter.categoryId)]);
  if (filter.type)
    chips.push(['type', t(filter.type === 'income' ? 'common.income' : 'common.expenses')]);
  if (filter.accountId) chips.push(['accountId', accountById.get(filter.accountId)?.name ?? '']);
  if (filter.from || filter.to)
    chips.push([
      'period',
      `${filter.from ? f.date(filter.from) : '…'} – ${filter.to ? f.date(filter.to) : '…'}`,
    ]);

  const listRef = useRef<HTMLDivElement>(null);
  const [listTop, setListTop] = useState(0);
  const hasRows = rows.length > 0;
  useLayoutEffect(() => setListTop(listRef.current?.offsetTop ?? 0), [hasRows]);
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    scrollMargin: listTop,
  });

  return (
    <Screen
      title={t('nav.transactions')}
      action={
        <div className="flex gap-2">
          <Link to="/import" className="btn-secondary">
            {t('import.action')}
          </Link>
          <button
            className="btn-primary !min-w-[44px] !px-3 text-xl"
            aria-label={t('tx.add')}
            onClick={() => setEditing('new')}
          >
            +
          </button>
        </div>
      }
    >
      <div
        role="group"
        aria-label={t('nav.transactions')}
        className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1"
      >
        {(['list', 'history'] as const).map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`min-h-[40px] rounded-lg text-[15px] font-semibold ${view === v ? 'bg-card shadow-sm' : 'text-muted'}`}
          >
            {t(`history.${v === 'list' ? 'list' : 'tab'}`)}
          </button>
        ))}
      </div>

      {view === 'history' && (
        <HistoryView
          transactions={transactions ?? []}
          onPickCategory={(categoryId) => {
            setFilter({ ...EMPTY_FILTER, categoryId });
            setView('list');
          }}
        />
      )}

      <div className="mb-3 flex gap-2" hidden={view !== 'list'}>
        <input
          type="search"
          className="input"
          placeholder={t('tx.search')}
          aria-label={t('tx.search')}
          value={filter.text}
          onChange={(e) => setFilter({ ...filter, text: e.target.value })}
        />
        <button
          className={active ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setFiltersOpen(true)}
        >
          {t('tx.filters')}
        </button>
      </div>

      {view === 'list' && (
        <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4">
          {chips.map(([key, label]) => (
            <button
              key={key}
              className="chip shrink-0 bg-accent/15 text-accent"
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
      )}

      {view === 'list' && active && (
        <p className="mb-2 flex items-center justify-between px-1 text-[13px] text-muted">
          <span>{t('tx.results', { count: rows.length })}</span>
          <Amount cents={total} />
        </p>
      )}
      {view === 'list' && transactions && rows.length === 0 && (
        <p className="card text-muted">{active ? t('tx.noResults') : t('home.empty')}</p>
      )}
      <div ref={listRef} className="card !p-2" hidden={!hasRows || view !== 'list'}>
        <ul style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => {
            const tx = rows[item.index]!;
            return (
              <li
                key={tx.id}
                className="absolute inset-x-0 border-b border-line/60"
                style={{
                  height: item.size,
                  transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <TransactionRow
                  tx={tx}
                  category={tx.categoryId ? categories.byId.get(tx.categoryId) : undefined}
                  categoryLabel={categories.label(tx.categoryId)}
                  account={accountById.get(tx.accountId)}
                  onOpen={setEditing}
                />
              </li>
            );
          })}
        </ul>
      </div>

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
