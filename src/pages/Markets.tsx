import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArtists, fetchRecentTicks } from '../lib/api';
import { formatMoney, formatPct, pctChange, tone } from '../lib/format';
import type { Artist, Tick } from '../lib/types';
import { Avatar } from '../components/Avatar';
import { PriceBadge } from '../components/PriceBadge';
import { Sparkline } from '../components/Sparkline';

interface Row { artist: Artist; ticks: Tick[]; change: number }
type Filter = 'all' | 'gainers' | 'losers';

export default function Markets() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const artists = await fetchArtists();
        const all = await Promise.all(artists.map(async (artist) => {
          const ticks = await fetchRecentTicks(artist.id, 90);
          const last = ticks[ticks.length - 1];
          return { artist, ticks, change: last ? pctChange(artist.base_price, last.price) : 0 };
        }));
        if (alive) { setRows(all); setError(null); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Could not load markets.'); }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const shown = useMemo(() => {
    let r = (rows ?? []).filter((x) => x.artist.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (filter === 'gainers') r = r.filter((x) => x.change > 0).sort((a, b) => b.change - a.change);
    if (filter === 'losers') r = r.filter((x) => x.change < 0).sort((a, b) => a.change - b.change);
    return r;
  }, [rows, q, filter]);

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>Markets</h1>
          <p className="muted">The top 10 YouTube creators. Verified prices come from YouTube data every 15 minutes; between updates you'll see clearly marked estimates.</p>
        </div>
        <label className="search">
          <span className="sr-only">Search creators</span>
          <input type="search" placeholder="Search creators" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      <div className="chips" role="tablist" aria-label="Filter">
        {(['all', 'gainers', 'losers'] as const).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? 'is-on' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All creators' : f === 'gainers' ? 'Up vs. base' : 'Down vs. base'}
          </button>
        ))}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!rows && !error && <div className="skeleton-list" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>}

      {rows && (
        <ul className="market-grid">
          {shown.map(({ artist, ticks, change }, i) => {
            const last = ticks[ticks.length - 1];
            return (
              <li key={artist.id} className="mcard" style={{ '--i': i } as React.CSSProperties}>
                <Link to={`/artists/${artist.id}`} className="mcard__top" aria-label={`${artist.name} market`}>
                  <Avatar name={artist.name} />
                  <span><span className="mcard__name">{artist.name}</span><br /><span className="mcard__rank">YouTube creator</span></span>
                </Link>
                <div className="mcard__mid">
                  <div>
                    {last ? (
                      <>
                        <div className="mcard__price num">{formatMoney(last.price)}</div>
                        <div className="mcard__sub">
                          <PriceBadge simulated={last.is_simulated} />
                          <span className={`num tone--${tone(change)}`}>{formatPct(change)} vs. base</span>
                          {last.is_simulated && <em className="est-tag">est.</em>}
                        </div>
                      </>
                    ) : <span className="muted">Awaiting first price</span>}
                  </div>
                  <Sparkline ticks={ticks} width={96} height={44} />
                </div>
                <div className="mcard__actions">
                  <Link to={`/artists/${artist.id}`} className="btn btn--buy btn--sm">Buy</Link>
                  <Link to={`/artists/${artist.id}?side=sell`} className="btn btn--sell btn--sm">Sell</Link>
                </div>
              </li>
            );
          })}
          {shown.length === 0 && <li className="empty">{rows.length === 0 ? 'No creators are listed yet.' : 'No creators match.'}</li>}
        </ul>
      )}
    </main>
  );
}
