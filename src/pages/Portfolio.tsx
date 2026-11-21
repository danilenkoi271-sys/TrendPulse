import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPortfolio, fetchTrades } from '../lib/api';
import { formatDateTime, formatMoney, formatPct, formatShares, formatSigned, pctChange, tone } from '../lib/format';
import type { PortfolioSummary, TradeRow } from '../lib/types';
import { PriceBadge } from '../components/PriceBadge';

export default function Portfolio() {
  const [p, setP] = useState<PortfolioSummary | null>(null);
  const [trades, setTrades] = useState<TradeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetchPortfolio().then((x) => alive && setP(x)).catch((e) => alive && setError(e.message));
      fetchTrades().then((x) => alive && setTrades(x)).catch((e) => alive && setError(e.message));
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <main className="page">
      <div className="page__head"><h1>Portfolio</h1></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!p ? <div className="skeleton" aria-busy="true" /> : (
        <>
          <section className="stats" aria-label="Account summary">
            <div className="card stat stat--hero">
              <span className="stat__label">Total value {p.any_estimated && <em className="est-tag">includes estimates</em>}</span>
              <b className="stat__value num" data-testid="total-value">{formatMoney(p.total_value)}</b>
              <span className="muted">{p.any_estimated ? 'Some holdings use estimated prices.' : 'All holdings use verified prices.'}</span>
            </div>
            <div className="card stat"><span className="stat__label">Cash (play money)</span><b className="stat__value num">{formatMoney(p.balance)}</b></div>
            <div className="card stat">
              <span className="stat__label">Unrealised P&amp;L {p.any_estimated && <em className="est-tag">est.</em>}</span>
              <b className={`stat__value num tone--${tone(p.unrealised_pnl)}`}>{formatSigned(p.unrealised_pnl)}</b>
            </div>
          </section>

          <h2 className="section-title">Holdings</h2>
          {p.holdings.length === 0 ? (
            <p className="empty card">Nothing here yet. <Link to="/markets">Browse markets</Link> to place your first order.</p>
          ) : (
            <div className="table-wrap card">
              <table className="table">
                <thead><tr><th>Artist</th><th className="r">Shares</th><th className="r">Avg. cost</th><th className="r">Price</th><th className="r">Market value</th><th className="r">P&amp;L</th></tr></thead>
                <tbody>
                  {p.holdings.map((h) => (
                    <tr key={h.artist_id}>
                      <td><Link to={`/artists/${h.artist_id}`}>{h.name}</Link></td>
                      <td className="r num">{formatShares(h.shares)}</td>
                      <td className="r num">{formatMoney(h.avg_cost)}</td>
                      <td className="r num">{formatMoney(h.latest_price)} <PriceBadge simulated={h.price_is_simulated} /></td>
                      <td className="r num">{formatMoney(h.market_value)} {h.price_is_simulated && <em className="est-tag">est.</em>}</td>
                      <td className={`r num tone--${tone(h.unrealised_pnl)}`}>
                        {formatSigned(h.unrealised_pnl)} <small>({formatPct(pctChange(h.avg_cost, h.latest_price))})</small> {h.price_is_simulated && <em className="est-tag">est.</em>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="section-title">Trade history</h2>
          {!trades ? <div className="skeleton" /> : trades.length === 0 ? <p className="empty card">No trades yet.</p> : (
            <div className="table-wrap card">
              <table className="table">
                <thead><tr><th>When</th><th>Artist</th><th>Side</th><th className="r">Shares</th><th className="r">Price</th><th className="r">Total</th></tr></thead>
                <tbody>
                  {trades.map((t) => (
                    <tr key={t.id}>
                      <td className="muted">{formatDateTime(t.created_at)}</td>
                      <td>{t.artists?.name ?? '—'}</td>
                      <td><span className={`side side--${t.shares > 0 ? 'buy' : 'sell'}`}>{t.shares > 0 ? 'Buy' : 'Sell'}</span></td>
                      <td className="r num">{formatShares(Math.abs(t.shares))}</td>
                      <td className="r num">{formatMoney(t.price)} <PriceBadge simulated={t.price_is_simulated} /></td>
                      <td className="r num">{formatMoney(Math.abs(t.shares) * t.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
