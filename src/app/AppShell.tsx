import { Suspense, useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TabBar } from '@/components/TabBar';
import { autoRegisterDue } from '@/db/recurrenceService';
import { todayIso } from '@/lib/dates';
import { TransactionSheet } from '@/features/transactions/TransactionSheet';
import { ScrollContext } from './scrollContext';
import { SWIPE_TABS, tabIndexOf } from './tabs';

const SWIPE_PX = 70;

/** Vero se, salendo dal punto toccato, c'è un elemento che scorre in orizzontale (righe di chip, tabelle…). */
function insideHorizontalScroller(start: EventTarget | null, stop: HTMLElement): boolean {
  for (let el = start as HTMLElement | null; el && el !== stop; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowX))
      return true;
  }
  return false;
}

/**
 * Struttura fissa dell'app: la pagina scorre in un contenitore suo e la barra dei tab sta sotto,
 * fuori dallo scorrimento, quindi non si muove mai. Scorrendo a destra o a sinistra si cambia pagina.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; ok: boolean } | null>(null);
  const [adding, setAdding] = useState(false);

  // direzione dell'animazione: si entra da destra andando avanti, da sinistra tornando indietro
  const index = tabIndexOf(pathname);
  const [nav, setNav] = useState({ pathname, index, direction: 0 });
  if (nav.pathname !== pathname)
    setNav({
      pathname,
      index,
      direction:
        index >= 0 && nav.index >= 0 && index !== nav.index ? Math.sign(index - nav.index) : 0,
    });
  const direction = nav.direction;
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // le ricorrenze senza avviso si registrano da sole all'apertura e quando si torna sull'app
  useEffect(() => {
    const run = (): void => void autoRegisterDue(todayIso()).catch(console.error);
    run();
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>): void => {
    const p = e.touches[0];
    const target = e.target as HTMLElement;
    const blocked =
      !p ||
      e.touches.length > 1 ||
      index < 0 ||
      !!target.closest('[role="dialog"], input, textarea, select, [data-no-swipe]') ||
      insideHorizontalScroller(target, e.currentTarget);
    touch.current = p && !blocked ? { x: p.clientX, y: p.clientY, ok: true } : null;
  };

  const onTouchEnd = (e: TouchEvent<HTMLDivElement>): void => {
    const start = touch.current;
    const p = e.changedTouches[0];
    touch.current = null;
    if (!start || !p) return;
    const dx = p.clientX - start.x;
    const dy = p.clientY - start.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.6) return;
    const next = SWIPE_TABS[index + (dx < 0 ? 1 : -1)];
    if (next) navigate(next);
  };

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <ScrollContext.Provider value={scrollRef}>
          <div
            key={pathname}
            className={direction > 0 ? 'slide-from-right' : direction < 0 ? 'slide-from-left' : ''}
          >
            <Suspense
              fallback={
                <p role="status" className="p-8 text-center text-muted">
                  {t('common.loading')}
                </p>
              }
            >
              {children}
            </Suspense>
          </div>
        </ScrollContext.Provider>
      </div>
      <TabBar onAdd={() => setAdding(true)} />
      {adding && <TransactionSheet onClose={() => setAdding(false)} />}
    </div>
  );
}
