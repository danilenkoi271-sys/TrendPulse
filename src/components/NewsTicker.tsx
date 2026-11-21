import { useLayoutEffect, useRef } from 'react';
import type { NewsItem } from '../lib/news';

const ARROW = { up: '▲', down: '▼', neutral: '■' } as const;
const PX_PER_SECOND = 110;

export type NewsStatus = 'loading' | 'ok' | 'error';

interface Props { items: NewsItem[]; status: NewsStatus; label: string }

/** Headlines scrolling right to left. The arrow shows the estimated direction the news pushes the price. */
export function NewsTicker({ items, status, label }: Props) {
  const track = useRef<HTMLDivElement>(null);

  const fallback =
    status === 'loading' ? 'LOADING NEWS' : status === 'error' ? 'NEWS UNAVAILABLE RIGHT NOW' : `NO RECENT NEWS FOR ${label}`;
  const entries = items.length
    ? items.map((n) => ({ id: n.id, impact: n.impact, text: n.title }))
    : [{ id: 'fallback', impact: 'neutral' as const, text: fallback }];

  // Constant speed regardless of how much text there is.
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const half = el.scrollWidth / 2;
    el.style.setProperty('--dur', `${Math.max(20, half / PX_PER_SECOND)}s`);
  }, [entries.length, label, status]);

  const row = (suffix: string) => entries.map((e) => (
    <span className="n-item" key={`${e.id}-${suffix}`} data-impact={e.impact}>
      <b className={`n-arrow n-${e.impact}`} aria-label={e.impact === 'up' ? 'bullish' : e.impact === 'down' ? 'bearish' : 'neutral'}>{ARROW[e.impact]}</b>
      <span className="n-text">{e.text}</span>
    </span>
  ));

  return (
    <div className="news led" aria-label="News headlines">
      <div className="news__track" ref={track}>{row('a')}{row('b')}</div>
    </div>
  );
}
