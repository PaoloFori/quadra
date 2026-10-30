import { useId } from 'react';

const W = 320;
const H = 140;
const PAD_Y = 12;

/**
 * Andamento del patrimonio: linea blu con sfumatura, griglia tratteggiata, punto finale cerchiato.
 * I punti da `projectedFrom` in poi sono una stima: tratteggiati e senza area.
 */
export function WealthChart({
  values,
  labels,
  projectedFrom,
  label,
}: {
  values: number[];
  labels: string[];
  projectedFrom?: number;
  label: string;
}) {
  const gradient = useId();
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const lastReal = Math.min((projectedFrom ?? values.length) - 1, values.length - 1);
  const stepX = (W - 14) / (values.length - 1);
  const points = values.map((v, i) => ({
    x: 7 + i * stepX,
    y: PAD_Y + (H - 2 * PAD_Y) * (1 - (v - min) / (max - min)),
  }));
  const path = (pts: typeof points): string =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const real = points.slice(0, lastReal + 1);
  const tail = points.slice(lastReal);
  const end = points[lastReal]!;
  const area = `${path(real)} L${real[real.length - 1]!.x} ${H} L${real[0]!.x} ${H} Z`;
  // al massimo 6 etichette sull'asse, distribuite
  const count = Math.min(labels.length, 6);
  const shown = Array.from({ length: count }, (_, k) =>
    Math.round((k * (labels.length - 1)) / Math.max(count - 1, 1)),
  );

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.15, 0.5, 0.85].map((g) => (
          <line
            key={g}
            x1="0"
            x2={W}
            y1={H * g}
            y2={H * g}
            stroke="rgb(var(--line))"
            strokeDasharray="4 4"
          />
        ))}
        <path d={area} fill={`url(#${gradient})`} />
        <path
          d={path(real)}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {tail.length > 1 && (
          <path
            d={path(tail)}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeOpacity="0.6"
            strokeWidth="2"
            strokeDasharray="6 5"
            strokeLinecap="round"
          />
        )}
        <circle cx={end.x} cy={end.y} r="6" fill="rgb(var(--bg))" />
        <circle
          cx={end.x}
          cy={end.y}
          r="4.5"
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="3"
        />
      </svg>
      <div className="mt-2 flex justify-between px-[7px] text-[11px] font-medium text-faint">
        {shown.map((i) => (
          <span key={i}>{labels[i]}</span>
        ))}
      </div>
    </div>
  );
}
