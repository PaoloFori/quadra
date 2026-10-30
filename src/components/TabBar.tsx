import { NavLink } from 'react-router-dom';
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

const TABS = [
  { to: '/', key: 'home', end: true, icon: icon('M3 11l9-8 9 8M5 10v10h14V10') },
  { to: '/transactions', key: 'transactions', icon: icon('M4 6h16M4 12h16M4 18h10') },
  { to: '/reports', key: 'reports', icon: icon('M5 20V10M12 20V4M19 20v-7') },
  { to: '/budget', key: 'budget', icon: icon('M12 3a9 9 0 1 0 9 9h-9V3z') },
  {
    to: '/settings',
    key: 'settings',
    icon: icon('M5 12h.01M12 12h.01M19 12h.01'),
  },
] as const;

/** Barra flottante a pillola: superficie rialzata, bordo sottile, voce attiva su pillola blu. */
export function TabBar() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label="Principale"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg/90 to-transparent px-4 pt-6"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
    >
      <ul className="pointer-events-auto mx-auto flex max-w-xl rounded-[26px] border-[1.5px] border-line bg-raised p-1.5">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={'end' in tab}
              className="flex min-h-[52px] flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-medium"
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <span
                    className={`flex h-7 w-14 items-center justify-center rounded-full transition ${isActive ? 'bg-accent text-on-accent' : 'text-faint'}`}
                  >
                    {tab.icon}
                  </span>
                  <span className={`max-w-full truncate ${isActive ? 'text-ink' : 'text-faint'}`}>
                    {t(`nav.${tab.key}`)}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
