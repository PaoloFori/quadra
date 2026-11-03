import { useState } from 'react';
import { useFormat } from '@/i18n/useFormat';

export interface DonutSlice {
  id: string;
  name: string;
  value: number;
  color: string;
}

const SIZE = 132;
/** Spazio ritagliato ai due lati di ogni fetta, in gradi (non c'è con una sola fetta). */
const GAP_DEG = 1.72;

/**
 * Ciambella: tocca una fetta per vedere solo quella categoria (anello nel suo colore, importo al centro);
 * tocca ancora o il centro per tornare al totale.
 */
export function DonutChart({
  slices,
  centerLabel,
  variant = 'donut',
}: {
  slices: DonutSlice[];
  centerLabel: string;
  /** 'pie' = torta piena (il totale/selezione compare sotto invece che al centro). */
  variant?: 'donut' | 'pie';
}) {
  const pie = variant === 'pie';
  // La torta è un cerchio con raggio SIZE/4 e tratto SIZE/2: riempie tutto il disco.
  const STROKE = pie ? SIZE / 2 : 15;
  const R = pie ? SIZE / 4 : (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const f = useFormat();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const selected = slices.find((s) => s.id === selectedId);
  const gap = slices.filter((s) => s.value > 0).length > 1 ? GAP_DEG : 0;

  let start = 0;
  const arcs = slices.map((s) => {
    const sweep = total === 0 ? 0 : (360 * s.value) / total;
    const arc = { slice: s, start, sweep };
    start += sweep;
    return arc;
  });

  const circle = (
    color: string,
    from: number,
    sweep: number,
    key: string,
    onClick?: () => void,
  ) => (
    <circle
      key={key}
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={R}
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeDasharray={`${(C * sweep) / 360} ${C}`}
      transform={`rotate(${-90 + from} ${SIZE / 2} ${SIZE / 2})`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    />
  );

  return (
    <div className="relative shrink-0" style={{ width: SIZE }}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          role="img"
          aria-label={slices.map((s) => `${s.name}: ${f.currency(s.value)}`).join(', ')}
        >
          {selected
            ? [
                circle(selected.color + '40', 0, 360, 'track'),
                ...arcs
                  .filter((a) => a.slice.id === selected.id)
                  .map((a) =>
                    circle(a.slice.color, a.start, a.sweep, a.slice.id, () => setSelectedId(null)),
                  ),
              ]
            : arcs
                .filter((a) => a.sweep > 2 * gap)
                .map((a) =>
                  circle(a.slice.color, a.start + gap, a.sweep - 2 * gap, a.slice.id, () =>
                    setSelectedId(a.slice.id),
                  ),
                )}
        </svg>
        {!pie && (
          <button
            className="absolute inset-0 m-auto flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full"
            aria-label={centerLabel}
            onClick={() => setSelectedId(null)}
          >
            <span className="max-w-[78px] truncate text-[11px] text-muted">
              {selected ? selected.name : centerLabel}
            </span>
            <span className="font-display tabular text-[17px] font-medium tracking-[-0.02em]">
              {f.currency(selected ? selected.value : total)}
            </span>
          </button>
        )}
      </div>
      {pie && (
        <button
          className="mt-1.5 flex w-full flex-col items-center"
          aria-label={centerLabel}
          onClick={() => setSelectedId(null)}
        >
          <span className="max-w-full truncate text-[11px] text-muted">
            {selected ? selected.name : centerLabel}
          </span>
          <span className="font-display tabular text-[17px] font-medium tracking-[-0.02em]">
            {f.currency(selected ? selected.value : total)}
          </span>
        </button>
      )}
    </div>
  );
}
