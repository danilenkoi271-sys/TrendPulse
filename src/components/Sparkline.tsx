import { splitRuns } from '../lib/ticks';
import type { Tick } from '../lib/types';

export function Sparkline({ ticks, width = 120, height = 36 }: { ticks: Tick[]; width?: number; height?: number }) {
  if (ticks.length < 2) return <svg width={width} height={height} aria-hidden="true" />;
  const prices = ticks.map((t) => t.price);
  const lo = Math.min(...prices), hi = Math.max(...prices);
  const span = hi - lo || 1;
  const idx = new Map(ticks.map((t, i) => [t.id, i]));
  const x = (t: Tick) => 2 + ((idx.get(t.id) ?? 0) / (ticks.length - 1)) * (width - 4);
  const y = (p: number) => 3 + (1 - (p - lo) / span) * (height - 6);
  const d = (pts: Tick[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ');
  const up = ticks[ticks.length - 1].price >= ticks[0].price;
  return (
    <svg width={width} height={height} className={`spark spark--${up ? 'up' : 'down'}`} aria-hidden="true">
      {splitRuns(ticks).map((r, i) => (
        <path key={i} d={d(r.points)} className={r.simulated ? 'spark__line spark__line--est' : 'spark__line'} />
      ))}
    </svg>
  );
}
