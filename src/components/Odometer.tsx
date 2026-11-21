import { useEffect, useRef, useState } from 'react';

const DIGITS = '0123456789'.split('');
const num = (s: string) => parseFloat(s.replace(/[^0-9.-]/g, ''));

/** Rolling-digit number. Screen readers get the plain text; `flash` pulses green/red when the value moves. */
export function Odometer({ value, className = '', flash = false }: { value: string; className?: string; flash?: boolean }) {
  const prev = useRef(value);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    if (!flash || prev.current === value) { prev.current = value; return; }
    const d = num(value) > num(prev.current) ? 'up' : 'down';
    prev.current = value;
    setDir(d);
    const t = setTimeout(() => setDir(null), 1100);
    return () => clearTimeout(t);
  }, [value, flash]);

  const chars = value.split('');
  return (
    <span className={`odo ${dir ? `odo--${dir}` : ''} ${className}`} data-testid="odometer">
      <span className="sr-only">{value}</span>
      <span aria-hidden="true" style={{ display: 'inline-flex' }}>
        {chars.map((c, i) => {
          const key = chars.length - i; // align by position from the right
          if (/\d/.test(c)) {
            return (
              <span className="odo__col" key={key}>
                <span className="odo__strip" style={{ transform: `translateY(${-Number(c) * 10}%)` }}>
                  {DIGITS.map((d) => <span key={d}>{d}</span>)}
                </span>
              </span>
            );
          }
          return <span key={key} className={`odo__chr ${c === ',' || c === '.' ? 'odo__chr--sep' : ''}`}>{c}</span>;
        })}
      </span>
    </span>
  );
}
