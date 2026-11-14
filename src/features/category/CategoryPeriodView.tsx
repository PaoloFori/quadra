import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Amount } from '@/components/Amount';
import { Delta } from '@/components/Delta';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { IconTile, MetricCard, SectionTitle } from '@/components/ui';
import { useCategoryLookup } from '@/db/hooks';
import { budgetsRepo, transactionsRepo } from '@/db/repositories';
import { levelOf } from '@/domain/reports/budget';
import { ALL_ACCOUNTS, filterByAccount } from '@/domain/reports/accounts';
import { buildCategoryPeriodReport, type CategoryPeriod } from '@/domain/reports/category';
import { compare } from '@/domain/reports/totals';
import { MonthlyBars } from '@/features/reports/charts';
import { DOT } from '@/features/reports/shared';
import { categoryLink, movementsLink } from '@/features/transactions/movementsLink';
import { useFormat } from '@/i18n/useFormat';
import { monthRange, shiftMonth } from '@/lib/dates';

export type PeriodScope = { kind: 'month'; month: string } | { kind: 'year'; year: string };

function periodOf(scope: PeriodScope): CategoryPeriod {
  if (scope.kind === 'month') {
    return {
      ...monthRange(scope.month),
      previous: monthRange(shiftMonth(scope.month, -1)),
      granularity: 'day',
    };
  }
  const y = Number(scope.year);
  return {
    from: `${y}-01-01`,
    to: `${y}-12-31`,
    previous: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` },
    granularity: 'month',
  };
}

/** Analisi di una categoria dentro un solo mese o anno (e, se scelto, un solo conto). */
export function CategoryPeriodView({
  categoryId,
  scope,
  accountId,
}: {
  categoryId: string | null;
  scope: PeriodScope;
  accountId: string;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const budgets = useLiveQuery(budgetsRepo.all, [], []);
  const period = useMemo(() => periodOf(scope), [scope]);
  const raw = useLiveQuery(
    () => transactionsRepo.inRange(period.previous.from, period.to),
    [period],
  );
  const category = categoryId ? lookup.byId.get(categoryId) : undefined;
  const report = useMemo(
    () => raw && buildCategoryPeriodReport(filterByAccount(raw, accountId), categoryId, period),
    [raw, accountId, categoryId, period],
  );

  const label = scope.kind === 'month' ? f.month(scope.month) : scope.year;
  const title = `${category?.icon ?? '❔'} ${lookup.label(categoryId)}`;
  const accountParam = accountId === ALL_ACCOUNTS ? undefined : accountId;
  const back = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Link to="/reports" className="inline-flex min-h-[44px] items-center text-accent">
        ‹ {t('category.back')}
      </Link>
      <Link
        to={categoryLink(categoryId)}
        className="chip"
        aria-label={t('category.allTime')}
        data-no-swipe
      >
        {t('category.allTime')}
      </Link>
    </div>
  );

  if (!report) return <Screen title={title}>{back}</Screen>;

  const income = report.kind === 'income';
  const change = compare(report.totalCents, report.previousCents);
  const budget =
    scope.kind === 'month'
      ? budgets.find((b) => b.categoryIds.length === 1 && b.categoryIds[0] === categoryId)
      : undefined;
  const ratio = budget && budget.monthlyCents > 0 ? report.totalCents / budget.monthlyCents : 0;
  const chart = report.series.map((p) => ({
    name: scope.kind === 'month' ? p.key : f.monthShort(p.key),
    value: p.cents,
  }));
  const range = { from: period.from, to: period.to, accountId: accountParam };

  return (
    <Screen
      masonry
      title={title}
      subtitle={`${label} · ${t('category.movements', { count: report.count })}`}
    >
      {back}

      {report.count === 0 ? (
        <p className="card text-muted">{t('category.emptyPeriod', { period: label })}</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3">
            <MetricCard label={label} dot={income ? DOT.income : DOT.expenses}>
              {f.currency(report.totalCents)}
            </MetricCard>
            <MetricCard
              label={t('category.perMovement')}
              dot={DOT.other}
              badge={report.share === null ? undefined : f.percent(report.share).replace('+', '')}
            >
              {f.currency(report.avgPerMovementCents)}
            </MetricCard>
          </section>

          <section className="card space-y-3">
            <SectionTitle
              title={scope.kind === 'month' ? t('category.byDay') : t('category.byMonth')}
              subtitle={
                report.share === null
                  ? undefined
                  : `${t(income ? 'category.shareIncome' : 'category.share')}: ${f.percent(report.share).replace('+', '')}`
              }
            />
            <MonthlyBars
              data={chart}
              label={scope.kind === 'month' ? t('category.byDay') : t('category.byMonth')}
              color={income ? 'rgb(var(--income))' : 'rgb(var(--accent))'}
            />
          </section>

          <section className="card space-y-1">
            <SectionTitle
              title={t(scope.kind === 'month' ? 'reports.vsPrevious' : 'reports.vsPreviousYear')}
            />
            <p className="flex justify-between pt-2">
              <span className="text-muted">{label}</span>
              <Delta {...change} higherIsBad={!income} />
            </p>
            <p className="flex justify-between text-[13px] text-muted">
              <span>
                {scope.kind === 'month'
                  ? f.month(shiftMonth(scope.month, -1))
                  : String(Number(scope.year) - 1)}
              </span>
              <span className="tabular">{f.currency(report.previousCents)}</span>
            </p>
          </section>

          {budget && (
            <section className="card space-y-2">
              <SectionTitle title={t('category.budget')} />
              <p className="tabular font-display text-[18px] font-medium">
                {f.currency(report.totalCents)} / {f.currency(budget.monthlyCents)}
              </p>
              <ProgressBar ratio={ratio} level={levelOf(ratio)} label={t('category.budget')} />
            </section>
          )}

          <section className="card">
            <SectionTitle title={t(income ? 'category.merchantsIncome' : 'category.merchants')} />
            <ul className="mt-1">
              {report.topMerchants.map((m) => (
                <li key={m.key} className="border-t border-line first:border-0">
                  <Link
                    to={movementsLink({ categoryId, text: m.label, ...range })}
                    className="flex min-h-[52px] items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="line-clamp-1 font-medium">{m.label}</span>
                      <span className="text-[13px] text-muted">
                        {t('category.times', { count: m.count })}
                      </span>
                    </span>
                    <Amount
                      cents={income ? m.cents : -m.cents}
                      signed={false}
                      neutral
                      className="text-[16px]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <SectionTitle title={t('category.biggest')} />
            <ol className="mt-1">
              {report.biggest.map((tx) => (
                <li
                  key={tx.id}
                  className="flex min-h-[52px] items-center justify-between gap-3 border-t border-line first:border-0"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 font-medium">{tx.note || tx.description}</span>
                    <span className="text-[13px] text-muted">{f.dateLong(tx.date)}</span>
                  </span>
                  <Amount cents={tx.amountCents} className="text-[16px]" />
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-[17px] font-semibold tracking-[-0.01em]">
              {t('category.inPeriod', { period: label })}
            </h2>
            <ul className="space-y-2">
              {report.items.slice(0, 8).map((tx) => (
                <li key={tx.id} className="card-row flex items-center gap-3 p-3.5">
                  <IconTile>{category?.icon ?? '❔'}</IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 font-medium">{tx.note || tx.description}</span>
                    <span className="text-[13px] text-muted">{f.date(tx.date)}</span>
                  </span>
                  <Amount cents={tx.amountCents} className="text-[17px]" />
                </li>
              ))}
            </ul>
            <Link to={movementsLink({ categoryId, ...range })} className="btn-secondary w-full">
              {t('category.seeAllPeriod')}
            </Link>
          </section>
        </>
      )}
    </Screen>
  );
}

/** Legge dall'indirizzo se l'analisi è di un solo mese o anno. */
export function scopeParamsOf(month: string | null, year: string | null): PeriodScope | null {
  if (month && /^\d{4}-\d{2}$/.test(month)) return { kind: 'month', month };
  if (year && /^\d{4}$/.test(year)) return { kind: 'year', year };
  return null;
}
