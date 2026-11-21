import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PriceBadge } from '../components/PriceBadge';
import { Reveal, useEased, useInView, usePointerVars } from '../components/landing/motion';
import { HERO_CHART, HONEST_CHART, SAMPLE_CREATORS, miniPath } from '../components/landing/sample';
import { formatMoney, formatPct, tone } from '../lib/format';
import { useAuth } from '../hooks/useAuth';

function HeroCard() {
  const c = HERO_CHART;
  return (
    <div className="hero-card" data-testid="hero-card">
      <div className="hero-card__top">
        <span className="avatar" aria-hidden="true">PP</span>
        <div><b>Pixel Pete</b><div className="muted hero-card__sub">Sample creator</div></div>
        <span className="sample-tag">Sample data</span>
      </div>
      <div className="hero-card__price">
        <b className="num">$104.80</b> <PriceBadge simulated />
        <span className="num tone--up">+4.80% <em className="est-tag">est.</em></span>
      </div>
      <svg viewBox={`0 0 ${c.W} ${c.H}`} className="hero-chart" role="img" aria-label="Sample chart: a solid verified line followed by a dashed estimated tail">
        <defs>
          <clipPath id="hero-reveal"><rect className="hero-chart__reveal" x="0" y="0" width={c.W} height={c.H} /></clipPath>
          <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--up)" stopOpacity=".18" /><stop offset="1" stopColor="var(--up)" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="12" x2={c.W - 12} y1={c.H * f} y2={c.H * f} className="chart__grid" />)}
        <g clipPath="url(#hero-reveal)">
          <path d={c.areaPath} fill="url(#hero-fill)" />
          <path d={c.verifiedPath} className="hero-chart__real" />
          <path d={c.estimatedPath} className="hero-chart__est" />
        </g>
        {c.verifiedDots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4.5" className="hero-chart__vdot" style={{ '--i': i } as CSSProperties} />)}
        <circle cx={c.last[0]} cy={c.last[1]} r="10" className="hero-chart__ping" />
        <circle cx={c.last[0]} cy={c.last[1]} r="5" className="hero-chart__end" />
      </svg>
      <ul className="chart__legend">
        <li><i className="swatch swatch--real" /> Verified</li>
        <li><i className="swatch swatch--est" /> Estimated between updates</li>
      </ul>
      <div className="hero-card__actions" aria-hidden="true">
        <span className="btn btn--buy btn--sm">Buy</span><span className="btn btn--sell btn--sm">Sell</span>
      </div>
    </div>
  );
}

function MiniCard({ i, className }: { i: number; className: string }) {
  const m = SAMPLE_CREATORS[i];
  const up = m.change > 0;
  return (
    <div className={`mini ${className}`}>
      <div className="mini__top"><b>{m.name}</b><span className="sample-tag">Sample</span></div>
      <div className="mini__row">
        <div>
          <div className="num mini__price">{formatMoney(m.price)}</div>
          <div className={`num tone--${tone(m.change)} mini__chg`}>{formatPct(m.change)} <PriceBadge simulated={m.est} /></div>
        </div>
        <svg viewBox="0 0 100 36" width="84" height="32" aria-hidden="true"><path d={miniPath(i + 1, up)} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
}

function Hero() {
  const { session } = useAuth();
  const ref = usePointerVars<HTMLElement>();
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(t); }, []);
  return (
    <section className={`hero ${ready ? 'is-ready' : ''}`} ref={ref}>
      <div className="hero__copy">
        <span className="pill"><i /> Play money · Top 10 YouTube creators</span>
        <h1 className="hero__title">
          <span className="line"><span>Trade the creators</span></span>
          <span className="line"><span>everyone's <em>watching.</em></span></span>
        </h1>
        <p className="hero__sub">
          Trendline is a play-money market where each share tracks how a top YouTube channel's views compare with its expected pace. Start with $1,000 of pretend cash and see how well you read the trend.
        </p>
        <div className="hero__actions">
          <Link to={session ? '/markets' : '/login?mode=signup'} className="btn btn--primary btn--lg">{session ? 'Open markets' : 'Start with $1,000'}</Link>
          <a href="#how" className="btn btn--lg">How prices work</a>
        </div>
        <p className="hero__fine">Verified prices are calculated from YouTube data every 15 minutes. In between, you'll see estimates, always labelled.</p>
      </div>
      <div className="hero__stage">
        <div className="stage__main"><HeroCard /></div>
        <MiniCard i={2} className="mini--a" />
        <MiniCard i={1} className="mini--b" />
      </div>
    </section>
  );
}

function Ticker() {
  const items = [...SAMPLE_CREATORS, ...SAMPLE_CREATORS];
  return (
    <div className="ticker" aria-label="Sample prices, for illustration only">
      <span className="ticker__note">Sample data</span>
      <div className="ticker__track">
        {items.map((a, i) => (
          <span className="ticker__item" key={i} aria-hidden={i >= SAMPLE_CREATORS.length}>
            <b>{a.name}</b>
            <span className="num">{formatMoney(a.price)}</span>
            <span className={`num tone--${tone(a.change)}`}>{formatPct(a.change)}</span>
            <span className={`ticker__kind ${a.est ? 'is-est' : ''}`}>{a.est ? 'est.' : 'verified'}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, format }: { value: number; label: string; format: (n: number) => string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  const v = useEased(seen ? value : 0, 0.08);
  return <div className="stat-tile" ref={ref}><b className="num">{format(v)}</b><span>{label}</span></div>;
}

function Stats() {
  return (
    <section className="stats-strip" aria-label="Key facts">
      <Stat value={10} label="YouTube creators, no more" format={(n) => String(Math.round(n))} />
      <Stat value={1000} label="play money to start" format={(n) => `$${Math.round(n).toLocaleString('en-US')}`} />
      <Stat value={15} label="minutes between verified updates" format={(n) => String(Math.round(n))} />
      <Stat value={0} label="real money involved, ever" format={() => '$0'} />
    </section>
  );
}

const STEPS = [
  { n: '01', title: 'Pick a creator', body: "Ten of YouTube's biggest channels, each with an expected daily view pace. You start with $1,000 of play money. There's nothing to deposit, ever." },
  { n: '02', title: 'Watch the price follow the views', body: "Every 15 minutes we compare a channel's last 7 days of views with its expected pace. Ahead of pace and the price climbs; behind and it slips. One update moves a price 10% at most." },
  { n: '03', title: 'Buy and sell', body: 'Trade any time. You can sell what you own but never sell short. Your portfolio tracks average cost, value and profit or loss, with every price marked verified or estimated.' },
];

function HowItWorks() {
  return (
    <section className="how" id="how">
      <Reveal as="h2" className="section-h">How Trendline works</Reveal>
      <div className="how__grid">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 90} className="how__item">
            <span className="how__n num">{s.n}</span>
            <h3>{s.title}</h3>
            <p className="muted">{s.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const MOODS: [number, string][] = [[0.7, 'Cooling off'], [0.95, 'A little behind'], [1.05, 'Right on pace'], [1.4, 'Heating up'], [9, 'Breakout']];

function PriceToy() {
  const [ratio, setRatio] = useState(1.3);
  const price = 100 * (1 + 0.5 * (ratio - 1));
  const shown = useEased(price, 0.18);
  const mood = MOODS.find(([max]) => ratio < max)![1];
  const tn = tone(Math.round((price - 100) * 100));
  return (
    <section className="toy">
      <Reveal className="toy__copy">
        <span className="eyebrow">Try the formula</span>
        <h2 className="section-h">Beat the pace,<br />the price climbs.</h2>
        <p className="muted">A price is a level that carries over day to day. It reacts to one thing: how a channel's last 7 days of views compare with what we expected. Drag the slider to feel it.</p>
        <p className="toy__fine">Illustration with a $100 starting price. In the real market each verified update is capped at ±10% from the one before.</p>
      </Reveal>
      <Reveal delay={100} className="toy__panel card">
        <div className="toy__readout">
          <span className="toy__mood" key={mood}>{mood}</span>
          <b className={`toy__price num tone--${tn}`}>{formatMoney(shown)}</b>
        </div>
        <label className="toy__slider">
          <span>Views vs. expected pace</span>
          <span className="toy__gauge" style={{ '--p': (ratio - 0.4) / 1.6 } as CSSProperties}>
            <span className="toy__bubble num" aria-hidden="true">{ratio.toFixed(2)}×</span>
            <input type="range" min="0.4" max="2" step="0.05" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} aria-label="Views compared with expected pace" aria-valuetext={`${ratio.toFixed(2)} times expected, price ${formatMoney(price)}`} />
          </span>
          <span className="toy__ends"><span>0.4× slow</span><span>1× on pace</span><span>2× viral</span></span>
        </label>
      </Reveal>
    </section>
  );
}

function Honest() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const h = HONEST_CHART;
  return (
    <section className="honest">
      <div className="honest__inner">
        <Reveal className="honest__copy">
          <span className="eyebrow">Transparent by design</span>
          <h2 className="section-h">Two kinds of prices.<br />We label both.</h2>
          <ul className="honest__list">
            <li><PriceBadge simulated={false} /><p>Calculated from YouTube view data, refreshed every 15 minutes.</p></li>
            <li><PriceBadge simulated /><p>A simulated nudge within 5% of the last verified price, every minute, so charts keep moving. Never presented as the real thing.</p></li>
            <li><span className="badge badge--pm">Play money</span><p>No deposits. No withdrawals. No cash value. Not now, not later.</p></li>
          </ul>
        </Reveal>
        <div className={`honest__viz ${seen ? 'is-in' : ''}`} ref={ref} role="img" aria-label="Illustration: a dashed estimated line wobbling between solid verified segments">
          <svg viewBox={`0 0 ${h.w + 20} ${h.h}`}>
            {h.est.map((d, i) => <path key={i} d={d} className="honest__est" style={{ '--i': i } as CSSProperties} />)}
            {h.vx.slice(0, -1).map((x, i) => <path key={i} d={`M${x},${h.vy[i]} L${h.vx[i + 1]},${h.vy[i + 1]}`} className="honest__real" style={{ '--i': i } as CSSProperties} />)}
            {h.vx.map((x, i) => <circle key={i} cx={x} cy={h.vy[i]} r="6" className="honest__dot" style={{ '--i': i } as CSSProperties} />)}
          </svg>
          <span className="honest__tag honest__tag--a">Verified · every 15 min</span>
          <span className="honest__tag honest__tag--b">Estimated · every minute</span>
        </div>
      </div>
    </section>
  );
}

function Finale() {
  const { session } = useAuth();
  return (
    <section className="finale">
      <Reveal className="finale__card">
        <h2>Pretend money.<br />Real bragging rights.</h2>
        <Link to={session ? '/markets' : '/login?mode=signup'} className="btn btn--lg finale__btn">{session ? 'Open markets' : 'Get your $1,000'}</Link>
      </Reveal>
    </section>
  );
}

export default function Landing() {
  return (
    <main className="landing">
      <Hero />
      <Ticker />
      <Stats />
      <HowItWorks />
      <PriceToy />
      <Honest />
      <Finale />
      <footer className="foot">
        <p><strong>Play money. No cash value. No deposits or withdrawals.</strong></p>
        <p>Trendline is a game, not a financial product or investment advice. It isn't affiliated with or endorsed by YouTube or any creator. Creators and figures shown on this page are fictional samples.</p>
      </footer>
    </main>
  );
}
