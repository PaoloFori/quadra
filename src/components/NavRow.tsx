import { Link } from 'react-router-dom';
import { IconTile } from './ui';

interface Props {
  to: string;
  label: string;
  hint?: string;
  icon?: string;
}

/** Riga di navigazione stile "Impostazioni iOS". */
export function NavRow({ to, label, hint, icon }: Props) {
  return (
    <Link
      to={to}
      className="flex min-h-[56px] items-center gap-3 border-b border-line/60 px-1 last:border-0"
    >
      {icon && <IconTile>{icon}</IconTile>}
      <span className="flex-1 font-medium">{label}</span>
      <span className="flex items-center gap-2 text-faint">
        {hint && <span className="text-[13px]">{hint}</span>}›
      </span>
    </Link>
  );
}
