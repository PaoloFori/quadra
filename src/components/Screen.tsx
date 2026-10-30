import type { ReactNode } from 'react';

interface Props {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Contenitore standard di una schermata: titolo grande + contenuto con safe area. */
export function Screen({ title, action, children }: Props) {
  return (
    <main
      className="mx-auto max-w-xl px-4 pb-8"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <header className="flex min-h-[44px] items-center justify-between gap-2 pb-2 pt-2">
        <h1 className="truncate text-[28px] font-bold leading-tight">{title}</h1>
        {action}
      </header>
      {children}
    </main>
  );
}
