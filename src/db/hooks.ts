import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import type { Account, Category } from '@/domain/types';
import { accountsRepo, categoriesRepo } from './repositories';

/** Conti in ordine alfabetico, così si trovano subito. */
export function useAccounts(): Account[] {
  const { i18n } = useTranslation();
  const accounts = useLiveQuery(accountsRepo.all, [], []);
  return useMemo(() => {
    const collator = new Intl.Collator(i18n.language, { sensitivity: 'base' });
    return [...accounts].sort((a, b) => collator.compare(a.name, b.name));
  }, [accounts, i18n.language]);
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
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  return useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const label = (id: string | null): string => {
      const c = id ? byId.get(id) : undefined;
      if (!c) return t('common.uncategorized');
      return c.name ?? t(`categories.${c.id}`);
    };
    // elenco in ordine alfabetico per il nome mostrato (nella lingua corrente)
    const collator = new Intl.Collator(i18n.language, { sensitivity: 'base' });
    const all = [...categories].sort((a, b) => collator.compare(label(a.id), label(b.id)));
    return { all, byId, label };
  }, [categories, t, i18n.language]);
}
