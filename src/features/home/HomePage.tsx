import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { useAccounts } from '@/db/hooks';
import { transactionsRepo } from '@/db/repositories';
import { ALL_ACCOUNTS } from '@/domain/reports/accounts';
import { BalancesCard } from '@/features/accounts/BalancesCard';
import { DueCard } from '@/features/recurrences/DueCard';
import { PeriodMovements } from '@/features/reports/PeriodMovements';
import { ReportBlocks, type Block } from '@/features/reports/ReportBlocks';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { useFormat } from '@/i18n/useFormat';
import { monthOf, monthRange, todayIso } from '@/lib/dates';
import {
  BudgetWidget,
  CategoriesWidget,
  LatestWidget,
  MonthChartWidget,
  MonthSummaryWidget,
  WealthTrendWidget,
  YearChartWidget,
} from './widgets';

export default function HomePage() {
  const { t } = useTranslation();
  const f = useFormat();
  const month = monthOf(todayIso());
  const total = useLiveQuery(transactionsRepo.count, []);
  const accounts = useAccounts();
  const [adding, setAdding] = useState(false);

  // Di base si vedono solo liquidità e conti (e le scadenze, quando ce ne sono); il resto si sceglie da «Personalizza».
  const blocks: Block[] = [
    { id: 'liquidity', title: t('home.blocks.liquidity'), node: <BalancesCard /> },
    { id: 'due', title: t('home.blocks.due'), node: <DueCard /> },
    {
      id: 'monthSummary',
      title: t('home.blocks.monthSummary'),
      node: <MonthSummaryWidget />,
      hiddenByDefault: true,
    },
    {
      id: 'monthChart',
      title: t('home.blocks.monthChart'),
      node: <MonthChartWidget />,
      hiddenByDefault: true,
    },
    {
      id: 'yearChart',
      title: t('home.blocks.yearChart'),
      node: <YearChartWidget />,
      hiddenByDefault: true,
    },
    {
      id: 'categories',
      title: t('home.blocks.categories'),
      node: <CategoriesWidget />,
      hiddenByDefault: true,
    },
    {
      id: 'wealthTrend',
      title: t('home.blocks.wealthTrend'),
      node: <WealthTrendWidget />,
      hiddenByDefault: true,
    },
    {
      id: 'budget',
      title: t('home.blocks.budget'),
      node: <BudgetWidget />,
      hiddenByDefault: true,
    },
    {
      id: 'latest',
      title: t('home.blocks.latest'),
      node: <LatestWidget />,
      hiddenByDefault: true,
    },
    {
      id: 'monthMovements',
      title: t('home.blocks.monthMovements'),
      node: (
        <PeriodMovements
          from={monthRange(month).from}
          to={monthRange(month).to}
          accountId={ALL_ACCOUNTS}
        />
      ),
      hiddenByDefault: true,
    },
    {
      id: 'allMovements',
      title: t('home.blocks.allMovements'),
      node: <PeriodMovements to="9999-12-31" accountId={ALL_ACCOUNTS} />,
      hiddenByDefault: true,
    },
  ];

  return (
    <Screen title={t('home.overview')} eyebrow={f.month(month)}>
      {accounts.length === 0 && (
        <div className="card space-y-2 text-center">
          <h2 className="font-display text-[20px] font-medium">{t('home.noAccountsTitle')}</h2>
          <p className="text-muted">{t('home.noAccountsBody')}</p>
        </div>
      )}
      {accounts.length > 0 && total === 0 && (
        <div className="card space-y-3 text-center">
          <p className="text-muted">{t('home.empty')}</p>
          <button className="btn-primary w-full" onClick={() => setAdding(true)}>
            {t('home.addFirst')}
          </button>
          <Link to="/import" className="btn-secondary w-full">
            {t('home.importFile')}
          </Link>
        </div>
      )}
      <ReportBlocks view="home" blocks={blocks} />
      {adding && <TransactionSheet onClose={() => setAdding(false)} />}
    </Screen>
  );
}
