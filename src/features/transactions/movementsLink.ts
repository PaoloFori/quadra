import type { TransactionFilter } from '@/domain/filters';

const NO_CATEGORY = 'none';

/** URL dei Movimenti già filtrati: usato dai grafici e dalle schede di Home e Resoconti. */
export function movementsLink(f: Omit<TransactionFilter, 'text'>): string {
  const p = new URLSearchParams();
  if (f.categoryId !== undefined) p.set('category', f.categoryId ?? NO_CATEGORY);
  if (f.type) p.set('type', f.type);
  if (f.accountId) p.set('account', f.accountId);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  return `/transactions?${p.toString()}`;
}

export function filterFromParams(p: URLSearchParams): TransactionFilter {
  const category = p.get('category');
  const type = p.get('type');
  return {
    text: '',
    categoryId: category === null ? undefined : category === NO_CATEGORY ? null : category,
    type: type === 'income' || type === 'expense' ? type : undefined,
    accountId: p.get('account') ?? undefined,
    from: p.get('from') ?? undefined,
    to: p.get('to') ?? undefined,
  };
}
