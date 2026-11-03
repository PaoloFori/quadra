import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isTabActive, NAV_ITEMS } from './TabBar';

/** Menu laterale per gli schermi larghi (computer, tablet in orizzontale): sostituisce la barra in basso. */
export function SideNav({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Principale"
      className="hidden w-64 shrink-0 flex-col gap-6 border-r-[1.5px] border-line bg-card/40 p-5 lg:flex"
    >
      <p className="font-display px-3 pt-2 text-[26px] font-medium tracking-[-0.03em]">Quadra</p>
      <button className="btn-primary w-full" onClick={onAdd}>
        + {t('tx.add')}
        <kbd className="ml-1 rounded border border-black/30 px-1.5 text-[11px] font-medium opacity-70">
          N
        </kbd>
      </button>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isTabActive[item.key](pathname);
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-[48px] items-center gap-3 rounded-[14px] px-3 text-[15px] font-medium transition ${active ? 'bg-accent text-on-accent' : 'text-muted hover:bg-tile hover:text-ink'}`}
              >
                {item.icon}
                {t(`nav.${item.key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
