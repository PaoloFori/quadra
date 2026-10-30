import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/i18n/useFormat';
import { Amount } from '@/components/Amount';
import { Sheet } from '@/components/Sheet';
import { getAccountBalances, setAccountBalance } from '@/db/accountService';
import type { AccountBalance } from '@/domain/balances';
import { centsToPlain, parseSignedAmount } from '@/lib/money';
import { AccountSheet } from './AccountSheet';

function BalancesSheet({ balances, onClose }: { balances: AccountBalance[]; onClose: () => void }) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      balances.map((b) => [b.account.id, centsToPlain(b.balanceCents).replace('.', ',')]),
    ),
  );
  const [invalid, setInvalid] = useState<string | null>(null);

  async function save(): Promise<void> {
    const parsed = balances.map(
      (b) => [b.account.id, parseSignedAmount(values[b.account.id] ?? '')] as const,
    );
    const bad = parsed.find(([, v]) => v === null);
    if (bad) return setInvalid(bad[0]);
    for (const [id, cents] of parsed) await setAccountBalance(id, cents!);
    onClose();
  }

  return (
    <Sheet title={t('balances.set')} onClose={onClose}>
      <p className="text-[13px] text-muted">{t('balances.hint')}</p>
      {balances.map(({ account }) => (
        <div key={account.id}>
          <label className="label" htmlFor={`bal-${account.id}`}>
            {account.name}
          </label>
          <input
            id={`bal-${account.id}`}
            className="input tabular"
            inputMode="decimal"
            value={values[account.id] ?? ''}
            onChange={(e) => {
              setValues({ ...values, [account.id]: e.target.value });
              setInvalid(null);
            }}
          />
          {invalid === account.id && (
            <p role="alert" className="mt-1 text-[13px] text-expense">
              {t('errors.invalidAmount')}
            </p>
          )}
        </div>
      ))}
      <button className="btn-primary w-full" onClick={() => void save()}>
        {t('common.save')}
      </button>
    </Sheet>
  );
}

/** Quanti soldi hai su ciascun conto + totale; un tap per aggiornare i saldi. */
export function BalancesCard() {
  const { t } = useTranslation();
  const f = useFormat();
  const balances = useLiveQuery(getAccountBalances, []);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  if (!balances) return null;
  const total = balances.reduce((s, b) => s + b.balanceCents, 0);

  return (
    <>
      <section className="hero space-y-1" aria-label={t('balances.title')}>
        <p className="label-caps !text-on-accent">{t('home.liquidity')}</p>
        <p className="tabular font-display text-[40px] font-medium leading-[44px] tracking-[-0.04em]">
          {f.currency(total)}
        </p>
      </section>
      <section className="card space-y-1" aria-label={t('balances.title')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{t('balances.title')}</h2>
          <div className="flex gap-2">
            <button
              className="btn-secondary !min-h-[40px] !px-3 !text-[14px]"
              onClick={() => setAdding(true)}
            >
              {t('balances.add')}
            </button>
            {balances.length > 0 && (
              <button
                className="btn-secondary !min-h-[40px] !px-3 !text-[14px]"
                onClick={() => setOpen(true)}
              >
                {t('balances.set')}
              </button>
            )}
          </div>
        </div>
        {balances.length === 0 && <p className="py-2 text-muted">{t('balances.empty')}</p>}
        <ul>
          {balances.map(({ account, balanceCents }) => (
            <li
              key={account.id}
              className="flex min-h-[48px] items-center justify-between border-t border-line first:border-0"
            >
              <span className="text-muted">{account.name}</span>
              <Amount cents={balanceCents} signed={false} neutral className="text-[17px]" />
            </li>
          ))}
        </ul>
      </section>
      {adding && <AccountSheet onClose={() => setAdding(false)} />}
      {open && <BalancesSheet balances={balances} onClose={() => setOpen(false)} />}
    </>
  );
}
