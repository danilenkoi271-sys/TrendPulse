import { formatMoney, formatPct, formatShares, formatSigned, pctChange, tone } from '../lib/format';
import type { Tick } from '../lib/types';
import { PriceBadge } from './PriceBadge';

interface Props { shares: number; avgCost: number; tick: Tick | undefined }

export function PositionPanel({ shares, avgCost, tick }: Props) {
  const price = tick?.price ?? 0;
  const simulated = tick?.is_simulated ?? true;
  const value = shares * price;
  const pnl = shares * (price - avgCost);
  const t = tone(pnl);
  return (
    <section className="card position" aria-label="Your position">
      <div className="ticket__head"><h2>Your position</h2>{tick && <PriceBadge simulated={simulated} />}</div>
      {shares <= 0 ? (
        <p className="muted">You don't hold any shares yet. Place a buy order to open a position.</p>
      ) : (
        <dl className="ticket__rows">
          <div><dt>Shares held</dt><dd className="num">{formatShares(shares)}</dd></div>
          <div><dt>Average cost</dt><dd className="num">{formatMoney(avgCost)}</dd></div>
          <div><dt>Market value {simulated && <em className="est-tag">est.</em>}</dt><dd className="num">{formatMoney(value)}</dd></div>
          <div>
            <dt>Unrealised P&amp;L {simulated && <em className="est-tag">est.</em>}</dt>
            <dd className={`num tone--${t}`}>{formatSigned(pnl)} <small>({formatPct(pctChange(avgCost, price))})</small></dd>
          </div>
        </dl>
      )}
      {shares > 0 && <p className="ticket__fine">{simulated ? 'Based on an estimated price, not a verified one.' : 'Based on a verified price.'}</p>}
    </section>
  );
}
