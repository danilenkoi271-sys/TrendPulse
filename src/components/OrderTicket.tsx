import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { executeTrade, type TradeReceipt } from '../lib/api';
import { formatMoney, formatShares, formatTime, round2 } from '../lib/format';
import type { Artist, Tick } from '../lib/types';
import { PriceBadge } from './PriceBadge';

type Side = 'buy' | 'sell';
type Step = 'edit' | 'review' | 'done';

interface Props {
  artist: Artist;
  tick: Tick | undefined;
  balance: number;
  sharesHeld: number;
  onTraded: () => void;
}

const QTY_RE = /^\d{0,9}(\.\d{0,4})?$/;

export function OrderTicket({ artist, tick, balance, sharesHeld, onTraded }: Props) {
  const [params] = useSearchParams();
  const [side, setSide] = useState<Side>(params.get('side') === 'sell' ? 'sell' : 'buy');
  const [qty, setQty] = useState('1');
  const [step, setStep] = useState<Step>('edit');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<(TradeReceipt & { side: Side }) | null>(null);

  const n = Number(qty);
  const price = tick?.price ?? 0;
  const simulated = tick?.is_simulated ?? true;
  const cost = useMemo(() => round2(n * price), [n, price]);

  const problem = useMemo(() => {
    if (!tick) return 'No price yet. The first estimate arrives within a minute.';
    if (!(n > 0)) return 'Enter a number of shares.';
    if (cost <= 0) return 'That order is too small.';
    if (side === 'buy' && cost > balance + 1e-9) return 'Estimated cost is more than your play-money balance.';
    if (side === 'sell' && n > sharesHeld + 1e-9) return `You hold ${formatShares(sharesHeld)} shares. Short selling isn't available.`;
    return null;
  }, [tick, n, cost, side, balance, sharesHeld]);

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      const r = await executeTrade(artist.id, side === 'buy' ? n : -n);
      setReceipt({ ...r, side });
      setStep('done');
      onTraded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The order could not be placed.');
      setStep('edit');
    } finally { setBusy(false); }
  };

  const reset = () => { setStep('edit'); setReceipt(null); setError(null); };

  return (
    <section className="card ticket" aria-label="Order ticket">
      <div className="ticket__head">
        <h2>Order ticket</h2>
        <span className="pm-chip">Play money</span>
      </div>

      {step === 'done' && receipt ? (
        <div className="ticket__done" role="status" data-testid="trade-confirmation">
          <div className="ticket__check" aria-hidden="true">✓</div>
          <p className="ticket__done-title">
            {receipt.side === 'buy' ? 'Bought' : 'Sold'} {formatShares(Math.abs(receipt.shares))} share{Math.abs(receipt.shares) === 1 ? '' : 's'} of {artist.name}
          </p>
          <p>
            Executed at <b className="num">{formatMoney(receipt.price)}</b> <PriceBadge simulated={receipt.isSimulated} />
          </p>
          <p className="muted">
            {receipt.isSimulated
              ? 'This was an estimated price: a simulated tick between verified updates.'
              : 'This was a verified price, calculated from the latest YouTube data update.'}
          </p>
          <button className="btn btn--primary btn--block" onClick={reset}>New order</button>
        </div>
      ) : (
        <>
          <div className="seg" role="tablist" aria-label="Order side">
            {(['buy', 'sell'] as const).map((s) => (
              <button key={s} role="tab" aria-selected={side === s} className={`seg__btn seg__btn--${s} ${side === s ? 'is-on' : ''}`}
                onClick={() => { setSide(s); setError(null); setStep('edit'); }} disabled={busy}>
                {s === 'buy' ? 'Buy' : 'Sell'}
              </button>
            ))}
          </div>

          <div className="ticket__price">
            <span className="muted">{simulated ? 'Estimated price' : 'Verified price'}</span>
            <span><b className="num">{tick ? formatMoney(price) : '—'}</b> {tick && <PriceBadge simulated={simulated} />}</span>
          </div>

          <label className="field">
            <span>Shares</span>
            <input inputMode="decimal" value={qty} disabled={step === 'review' || busy} aria-label="Shares"
              onChange={(e) => QTY_RE.test(e.target.value) && setQty(e.target.value)} />
          </label>

          <dl className="ticket__rows">
            <div><dt>{side === 'buy' ? 'Estimated cost' : 'Estimated proceeds'}</dt><dd className="num">{n > 0 && tick ? formatMoney(cost) : '—'}</dd></div>
            <div><dt>Available balance</dt><dd className="num">{formatMoney(balance)}</dd></div>
            {side === 'sell' && <div><dt>Shares held</dt><dd className="num">{formatShares(sharesHeld)}</dd></div>}
          </dl>

          {(error || (problem && qty !== '')) && <p className="form-error" role="alert">{error ?? problem}</p>}

          {step === 'edit' ? (
            <button className={`btn btn--block ${side === 'buy' ? 'btn--buy' : 'btn--sell'}`} disabled={!!problem || busy} onClick={() => setStep('review')}>
              Review {side} order
            </button>
          ) : (
            <div className="ticket__review" data-testid="order-review">
              <p>
                <b>{side === 'buy' ? 'Buy' : 'Sell'} {formatShares(n)} share{n === 1 ? '' : 's'}</b> of {artist.name} at about{' '}
                <b className="num">{formatMoney(price)}</b> <PriceBadge simulated={simulated} />
              </p>
              <p className="muted">
                {simulated
                  ? 'Estimated price: a simulated tick between verified updates.'
                  : `Verified price from ${tick ? formatTime(tick.created_at) : 'the latest update'}.`}{' '}
                The price is locked in when you confirm, so it may differ slightly.
              </p>
              <div className="ticket__review-actions">
                <button className="btn btn--ghost" onClick={() => setStep('edit')} disabled={busy}>Back</button>
                <button className={`btn ${side === 'buy' ? 'btn--buy' : 'btn--sell'}`} onClick={confirm} disabled={busy}>
                  {busy ? 'Placing…' : `Confirm ${side}`}
                </button>
              </div>
            </div>
          )}
          <p className="ticket__fine">Play money. No cash value. Shares can be bought and sold, never sold short.</p>
        </>
      )}
    </section>
  );
}
