import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Sheet } from '@/components/Sheet';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { recurrencesRepo } from '@/db/repositories';
import { autoRegisterDue, createRecurrence } from '@/db/recurrenceService';
import { FREQUENCIES } from '@/domain/recurrence';
import type { Frequency, Recurrence } from '@/domain/types';
import { todayIso } from '@/lib/dates';
import { centsToPlain, parseUserAmount } from '@/lib/money';
import { AmountInput } from '@/components/AmountInput';

/** Crea o modifica una ricorrenza (le sue regole, non i movimenti già registrati). */
export function RecurrenceSheet({
  recurrence,
  onClose,
}: {
  recurrence?: Recurrence;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const lookup = useCategoryLookup();
  const [title, setTitle] = useState(recurrence?.title ?? '');
  const [income, setIncome] = useState((recurrence?.amountCents ?? -1) > 0);
  const [amount, setAmount] = useState(
    recurrence ? centsToPlain(Math.abs(recurrence.amountCents)).replace('.', ',') : '',
  );
  const [accountId, setAccountId] = useState(recurrence?.accountId ?? accounts[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(recurrence?.categoryId ?? null);
  const [frequency, setFrequency] = useState<Frequency>(recurrence?.frequency ?? 'monthly');
  const [nextDue, setNextDue] = useState(recurrence?.nextDue ?? todayIso());
  const [remind, setRemind] = useState(recurrence?.remind ?? true);
  const [active, setActive] = useState(recurrence?.active ?? true);
  const [error, setError] = useState(false);

  const account = accounts.some((a) => a.id === accountId) ? accountId : (accounts[0]?.id ?? '');

  async function save(): Promise<void> {
    const cents = parseUserAmount(amount);
    if (cents === null || !title.trim() || !account) return setError(true);
    const signed = income ? cents : -cents;
    const category = categoryId ?? (income ? 'otherIncome' : 'other');
    if (recurrence) {
      await recurrencesRepo.put({
        ...recurrence,
        title: title.trim(),
        amountCents: signed,
        accountId: account,
        categoryId: category,
        frequency,
        nextDue,
        anchorDay:
          nextDue === recurrence.nextDue ? recurrence.anchorDay : Number(nextDue.slice(8, 10)),
        remind,
        active,
      });
    } else {
      await createRecurrence({
        title,
        amountCents: signed,
        accountId: account,
        categoryId: category,
        frequency,
        nextDue,
        remind,
      });
    }
    await autoRegisterDue(todayIso()); // se ha già scadenze passate e niente avviso, si registrano subito
    onClose();
  }

  async function remove(): Promise<void> {
    if (!recurrence) return;
    if (!window.confirm(t('recurrence.deleteConfirm', { title: recurrence.title }))) return;
    await recurrencesRepo.remove(recurrence.id);
    onClose();
  }

  return (
    <Sheet title={recurrence ? t('common.edit') : t('recurrence.add')} onClose={onClose}>
      <div>
        <label className="label" htmlFor="r-title">
          {t('recurrence.name')}
        </label>
        <input
          id="r-title"
          className="input"
          autoFocus={!recurrence}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div role="group" aria-label={t('tx.type')} className="grid grid-cols-2 gap-2">
        {([false, true] as const).map((isIncome) => (
          <button
            key={String(isIncome)}
            type="button"
            aria-pressed={income === isIncome}
            onClick={() => setIncome(isIncome)}
            className={`chip justify-center ${income === isIncome ? 'chip-on' : ''}`}
          >
            {t(isIncome ? 'common.income' : 'common.expenses')}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="r-amount">
          {t('common.amount')}
        </label>
        <AmountInput
          id="r-amount"
          className="input tabular"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(false);
          }}
        />
        {error && (
          <p role="alert" className="mt-1 text-[13px] text-expense">
            {t('errors.invalidAmount')}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="r-freq">
            {t('recurrence.repeat')}
          </label>
          <select
            id="r-freq"
            className="input"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as Frequency)}
          >
            {FREQUENCIES.map((fr) => (
              <option key={fr} value={fr}>
                {t(`recurrence.freq.${fr}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="r-due">
            {t('recurrence.nextDue')}
          </label>
          <input
            id="r-due"
            type="date"
            className="input min-w-0"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="r-account">
          {t('common.account')}
        </label>
        <select
          id="r-account"
          className="input"
          value={account}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="label">{t('common.category')}</span>
        <CategoryPicker
          lookup={lookup}
          value={categoryId}
          onChange={setCategoryId}
          kind={income ? 'income' : 'expense'}
        />
      </div>
      <label className="flex min-h-[44px] items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 accent-[rgb(var(--accent))]"
          checked={remind}
          onChange={(e) => setRemind(e.target.checked)}
        />
        <span>
          <span className="block">{t('recurrence.remind')}</span>
          <span className="block text-[12px] text-muted">{t('recurrence.remindHint')}</span>
        </span>
      </label>
      {recurrence && (
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--accent))]"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {t('recurrence.active')}
        </label>
      )}
      <div className="flex gap-2 pt-1">
        {recurrence && (
          <button className="btn-danger" onClick={() => void remove()}>
            {t('common.delete')}
          </button>
        )}
        <button className="btn-primary flex-1" onClick={() => void save()}>
          {t('common.save')}
        </button>
      </div>
    </Sheet>
  );
}
