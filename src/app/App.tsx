import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { AppShell } from './AppShell';
import { LastScreen } from './LastScreen';
import { LockProvider } from '@/features/security/LockProvider';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const CategoryPage = lazy(() => import('@/features/category/CategoryPage'));
const RecurrencesPage = lazy(() => import('@/features/recurrences/RecurrencesPage'));
const BudgetPage = lazy(() => import('@/features/budgets/BudgetPage'));
const ImportPage = lazy(() => import('@/features/import/ImportPage'));
const CategoriesPage = lazy(() => import('@/features/settings/CategoriesPage'));
const RulesPage = lazy(() => import('@/features/settings/RulesPage'));
const AccountsPage = lazy(() => import('@/features/settings/AccountsPage'));
const BackupPage = lazy(() => import('@/features/backup/BackupPage'));
const SecurityPage = lazy(() => import('@/features/security/SecurityPage'));
const StatementCheckPage = lazy(() => import('@/features/statements/StatementCheckPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));

export function App() {
  return (
    <ErrorBoundary>
      <LockProvider>
        <HashRouter>
          <LastScreen />
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route
                path="/transactions"
                element={<ReportsPage key="transactions" initialMode="movements" />}
              />
              <Route path="/reports" element={<ReportsPage key="reports" />} />
              <Route path="/category/:id" element={<CategoryPage />} />
              <Route path="/budget" element={<BudgetPage />} />
              <Route path="/settings/categories" element={<CategoriesPage />} />
              <Route path="/settings/recurrences" element={<RecurrencesPage />} />
              <Route path="/settings/rules" element={<RulesPage />} />
              <Route path="/settings/accounts" element={<AccountsPage />} />
              <Route path="/settings/backup" element={<BackupPage />} />
              <Route path="/settings/security" element={<SecurityPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/check" element={<StatementCheckPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AppShell>
        </HashRouter>
      </LockProvider>
    </ErrorBoundary>
  );
}
