import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { useAccounts } from '@/db/hooks';
import type { Account } from '@/domain/types';
import { AccountSheet } from '@/features/accounts/AccountSheet';

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
      <p className="mb-3 px-1 text-[14px] text-muted">{t('accounts.intro')}</p>
      {accounts.length === 0 ? (
        <p className="card text-muted">{t('accounts.empty')}</p>
      ) : (
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
      )}
      {editing && (
        <AccountSheet
          account={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
