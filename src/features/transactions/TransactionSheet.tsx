import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Sheet } from '@/components/Sheet';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { categoriesRepo, newId, recurrencesRepo, rulesRepo } from '@/db/repositories';
import { autoRegisterDue, makeRecurring } from '@/db/recurrenceService';
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
import { findCategoryByName, nextCategoryColor } from '@/domain/categoryMatch';
import { CATEGORY_COLORS } from '@/domain/defaults';
import { FREQUENCIES } from '@/domain/recurrence';
import type { Frequency, Transaction } from '@/domain/types';
import { todayIso } from '@/lib/dates';
import { centsToPlain, parseUserAmount } from '@/lib/money';
import { useFormat } from '@/i18n/useFormat';
import { AmountInput } from '@/components/AmountInput';

const LAST_ACCOUNT_KEY = 'quadra.lastAccount';

/** Telefono o tablet (schermo toccato con il dito): lì si chiude la tastiera da sola. */
function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
}

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
  const [frequency, setFrequency] = useState<Frequency | ''>('');
  const [remind, setRemind] = useState(true);
  const recurrence = useLiveQuery(
    () => (tx?.recurrenceId ? recurrencesRepo.all() : Promise.resolve([])),
    [tx?.recurrenceId],
    [],
  ).find((r) => r.id === tx?.recurrenceId);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);

  const all = useLiveQuery(() => (tx ? transactionsRepo.all() : Promise.resolve([])), [tx?.id], []);
  const similar = useMemo(() => (tx ? similarTransactions(all, tx) : []), [all, tx]);
  const effectiveAccount = accounts.some((a) => a.id === accountId)
    ? accountId
    : (accounts[0]?.id ?? '');
  const suggested = useMemo(() => (note ? matchCategory(note, rules) : null), [note, rules]);
  const shownCategory = categoryTouched || categoryId ? categoryId : suggested;
  const categoryChanged = !!tx && shownCategory !== tx.categoryId && shownCategory !== null;

  /** Nuova categoria dal nome scritto: se esiste già (stesso nome) si usa quella, altrimenti si crea. */
  async function createCategory(): Promise<void> {
    const name = newName.trim();
    if (!name) return;
    const existing = findCategoryByName(lookup.all, lookup.label, name);
    let id: string;
    if (existing) {
      id = existing.id;
      setCategoryNotice(t('categories.alreadyExists', { name: lookup.label(existing.id) }));
    } else {
      id = newId();
      await categoriesRepo.put({
        id,
        builtin: false,
        icon: '🏷️',
        color: nextCategoryColor(
          lookup.all.map((c) => c.color),
          CATEGORY_COLORS,
        ),
        kind: income ? 'income' : 'expense',
        name,
      });
      setCategoryNotice(t('categories.created', { name }));
    }
    setCategoryId(id);
    setCategoryTouched(true);
    setNewName('');
    setCreating(false);
  }

  async function save(): Promise<void> {
    const cents = parseUserAmount(amount);
    if (cents === null) return setError(t('errors.invalidAmount'));
    setSaving(true);
    try {
      const signed = income ? cents : -cents;
      // nessun movimento resta senza categoria (i giroconti non ne hanno)
      const finalCategory =
        shownCategory ?? (tx?.isTransfer ? null : income ? 'otherIncome' : 'other');
      if (tx) {
        if (categoryChanged) await recategorize(tx, shownCategory!, applySimilar);
        await updateTransaction(tx.id, {
          accountId: effectiveAccount,
          date,
          amountCents: signed,
          categoryId: finalCategory,
          note,
          ...(tx.source === 'import' ? { description } : {}),
        });
        if (frequency && !tx.recurrenceId) {
          const updated = await transactionsRepo.get(tx.id);
          if (updated) await makeRecurring(updated, { frequency, remind });
          await autoRegisterDue(todayIso());
        }
      } else {
        const created = await addManualTransaction({
          accountId: effectiveAccount,
          date,
          amountCents: signed,
          categoryId: finalCategory,
          note,
        });
        if (frequency) {
          await makeRecurring(created, { frequency, remind });
          await autoRegisterDue(todayIso());
        }
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

  if (accounts.length === 0) {
    return (
      <Sheet title={t('accounts.needOne')} onClose={onClose}>
        <p className="text-muted">{t('accounts.needOneBody')}</p>
        <Link to="/settings/accounts" className="btn-primary w-full" onClick={onClose}>
          {t('accounts.addFirst')}
        </Link>
      </Sheet>
    );
  }

  return (
    <Sheet title={tx ? t('tx.edit') : t('tx.add')} onClose={onClose}>
      <div role="group" aria-label={t('tx.type')} className="grid grid-cols-2 gap-2">
        {([false, true] as const).map((isIncome) => (
          <button
            key={String(isIncome)}
            type="button"
            aria-pressed={income === isIncome}
            onClick={() => setIncome(isIncome)}
            className={`chip justify-center ${income === isIncome ? 'chip-on' : ''}`}
          >
            {isIncome ? t('common.income') : t('common.expenses')}
          </button>
        ))}
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

      <div>
        <label className="label" htmlFor="tx-amount">
          {t('common.amount')}
        </label>
        <AmountInput
          id="tx-amount"
          className="input tabular !text-2xl font-bold"
          autoFocus={!tx}
          placeholder="0,00"
          value={amount}
          onChange={(e) => {
            const value = e.target.value;
            setAmount(value);
            setError(null);
            // su telefono, scritti i due decimali la tastiera si chiude: il tasto Salva resta raggiungibile
            if (isTouchDevice() && /^\d+[.,]\d{2}$/.test(value.trim())) e.target.blur();
          }}
        />
        {error && (
          <p role="alert" className="mt-1 text-[13px] text-expense">
            {error}
          </p>
        )}
      </div>

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
          placeholder={t('tx.notePlaceholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0">
          <label className="label" htmlFor="tx-date">
            {t('common.date')}
          </label>
          <input
            id="tx-date"
            type="date"
            className="input block w-full min-w-0 max-w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {!tx?.isTransfer && !tx?.recurrenceId && (
          <div className="min-w-0">
            <label className="label" htmlFor="tx-repeat">
              {t('recurrence.repeat')}
            </label>
            <select
              id="tx-repeat"
              className="input block w-full min-w-0 max-w-full"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency | '')}
            >
              <option value="">{t('recurrence.never')}</option>
              {FREQUENCIES.map((fr) => (
                <option key={fr} value={fr}>
                  {t(`recurrence.freq.${fr}`)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tx?.recurrenceId && (
        <p className="rounded-xl bg-tile p-3 text-[13px] text-muted">
          🔁 {t('recurrence.partOf', { title: recurrence?.title ?? '…' })}{' '}
          <Link to="/settings/recurrences" className="text-accent" onClick={onClose}>
            {t('recurrence.manage')}
          </Link>
        </p>
      )}
      {frequency && !tx?.recurrenceId && !tx?.isTransfer && (
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
      )}

      <div className="space-y-2">
        <CategoryPicker
          lookup={lookup}
          kind={income ? 'income' : 'expense'}
          value={shownCategory}
          onChange={(id) => {
            setCategoryId(id);
            setCategoryTouched(true);
            setCategoryNotice(null);
          }}
          onAdd={() => setCreating(true)}
        />
        {creating && (
          <div className="flex gap-2">
            <input
              className="input min-w-0 flex-1"
              aria-label={t('categories.newName')}
              placeholder={t('categories.newName')}
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void createCategory();
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={newName.trim() === ''}
              onClick={() => void createCategory()}
            >
              {t('categories.addShort')}
            </button>
          </div>
        )}
        {categoryNotice && <p className="text-[13px] text-muted">{categoryNotice}</p>}
      </div>
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

      {tx && (
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[rgb(var(--accent))]"
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
