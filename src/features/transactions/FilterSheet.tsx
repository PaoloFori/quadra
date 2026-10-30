import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { useAccounts, useCategoryLookup } from '@/db/hooks';
import { EMPTY_FILTER, type TransactionFilter } from '@/domain/filters';
import { centsToPlain, parseUserAmount } from '@/lib/money';

interface Props {
  value: TransactionFilter;
  onApply: (f: TransactionFilter) => void;
  onClose: () => void;
}

const ANY = '__any__';
const NONE = '__none__';

export function FilterSheet({ value, onApply, onClose }: Props) {
  const { t } = useTranslation();
  const accounts = useAccounts();
  const lookup = useCategoryLookup();
  const [draft, setDraft] = useState(value);
  const [min, setMin] = useState(
    value.minCents === undefined ? '' : centsToPlain(value.minCents).replace('.', ','),
  );
  const [max, setMax] = useState(
    value.maxCents === undefined ? '' : centsToPlain(value.maxCents).replace('.', ','),
  );

  const categoryValue =
    draft.categoryId === undefined ? ANY : draft.categoryId === null ? NONE : draft.categoryId;

  function apply(): void {
    const minCents = parseUserAmount(min);
    const maxCents = parseUserAmount(max);
    onApply({ ...draft, minCents: minCents ?? undefined, maxCents: maxCents ?? undefined });
    onClose();
  }

  return (
    <Sheet title={t('tx.filters')} onClose={onClose}>
      <div>
        <label className="label" htmlFor="f-cat">
          {t('common.category')}
        </label>
        <select
          id="f-cat"
          className="input"
          value={categoryValue}
          onChange={(e) => {
            const v = e.target.value;
            setDraft({ ...draft, categoryId: v === ANY ? undefined : v === NONE ? null : v });
          }}
        >
          <option value={ANY}>{t('common.all')}</option>
          <option value={NONE}>{t('common.uncategorized')}</option>
          {lookup.all.map((c) => (
            <option key={c.id} value={c.id}>
              {lookup.label(c.id)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-acc">
          {t('common.account')}
        </label>
        <select
          id="f-acc"
          className="input"
          value={draft.accountId ?? ANY}
          onChange={(e) =>
            setDraft({ ...draft, accountId: e.target.value === ANY ? undefined : e.target.value })
          }
        >
          <option value={ANY}>{t('common.all')}</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="f-from">
            {t('tx.from')}
          </label>
          <input
            id="f-from"
            type="date"
            className="input"
            value={draft.from ?? ''}
            onChange={(e) => setDraft({ ...draft, from: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="label" htmlFor="f-to">
            {t('tx.to')}
          </label>
          <input
            id="f-to"
            type="date"
            className="input"
            value={draft.to ?? ''}
            onChange={(e) => setDraft({ ...draft, to: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="label" htmlFor="f-min">
            {t('tx.minAmount')}
          </label>
          <input
            id="f-min"
            className="input"
            inputMode="decimal"
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="f-max">
            {t('tx.maxAmount')}
          </label>
          <input
            id="f-max"
            className="input"
            inputMode="decimal"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-secondary flex-1"
          onClick={() => {
            onApply({ ...EMPTY_FILTER, text: draft.text });
            onClose();
          }}
        >
          {t('tx.resetFilters')}
        </button>
        <button className="btn-primary flex-1" onClick={apply}>
          {t('common.confirm')}
        </button>
      </div>
    </Sheet>
  );
}
