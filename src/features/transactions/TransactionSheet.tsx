import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Sheet } from '@/components/Sheet';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { rulesRepo } from '@/db/repositories';
import {
  addManualTransaction,
  deleteTransaction,
  recategorize,
  setTransfer,
  updateTransaction,
} from '@/db/transactionService';
import { similarTransactions } from '@/domain/history';
import { Amount } from '@/components/Amount';
import { transactionsRepo } from '@/db/repositories';
import { matchCategory } from '@/domain/rules';
import type { Transaction } from '@/domain/types';
import { todayIso } from '@/lib/dates';
import { centsToPlain, parseUserAmount } from '@/lib/money';
import { useFormat } from '@/i18n/useFormat';

const LAST_ACCOUNT_KEY = 'quadra.lastAccount';

function rememberedAccount(): string | undefined {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

interface Props {
  /** Se presente, modifica quel movimento; altrimenti ne crea uno nuovo. */
  tx?: Transaction;
  onClose: () => void;
}

export function TransactionSheet({ tx, onClose }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const accounts = useAccounts();
  const lookup = useCategoryLookup();
  const rules = useLiveQuery(rulesRepo.all, [], []);

  const [income, setIncome] = useState((tx?.amountCents ?? -1) > 0);
  const [amount, setAmount] = useState(
    tx ? centsToPlain(Math.abs(tx.amountCents)).replace('.', ',') : '',
  );
  const [categoryId, setCategoryId] = useState<string | null>(tx?.categoryId ?? null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [description, setDescription] = useState(tx?.description ?? '');
  const [note, setNote] = useState(tx?.note ?? '');
  const [date, setDate] = useState(tx?.date ?? todayIso());
  const [accountId, setAccountId] = useState(tx?.accountId ?? rememberedAccount() ?? '');
  const [applySimilar, setApplySimilar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const all = useLiveQuery(() => (tx ? transactionsRepo.all() : Promise.resolve([])), [tx?.id], []);
  const similar = useMemo(() => (tx ? similarTransactions(all, tx) : []), [all, tx]);
  const effectiveAccount = accounts.some((a) => a.id === accountId)
    ? accountId
    : (accounts[0]?.id ?? '');
  const suggested = useMemo(() => (note ? matchCategory(note, rules) : null), [note, rules]);
  const shownCategory = categoryTouched || categoryId ? categoryId : suggested;
  const categoryChanged = !!tx && shownCategory !== tx.categoryId && shownCategory !== null;

  async function save(): Promise<void> {
    const cents = parseUserAmount(amount);
    if (cents === null) return setError(t('errors.invalidAmount'));
    setSaving(true);
    try {
      const signed = income ? cents : -cents;
      if (tx) {
        if (categoryChanged) await recategorize(tx, shownCategory!, applySimilar);
        await updateTransaction(tx.id, {
          accountId: effectiveAccount,
          date,
          amountCents: signed,
          categoryId: shownCategory,
          note,
        });
      } else {
        await addManualTransaction({
          accountId: effectiveAccount,
          date,
          amountCents: signed,
          categoryId: shownCategory,
          note,
        });
      }
      try {
        localStorage.setItem(LAST_ACCOUNT_KEY, effectiveAccount);
      } catch {
        /* preferenza non essenziale */
      }
      onClose();
    } catch (e) {
      console.error(e);
      setError(t('errors.generic'));
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    if (tx && window.confirm(t('tx.confirmDelete'))) {
      await deleteTransaction(tx.id);
      onClose();
    }
  }

  return (
    <Sheet title={tx ? t('tx.edit') : t('tx.add')} onClose={onClose}>
      <div
        role="group"
        aria-label={t('tx.type')}
        className="grid grid-cols-2 gap-1 rounded-xl bg-line/60 p-1"
      >
        {([false, true] as const).map((isIncome) => (
          <button
            key={String(isIncome)}
            type="button"
            aria-pressed={income === isIncome}
            onClick={() => setIncome(isIncome)}
            className={`min-h-[40px] rounded-lg text-[15px] font-semibold ${income === isIncome ? 'bg-card shadow-sm' : 'text-muted'}`}
          >
            {isIncome ? t('common.income') : t('common.expenses')}
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="tx-amount">
          {t('common.amount')}
        </label>
        <input
          id="tx-amount"
          className="input tabular !text-2xl font-bold"
          inputMode="decimal"
          autoFocus={!tx}
          placeholder="0,00"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
        />
        {error && (
          <p role="alert" className="mt-1 text-[13px] text-expense">
            {error}
          </p>
        )}
      </div>

      <CategoryPicker
        lookup={lookup}
        kind={income ? 'income' : 'expense'}
        value={shownCategory}
        onChange={(id) => {
          setCategoryId(id);
          setCategoryTouched(true);
        }}
      />
      {categoryChanged && (
        <label className="flex min-h-[44px] items-center gap-3 text-[14px]">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={applySimilar}
            onChange={(e) => setApplySimilar(e.target.checked)}
          />
          {t('tx.applySimilar')}
        </label>
      )}

      {tx?.source === 'import' && (
        <div>
          <label className="label" htmlFor="tx-desc">
            {t('tx.description')}
          </label>
          <input
            id="tx-desc"
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      )}
      <div>
        <label className="label" htmlFor="tx-note">
          {t('common.note')}
        </label>
        <input
          id="tx-note"
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="tx-date">
            {t('common.date')}
          </label>
          <input
            id="tx-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="tx-account">
            {t('common.account')}
          </label>
          <select
            id="tx-account"
            className="input"
            value={effectiveAccount}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tx && (
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={tx.isTransfer}
            onChange={(e) => void setTransfer(tx, e.target.checked).then(onClose)}
          />
          <span>{t('tx.markTransfer')}</span>
        </label>
      )}
      {tx && (
        <section aria-label={t('tx.lastTimes')}>
          <h3 className="label">{t('tx.lastTimes')}</h3>
          {similar.length === 0 ? (
            <p className="text-[13px] text-muted">{t('tx.noSimilar')}</p>
          ) : (
            <ul>
              {similar.map((s) => (
                <li
                  key={s.id}
                  className="flex min-h-[40px] items-center justify-between gap-3 border-b border-line/60 text-[14px] last:border-0"
                >
                  <span className="min-w-0 truncate">
                    {f.date(s.date)} · {s.note || s.description}
                  </span>
                  <Amount cents={s.amountCents} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {tx && (
        <p className="text-[12px] text-muted">{f.dateTime(new Date(tx.createdAt).toISOString())}</p>
      )}

      <div className="flex gap-2 pt-1">
        {tx && (
          <button type="button" className="btn-danger" onClick={() => void remove()}>
            {t('common.delete')}
          </button>
        )}
        <button
          type="button"
          className="btn-primary flex-1"
          disabled={saving}
          onClick={() => void save()}
        >
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  );
}
