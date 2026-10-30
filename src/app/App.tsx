import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './ErrorBoundary';
import { TabBar } from '@/components/TabBar';
import { LockProvider } from '@/features/security/LockProvider';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const TransactionsPage = lazy(() => import('@/features/transactions/TransactionsPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const BudgetPage = lazy(() => import('@/features/budgets/BudgetPage'));
const ImportPage = lazy(() => import('@/features/import/ImportPage'));
const CategoriesPage = lazy(() => import('@/features/settings/CategoriesPage'));
const RulesPage = lazy(() => import('@/features/settings/RulesPage'));
const AccountsPage = lazy(() => import('@/features/settings/AccountsPage'));
const BackupPage = lazy(() => import('@/features/backup/BackupPage'));
const SecurityPage = lazy(() => import('@/features/security/SecurityPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

function Loading() {
  const { t } = useTranslation();
  return (
    <p role="status" className="p-8 text-center text-muted">
      {t('common.loading')}
    </p>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <LockProvider>
        <HashRouter>
          <div className="min-h-full pb-[calc(64px+env(safe-area-inset-bottom))]">
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/budget" element={<BudgetPage />} />
                <Route path="/settings/categories" element={<CategoriesPage />} />
                <Route path="/settings/rules" element={<RulesPage />} />
                <Route path="/settings/accounts" element={<AccountsPage />} />
                <Route path="/settings/backup" element={<BackupPage />} />
                <Route path="/settings/security" element={<SecurityPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </Suspense>
          </div>
          <TabBar />
        </HashRouter>
      </LockProvider>
    </ErrorBoundary>
  );
}
