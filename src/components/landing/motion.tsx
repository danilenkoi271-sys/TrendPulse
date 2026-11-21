import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Adds `is-in` once the element scrolls into view. */
export function useInView<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || reduced()) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }: { as?: ElementType; delay?: number; className?: string; children: ReactNode } & Record<string, unknown>) {
  const [ref, seen] = useInView<HTMLElement>();
  return (
    <Tag ref={ref} className={`reveal ${seen ? 'is-in' : ''} ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}

/** Eases a number toward `target` (spring-ish), for count-ups and the price toy. */
export function useEased(target: number, speed = 0.14) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (reduced()) { cur.current = target; setV(target); return; }
    let raf = 0;
    const tick = () => {
      cur.current += (target - cur.current) * speed;
      if (Math.abs(target - cur.current) < 0.005) cur.current = target;
      setV(cur.current);
      if (cur.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return v;
}

/** Writes pointer position (-1..1) to --mx / --my on the element, for parallax and tilt. */
export function usePointerVars<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || typeof matchMedia === 'undefined' || matchMedia('(pointer: coarse)').matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2));
        el.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2));
      });
    };
    const leave = () => { el.style.setProperty('--mx', '0'); el.style.setProperty('--my', '0'); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); };
  }, []);
  return ref;
}

/** Thin brand-coloured page progress bar. */
export function ScrollBar() {
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      document.documentElement.style.setProperty('--sp', String(max > 0 ? Math.min(1, scrollY / max) : 0));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    update();
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return <div className="scrollbar" aria-hidden="true" />;
}

/** Ring that trails the pointer and swells over interactive elements. */
export function CursorRing() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced() || typeof matchMedia === 'undefined' || matchMedia('(pointer: coarse)').matches) return;
    const el = ref.current!;
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const loop = () => { x += (tx - x) * 0.2; y += (ty - y) * 0.2; el.style.transform = `translate(${x}px, ${y}px)`; raf = requestAnimationFrame(loop); };
    const move = (e: PointerEvent) => {
      tx = e.clientX; ty = e.clientY; el.classList.add('is-on');
      el.classList.toggle('is-hot', !!(e.target as HTMLElement).closest?.('a, button, input, [role=tab], .mcard'));
    };
    const leave = () => el.classList.remove('is-on');
    addEventListener('pointermove', move); document.documentElement.addEventListener('pointerleave', leave);
    raf = requestAnimationFrame(loop);
    return () => { removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); cancelAnimationFrame(raf); };
  }, []);
  return <div className="cursor-ring" ref={ref} aria-hidden="true" />;
}

/** Pulls the element toward the pointer while hovering. */
export function useMagnetic<T extends HTMLElement>(strength = 0.3) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || typeof matchMedia === 'undefined' || matchMedia('(pointer: coarse)').matches) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${(e.clientX - (r.left + r.width / 2)) * strength}px`);
      el.style.setProperty('--ty', `${(e.clientY - (r.top + r.height / 2)) * strength}px`);
    };
    const leave = () => { el.style.setProperty('--tx', '0px'); el.style.setProperty('--ty', '0px'); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [strength]);
  return ref;
}

/** Splits text into word > letter spans for staggered, per-letter motion. */
export function Letters({ text, start = 0, step = 28 }: { text: string; start?: number; step?: number }) {
  let n = 0;
  return (
    <>
      {text.split(' ').map((w, wi) => (
        <span className="word" key={wi}>
          {w.split('').map((c) => (
            <span className="ltr" key={n} style={{ '--i': start + n++ * step } as CSSProperties}><span>{c}</span></span>
          ))}
          {' '}
        </span>
      ))}
    </>
  );
}

/** Infinite marquee whose speed and skew react to scroll velocity. */
export function Marquee({ children, dir = 1, speed = 0.6, className = '' }: { children: ReactNode; dir?: 1 | -1; speed?: number; className?: string }) {
  const track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = track.current;
    if (!el || reduced()) return;
    let x = 0, last = scrollY, vel = 0, raf = 0;
    const loop = () => {
      const dy = scrollY - last; last = scrollY;
      vel += (dy - vel) * 0.12;
      x -= dir * (speed + Math.abs(vel) * 0.35);
      const half = el.scrollWidth / 2;
      if (x <= -half) x += half; if (x > 0) x -= half;
      el.style.transform = `translate3d(${x}px,0,0) skewX(${Math.max(-12, Math.min(12, -vel * 0.4 * dir))}deg)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [dir, speed]);
  return <div className={`marquee ${className}`}><div className="marquee__track" ref={track}>{children}{children}</div></div>;
}

/** Writes 0..1 progress (--ep) as the element travels through the viewport. */
export function useElementProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--ep', String(Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)))));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    addEventListener('scroll', on, { passive: true }); addEventListener('resize', on);
    update();
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return ref;
}

export const prefersReducedMotion = reduced;
