export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="var(--butter)" stroke="var(--ink)" strokeWidth="3" />
        <path d="M10 44 C 20 44, 22 24, 32 30 S 46 14, 54 12" fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="54" cy="12" r="5" fill="var(--ink)" />
      </svg>
      <span className="logo__word">Trendline</span>
    </span>
  );
}
