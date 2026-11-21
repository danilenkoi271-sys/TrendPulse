import type { Range, Tick } from './types';

export const RANGE_MS: Record<Range, number> = {
  '1H': 3600_000,
  '1D': 86_400_000,
  '1W': 7 * 86_400_000,
  '1M': 30 * 86_400_000,
};

/** Merge, de-duplicate by id and sort ascending. */
export function mergeTicks(existing: Tick[], incoming: Tick[]): Tick[] {
  const map = new Map<number, Tick>();
  for (const t of existing) map.set(t.id, t);
  for (const t of incoming) map.set(t.id, t);
  return [...map.values()].sort((a, b) => a.id - b.id);
}

export interface Run { simulated: boolean; points: Tick[] }

/**
 * Split ticks into consecutive runs of the same kind. The first point of each run after the
 * first is repeated as the last point of the previous one, so the drawn line is continuous.
 */
export function splitRuns(ticks: Tick[]): Run[] {
  const runs: Run[] = [];
  for (const t of ticks) {
    const cur = runs[runs.length - 1];
    if (!cur || cur.simulated !== t.is_simulated) {
      const prev = cur?.points[cur.points.length - 1];
      runs.push({ simulated: t.is_simulated, points: prev ? [prev, t] : [t] });
    } else {
      cur.points.push(t);
    }
  }
  return runs;
}

/** Stride downsample to at most `max` points, always keeping first and last. */
export function downsample(ticks: Tick[], max: number): Tick[] {
  if (ticks.length <= max) return ticks;
  const step = (ticks.length - 1) / (max - 1);
  const out: Tick[] = [];
  for (let i = 0; i < max; i++) out.push(ticks[Math.round(i * step)]);
  return out;
}

export const latestTick = (ticks: Tick[]): Tick | undefined => ticks[ticks.length - 1];
export const lastRealTick = (ticks: Tick[]): Tick | undefined => [...ticks].reverse().find((t) => !t.is_simulated);
