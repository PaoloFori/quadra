import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { TransactionRow } from './TransactionRow';

const ROW_HEIGHT = 57;

export default function TransactionsPage() {
  const { t } = useTranslation();
  const transactions = useLiveQuery(transactionsRepo.all, []);
  const accounts = useAccounts();
  const categories = useCategoryLookup();
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const listRef = useRef<HTMLDivElement>(null);
  const [listTop, setListTop] = useState(0);

  const rows = transactions ?? [];
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
        <Link to="/import" className="btn-secondary">
          {t('import.action')}
        </Link>
      }
    >
      {transactions && rows.length === 0 && <p className="card text-muted">{t('home.empty')}</p>}
      <div ref={listRef} className="card !p-2" hidden={rows.length === 0}>
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
                />
              </li>
            );
          })}
        </ul>
      </div>
    </Screen>
  );
}
