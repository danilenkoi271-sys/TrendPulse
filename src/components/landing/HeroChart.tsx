import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { formatMoney } from '../../lib/format';
import { Odometer } from '../Odometer';
import { PriceBadge } from '../PriceBadge';
import { HERO_HI, HERO_LO, HERO_N, HERO_SERIES, heroIsVerified } from './sample';
import { prefersReducedMotion } from './motion';

const xPct = (i: number) => (i / (HERO_N - 1)) * 100;
const yPct = (p: number) => 100 - ((p - HERO_LO) / (HERO_HI - HERO_LO)) * 84 - 8;

/**
 * Full-width illustrative chart. Solid = "verified" points, dashed = "estimated" points, the same
 * vocabulary as the product. Move the pointer to inspect it; the last point ticks as an estimate.
 */
export function HeroChart() {
  const [hover, setHover] = useState<number | null>(null);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setBump((b) => b + 1), 1500);
    return () => clearInterval(t);
  }, []);

  const series = useMemo(() => {
    const s = [...HERO_SERIES];
    // The newest point is an estimate that keeps nudging (well inside +/-5% of the last verified tick).
    s[s.length - 1] = +(HERO_SERIES[HERO_N - 1] + Math.sin(bump * 1.9) * 0.55 + Math.cos(bump * 0.7) * 0.3).toFixed(2);
    return s;
  }, [bump]);

  const all = series.map((p, i) => `${i ? 'L' : 'M'}${xPct(i) * 10},${yPct(p) * 3}`).join(' ');
  const verifiedIdx = series.map((_, i) => i).filter(heroIsVerified);
  const ver = verifiedIdx.map((i, k) => `${k ? 'L' : 'M'}${xPct(i) * 10},${yPct(series[i]) * 3}`).join(' ');
  const idx = hover ?? HERO_N - 1;
  const shown = series[idx];
  const shownVerified = heroIsVerified(idx);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(HERO_N - 1, Math.round(((e.clientX - r.left) / r.width) * (HERO_N - 1)))));
  };

  return (
    <div className="hchart" onPointerMove={onMove} onPointerLeave={() => setHover(null)} data-testid="hero-chart">
      <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="hchart__svg" role="img" aria-label="Sample chart: a solid verified line with a dashed estimated line between updates">
        <defs>
          <clipPath id="hc-reveal"><rect className="hchart__reveal" x="0" y="0" width="1000" height="300" /></clipPath>
          <linearGradient id="hc-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--up)" stopOpacity=".22" /><stop offset="1" stopColor="var(--up)" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.2, 0.4, 0.6, 0.8].map((f) => <line key={f} x1="0" x2="1000" y1={300 * f} y2={300 * f} className="hchart__grid" vectorEffect="non-scaling-stroke" />)}
        <g clipPath="url(#hc-reveal)">
          <path d={`${ver} L1000,300 L0,300 Z`} fill="url(#hc-fill)" />
          <path d={all} className="hchart__est" vectorEffect="non-scaling-stroke" />
          <path d={ver} className="hchart__real" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {verifiedIdx.map((i, k) => (
        <i key={i} className="hchart__dot" style={{ left: `${xPct(i)}%`, top: `${yPct(series[i])}%`, '--i': k } as CSSProperties} />
      ))}
      <i className="hchart__live" style={{ left: `${xPct(HERO_N - 1)}%`, top: `${yPct(series[HERO_N - 1])}%` }} />
      <div className="hchart__cross" style={{ left: `${xPct(idx)}%` }} />
      <div className="hchart__flag" style={{ left: `${xPct(idx)}%`, top: `${yPct(shown)}%` } as CSSProperties} data-side={xPct(idx) > 70 ? 'l' : 'r'}>
        <span className="hchart__sample">Sample data</span>
        <Odometer value={formatMoney(shown)} className="hchart__price" />
        <PriceBadge simulated={!shownVerified} />
      </div>
    </div>
  );
}
