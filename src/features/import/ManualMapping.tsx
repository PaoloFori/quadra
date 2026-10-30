import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnMapping } from '@/domain/types';
import type { Table } from '@/domain/importing/table';

interface Props {
  table: Table;
  onSubmit: (headerRow: number, mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const NONE = -1;
const letter = (i: number): string => String.fromCharCode(65 + (i % 26));

interface ColumnSelectProps {
  id: string;
  label: string;
  value: number;
  options: Array<{ col: number; text: string }>;
  optional?: boolean;
  onChange: (v: number) => void;
}

function ColumnSelect({ id, label, value, options, optional, onChange }: ColumnSelectProps) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {optional && <option value={NONE}>{t('import.map.notUsed')}</option>}
        {!optional && value === NONE && <option value={NONE}>{t('import.map.choose')}</option>}
        {options.map((o) => (
          <option key={o.col} value={o.col}>
            {o.text}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Mappatura manuale quando il formato non viene riconosciuto dalle intestazioni. */
export function ManualMapping({ table, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [headerRow, setHeaderRow] = useState(0);
  const [split, setSplit] = useState(false);
  const [m, setM] = useState({
    date: NONE,
    valueDate: NONE,
    amount: NONE,
    debit: NONE,
    credit: NONE,
    desc1: NONE,
    desc2: NONE,
    balance: NONE,
  });
  const set = (key: keyof typeof m) => (v: number) => setM((prev) => ({ ...prev, [key]: v }));

  const options = useMemo(() => {
    const header = table[headerRow] ?? [];
    const sample = table[headerRow + 1] ?? [];
    return header.map((h, col) => ({
      col,
      text: `${letter(col)} · ${h || '—'} (${sample[col] ?? ''})`,
    }));
  }, [table, headerRow]);

  const valid =
    m.date !== NONE &&
    m.desc1 !== NONE &&
    (split ? m.debit !== NONE && m.credit !== NONE : m.amount !== NONE);

  function submit(): void {
    const mapping: ColumnMapping = {
      date: m.date,
      description: [m.desc1, m.desc2].filter((c) => c !== NONE),
    };
    if (m.valueDate !== NONE) mapping.valueDate = m.valueDate;
    if (split) Object.assign(mapping, { debit: m.debit, credit: m.credit });
    else mapping.amount = m.amount;
    if (m.balance !== NONE) mapping.balance = m.balance;
    onSubmit(headerRow, mapping);
  }

  return (
    <div className="space-y-3">
      <p className="text-muted">{t('import.map.intro')}</p>
      <div>
        <label className="label" htmlFor="header-row">
          {t('import.map.headerRow')}
        </label>
        <select
          id="header-row"
          className="input"
          value={headerRow}
          onChange={(e) => setHeaderRow(Number(e.target.value))}
        >
          {table.slice(0, 20).map((row, i) => (
            <option key={i} value={i}>
              {i + 1} · {row.slice(0, 3).join(' | ')}
            </option>
          ))}
        </select>
      </div>
      <ColumnSelect
        id="m-date"
        label={t('common.date')}
        value={m.date}
        options={options}
        onChange={set('date')}
      />
      <ColumnSelect
        id="m-vdate"
        label={t('import.map.valueDate')}
        value={m.valueDate}
        options={options}
        optional
        onChange={set('valueDate')}
      />
      <label className="flex min-h-[44px] items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={split}
          onChange={(e) => setSplit(e.target.checked)}
        />
        {t('import.map.splitAmount')}
      </label>
      {split ? (
        <>
          <ColumnSelect
            id="m-debit"
            label={t('import.map.debit')}
            value={m.debit}
            options={options}
            onChange={set('debit')}
          />
          <ColumnSelect
            id="m-credit"
            label={t('import.map.credit')}
            value={m.credit}
            options={options}
            onChange={set('credit')}
          />
        </>
      ) : (
        <ColumnSelect
          id="m-amount"
          label={t('common.amount')}
          value={m.amount}
          options={options}
          onChange={set('amount')}
        />
      )}
      <ColumnSelect
        id="m-d1"
        label={t('common.description')}
        value={m.desc1}
        options={options}
        onChange={set('desc1')}
      />
      <ColumnSelect
        id="m-d2"
        label={t('import.map.descriptionExtra')}
        value={m.desc2}
        options={options}
        optional
        onChange={set('desc2')}
      />
      <ColumnSelect
        id="m-balance"
        label={t('import.map.balance')}
        value={m.balance}
        options={options}
        optional
        onChange={set('balance')}
      />
      <div className="flex gap-2 pt-2">
        <button className="btn-secondary flex-1" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="btn-primary flex-1" disabled={!valid} onClick={submit}>
          {t('common.confirm')}
        </button>
      </div>
    </div>
  );
}
