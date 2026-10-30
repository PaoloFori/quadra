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
    icon: icon(
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 1-2-1-1-2h-4l-1 2-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1 1 2h4l1-2 2-1 2 1 2-4-2-1z',
    ),
  },
] as const;

export function TabBar() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label="Principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/90 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-xl">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={'end' in tab}
              className={({ isActive }) =>
                `flex min-h-[52px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium ${isActive ? 'font-semibold text-accent' : 'text-muted'}`
              }
            >
              {({ isActive }: { isActive: boolean }) => (
                <>
                  <span
                    className={`flex h-7 w-14 items-center justify-center rounded-full transition ${isActive ? 'bg-accent/15' : ''}`}
                  >
                    {tab.icon}
                  </span>
                  <span className="max-w-full truncate">{t(`nav.${tab.key}`)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
