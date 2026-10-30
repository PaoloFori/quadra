import { Link } from 'react-router-dom';

interface Props {
  to: string;
  label: string;
  hint?: string;
}

/** Riga di navigazione stile "Impostazioni iOS". */
export function NavRow({ to, label, hint }: Props) {
  return (
    <Link
      to={to}
      className="flex min-h-[48px] items-center justify-between gap-3 border-b border-line/60 px-1 last:border-0"
    >
      <span>{label}</span>
      <span className="flex items-center gap-2 text-muted">
        {hint && <span className="text-[13px]">{hint}</span>}›
      </span>
    </Link>
  );
}
