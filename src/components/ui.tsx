import type { ReactNode } from 'react';

/** Etichetta in maiuscolo con puntino colorato facoltativo. */
export function LabelCaps({ children, dot }: { children: ReactNode; dot?: string }) {
  return (
    <span className="label-caps inline-flex items-center gap-1.5">
      {dot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </span>
  );
}

/** Tessera 40px con icona: neutra, o lime per le entrate. */
export function IconTile({
  children,
  accent = false,
  color,
}: {
  children: ReactNode;
  accent?: boolean;
  color?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px] ${accent ? 'bg-accent-subtle' : 'bg-tile'}`}
      style={color && !accent ? { backgroundColor: `${color}26` } : undefined}
    >
      {children}
    </span>
  );
}

/** Tessera statistica: puntino + etichetta, importo sotto. Si mette in coppia (grid 2 colonne). */
export function MetricCard({
  label,
  dot,
  badge,
  children,
}: {
  label: string;
  dot: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <div className="card-row space-y-2.5 p-4">
      <div className="flex items-center justify-between gap-2">
        <LabelCaps dot={dot}>{label}</LabelCaps>
        {badge && <Badge accent>{badge}</Badge>}
      </div>
      <div className="font-display text-[20px] font-medium leading-6 tracking-[-0.02em]">
        {children}
      </div>
    </div>
  );
}

export function Badge({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${accent ? 'bg-accent-subtle text-accent' : 'bg-tile text-muted'}`}
    >
      {children}
    </span>
  );
}

/** Titolo di una scheda, con un'azione facoltativa a destra. */
export function SectionTitle({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {trailing}
    </div>
  );
}
