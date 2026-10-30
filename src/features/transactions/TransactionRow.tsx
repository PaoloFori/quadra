import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { useFormat } from '@/i18n/useFormat';
import type { Account, Category, Transaction } from '@/domain/types';

interface Props {
  tx: Transaction;
  category?: Category;
  categoryLabel: string;
  account?: Account;
  onOpen?: (tx: Transaction) => void;
}

export const TransactionRow = memo(function TransactionRow({
  tx,
  category,
  categoryLabel,
  account,
  onOpen,
}: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const body = (
    <>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
        style={{ backgroundColor: `${category?.color ?? '#98989d'}33` }}
      >
        {tx.isTransfer ? '↔️' : (category?.icon ?? '❔')}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="line-clamp-1 text-[15px] font-medium">
          {tx.description || categoryLabel}
        </span>
        <span className="line-clamp-1 text-[13px] text-muted">
          {f.date(tx.date)} · {account?.name ?? tx.accountId} ·{' '}
          {tx.isTransfer ? t('tx.transfer') : categoryLabel}
        </span>
      </span>
      <Amount
        cents={tx.amountCents}
        neutral={tx.isTransfer}
        className="text-[15px] font-semibold"
      />
    </>
  );
  const cls = 'flex min-h-[56px] w-full items-center gap-3 px-1 py-2';
  return onOpen ? (
    <button className={cls} onClick={() => onOpen(tx)}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
});
