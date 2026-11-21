import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { fetchMarkets, type Market } from '../lib/hyperliquid';
import { fetchNews, newsFor, type NewsItem } from '../lib/news';
import { formatClock, formatPct, formatPrice, formatVolume, trend } from '../lib/format';
import { useIsFullscreen, useWakeLock } from '../lib/fullscreen';
import { CYCLE_MS, NEWS_MS, REFRESH_MS } from '../lib/timing';
import { NewsTicker, type NewsStatus } from './NewsTicker';

interface Props {
  /** Selected market keys, in cycle order. */
  selected: string[];
  onOpenSettings: () => void;
}

/** Briefly reports which way the price just moved, so the digits can flash green or red. */
function usePriceFlash(key: string | undefined, price: number | undefined): 'up' | 'down' | null {
  const prev = useRef<{ key?: string; price?: number }>({});
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    const p = prev.current;
    if (p.key === key && p.price !== undefined && price !== undefined && price !== p.price) {
      setDir(price > p.price ? 'up' : 'down');
      const t = setTimeout(() => setDir(null), 1200);
      prev.current = { key, price };
      return () => clearTimeout(t);
    }
    prev.current = { key, price };
    setDir(null);
  }, [key, price]);
  return dir;
}

export function Display({ selected, onOpenSettings }: Props) {
  const [markets, setMarkets] = useState<Map<string, Market>>(new Map());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [offline, setOffline] = useState(false);
  const [idx, setIdx] = useState(0);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsStatus, setNewsStatus] = useState<NewsStatus>('loading');
  const fullscreen = useIsFullscreen();
  useWakeLock();

  // Only fetch the kinds we actually show.
  const wantPerp = selected.some((k) => k.startsWith('perp:'));
  const wantSpot = selected.some((k) => k.startsWith('spot:'));

  // Prices: immediately, then every 10 seconds.
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const list = await fetchMarkets({ perp: wantPerp, spot: wantSpot });
        if (!alive) return;
        setMarkets(new Map(list.map((m) => [m.key, m])));
        setUpdatedAt(new Date());
        setOffline(false);
      } catch {
        if (alive) setOffline(true); // keep showing the last good numbers
      }
    };
    void refresh();
    const t = setInterval(refresh, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [wantPerp, wantSpot]);

  // News: immediately, then every 5 minutes.
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const items = await fetchNews();
        if (!alive) return;
        // An empty result usually means every feed failed; keep older headlines if we have them.
        setNews((old) => (items.length ? items : old));
        setNewsStatus((s) => (items.length ? 'ok' : s === 'ok' ? 'ok' : 'error'));
      } catch {
        if (alive) setNewsStatus((s) => (s === 'ok' ? 'ok' : 'error'));
      }
    };
    void load();
    const t = setInterval(load, NEWS_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Cycle order: the selection, minus anything Hyperliquid no longer lists (once data has loaded).
  const order = useMemo(
    () => (markets.size ? selected.filter((k) => markets.has(k)) : selected),
    [selected, markets],
  );
  const count = Math.max(order.length, 1);
  const pos = ((idx % count) + count) % count;
  const key = order[pos];
  const market = key ? markets.get(key) : undefined;

  const next = useCallback(() => setIdx((i) => i + 1), []);
  const prev = useCallback(() => setIdx((i) => i - 1), []);

  // Every 30 seconds, move on. Any manual change restarts the 30 seconds.
  useEffect(() => {
    if (count < 2) return;
    const t = setTimeout(next, CYCLE_MS);
    return () => clearTimeout(t);
  }, [idx, count, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const flash = usePriceFlash(key, market?.price);
  const headlines = useMemo(() => (market ? newsFor(news, market.base) : []), [news, market]);

  const onTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-nonav]')) return;
    next();
  };

  const label = market?.label ?? '...';
  const priceText = market ? formatPrice(market.price) : '$------';
  const tone = market ? trend(market.changePct) : 'flat';
  const arrow = tone === 'up' ? '▲' : tone === 'down' ? '▼' : '■';

  return (
    <div className="board" onClick={onTap} data-testid="board" role="presentation">
      <div className="dots" aria-hidden="true" />
      <header className="board__top led">
        <span className="board__left">
          <span className="tag" data-testid="kind">{market ? (market.kind === 'perp' ? 'PERP' : 'SPOT') : ''}</span>
          {!fullscreen && <button className="gear" data-nonav onClick={onOpenSettings}>SETTINGS</button>}
        </span>
        <span className="board__right" data-testid="status">
          <span>{count > 1 ? `${pos + 1}/${count}` : ''}</span>
          <span className={offline ? 'live live--off' : 'live'} aria-hidden="true" />
          <span>{offline ? 'OFFLINE' : updatedAt ? formatClock(updatedAt) : '--:--:--'}</span>
        </span>
      </header>

      <main className="swap" key={key ?? 'none'}>
        <h1 className="led name" style={{ '--n': label.length } as CSSProperties} data-testid="name">{label}</h1>
        <div className={`led price ${flash ? `flash-${flash}` : ''}`} style={{ '--n': priceText.length } as CSSProperties} data-testid="price">{priceText}</div>
        <div className="stats led">
          <div className="stat">
            <span className="k">24H VOLUME</span>
            <span className="v white" data-testid="volume">{market ? formatVolume(market.volume) : '---'}</span>
          </div>
          <div className="stat">
            <span className="k">24H CHANGE</span>
            <span className={`v ${tone}`} data-testid="change">{market ? `${arrow} ${formatPct(market.changePct)}` : '---'}</span>
          </div>
        </div>
      </main>

      <NewsTicker items={headlines} status={newsStatus} label={label} />
    </div>
  );
}
