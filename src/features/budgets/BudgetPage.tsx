import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { useCategoryLookup } from '@/db/hooks';
import { budgetsRepo, newId, transactionsRepo } from '@/db/repositories';
import {
  budgetStatuses,
  levelOf,
  totalRemaining,
  type BudgetStatus,
} from '@/domain/reports/budget';
import type { Budget } from '@/domain/types';
import { monthOf, monthRange, shiftMonth, todayIso } from '@/lib/dates';
import { centsToPlain, parseUserAmount } from '@/lib/money';
import { useFormat } from '@/i18n/useFormat';

function BudgetSheet({
  budget,
  taken,
  onClose,
}: {
  budget?: Budget;
  taken: Set<string>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const lookup = useCategoryLookup();
  const options = lookup.all.filter(
    (c) => c.kind !== 'income' && (c.id === budget?.categoryId || !taken.has(c.id)),
  );
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '');
  const [amount, setAmount] = useState(
    budget ? centsToPlain(budget.monthlyCents).replace('.', ',') : '',
  );
  const [error, setError] = useState(false);
  const chosen = categoryId || options[0]?.id || '';

  async function save(): Promise<void> {
    const cents = parseUserAmount(amount);
    if (cents === null || !chosen) return setError(true);
    await budgetsRepo.put({ id: budget?.id ?? newId(), categoryId: chosen, monthlyCents: cents });
    onClose();
  }

  return (
    <Sheet title={budget ? t('budget.edit') : t('budget.add')} onClose={onClose}>
      <div>
        <label className="label" htmlFor="b-cat">
          {t('common.category')}
        </label>
        <select
          id="b-cat"
          className="input"
          value={chosen}
          disabled={!!budget}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {lookup.label(c.id)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="b-amount">
          {t('budget.monthlyLimit')}
        </label>
        <input
          id="b-amount"
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

  const statuses = useMemo(() => budgetStatuses(budgets, txs), [budgets, txs]);
  const taken = useMemo(() => new Set(budgets.map((b) => b.categoryId)), [budgets]);

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

      <section className="card mb-3 space-y-1.5 border border-accent/20 bg-accent/5">
        <h2 className="font-semibold">{t('budget.what')}</h2>
        <p className="text-[14px] text-muted">{t('budget.intro')}</p>
        <p className="text-[14px] text-muted">{t('budget.canExceed')}</p>
        {statuses.length === 0 && <p className="text-[14px] text-muted">{t('budget.howTo')}</p>}
      </section>

      {statuses.length > 0 && (
        <section className="card mb-3" aria-label={t('budget.totalTitle')}>
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
          const cat = lookup.byId.get(s.budget.categoryId);
          return (
            <li key={s.budget.id}>
              <button className="card w-full text-left" onClick={() => setEditing(s.budget)}>
                <span className="mb-2 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span aria-hidden="true">{cat?.icon}</span>
                    <span className="truncate font-semibold">
                      {lookup.label(s.budget.categoryId)}
                    </span>
                  </span>
                  <span className="tabular whitespace-nowrap text-[14px]">
                    <Amount cents={-s.spent} signed={false} neutral /> /{' '}
                    {f.currency(s.budget.monthlyCents)}
                  </span>
                </span>
                <ProgressBar
                  ratio={s.ratio}
                  level={s.level}
                  label={lookup.label(s.budget.categoryId)}
                />
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
      {editing && (
        <BudgetSheet
          budget={editing === 'new' ? undefined : editing}
          taken={taken}
          onClose={() => setEditing(null)}
        />
      )}
    </Screen>
  );
}
