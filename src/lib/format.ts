const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });

/** Play-money amounts, always two decimals with thousands separators. */
export const formatMoney = (n: number) => money.format(n);

export function formatSigned(n: number): string {
  const s = money.format(Math.abs(n));
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

export function formatPct(n: number): string {
  const s = `${Math.abs(n).toFixed(2)}%`;
  return n > 0 ? `+${s}` : n < 0 ? `−${s}` : s;
}

export const formatShares = (n: number) => num.format(n);

export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${formatTime(d)}`;
}

export const priceKind = (isSimulated: boolean): 'Estimated' | 'Verified' => (isSimulated ? 'Estimated' : 'Verified');

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function pctChange(from: number, to: number): number {
  return from === 0 ? 0 : ((to - from) / from) * 100;
}

export const tone = (n: number): 'up' | 'down' | 'flat' => (n > 0 ? 'up' : n < 0 ? 'down' : 'flat');
