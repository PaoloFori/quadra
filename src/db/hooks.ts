import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import type { Account, Category } from '@/domain/types';
import { accountsRepo, categoriesRepo } from './repositories';

export function useAccounts(): Account[] {
  return useLiveQuery(accountsRepo.all, [], []);
}

export function useCategories(): Category[] {
  return useLiveQuery(categoriesRepo.all, [], []);
}

export interface CategoryLookup {
  all: Category[];
  byId: Map<string, Category>;
  label: (id: string | null) => string;
}

/** Nome mostrato: quello scelto dall'utente, altrimenti la traduzione della categoria predefinita. */
export function useCategoryLookup(): CategoryLookup {
  const { t } = useTranslation();
  const all = useCategories();
  return useMemo(() => {
    const byId = new Map(all.map((c) => [c.id, c]));
    const label = (id: string | null): string => {
      const c = id ? byId.get(id) : undefined;
      if (!c) return t('common.uncategorized');
      return c.name ?? t(`categories.${c.id}`);
    };
    return { all, byId, label };
  }, [all, t]);
}
