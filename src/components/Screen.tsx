import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Riga sopra il titolo (es. il mese). */
  eyebrow?: string;
  subtitle?: string;
  action?: ReactNode;
  /** Su schermi larghi le schede si dispongono su due colonne. */
  masonry?: boolean;
  children: ReactNode;
}

/** Contenitore standard di una schermata: titolo grande + contenuto con safe area e spazio per la barra flottante. */
export function Screen({ title, eyebrow, subtitle, action, masonry = false, children }: Props) {
  return (
    <main
      className="mx-auto w-full max-w-xl px-6 pb-8 md:max-w-3xl md:px-8 lg:max-w-5xl lg:px-10"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <header className="flex min-h-[44px] items-center justify-between gap-3 pb-4 pt-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-[13px] capitalize text-muted">{eyebrow}</p>}
          <h1 className="font-display truncate text-[28px] font-medium leading-tight tracking-[-0.02em]">
            {title}
          </h1>
          {subtitle && <p className="text-[13px] capitalize text-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={masonry ? 'masonry' : 'space-y-4'}>{children}</div>
    </main>
  );
}
