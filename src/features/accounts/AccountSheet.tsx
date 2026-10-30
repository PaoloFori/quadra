import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { db } from '@/db/database';
import { accountsRepo, newId } from '@/db/repositories';
import type { Account } from '@/domain/types';

/** Crea o modifica un conto; un conto con movimenti non si può eliminare. */
export function AccountSheet({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(account?.name ?? '');
  const [blocked, setBlocked] = useState<number | null>(null);

  async function save(): Promise<void> {
    if (!name.trim()) return;
    await accountsRepo.put({
      ...account,
      id: account?.id ?? newId(),
      name: name.trim(),
      bank: account?.bank ?? 'other',
    });
    onClose();
  }

  async function remove(): Promise<void> {
    if (!account) return;
    const count = await db.transactions.where('accountId').equals(account.id).count();
    if (count > 0) return setBlocked(count);
    if (!window.confirm(t('accounts.deleteConfirm', { name: account.name }))) return;
    await accountsRepo.remove(account.id);
    onClose();
  }

  return (
    <Sheet title={account ? t('common.edit') : t('accounts.add')} onClose={onClose}>
      <div>
        <label className="label" htmlFor="a-name">
          {t('accounts.name')}
        </label>
        <input
          id="a-name"
          className="input"
          autoFocus
          placeholder={t('accounts.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      {blocked !== null && (
        <p role="alert" className="text-[13px] text-expense">
          {t('accounts.hasMovements', { count: blocked })}
        </p>
      )}
      <div className="flex gap-2">
        {account && (
          <button className="btn-danger" onClick={() => void remove()}>
            {t('common.delete')}
          </button>
        )}
        <button className="btn-primary flex-1" disabled={!name.trim()} onClick={() => void save()}>
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  );
}
