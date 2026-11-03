import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

const icon = (d: string): ReactNode => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const isActive = {
  home: (p: string) => p === '/',
  reports: (p: string) => p.startsWith('/reports') || p.startsWith('/transactions'),
  budget: (p: string) => p.startsWith('/budget'),
  settings: (p: string) => p.startsWith('/settings') || p.startsWith('/import'),
};

const TABS = [
  { to: '/', key: 'home', icon: icon('M3 11l9-8 9 8M5 10v10h14V10') },
  { to: '/reports', key: 'reports', icon: icon('M5 20V10M12 20V4M19 20v-7') },
  { to: '/budget', key: 'budget', icon: icon('M12 3a9 9 0 1 0 9 9h-9V3z') },
  { to: '/settings', key: 'settings', icon: icon('M5 12h.01M12 12h.01M19 12h.01') },
] as const;

function Tab({ tab }: { tab: (typeof TABS)[number] }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const active = isActive[tab.key](pathname);
  return (
    <li className="flex-1">
      <Link
        to={tab.to}
        aria-current={active ? 'page' : undefined}
        className="flex min-h-[52px] flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-medium"
      >
        <span
          className={`flex h-7 w-14 items-center justify-center rounded-full transition ${active ? 'bg-accent text-on-accent' : 'text-faint'}`}
        >
          {tab.icon}
        </span>
        <span className={`max-w-full truncate ${active ? 'text-ink' : 'text-faint'}`}>
          {t(`nav.${tab.key}`)}
        </span>
      </Link>
    </li>
  );
}

/**
 * Barra a pillola in fondo, sempre ferma: Home, Resoconti, «+» al centro, Budget, Impostazioni.
 * Sta fuori dall'area che scorre, quindi non si alza né si abbassa cambiando pagina.
 */
export function TabBar({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label="Principale"
      className="shrink-0 bg-bg px-4 pt-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      <ul className="mx-auto flex max-w-xl items-center rounded-[26px] border-[1.5px] border-line bg-raised p-1.5">
        <Tab tab={TABS[0]} />
        <Tab tab={TABS[1]} />
        <li className="flex w-[72px] justify-center">
          <button
            aria-label={t('tx.add')}
            onClick={onAdd}
            className="btn-primary !min-h-[52px] !w-[52px] !rounded-full !px-0 text-[28px] leading-none"
          >
            +
          </button>
        </li>
        <Tab tab={TABS[2]} />
        <Tab tab={TABS[3]} />
      </ul>
    </nav>
  );
}
