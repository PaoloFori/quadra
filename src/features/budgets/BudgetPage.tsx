import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { useCategoryLookup } from '@/db/hooks';
import { budgetsRepo, newId, transactionsRepo } from '@/db/repositories';
import { getSettings, setSetting } from '@/db/settings';
import {
  budgetStatuses,
  budgetsOverlap,
  levelOf,
  savingsProgress,
  totalRemaining,
  type BudgetStatus,
  type SavingsProgress,
} from '@/domain/reports/budget';
import { totalsOf } from '@/domain/reports/totals';
import type { Budget } from '@/domain/types';
import { monthOf, monthRange, shiftMonth, todayIso } from '@/lib/dates';
import { centsToPlain, parseUserAmount } from '@/lib/money';
import { useFormat } from '@/i18n/useFormat';
import { AmountInput } from '@/components/AmountInput';

function BudgetSheet({ budget, onClose }: { budget?: Budget; onClose: () => void }) {
  const { t } = useTranslation();
  const lookup = useCategoryLookup();
  const options = lookup.all.filter((c) => c.kind !== 'income');
  const [name, setName] = useState(budget?.name ?? '');
  const [selected, setSelected] = useState<string[]>(budget?.categoryIds ?? []);
  const [amount, setAmount] = useState(
    budget ? centsToPlain(budget.monthlyCents).replace('.', ',') : '',
  );
  const [errors, setErrors] = useState({ name: false, pick: false, amount: false });

  const toggle = (id: string): void => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setErrors((e) => ({ ...e, pick: false }));
  };
  const allSelected = options.length > 0 && selected.length === options.length;

  async function save(): Promise<void> {
    const cents = parseUserAmount(amount);
    const next = {
      name: name.trim() === '',
      pick: selected.length === 0,
      amount: cents === null,
    };
    setErrors(next);
    if (next.name || next.pick || cents === null) return;
    await budgetsRepo.put({
      id: budget?.id ?? newId(),
      name: name.trim(),
      categoryIds: selected,
      monthlyCents: cents,
    });
    onClose();
  }

  return (
    <Sheet title={budget ? t('budget.edit') : t('budget.add')} onClose={onClose}>
      <div>
        <label className="label" htmlFor="b-name">
          {t('budget.name')}
        </label>
        <input
          id="b-name"
          className="input"
          maxLength={40}
          placeholder={t('budget.namePlaceholder')}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((er) => ({ ...er, name: false }));
          }}
        />
        {errors.name && (
          <p role="alert" className="mt-1 text-[13px] text-expense">
            {t('budget.nameRequired')}
          </p>
        )}
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span className="label !mb-0" id="b-cats">
            {t('budget.pickCategories')}
          </span>
          <button
            className="text-[14px] font-medium text-accent"
            onClick={() => {
              setSelected(allSelected ? [] : options.map((c) => c.id));
              setErrors((e) => ({ ...e, pick: false }));
            }}
          >
            {allSelected ? t('budget.selectNone') : t('budget.selectAll')}
          </button>
        </div>
        <div role="group" aria-labelledby="b-cats" className="flex flex-wrap gap-2">
          {options.map((c) => (
            <button
              key={c.id}
              aria-pressed={selected.includes(c.id)}
              onClick={() => toggle(c.id)}
              className={`chip ${selected.includes(c.id) ? 'chip-on' : ''}`}
            >
              <span aria-hidden="true">{c.icon}</span> {lookup.label(c.id)}
            </button>
          ))}
        </div>
        {errors.pick && (
          <p role="alert" className="mt-1 text-[13px] text-expense">
            {t('budget.pickAtLeastOne')}
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="b-amount">
          {t('budget.monthlyLimit')}
        </label>
        <AmountInput
          id="b-amount"
          className="input tabular"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setErrors((er) => ({ ...er, amount: false }));
          }}
        />
        <p className="mt-1 text-[13px] text-muted">{t('budget.oneLimitHint')}</p>
        {errors.amount && (
          <p role="alert" className="mt-1 text-[13px] text-expense">
            {t('errors.invalidAmount')}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {budget && (
          <button
            className="btn-danger"
            onClick={() => void budgetsRepo.remove(budget.id).then(onClose)}
          >
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

function SavingsSheet({
  monthlyCents,
  yearlyCents,
  onClose,
}: {
  monthlyCents?: number;
  yearlyCents?: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const plain = (c?: number): string => (c === undefined ? '' : centsToPlain(c).replace('.', ','));
  const [monthly, setMonthly] = useState(plain(monthlyCents));
  const [yearly, setYearly] = useState(plain(yearlyCents));
  const [error, setError] = useState(false);

  async function save(): Promise<void> {
    const m = monthly.trim() === '' ? null : parseUserAmount(monthly);
    const y = yearly.trim() === '' ? null : parseUserAmount(yearly);
    if ((monthly.trim() !== '' && m === null) || (yearly.trim() !== '' && y === null))
      return setError(true);
    await setSetting('savingsMonthlyCents', m === null || m === 0 ? undefined : m);
    await setSetting('savingsYearlyCents', y === null || y === 0 ? undefined : y);
    onClose();
  }

  return (
    <Sheet title={t('budget.savingsTitle')} onClose={onClose}>
      <p className="text-[13px] text-muted">{t('budget.savingsHint')}</p>
      <div>
        <label className="label" htmlFor="sv-month">
          {t('budget.savingsMonthly')}
        </label>
        <AmountInput
          id="sv-month"
          className="input tabular"
          autoFocus
          value={monthly}
          onChange={(e) => {
            setMonthly(e.target.value);
            setError(false);
          }}
        />
      </div>
      <div>
        <label className="label" htmlFor="sv-year">
          {t('budget.savingsYearly')}
        </label>
        <AmountInput
          id="sv-year"
          className="input tabular"
          value={yearly}
          onChange={(e) => {
            setYearly(e.target.value);
            setError(false);
          }}
        />
        {error && (
          <p role="alert" className="mt-1 text-[13px] text-expense">
            {t('errors.invalidAmount')}
          </p>
        )}
      </div>
      <button className="btn-primary w-full" onClick={() => void save()}>
        {t('common.save')}
      </button>
    </Sheet>
  );
}

/** Una riga dell'obiettivo di risparmio: quanto è entrato, quanto è uscito, quanto hai messo da parte. */
function SavingsBlock({ title, progress }: { title: string; progress: SavingsProgress }) {
  const { t } = useTranslation();
  const f = useFormat();
  const p = progress;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold capitalize">{title}</p>
        <p className="tabular whitespace-nowrap text-[14px]">
          <Amount cents={p.savedCents} /> / {f.currency(p.targetCents)}
        </p>
      </div>
      <ProgressBar ratio={p.ratio} level="ok" label={title} />
      <p className="text-[13px] text-muted">
        {t('budget.savingsFlow', {
          income: f.currency(p.incomeCents),
          expenses: f.currency(p.expensesCents),
        })}
      </p>
      <p
        className={`text-[13px] font-semibold ${p.reached ? 'text-income' : p.canStillSpendCents < 0 ? 'text-expense' : 'text-muted'}`}
      >
        {p.reached
          ? `✓ ${t('budget.savingsReached', { amount: f.currency(p.savedCents - p.targetCents) })}`
          : t('budget.savingsMissing', { amount: f.currency(p.missingCents) })}
        {!p.reached &&
          ` · ${
            p.canStillSpendCents >= 0
              ? t('budget.savingsCanSpend', { amount: f.currency(p.canStillSpendCents) })
              : t('budget.savingsNoRoom')
          }`}
      </p>
    </div>
  );
}

export default function BudgetPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const [month, setMonth] = useState(monthOf(todayIso()));
  const budgets = useLiveQuery(budgetsRepo.all, [], []);
  const txs = useLiveQuery(
    () => transactionsRepo.inRange(monthRange(month).from, monthRange(month).to),
    [month],
    [],
  );
  const [editing, setEditing] = useState<Budget | 'new' | null>(null);
  const settings = useLiveQuery(getSettings, [], undefined);
  const [editingSavings, setEditingSavings] = useState(false);
  const year = month.slice(0, 4);
  const yearTxs = useLiveQuery(
    () => transactionsRepo.inRange(`${year}-01-01`, `${year}-12-31`),
    [year],
    [],
  );
  const monthlyGoal = settings?.savingsMonthlyCents;
  const yearlyGoal = settings?.savingsYearlyCents;
  const savingsMonth = useMemo(
    () => (monthlyGoal ? savingsProgress(totalsOf(txs), monthlyGoal) : null),
    [txs, monthlyGoal],
  );
  const savingsYear = useMemo(
    () => (yearlyGoal ? savingsProgress(totalsOf(yearTxs), yearlyGoal) : null),
    [yearTxs, yearlyGoal],
  );

  /** Nome mostrato: quello scelto, altrimenti (budget vecchi) le categorie elencate. */
  const nameOf = (b: Budget): string =>
    b.name?.trim() || b.categoryIds.map((id) => lookup.label(id)).join(', ');
  const statuses = useMemo(
    () =>
      budgetStatuses(budgets, txs).sort((a, b) =>
        nameOf(a.budget).localeCompare(nameOf(b.budget), undefined, { sensitivity: 'base' }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [budgets, txs, lookup],
  );
  // con budget sovrapposti (es. «Tutto» e «Casa») il totale conterebbe due volte le stesse spese
  const overlap = useMemo(() => budgetsOverlap(budgets), [budgets]);

  const totals = useMemo(() => totalRemaining(statuses), [statuses]);
  const exceeded = statuses.filter((s) => s.level === 'over').length;

  const message = (s: BudgetStatus): string =>
    s.level === 'over'
      ? t('budget.over', { amount: f.currency(-s.remaining) })
      : s.level === 'warning'
        ? t('budget.warning', { amount: f.currency(s.remaining) })
        : t('budget.left', { amount: f.currency(s.remaining) });

  return (
    <Screen
      title={t('nav.budget')}
      action={
        <button className="btn-primary" onClick={() => setEditing('new')}>
          {t('budget.add')}
        </button>
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          className="btn-secondary !min-w-[44px] !px-3"
          aria-label={t('reports.previous')}
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          ‹
        </button>
        <h2 className="text-lg font-semibold capitalize">{f.month(month)}</h2>
        <button
          className="btn-secondary !min-w-[44px] !px-3"
          aria-label={t('reports.next')}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          ›
        </button>
      </div>

      <section className="card space-y-1.5">
        <h2 className="font-semibold">{t('budget.what')}</h2>
        <p className="text-[14px] text-muted">{t('budget.intro')}</p>
        <p className="text-[14px] text-muted">{t('budget.canExceed')}</p>
        {statuses.length === 0 && <p className="text-[14px] text-muted">{t('budget.howTo')}</p>}
      </section>

      <section className="card space-y-3" aria-label={t('budget.savingsTitle')}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
            {t('budget.savingsTitle')}
          </h2>
          <button
            className="btn-secondary !min-h-[40px] !px-3 !text-[14px]"
            onClick={() => setEditingSavings(true)}
          >
            {savingsMonth || savingsYear ? t('common.edit') : t('budget.savingsSet')}
          </button>
        </div>
        {!savingsMonth && !savingsYear && (
          <p className="text-[14px] text-muted">{t('budget.savingsIntro')}</p>
        )}
        {savingsMonth && <SavingsBlock title={f.month(month)} progress={savingsMonth} />}
        {savingsYear && <SavingsBlock title={year} progress={savingsYear} />}
      </section>

      {statuses.length > 0 && !overlap && (
        <section className="card" aria-label={t('budget.totalTitle')}>
          <p className="text-[13px] text-muted">{t('budget.totalTitle')}</p>
          <p className="mb-2 text-lg font-bold">
            {t('budget.spentOf', {
              spent: f.currency(totals.spent),
              limit: f.currency(totals.limit),
            })}
          </p>
          <ProgressBar
            ratio={totals.limit === 0 ? 0 : totals.spent / totals.limit}
            level={levelOf(totals.limit === 0 ? 0 : totals.spent / totals.limit)}
            label={t('budget.totalTitle')}
          />
          {exceeded > 0 && (
            <p className="mt-1.5 text-[13px] font-semibold text-expense">
              ⛔ {t('budget.exceeded', { count: exceeded })}
            </p>
          )}
        </section>
      )}

      <ul className="space-y-3">
        {statuses.map((s) => {
          const title = nameOf(s.budget);
          const icons = s.budget.categoryIds.map((id) => lookup.byId.get(id)?.icon).filter(Boolean);
          return (
            <li key={s.budget.id}>
              <button className="card w-full text-left" onClick={() => setEditing(s.budget)}>
                <span className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true">
                      {icons.length === 1
                        ? icons[0]
                        : `${icons.slice(0, 3).join('')}${icons.length > 3 ? '…' : ''}`}
                    </span>
                    <span className="truncate font-semibold">{title}</span>
                  </span>
                  <span className="tabular whitespace-nowrap text-[14px]">
                    <Amount cents={-s.spent} signed={false} neutral /> /{' '}
                    {f.currency(s.budget.monthlyCents)}
                  </span>
                </span>
                <ProgressBar ratio={s.ratio} level={s.level} label={title} />
                {s.budget.categoryIds.length > 1 && (
                  <span className="mt-1 block truncate text-[12px] text-muted">
                    {s.budget.categoryIds.map((id) => lookup.label(id)).join(' · ')}
                  </span>
                )}
                <span
                  className={`mt-1.5 block text-[13px] ${s.level === 'over' ? 'font-semibold text-expense' : s.level === 'warning' ? 'font-semibold text-warn' : 'text-muted'}`}
                >
                  {s.level === 'over' ? '⛔ ' : s.level === 'warning' ? '⚠️ ' : ''}
                  {message(s)} · {t('budget.percentUsed', { pct: Math.round(s.ratio * 100) })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {editingSavings && (
        <SavingsSheet
          monthlyCents={monthlyGoal}
          yearlyCents={yearlyGoal}
          onClose={() => setEditingSavings(false)}
        />
      )}
      {editing && (
        <BudgetSheet
          budget={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
