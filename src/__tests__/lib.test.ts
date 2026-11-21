import { describe, expect, it } from 'vitest';
import { formatMoney, formatPct, formatSigned, pctChange, round2 } from '../lib/format';
import { downsample, mergeTicks, splitRuns } from '../lib/ticks';
import type { Tick } from '../lib/types';

const t = (id: number, price: number, sim: boolean): Tick => ({ id, artist_id: 'a', price, is_simulated: sim, created_at: new Date(1_700_000_000_000 + id * 60_000).toISOString() });

describe('format', () => {
  it('formats play money with two decimals and separators', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
    expect(formatMoney(1000)).toBe('$1,000.00');
    expect(formatSigned(-5)).toBe('−$5.00');
    expect(formatSigned(5)).toBe('+$5.00');
    expect(formatPct(2.345)).toBe('+2.35%');
    expect(round2(1.005 + 1e-12)).toBe(1.01);
    expect(pctChange(100, 110)).toBeCloseTo(10);
  });
});

describe('ticks', () => {
  it('splits into runs of the same kind with continuous joins', () => {
    const runs = splitRuns([t(1, 10, false), t(2, 11, false), t(3, 12, true), t(4, 13, true), t(5, 14, false)]);
    expect(runs.map((r) => [r.simulated, r.points.map((p) => p.id)])).toEqual([
      [false, [1, 2]],
      [true, [2, 3, 4]],
      [false, [4, 5]],
    ]);
  });
  it('merges without duplicates, ascending', () => {
    expect(mergeTicks([t(2, 1, false), t(1, 1, false)], [t(2, 9, true), t(3, 1, false)]).map((x) => [x.id, x.price])).toEqual([[1, 1], [2, 9], [3, 1]]);
  });
  it('downsamples keeping first and last', () => {
    const many = Array.from({ length: 1000 }, (_, i) => t(i + 1, i, false));
    const out = downsample(many, 100);
    expect(out).toHaveLength(100);
    expect(out[0].id).toBe(1);
    expect(out[99].id).toBe(1000);
  });
});
