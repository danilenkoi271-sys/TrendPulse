import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { formatMoney } from '../../lib/format';
import { Odometer } from '../Odometer';
import { PriceBadge } from '../PriceBadge';
import { SAMPLE_CREATORS } from './sample';
import { prefersReducedMotion } from './motion';

const PHASES = [
  { n: '01', t: 'Pick a creator', b: "Ten of YouTube's biggest channels, each with an expected daily view pace. You start with $1,000 of play money. There's nothing to deposit, ever." },
  { n: '02', t: 'Price follows the views', b: "Every 15 minutes we compare a channel's last 7 days of views with its expected pace. Ahead and the price climbs; behind and it slips. One update moves a price 10% at most." },
  { n: '03', t: 'Buy. Sell. Brag.', b: 'Trade any time. Sell what you own, never short. Your portfolio tracks cost, value and P&L, and every price is marked verified or estimated.' },
];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const CHART = 'M0,172 C30,168 40,150 70,152 S110,120 140,126 S185,96 215,104 S260,60 295,70 S350,34 398,22';

/** Pinned story: scroll drives the chart, the price and which step is on screen. */
export function Scrolly() {
  const root = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const [phase, setPhase] = useState(0);
  const [b, setB] = useState(0);
  const [prog, setProg] = useState(0);
  const [stat, setStat] = useState(false);

  useEffect(() => {
    const decide = () => setStat(innerWidth < 900 || prefersReducedMotion());
    decide();
    addEventListener('resize', decide);
    return () => removeEventListener('resize', decide);
  }, []);

  useEffect(() => {
    if (stat) { setPhase(2); setB(1); setProg(1); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = root.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight));
      setProg(p);
      setPhase(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
      setB(+clamp((p - 0.3) / 0.35).toFixed(3));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    update();
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [stat]);

  useEffect(() => {
    const p = path.current, d = dot.current;
    if (!p || !d || !p.getTotalLength) return;
    const pt = p.getPointAtLength(p.getTotalLength() * b);
    d.setAttribute('cx', String(pt.x)); d.setAttribute('cy', String(pt.y));
  }, [b]);

  const ratio = 1 + 0.36 * b;
  const price = 100 * (1 + 0.5 * (ratio - 1));

  return (
    <section className={`scrolly ${stat ? 'scrolly--static' : ''}`} ref={root} id="how" style={{ '--p': prog } as CSSProperties}>
      <div className="scrolly__pin">
        <div className="scrolly__inner">
          <div className="sc-left">
            <span className="eyebrow">How it works</span>
            <div className="sc-texts">
              {PHASES.map((p, i) => (
                <article key={p.n} className={`sc-text ${stat || phase === i ? 'is-on' : ''}`}>
                  <span className="sc-n num">{p.n}</span>
                  <h2>{p.t}</h2>
                  <p>{p.b}</p>
                </article>
              ))}
            </div>
            <div className="sc-rail" aria-hidden="true">
              <i style={{ transform: `scaleX(${prog})` }} />
              {PHASES.map((p, i) => <span key={p.n} className={phase >= i ? 'is-on' : ''}>{p.n}</span>)}
            </div>
          </div>

          <div className="sc-stage" data-phase={phase} aria-label="Illustration of the three steps">
            <div className="sc-stage__chrome"><span>TRENDLINE / SAMPLE</span><span className="sample-tag">Sample data</span></div>

            <div className="layer layer--a" aria-hidden={phase !== 0}>
              {SAMPLE_CREATORS.slice(0, 5).map((c, i) => (
                <div className={`sc-row ${i === 2 ? 'is-pick' : ''}`} key={c.name} style={{ '--i': i } as CSSProperties}>
                  <span className="avatar">{c.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
                  <b>{c.name}</b>
                  <span className="num">{formatMoney(c.price)}</span>
                  <PriceBadge simulated={c.est} />
                </div>
              ))}
            </div>

            <div className="layer layer--b">
              <div className="sc-pricebar">
                <div><span className="muted sc-lbl">Gadget Gus</span><Odometer value={formatMoney(price)} className="sc-price" /></div>
                <div className="sc-pace"><span className="muted sc-lbl">Views vs. pace</span><span className="num">{ratio.toFixed(2)}×</span><PriceBadge simulated={false} /></div>
              </div>
              <svg viewBox="0 0 400 200" className="sc-chart">
                {[50, 100, 150].map((y) => <line key={y} x1="0" x2="400" y1={y} y2={y} className="chart__grid" vectorEffect="non-scaling-stroke" />)}
                <path d={CHART} className="sc-chart__ghost" vectorEffect="non-scaling-stroke" />
                <path ref={path} d={CHART} pathLength={1} className="sc-chart__line" style={{ strokeDashoffset: 1 - b }} vectorEffect="non-scaling-stroke" />
                <circle ref={dot} r="6" className="sc-chart__dot" cx="0" cy="172" />
              </svg>
            </div>

            <div className="layer layer--d" aria-hidden="true">
              <div className="sc-bar"><span><em>Expected 7-day views</em><b className="num">100%</b></span><i style={{ '--w': '62%' } as CSSProperties} /></div>
              <div className="sc-bar sc-bar--act"><span><em>Actual 7-day views</em><b className="num">{Math.round(ratio * 100)}%</b></span><i style={{ '--w': `${62 * ratio}%` } as CSSProperties} /></div>
            </div>

            <div className="layer layer--c">
              <div className="sc-ticket">
                <div className="sc-ticket__row"><b>Buy 3 shares</b><span className="num">{formatMoney(118.2)} <PriceBadge simulated /></span></div>
                <div className="sc-ticket__row muted"><span>Estimated cost</span><span className="num">{formatMoney(354.6)}</span></div>
                <div className="sc-ticket__btn"><span>Review buy order</span></div>
                <div className="sc-ticket__done"><i>✓</i> Bought 3 shares at {formatMoney(118.2)} <PriceBadge simulated /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
