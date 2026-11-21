import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PriceBadge } from '../components/PriceBadge';
import { Reveal, useEased, useInView, usePointerVars } from '../components/landing/motion';
import { HERO_CHART, HONEST_CHART, SAMPLE_ARTISTS } from '../components/landing/sample';
import { formatMoney, formatPct, tone } from '../lib/format';
import { useAuth } from '../hooks/useAuth';

function Words({ text, accent }: { text: string; accent?: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="w"><span className={`w__in ${accent && accent.split(' ').includes(w) ? 'w__in--accent' : ''}`} style={{ '--i': i } as CSSProperties}>{w}</span></span>{' '}
        </Fragment>
      ))}
    </>
  );
}

function Seal() {
  return (
    <svg className="seal" viewBox="0 0 200 200" aria-hidden="true">
      <defs><path id="seal-circle" d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0" /></defs>
      <circle cx="100" cy="100" r="96" className="seal__bg" />
      <g className="seal__ring">
        <text><textPath href="#seal-circle" startOffset="0" textLength="455" lengthAdjust="spacing">PLAY MONEY ✺ NO CASH VALUE ✺ PLAY MONEY ✺ NO CASH VALUE ✺</textPath></text>
      </g>
      <path className="seal__star" d="M100 68 L108 92 L134 92 L113 107 L121 132 L100 117 L79 132 L87 107 L66 92 L92 92 Z" />
    </svg>
  );
}

function HeroCard() {
  const c = HERO_CHART;
  return (
    <div className="hero-card" data-testid="hero-card">
      <div className="hero-card__top">
        <div><span className="hero-card__name">Nova Kline</span><span className="sample-tag">Sample data</span></div>
      </div>
      <span className="muted hero-card__time">Last verified update: 2:15 PM</span>
      <div className="hero-card__price">
        <b className="num">$104.80</b> <PriceBadge simulated />
        <span className="num tone--up hero-card__delta">+4.80% <em className="est-tag">est.</em></span>
      </div>
      <svg viewBox={`0 0 ${c.W} ${c.H}`} className="hero-chart" role="img" aria-label="Sample chart: a verified line followed by a dashed estimated tail">
        <defs>
          <clipPath id="hero-reveal"><rect className="hero-chart__reveal" x="0" y="0" width={c.W} height={c.H} /></clipPath>
          <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--up)" stopOpacity=".28" /><stop offset="1" stopColor="var(--up)" stopOpacity="0" /></linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="12" x2={c.W - 12} y1={c.H * f} y2={c.H * f} className="chart__grid" />)}
        <g clipPath="url(#hero-reveal)">
          <path d={c.areaPath} fill="url(#hero-fill)" />
          <path d={c.verifiedPath} className="hero-chart__real" />
          <path d={c.estimatedPath} className="hero-chart__est" />
        </g>
        {c.verifiedDots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" className="hero-chart__vdot" style={{ '--i': i } as CSSProperties} />)}
        <circle cx={c.last[0]} cy={c.last[1]} r="11" className="hero-chart__ping" />
        <circle cx={c.last[0]} cy={c.last[1]} r="6" className="hero-chart__end" />
      </svg>
      <ul className="chart__legend">
        <li><i className="swatch swatch--real" /> Verified</li>
        <li><i className="swatch swatch--est" /> Estimated between updates</li>
      </ul>
      <div className="hero-card__ticket">
        <div className="seg seg--mini"><span className="seg__btn seg__btn--buy is-on">Buy</span><span className="seg__btn">Sell</span></div>
        <span className="num">3 shares ≈ $314.40</span>
        <span className="hero-card__cta" aria-hidden="true">Review</span>
      </div>
    </div>
  );
}

function Hero() {
  const { session } = useAuth();
  const ref = usePointerVars<HTMLElement>();
  const stack = useEased(1000, 0.06);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(t); }, []);
  return (
    <section className={`hero ${ready ? 'is-ready' : ''}`} ref={ref}>
      <div className="hero__copy">
        <p className="eyebrow"><span className="eyebrow__dot" /> A play-money game for music obsessives</p>
        <h1 className="hero__title" aria-label="Back the artists before they blow up.">
          <span aria-hidden="true"><Words text="Back the artists before they blow up." accent="blow up." /></span>
          <svg className="hero__squig" viewBox="0 0 300 18" aria-hidden="true"><path d="M3 11 C 30 2, 50 18, 80 9 S 130 2, 160 10 S 220 17, 250 8 S 285 6, 297 10" /></svg>
        </h1>
        <p className="hero__sub">
          Every artist on Trendline is a share whose price follows how their YouTube channel is really doing. Pick early, trade with pretend cash, and see if your ear beats the algorithm.
        </p>
        <div className="hero__actions">
          <Link to={session ? '/markets' : '/login?mode=signup'} className="btn btn--primary btn--lg btn--magnetic">
            {session ? 'Open markets' : <>Start with <span className="num">{formatMoney(Math.round(stack)).replace('.00', '')}</span></>}
          </Link>
          <a href="#how" className="btn btn--ghost btn--lg">How prices work</a>
        </div>
        <p className="hero__fine">Verified prices come from YouTube data every 15 minutes. In between, you'll see estimates, always labelled.</p>
      </div>
      <div className="hero__stage">
        <div className="parallax hero-card-wrap" style={{ '--depth': 1 } as CSSProperties}>
          <HeroCard />
          <div className="parallax sticker sticker--seal" style={{ '--depth': 2.6 } as CSSProperties}><Seal /></div>
        </div>
        <div className="parallax sticker sticker--up" style={{ '--depth': 3.4 } as CSSProperties}><span>+18.4%</span><small>this week</small></div>
        <div className="parallax sticker sticker--pill" style={{ '--depth': 2 } as CSSProperties}>Illustration only</div>
        <svg className="parallax confetti confetti--a" style={{ '--depth': 4 } as CSSProperties} viewBox="0 0 40 40" aria-hidden="true"><path d="M20 3 L24 16 L37 20 L24 24 L20 37 L16 24 L3 20 L16 16 Z" /></svg>
        <svg className="parallax confetti confetti--b" style={{ '--depth': 1.8 } as CSSProperties} viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="14" /></svg>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [...SAMPLE_ARTISTS, ...SAMPLE_ARTISTS];
  return (
    <div className="ticker" aria-label="Sample prices, for illustration only">
      <div className="ticker__track">
        {items.map((a, i) => (
          <span className="ticker__item" key={i} aria-hidden={i >= SAMPLE_ARTISTS.length}>
            <b>{a.name}</b>
            <span className="num">{formatMoney(a.price)}</span>
            <span className={`num tone--${tone(a.change)}`}>{formatPct(a.change)}</span>
            <span className={`ticker__kind ${a.est ? 'is-est' : ''}`}>{a.est ? 'est.' : 'verified'}</span>
            <i className="ticker__sep">✺</i>
          </span>
        ))}
      </div>
      <span className="ticker__note">Sample data</span>
    </div>
  );
}

const STEPS = [
  { n: '1', color: 'butter', title: 'Pick an artist you believe in.', body: "Each artist maps to a YouTube channel with an expected daily view pace. You start with $1,000 of play money and no strings attached. There's nothing to deposit, ever.", art: 'coins' },
  { n: '2', color: 'pink', title: 'Watch the price follow the views.', body: "Every 15 minutes we compare the channel's last 7 days of views with its expected pace. Ahead of pace and the price climbs; falling behind and it slips. One update can move a price by 10% at most.", art: 'bars' },
  { n: '3', color: 'mint', title: 'Buy, sell, brag.', body: "Trade any time. You can sell what you own, but never short. Your portfolio tracks average cost, value and profit or loss, with every price marked verified or estimated.", art: 'arrows' },
] as const;

function StepArt({ kind }: { kind: (typeof STEPS)[number]['art'] }) {
  if (kind === 'coins') return (
    <svg viewBox="0 0 160 140" className="step__art" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => <ellipse key={i} cx="80" cy={108 - i * 22} rx="52" ry="17" className="coin" style={{ '--i': i } as CSSProperties} />)}
      <text x="80" y="50" textAnchor="middle" className="coin__label">$</text>
    </svg>
  );
  if (kind === 'bars') return (
    <svg viewBox="0 0 160 140" className="step__art" aria-hidden="true">
      {[40, 64, 52, 92, 112].map((h, i) => <rect key={i} x={14 + i * 28} y={128 - h} width="20" height={h} rx="7" className="bar" style={{ '--i': i } as CSSProperties} />)}
      <path d="M10 70 C 40 78, 60 40, 90 52 S 130 20, 152 14" className="bar__line" />
    </svg>
  );
  return (
    <svg viewBox="0 0 160 140" className="step__art" aria-hidden="true">
      <g className="arrow arrow--up"><path d="M44 120 V40" /><path d="M24 62 L44 38 L64 62" /></g>
      <g className="arrow arrow--down"><path d="M116 20 V100" /><path d="M96 78 L116 102 L136 78" /></g>
    </svg>
  );
}

function HowItWorks() {
  return (
    <section className="how" id="how">
      <Reveal as="h2" className="section-h">Three steps. No spreadsheets.</Reveal>
      <div className="how__stack">
        {STEPS.map((s, i) => (
          <article className={`step step--${s.color}`} style={{ '--i': i } as CSSProperties} key={s.n}>
            <span className="step__num" aria-hidden="true">{s.n}</span>
            <div className="step__text"><h3>{s.title}</h3><p>{s.body}</p></div>
            <StepArt kind={s.art} />
          </article>
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
        <p className="eyebrow">Play with the formula</p>
        <h2 className="section-h">Beat the pace,<br />the price climbs.</h2>
        <p className="muted">An artist's price is a level that carries over day to day. It reacts to one thing: how their last 7 days of views compare with what we expected. Drag the slider to feel it.</p>
        <p className="toy__fine">Illustration with a $100 starting price. In the real market each verified update is capped at ±10% from the one before.</p>
      </Reveal>
      <Reveal delay={120} className="toy__panel card">
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
          <p className="eyebrow eyebrow--light">Honest by design</p>
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
            {h.vx.map((x, i) => <circle key={i} cx={x} cy={h.vy[i]} r="7" className="honest__dot" style={{ '--i': i } as CSSProperties} />)}
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
      <Reveal as="h2" className="finale__title">Pretend money.<br /><em>Real</em> bragging rights.</Reveal>
      <Reveal delay={120}>
        <Link to={session ? '/markets' : '/login?mode=signup'} className="btn btn--primary btn--lg btn--magnetic">{session ? 'Open markets' : 'Grab your $1,000'}</Link>
      </Reveal>
    </section>
  );
}

export default function Landing() {
  return (
    <main className="landing">
      <Hero />
      <Ticker />
      <HowItWorks />
      <PriceToy />
      <Honest />
      <Finale />
      <footer className="foot">
        <p><strong>Play money. No cash value. No deposits or withdrawals.</strong></p>
        <p>Trendline is a game, not a financial product or investment advice. It isn't affiliated with or endorsed by YouTube or any artist. Artists and figures shown on this page are fictional samples.</p>
      </footer>
    </main>
  );
}
