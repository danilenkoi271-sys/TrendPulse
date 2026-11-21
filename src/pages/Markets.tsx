import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArtists, fetchRecentTicks } from '../lib/api';
import { formatMoney, formatPct, pctChange, tone } from '../lib/format';
import type { Artist, Tick } from '../lib/types';
import { PriceBadge } from '../components/PriceBadge';
import { Sparkline } from '../components/Sparkline';

interface Row { artist: Artist; ticks: Tick[] }

export default function Markets() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const artists = await fetchArtists();
        const all = await Promise.all(artists.map(async (artist) => ({ artist, ticks: await fetchRecentTicks(artist.id, 90) })));
        if (alive) { setRows(all); setError(null); }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Could not load markets.'); }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const shown = useMemo(() => (rows ?? []).filter((r) => r.artist.name.toLowerCase().includes(q.trim().toLowerCase())), [rows, q]);

  return (
    <main className="page">
      <div className="page__head">
        <div>
          <h1>Markets</h1>
          <p className="muted">Prices follow how each channel's views compare with its expected pace. Verified prices come from YouTube data every 15 minutes; between updates you'll see clearly marked estimates.</p>
        </div>
        <label className="search">
          <span className="sr-only">Search artists</span>
          <input type="search" placeholder="Search artists" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!rows && !error && <div className="skeleton-list" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}</div>}

      {rows && (
        <ul className="market-list">
          <li className="market-list__head" aria-hidden="true"><span>Artist</span><span>Price</span><span>Vs. base</span><span>Trend</span></li>
          {shown.map(({ artist, ticks }) => {
            const last = ticks[ticks.length - 1];
            const change = last ? pctChange(artist.base_price, last.price) : 0;
            return (
              <li key={artist.id}>
                <Link to={`/artists/${artist.id}`} className="market-row">
                  <span className="market-row__name">{artist.name}</span>
                  <span className="market-row__price">
                    {last ? (<><b className="num">{formatMoney(last.price)}</b> <PriceBadge simulated={last.is_simulated} /></>) : <span className="muted">Awaiting first price</span>}
                  </span>
                  <span className={`num tone--${tone(change)}`}>
                    {last ? formatPct(change) : '—'} {last?.is_simulated && <em className="est-tag">est.</em>}
                  </span>
                  <span className="market-row__spark"><Sparkline ticks={ticks} /></span>
                </Link>
              </li>
            );
          })}
          {shown.length === 0 && <li className="empty">{rows.length === 0 ? 'No artists are listed yet.' : 'No artists match your search.'}</li>}
        </ul>
      )}
    </main>
  );
}
