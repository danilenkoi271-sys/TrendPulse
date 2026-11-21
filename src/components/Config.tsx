import { useEffect, useMemo, useState } from 'react';
import { fetchMarkets, type Market } from '../lib/hyperliquid';
import { formatPct, formatPrice, formatVolume, trend } from '../lib/format';
import { enterFullscreen, fullscreenSupported } from '../lib/fullscreen';
import { CYCLE_MS, REFRESH_MS } from '../lib/timing';

interface Props {
  initial: string[];
  onStart: (selected: string[]) => void;
}

type Filter = 'all' | 'perp' | 'spot';
const LIST_LIMIT = 120;

export function Config({ initial, onStart }: Props) {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(initial);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetchMarkets()
      .then((list) => { if (alive) setMarkets([...list].sort((a, b) => b.volume - a.volume)); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load markets'); });
    return () => { alive = false; };
  }, [attempt]);

  const known = useMemo(() => new Set((markets ?? []).map((m) => m.key)), [markets]);
  const validSelected = markets ? selected.filter((k) => known.has(k)) : selected;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (markets ?? []).filter((m) => (filter === 'all' || m.kind === filter) && (!q || m.label.toLowerCase().includes(q)));
    return q ? list.slice(0, 200) : list.slice(0, LIST_LIMIT);
  }, [markets, query, filter]);

  const toggle = (key: string) => setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  const top10 = () => setSelected((markets ?? []).filter((m) => m.kind === 'perp').slice(0, 10).map((m) => m.key));

  const start = async (full: boolean) => {
    if (validSelected.length === 0) return;
    if (full) await enterFullscreen(); // must run inside the click that started it
    onStart(validSelected);
  };

  return (
    <div className="cfg">
      <div className="cfg__panel">
        <div className="dots" aria-hidden="true" />
        <h1 className="led cfg__title">HYPERLIQUID LED BOARD</h1>
        <p className="cfg__lead">
          Choose the markets to cycle through. Prices refresh every {REFRESH_MS / 1000} seconds and the board moves to the next market every {CYCLE_MS / 1000} seconds.
          In full screen, tap anywhere to skip ahead.
        </p>

        <div className="cfg__bar">
          <input className="cfg__search" type="search" placeholder="SEARCH MARKETS" aria-label="Search markets" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="seg" role="tablist" aria-label="Market type">
            {(['all', 'perp', 'spot'] as const).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>
                {f === 'all' ? 'ALL' : f === 'perp' ? 'PERPS' : 'SPOT'}
              </button>
            ))}
          </div>
          <button className="ghost" onClick={top10} disabled={!markets}>TOP 10 PERPS</button>
          <button className="ghost" onClick={() => setSelected([])}>CLEAR</button>
        </div>

        {error && (
          <p className="cfg__err" role="alert">COULD NOT LOAD MARKETS ({error}). <button className="ghost" onClick={() => setAttempt((a) => a + 1)}>RETRY</button></p>
        )}
        {!markets && !error && <p className="cfg__msg led">LOADING MARKETS...</p>}

        {markets && (
          <ul className="cfg__list" aria-label="Markets">
            <li className="row row--head" aria-hidden="true"><span /><span>MARKET</span><span className="r">PRICE</span><span className="r">24H</span><span className="r">24H VOLUME</span></li>
            {shown.map((m) => {
              const on = selected.includes(m.key);
              const n = on ? selected.indexOf(m.key) + 1 : 0;
              return (
                <li key={m.key}>
                  <label className={`row ${on ? 'is-on' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(m.key)} />
                    <span className="box" aria-hidden="true">{on ? n : ''}</span>
                    <span className="mk"><b>{m.label}</b> <i>{m.kind === 'perp' ? 'PERP' : 'SPOT'}</i></span>
                    <span className="r">{formatPrice(m.price)}</span>
                    <span className={`r ${trend(m.changePct)}`}>{formatPct(m.changePct)}</span>
                    <span className="r">{formatVolume(m.volume)}</span>
                  </label>
                </li>
              );
            })}
            {shown.length === 0 && <li className="cfg__msg">NO MARKETS MATCH</li>}
          </ul>
        )}

        <div className="cfg__foot">
          <span className="cfg__count" data-testid="count">{validSelected.length} SELECTED</span>
          <div className="cfg__actions">
            <button className="primary" disabled={validSelected.length === 0 || !fullscreenSupported()} onClick={() => start(true)}>START FULL SCREEN</button>
            <button className="secondary" disabled={validSelected.length === 0} onClick={() => start(false)}>START IN WINDOW</button>
          </div>
        </div>
        {!fullscreenSupported() && <p className="cfg__note">This browser can't go full screen (iPhone Safari). Use Share, then Add to Home Screen to run it full screen.</p>}
        <p className="cfg__note">Data: Hyperliquid public API. Headlines come from public crypto RSS feeds, and the green or red arrow is an automatic keyword estimate of how a headline may move the price. It is not analysis or advice.</p>
      </div>
    </div>
  );
}
