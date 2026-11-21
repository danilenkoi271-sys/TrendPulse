export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" fill="var(--flare)" />
        <path d="M5 23 L12 15 L17 19 L26 8" fill="none" stroke="#0c0c0b" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" className="logo__tick" />
        <rect x="22.5" y="4.5" width="7" height="7" fill="#0c0c0b" className="logo__tick" />
      </svg>
      <span className="logo__word">Trendline</span>
    </span>
  );
}
