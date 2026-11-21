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
