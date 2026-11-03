/** Le pagine tra cui si passa con lo scorrimento laterale, nell'ordine della barra. */
export const SWIPE_TABS = ['/', '/reports', '/budget', '/settings'] as const;

/** Indice della scheda a cui appartiene un percorso; -1 per le sotto-pagine (niente scorrimento laterale). */
export function tabIndexOf(pathname: string): number {
  if (pathname === '/') return 0;
  if (pathname === '/reports' || pathname === '/transactions') return 1;
  if (pathname === '/budget') return 2;
  if (pathname === '/settings') return 3;
  return -1;
}
