import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchArtist, fetchChartTicks, fetchLastReal, fetchPortfolio } from '../lib/api';
import { formatMoney, formatPct, formatSigned, formatTime, pctChange, tone } from '../lib/format';
import { lastRealTick } from '../lib/ticks';
import type { Artist as ArtistT, PortfolioSummary, Range, Tick } from '../lib/types';
import { useLiveTicks } from '../hooks/useLiveTicks';
import { OrderTicket } from '../components/OrderTicket';
import { PositionPanel } from '../components/PositionPanel';
import { PriceBadge } from '../components/PriceBadge';
import { PriceChart } from '../components/PriceChart';

const RANGES: Range[] = ['1H', '1D', '1W', '1M'];
const NONE: Tick[] = [];

export default function ArtistPage() {
  const { id } = useParams();
  const [artist, setArtist] = useState<ArtistT | null | undefined>(undefined);
  const [range, setRange] = useState<Range>('1D');
  const [seed, setSeed] = useState<Tick[]>(NONE);
  const [lastReal, setLastReal] = useState<Tick | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ticks, mode } = useLiveTicks(artist?.id, seed);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchArtist(id).then((a) => alive && setArtist(a)).catch((e) => { if (alive) { setArtist(null); setError(e.message); } });
    fetchLastReal(id).then((t) => alive && setLastReal(t)).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchChartTicks(id, range).then((t) => alive && setSeed(t)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [id, range]);

  const refreshPortfolio = useCallback(() => { fetchPortfolio().then(setPortfolio).catch(() => {}); }, []);
  useEffect(refreshPortfolio, [refreshPortfolio]);

  if (artist === undefined) return <main className="page"><div className="skeleton" /></main>;
  if (artist === null) return <main className="page"><p className="form-error">{error ?? 'Artist not found.'}</p><Link to="/markets">Back to markets</Link></main>;

  const latest = ticks[ticks.length - 1];
  const live = lastRealTick(ticks);
  const verified = live && (!lastReal || live.id > lastReal.id) ? live : lastReal;
  const change = latest && ticks[0] ? latest.price - ticks[0].price : 0;
  const changePct = latest && ticks[0] ? pctChange(ticks[0].price, latest.price) : 0;
  const holding = portfolio?.holdings.find((h) => h.artist_id === artist.id);

  return (
    <main className="page artist">
      <div className="artist__main">
        <Link to="/markets" className="back">← Markets</Link>
        <header className="artist__head">
          <h1>{artist.name}</h1>
          <div className="artist__price">
            <span className="artist__big num" data-testid="header-price">{latest ? formatMoney(latest.price) : '—'}</span>
            {latest && <PriceBadge simulated={latest.is_simulated} />}
          </div>
          <div className="artist__meta">
            <span className={`num tone--${tone(change)}`}>
              {formatSigned(change)} ({formatPct(changePct)}) <span className="muted">past {range}</span>
              {latest?.is_simulated && <em className="est-tag">est.</em>}
            </span>
            <span className="muted" data-testid="verified-at">
              {verified ? `Verified at ${formatTime(verified.created_at)}` : 'No verified update yet'}
            </span>
          </div>
        </header>

        <div className="card chartcard">
          <div className="range" role="tablist" aria-label="Chart range">
            {RANGES.map((r) => (
              <button key={r} role="tab" aria-selected={range === r} className={`range__btn ${range === r ? 'is-on' : ''}`} onClick={() => setRange(r)}>{r}</button>
            ))}
          </div>
          <PriceChart ticks={ticks} />
          <p className="chartcard__note">
            {range === '1W' || range === '1M' ? 'Longer ranges show verified points, plus every estimate from the last hour. ' : ''}
            {mode === 'realtime' ? 'New prices appear here automatically.' : mode === 'polling' ? 'Checking for new prices every 30 seconds.' : 'Connecting for automatic updates…'}
          </p>
        </div>
      </div>

      <aside className="artist__side">
        <OrderTicket artist={artist} tick={latest} balance={portfolio?.balance ?? 0} sharesHeld={holding?.shares ?? 0} onTraded={refreshPortfolio} />
        <PositionPanel shares={holding?.shares ?? 0} avgCost={holding?.avg_cost ?? 0} tick={latest} />
      </aside>
    </main>
  );
}
