import type { BudgetLevel } from '@/domain/reports/budget';

const COLOR: Record<BudgetLevel, string> = {
  ok: 'bg-accent',
  warning: 'bg-warn',
  over: 'bg-expense',
};

export function ProgressBar({
  ratio,
  level,
  label,
}: {
  ratio: number;
  level: BudgetLevel;
  label: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      className="h-2 overflow-hidden rounded-full bg-tile"
    >
      <div
        className={`h-full rounded-full transition-all ${COLOR[level]}`}
        style={{ width: `${Math.min(100, ratio * 100)}%` }}
      />
    </div>
  );
}
