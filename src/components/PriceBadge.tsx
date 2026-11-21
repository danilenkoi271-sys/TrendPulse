import { priceKind } from '../lib/format';

/** Marks a figure as Verified (real YouTube-based tick) or Estimated (simulated tick). */
export function PriceBadge({ simulated, className = '' }: { simulated: boolean; className?: string }) {
  return (
    <span
      className={`badge ${simulated ? 'badge--est' : 'badge--ver'} ${className}`}
      title={simulated ? 'Simulated between verified updates. Not a verified value.' : 'Calculated from a YouTube data update.'}
      data-testid="price-badge"
    >
      {priceKind(simulated)}
    </span>
  );
}
