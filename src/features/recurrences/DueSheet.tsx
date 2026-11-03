import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { registerOccurrence, skipOccurrence } from '@/db/recurrenceService';
import type { IsoDate, Recurrence } from '@/domain/types';
import { useFormat } from '@/i18n/useFormat';
import { todayIso } from '@/lib/dates';
import { centsToPlain, parseUserAmount } from '@/lib/money';

/** Conferma una scadenza: importo e data si possono cambiare, ma solo per questa volta. */
export function DueSheet({
  recurrence,
  dueDate,
  onClose,
}: {
  recurrence: Recurrence;
  dueDate: IsoDate;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const income = recurrence.amountCents > 0;
  const [amount, setAmount] = useState(
    centsToPlain(Math.abs(recurrence.amountCents)).replace('.', ','),
  );
  const [date, setDate] = useState(dueDate <= todayIso() ? dueDate : todayIso());
  const [error, setError] = useState(false);

  async function register(): Promise<void> {
    const cents = parseUserAmount(amount);
    if (cents === null) return setError(true);
    await registerOccurrence(recurrence, {
      dueDate,
      date,
      amountCents: income ? cents : -cents,
    });
    onClose();
  }

  async function skip(): Promise<void> {
    await skipOccurrence(recurrence, dueDate);
    onClose();
  }

  return (
    <Sheet title={recurrence.title} onClose={onClose}>
      <p className="text-[14px] text-muted">
        {t(income ? 'recurrence.income' : 'recurrence.expense')} · {f.dateLong(dueDate)}
      </p>
      <div>
        <label className="label" htmlFor="due-amount">
          {t('common.amount')}
        </label>
        <input
          id="due-amount"
          className="input tabular"
          inputMode="decimal"
          autoFocus
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
        <p className="mt-1 text-[12px] text-muted">
          {t('recurrence.usual', { amount: f.currency(Math.abs(recurrence.amountCents)) })} ·{' '}
          {t('recurrence.onlyThis')}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="due-date">
          {t('common.date')}
        </label>
        <input
          id="due-date"
          type="date"
          className="input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button className="btn-secondary" onClick={() => void skip()}>
          {t('recurrence.skip')}
        </button>
        <button className="btn-primary flex-1" onClick={() => void register()}>
          {t('recurrence.register')}
        </button>
      </div>
    </Sheet>
  );
}
