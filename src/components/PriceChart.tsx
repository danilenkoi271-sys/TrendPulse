import { useEffect, useMemo, useRef, useState } from 'react';
import { splitRuns } from '../lib/ticks';
import { formatDateTime, formatMoney, priceKind } from '../lib/format';
import type { Tick } from '../lib/types';

const H = 280;
const PAD = { t: 16, r: 12, b: 26, l: 12 };

export function PriceChart({ ticks, revealKey = 'chart' }: { ticks: Tick[]; revealKey?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (ticks.length === 0) return null;
    const t0 = new Date(ticks[0].created_at).getTime();
    const t1 = new Date(ticks[ticks.length - 1].created_at).getTime();
    const prices = ticks.map((t) => t.price);
    let lo = Math.min(...prices), hi = Math.max(...prices);
    if (hi - lo < 0.5) { lo -= 0.25; hi += 0.25; }
    const padY = (hi - lo) * 0.12; lo -= padY; hi += padY;
    const x = (t: Tick) => PAD.l + (t1 === t0 ? 0.5 : (new Date(t.created_at).getTime() - t0) / (t1 - t0)) * (w - PAD.l - PAD.r);
    const y = (p: number) => PAD.t + (1 - (p - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
    const path = (pts: Tick[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.price).toFixed(1)}`).join(' ');
    return { x, y, path, lo, hi, t0, t1 };
  }, [ticks, w]);

  if (!geo) return <div className="chart chart--empty" ref={wrap}>No price history yet. The first estimated tick arrives within a minute.</div>;

  const runs = splitRuns(ticks);
  const first = ticks[0].price, last = ticks[ticks.length - 1].price;
  const dir = last >= first ? 'up' : 'down';
  const hoverTick = hover !== null ? ticks[hover] : null;
  const lastT = ticks[ticks.length - 1];
  const yTicks = [0, 0.5, 1].map((f) => geo.lo + (geo.hi - geo.lo) * f);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0, bd = Infinity;
    ticks.forEach((t, i) => { const d = Math.abs(geo.x(t) - px); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };

  return (
    <div className={`chart chart--${dir}`} ref={wrap}>
      <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img"
        aria-label={`Price chart. Latest price ${formatMoney(last)}, ${priceKind(lastT.is_simulated)}.`}>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={w - PAD.r} y1={geo.y(v)} y2={geo.y(v)} className="chart__grid" />
            <text x={PAD.l + 2} y={geo.y(v) - 5} className="chart__axis">{formatMoney(v)}</text>
          </g>
        ))}
        <clipPath id={`reveal-${revealKey}`}><rect key={revealKey} className="chart__reveal" x="0" y="0" width={w} height={H} /></clipPath>
        <g clipPath={`url(#reveal-${revealKey})`}>
          <path d={`${geo.path(ticks)} L${geo.x(lastT)},${H - PAD.b} L${geo.x(ticks[0])},${H - PAD.b} Z`} fill="url(#chart-fill)" />
          {runs.map((r, i) => (
            <path key={i} d={geo.path(r.points)} className={r.simulated ? 'chart__line chart__line--est' : 'chart__line chart__line--real'} data-kind={r.simulated ? 'estimated' : 'verified'} />
          ))}
        </g>
        <circle cx={geo.x(lastT)} cy={geo.y(lastT.price)} r="6" className="chart__pulse" />
        <circle cx={geo.x(lastT)} cy={geo.y(lastT.price)} r="5" className={`chart__dot ${lastT.is_simulated ? 'chart__dot--est' : ''}`} />
        {hoverTick && (
          <g>
            <line x1={geo.x(hoverTick)} x2={geo.x(hoverTick)} y1={PAD.t} y2={H - PAD.b} className="chart__cross" />
            <circle cx={geo.x(hoverTick)} cy={geo.y(hoverTick.price)} r="5" className="chart__hoverdot" />
          </g>
        )}
        <text x={PAD.l} y={H - 6} className="chart__axis">{formatDateTime(ticks[0].created_at)}</text>
        <text x={w - PAD.r} y={H - 6} textAnchor="end" className="chart__axis">{formatDateTime(lastT.created_at)}</text>
      </svg>
      {hoverTick && (
        <div className="chart__tip" style={{ left: Math.min(Math.max(geo.x(hoverTick), 70), w - 70) }}>
          <b>{formatMoney(hoverTick.price)}</b>
          <span className={`badge ${hoverTick.is_simulated ? 'badge--est' : 'badge--ver'}`}>{priceKind(hoverTick.is_simulated)}</span>
          <small>{formatDateTime(hoverTick.created_at)}</small>
        </div>
      )}
      <ul className="chart__legend" aria-label="Chart legend">
        <li><i className="swatch swatch--real" /> Verified from YouTube data</li>
        <li><i className="swatch swatch--est" /> Estimated between updates</li>
      </ul>
    </div>
  );
}
