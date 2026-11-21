import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PriceBadge } from '../components/PriceBadge';
import { Odometer } from '../components/Odometer';
import { HeroChart } from '../components/landing/HeroChart';
import { Scrolly } from '../components/landing/Scrolly';
import { Letters, Marquee, Reveal, useElementProgress, useEased, useInView, useMagnetic } from '../components/landing/motion';
import { HONEST_CHART, SAMPLE_CREATORS } from '../components/landing/sample';
import { formatMoney, formatPct, tone } from '../lib/format';
import { useAuth } from '../hooks/useAuth';

function Hero() {
  const { session } = useAuth();
  const [ready, setReady] = useState(false);
  const cta = useMagnetic<HTMLAnchorElement>(0.35);
  useEffect(() => { const t = setTimeout(() => setReady(true), 60); return () => clearTimeout(t); }, []);
  return (
    <section className={`hero ${ready ? 'is-ready' : ''}`}>
      <div className="hero__top">
        <span className="hero__tag"><i /> Top 10 YouTube creators · Play money</span>
        <span className="hero__tag hero__tag--r">Verified every 15 min · Estimated every minute</span>
      </div>
      <h1 className="mega" aria-label="The creators everyone's watching.">
        <span className="mega__line" aria-hidden="true"><Letters text="THE CREATORS" start={100} /></span>
        <span className="mega__line" aria-hidden="true"><Letters text="EVERYONE'S" start={450} /></span>
        <span className="mega__line mega__line--hot" aria-hidden="true"><Letters text="WATCHING." start={750} /></span>
      </h1>
      <div className="hero__row">
        <p className="hero__sub">
          Trendline is a play-money market. Each share tracks how a top YouTube channel's views compare with its expected pace. Start with <b>$1,000</b> of pretend cash and find out if you can spot the trend before everyone else.
        </p>
        <div className="hero__cta">
          <Link ref={cta} to={session ? '/markets' : '/login?mode=signup'} className="btn btn--primary btn--lg btn--magnetic">{session ? 'Open markets' : 'Start with $1,000'} <span aria-hidden="true">→</span></Link>
          <a href="#how" className="btn btn--lg">See how it works</a>
        </div>
      </div>
      <HeroChart />
    </section>
  );
}

function Row({ filled }: { filled?: boolean }) {
  return (
    <>
      {SAMPLE_CREATORS.map((c) => (
        <span className={`mq ${filled ? 'mq--filled' : ''}`} key={c.name}>
          <span className="mq__name">{c.name}</span>
          <span className={`mq__chip num tone--${tone(c.change)}`}>{formatPct(c.change)}</span>
          <span className="mq__star" aria-hidden="true">✺</span>
        </span>
      ))}
    </>
  );
}

function Marquees() {
  return (
    <div className="marquees" aria-label="Sample creators, for illustration only">
      <Marquee dir={1} speed={0.5}><Row /></Marquee>
      <Marquee dir={-1} speed={0.5}><Row filled /></Marquee>
      <span className="marquees__note">Sample data · fictional creators</span>
    </div>
  );
}

function Stat({ value, label, fmt, from }: { value: number; label: string; fmt: (n: number) => string; from: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  return (
    <div className="bigstat" ref={ref}>
      <Odometer value={seen ? fmt(value) : from} className="bigstat__n" />
      <span>{label}</span>
    </div>
  );
}

function Stats() {
  return (
    <section className="bigstats" aria-label="Key facts">
      <Stat value={10} from="0" fmt={(n) => String(n)} label="YouTube creators. No more." />
      <Stat value={1000} from="$0" fmt={(n) => `$${n.toLocaleString('en-US')}`} label="of play money to start" />
      <Stat value={15} from="0" fmt={(n) => String(n)} label="minutes between verified updates" />
      <Stat value={0} from="$99" fmt={() => '$0'} label="of real money. Ever." />
    </section>
  );
}

const MOODS: [number, string][] = [[0.7, 'Cooling off'], [0.95, 'A little behind'], [1.05, 'Right on pace'], [1.4, 'Heating up'], [9, 'Breakout']];

function PriceToy() {
  const [ratio, setRatio] = useState(1.3);
  const price = 100 * (1 + 0.5 * (ratio - 1));
  const mood = MOODS.find(([max]) => ratio < max)![1];
  const tn = tone(Math.round((price - 100) * 100));
  const eased = useEased(price, 0.2);
  return (
    <section className="toy">
      <Reveal className="toy__copy">
        <span className="eyebrow">Try the formula</span>
        <h2 className="section-h">Beat the pace.<br />The price climbs.</h2>
        <p className="muted">A price is a level that carries over day to day. It reacts to one thing: how a channel's last 7 days of views compare with what we expected. Drag the slider.</p>
        <p className="toy__fine">Illustration from a $100 starting price. In the real market each verified update is capped at ±10% from the one before.</p>
      </Reveal>
      <Reveal delay={120} className="toy__panel">
        <div className="toy__readout">
          <span className="toy__mood" key={mood}>{mood}</span>
          <span className={`toy__price tone--${tn}`}><Odometer value={formatMoney(Math.round(eased * 100) / 100)} /></span>
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
  const ref = useElementProgress<HTMLElement>();
  const cta = useMagnetic<HTMLAnchorElement>(0.35);
  return (
    <section className="finale" ref={ref}>
      <div className="finale__bg" aria-hidden="true"><span>BE EARLY. BE EARLY. BE EARLY.</span></div>
      <Reveal className="finale__inner">
        <h2>Pretend money.<br />Real bragging rights.</h2>
        <Link ref={cta} to={session ? '/markets' : '/login?mode=signup'} className="btn btn--primary btn--lg btn--magnetic">{session ? 'Open markets' : 'Get your $1,000'} <span aria-hidden="true">→</span></Link>
      </Reveal>
    </section>
  );
}

export default function Landing() {
  return (
    <main className="landing">
      <Hero />
      <Marquees />
      <Stats />
      <Scrolly />
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
