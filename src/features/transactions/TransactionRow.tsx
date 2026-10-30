import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { IconTile } from '@/components/ui';
import type { Account, Category, Transaction } from '@/domain/types';

interface Props {
  tx: Transaction;
  category?: Category;
  categoryLabel: string;
  account?: Account;
  onOpen?: (tx: Transaction) => void;
}

/** Riga-scheda di un movimento: icona, descrizione, «Categoria · Conto» e importo con segno. */
export const TransactionRow = memo(function TransactionRow({
  tx,
  category,
  categoryLabel,
  account,
  onOpen,
}: Props) {
  const { t } = useTranslation();
  const income = tx.amountCents > 0 && !tx.isTransfer;
  const body = (
    <>
      <IconTile accent={income}>
        <span className={income ? '' : 'opacity-80 grayscale'}>
          {tx.isTransfer ? '↔️' : (category?.icon ?? '❔')}
        </span>
      </IconTile>
      <span className="min-w-0 flex-1 text-left">
        <span className="line-clamp-2 break-words text-[15px] font-medium leading-tight">
          {tx.note || tx.description || categoryLabel}
        </span>
        <span className="line-clamp-1 text-[13px] text-muted">
          {tx.isTransfer ? t('tx.transfer') : categoryLabel}
          {account ? ` · ${account.name}` : ''}
        </span>
      </span>
      <Amount cents={tx.amountCents} neutral={tx.isTransfer} className="text-[17px]" />
    </>
  );
  const cls = 'card-row flex min-h-[64px] w-full items-center gap-3 p-3.5';
  return onOpen ? (
    <button className={cls} onClick={() => onOpen(tx)}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
});
