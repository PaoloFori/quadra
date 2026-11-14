import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { oneOf, readStored, writeStored } from '@/lib/persistentState';

/** Le schede principali: solo queste si ricordano, le sotto-pagine (importa, backup…) no. */
export const REMEMBERED_SCREENS = [
  '/',
  '/reports',
  '/transactions',
  '/budget',
  '/settings',
] as const;
const KEY = 'lastScreen';

/** All'apertura dell'app torna dove eri rimasto; poi tiene aggiornata la scheda in uso. Non disegna nulla. */
export function LastScreen() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const restored = useRef(false);
  /** Scheda verso cui si sta tornando: finché non ci si arriva non si salva nulla (evita di sovrascriverla). */
  const target = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!restored.current) {
      restored.current = true;
      // si ripristina solo se l'app è stata aperta sulla Home, non da un link a una pagina precisa
      const last = pathname === '/' ? readStored(KEY, oneOf(REMEMBERED_SCREENS)) : undefined;
      if (last && last !== '/') {
        target.current = last;
        navigate(last, { replace: true });
        return;
      }
    }
    if (target.current && pathname !== target.current) return;
    target.current = undefined;
    if ((REMEMBERED_SCREENS as readonly string[]).includes(pathname)) writeStored(KEY, pathname);
  }, [pathname, navigate]);

  return null;
}
