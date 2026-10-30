import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { MetricCard, SectionTitle } from '@/components/ui';
import { WealthChart } from '@/components/WealthChart';
import { savingsGoal } from '@/domain/reports/projections';
import { todayIso } from '@/lib/dates';
import { parseUserAmount } from '@/lib/money';
import { useFormat } from '@/i18n/useFormat';
import { DOT } from './shared';
import { useWealth } from './useWealth';

const GOAL_KEY = 'quadra:goal';

function loadGoal(): { amount: string; date: string } {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    if (raw) return JSON.parse(raw) as { amount: string; date: string };
  } catch {
    /* preferenza non essenziale */
  }
  return { amount: '', date: '' };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="flex min-h-[36px] items-baseline justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="tabular font-display text-right font-medium">{children}</span>
    </p>
  );
}

function GoalCard({
  currentCents,
  avgIncomeCents,
}: {
  currentCents: number;
  avgIncomeCents: number;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const [goal, setGoal] = useState(loadGoal);
  const update = (next: { amount: string; date: string }): void => {
    setGoal(next);
    try {
      localStorage.setItem(GOAL_KEY, JSON.stringify(next));
    } catch {
      /* preferenza non essenziale */
    }
  };

  const targetCents = parseUserAmount(goal.amount);
  const result = useMemo(
    () =>
      targetCents !== null && goal.date
        ? savingsGoal({
            targetCents,
            targetDate: goal.date,
            currentCents,
            avgIncomeCents,
            today: todayIso(),
          })
        : null,
    [targetCents, goal.date, currentCents, avgIncomeCents],
  );

  return (
    <section className="card space-y-3">
      <SectionTitle title={t('wealth.goalTitle')} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="goal-amount">
            {t('wealth.goalAmount')}
          </label>
          <input
            id="goal-amount"
            className="input tabular"
            inputMode="decimal"
            value={goal.amount}
            onChange={(e) => update({ ...goal, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="goal-date">
            {t('wealth.goalDate')}
          </label>
          <input
            id="goal-date"
            type="date"
            className="input min-w-0"
            value={goal.date}
            onChange={(e) => update({ ...goal, date: e.target.value })}
          />
        </div>
      </div>
      {result?.status === 'past' && <p className="text-muted">{t('wealth.goalPast')}</p>}
      {result?.reached && result.status !== 'past' && (
        <p className="font-medium text-income">✓ {t('wealth.goalReached')}</p>
      )}
      {result?.status === 'tooSoon' && !result.reached && (
        <p className="text-expense">
          {t('wealth.goalTooSoon', { amount: f.currency(result.requiredPerMonthCents) })}
        </p>
      )}
      {result?.status === 'ok' && !result.reached && (
        <>
          <Row label={t('wealth.goalRequired')}>{f.currency(result.requiredPerMonthCents)}</Row>
          <Row label={t('wealth.goalMaxSpend')}>
            {f.currency(Math.max(result.maxSpendPerMonthCents, 0))}
          </Row>
          <p
            className={`text-[14px] font-medium ${result.feasible ? 'text-income' : 'text-expense'}`}
          >
            {result.feasible
              ? t('wealth.goalOk', {
                  income: f.currency(avgIncomeCents),
                  amount: f.currency(result.maxSpendPerMonthCents),
                })
              : t('wealth.goalNo', {
                  income: f.currency(avgIncomeCents),
                  required: f.currency(result.requiredPerMonthCents),
                })}
          </p>
          <p className="text-[12px] text-muted">
            {t('wealth.goalMonths', { count: result.monthsRemaining })} · {t('wealth.paceHint')}
          </p>
        </>
      )}
    </section>
  );
}

/** Patrimonio (somma dei saldi dei conti), come è cambiato negli ultimi mesi e dove porta «a questo ritmo». */
export function WealthView({ accountId }: { accountId: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const view = useWealth(accountId);

  if (view === undefined)
    return <p className="p-6 text-center text-muted">{t('common.loading')}</p>;
  if (view === null) return <p className="card text-muted">{t('wealth.noAccounts')}</p>;

  const { projection, flows } = view;
  const up = projection.delta.cents >= 0;

  return (
    <div className="space-y-4">
      <section className="hero space-y-1" aria-label={t('wealth.title')}>
        <p className="label-caps !text-on-accent">{t('wealth.title')}</p>
        <p className="tabular font-display text-[40px] font-medium leading-[44px] tracking-[-0.04em]">
          {f.currency(view.currentCents)}
        </p>
        <p className="mt-2 inline-flex rounded-full bg-bg px-2.5 py-1 text-[13px] text-ink">
          {flows.sufficientHistory
            ? `${t('wealth.in6')}: ${f.currency(flows.in6Months)}`
            : t('wealth.shortHistory').split(' (')[0]}
        </p>
      </section>

      <section className="card space-y-3">
        <SectionTitle
          title={t('wealth.history')}
          subtitle={
            projection.delta.months > 0
              ? `${up ? '↑' : '↓'} ${f.currency(Math.abs(projection.delta.cents))} · ${t('wealth.goalMonths', { count: projection.delta.months })}`
              : undefined
          }
        />
        <WealthChart
          values={projection.values}
          labels={projection.months.map((m) => f.monthShort(m))}
          projectedFrom={projection.projectedFrom}
          label={t('wealth.title')}
        />
        <p className="text-[12px] text-faint">{t('wealth.dashedHint')}</p>
      </section>

      {view.accounts.length > 1 && (
        <section className="card">
          <SectionTitle title={t('reports.byAccount')} />
          <ul className="mt-1">
            {view.accounts.map((b) => (
              <li
                key={b.account.id}
                className="flex min-h-[48px] items-center justify-between border-t border-line first:border-0"
              >
                <span>{b.account.name}</span>
                <Amount cents={b.balanceCents} signed={false} neutral className="text-[16px]" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label={t('wealth.avgIncome')} dot={DOT.income}>
          <span className="text-income">{f.currency(flows.avgIncomeCents)}</span>
        </MetricCard>
        <MetricCard label={t('wealth.avgExpenses')} dot={DOT.expenses}>
          {f.currency(flows.avgExpensesCents)}
        </MetricCard>
      </div>

      <section className="card space-y-0.5">
        <SectionTitle title={t('wealth.pace')} />
        <div className="pt-2">
          <Row label={t('wealth.avgSaving')}>
            <Amount cents={flows.avgSavingCents} />
          </Row>
          <Row label={t('wealth.in6')}>{f.currency(flows.in6Months)}</Row>
          <Row label={t('wealth.in12')}>{f.currency(flows.in12Months)}</Row>
        </div>
        <p className="pt-1 text-[12px] text-muted">
          {flows.sufficientHistory ? t('wealth.paceHint') : `⚠️ ${t('wealth.shortHistory')}`}
        </p>
      </section>

      <GoalCard currentCents={view.currentCents} avgIncomeCents={flows.avgIncomeCents} />
    </div>
  );
}
