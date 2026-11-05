import type { TransactionFilter } from '@/domain/filters';

const NO_CATEGORY = 'none';

/** URL dei Movimenti già filtrati: usato dai grafici e dalle schede di Home e Resoconti. */
export function movementsLink(f: Partial<TransactionFilter>): string {
  const p = new URLSearchParams();
  if (f.categoryId !== undefined) p.set('category', f.categoryId ?? NO_CATEGORY);
  if (f.type) p.set('type', f.type);
  if (f.text) p.set('q', f.text);
  if (f.accountId) p.set('account', f.accountId);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  return `/transactions?${p.toString()}`;
}

export function filterFromParams(p: URLSearchParams): TransactionFilter {
  const category = p.get('category');
  const type = p.get('type');
  return {
    text: p.get('q') ?? '',
    categoryId: category === null ? undefined : category === NO_CATEGORY ? null : category,
    type: type === 'income' || type === 'expense' ? type : undefined,
    accountId: p.get('account') ?? undefined,
    from: p.get('from') ?? undefined,
    to: p.get('to') ?? undefined,
  };
}

/** Pagina di analisi di una categoria (`null` = senza categoria). */
export const categoryLink = (
  categoryId: string | null,
  scope: { month?: string; year?: string; accountId?: string } = {},
): string => {
  const p = new URLSearchParams();
  if (scope.month) p.set('month', scope.month);
  else if (scope.year) p.set('year', scope.year);
  if (scope.accountId) p.set('account', scope.accountId);
  const query = p.toString();
  return `/category/${categoryId ?? NO_CATEGORY}${query ? `?${query}` : ''}`;
};
