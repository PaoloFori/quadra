import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { useAccounts } from '@/db/hooks';
import { accountsRepo, newId } from '@/db/repositories';
import type { Account, BankKind } from '@/domain/types';

function AccountSheet({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(account?.name ?? '');
  const [bank, setBank] = useState<BankKind>(account?.bank ?? 'other');

  async function save(): Promise<void> {
    if (!name.trim()) return;
    await accountsRepo.put({ id: account?.id ?? newId(), name: name.trim(), bank });
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
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="a-bank">
          {t('accounts.bank')}
        </label>
        <select
          id="a-bank"
          className="input"
          value={bank}
          onChange={(e) => setBank(e.target.value as BankKind)}
        >
          <option value="bbva">BBVA</option>
          <option value="intesa">Intesa Sanpaolo</option>
          <option value="other">{t('accounts.otherBank')}</option>
        </select>
      </div>
      <button className="btn-primary w-full" disabled={!name.trim()} onClick={() => void save()}>
        {t('common.save')}
      </button>
    </Sheet>
  );
}

export default function AccountsPage() {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Account | 'new' | null>(null);

  return (
    <Screen
      title={t('accounts.title')}
      action={
        <button className="btn-primary" onClick={() => setEditing('new')}>
          {t('accounts.add')}
        </button>
      }
    >
      <Link to="/settings" className="mb-2 inline-flex min-h-[44px] items-center text-accent">
        ‹ {t('settings.title')}
      </Link>
      <ul className="card !p-2">
        {accounts.map((a) => (
          <li key={a.id} className="border-b border-line/60 last:border-0">
            <button
              className="flex min-h-[48px] w-full items-center justify-between px-1"
              onClick={() => setEditing(a)}
            >
              <span>{a.name}</span>
              <span className="text-muted">›</span>
            </button>
          </li>
        ))}
      </ul>
      {editing && (
        <AccountSheet
          account={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
