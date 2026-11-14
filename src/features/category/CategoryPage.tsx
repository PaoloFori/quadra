import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
import { buildCategoryReport } from '@/domain/reports/category';
import { compare } from '@/domain/reports/totals';
import { MonthlyBars } from '@/features/reports/charts';
import { DOT } from '@/features/reports/shared';
import { movementsLink } from '@/features/transactions/movementsLink';
import { useFormat } from '@/i18n/useFormat';
import { monthOf, todayIso } from '@/lib/dates';
import { ALL_ACCOUNTS } from '@/domain/reports/accounts';
import { CategoryPeriodView, scopeParamsOf } from './CategoryPeriodView';

/** Analisi di una singola categoria: totali, andamento, dove si spende e movimenti più alti. */
export default function CategoryPage() {
  const { id = 'none' } = useParams();
  const [params] = useSearchParams();
  const categoryId = id === 'none' ? null : id;
  const scope = scopeParamsOf(params.get('month'), params.get('year'));
  if (scope) {
    return (
      <CategoryPeriodView
        categoryId={categoryId}
        scope={scope}
        accountId={params.get('account') ?? ALL_ACCOUNTS}
      />
    );
  }
  return <CategoryAllTime categoryId={categoryId} />;
}

/** Analisi di tutto lo storico di una categoria. */
function CategoryAllTime({ categoryId }: { categoryId: string | null }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lookup = useCategoryLookup();
  const all = useLiveQuery(transactionsRepo.all, []);
  const budgets = useLiveQuery(budgetsRepo.all, [], []);
  const category = categoryId ? lookup.byId.get(categoryId) : undefined;

  const report = useMemo(
    () => (all ? buildCategoryReport(all, categoryId, todayIso()) : undefined),
    [all, categoryId],
  );
  const budget = budgets.find((b) => b.categoryIds.length === 1 && b.categoryIds[0] === categoryId);

  const title = `${category?.icon ?? '❔'} ${lookup.label(categoryId)}`;
  const back = (
    <Link to="/reports" className="inline-flex min-h-[44px] items-center text-accent">
      ‹ {t('category.back')}
    </Link>
  );

  if (!report) return <Screen title={title}>{back}</Screen>;
  if (report.count === 0)
    return (
      <Screen title={title}>
        {back}
        <p className="card text-muted">{t('category.empty')}</p>
      </Screen>
    );

  const income = report.kind === 'income';
  const change = compare(report.thisMonthCents, report.previousMonthCents);
  const vsAverage = compare(report.thisMonthCents, report.avgMonthlyCents);
  const chart = report.months.map((m) => ({ name: f.monthShort(m.month), value: m.cents }));
  const ratio = budget ? report.thisMonthCents / budget.monthlyCents : 0;

  return (
    <Screen
      masonry
      title={title}
      subtitle={
        report.firstDate
          ? `${t('category.movements', { count: report.count })} · ${t('category.since', { date: f.month(monthOf(report.firstDate)) })}`
          : undefined
      }
    >
      {back}

      <section className="grid grid-cols-2 gap-3">
        <MetricCard label={t('category.total')} dot={DOT.saving}>
          {f.currency(report.totalCents)}
        </MetricCard>
        <MetricCard label={t('category.thisMonth')} dot={income ? DOT.income : DOT.expenses}>
          {f.currency(report.thisMonthCents)}
        </MetricCard>
        <MetricCard label={t('category.avgMonth')} dot={DOT.other}>
          {f.currency(report.avgMonthlyCents)}
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
          title={t('category.last12')}
          subtitle={
            report.share === null
              ? undefined
              : `${t(income ? 'category.shareIncome' : 'category.share')}: ${f.percent(report.share).replace('+', '')}`
          }
        />
        <MonthlyBars
          data={chart}
          label={t('category.last12')}
          limitCents={budget?.monthlyCents}
          color={income ? 'rgb(var(--income))' : 'rgb(var(--accent))'}
        />
      </section>

      <section className="card space-y-1">
        <SectionTitle title={t('reports.vsPrevious')} />
        <p className="flex justify-between pt-2">
          <span className="text-muted">{t('category.thisMonth')}</span>
          <Delta {...change} higherIsBad={!income} />
        </p>
        <p className="flex justify-between">
          <span className="text-muted">{t('category.vsAverage')}</span>
          <Delta {...vsAverage} higherIsBad={!income} />
        </p>
      </section>

      {budget && (
        <section className="card space-y-2">
          <SectionTitle title={t('category.budget')} />
          <p className="tabular font-display text-[18px] font-medium">
            {f.currency(report.thisMonthCents)} / {f.currency(budget.monthlyCents)}
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
                to={movementsLink({ categoryId, text: m.label })}
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
          {t('category.recent')}
        </h2>
        <ul className="space-y-2">
          {report.recent.slice(0, 5).map((tx) => (
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
        <Link to={movementsLink({ categoryId })} className="btn-secondary w-full">
          {t('category.seeAll')}
        </Link>
      </section>
    </Screen>
  );
}
