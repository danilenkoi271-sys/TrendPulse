/** Price with a sensible number of decimals for any magnitude, e.g. $59,021.30 / $1.6264 / $0.00004961. */
export function formatPrice(p: number): string {
  const abs = Math.abs(p);
  const dp = abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 5 : 8;
  const s = p.toLocaleString('en-US', { minimumFractionDigits: dp === 8 ? 4 : dp, maximumFractionDigits: dp });
  return `$${s}`;
}

/** Compact USD volume: $5.87B, $42.50M, $13.0K, $850. */
export function formatVolume(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function formatPct(p: number): string {
  const s = `${Math.abs(p).toFixed(2)}%`;
  return p > 0 ? `+${s}` : p < 0 ? `-${s}` : s;
}

export const trend = (n: number): 'up' | 'down' | 'flat' => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');

export function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour12: false });
}
