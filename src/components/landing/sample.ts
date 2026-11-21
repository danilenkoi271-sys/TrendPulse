// Illustrative sample data for the landing page only. Not real prices; names are fictional.

export const SAMPLE_CREATORS = [
  { name: 'Pixel Pete', price: 104.8, change: 4.8, est: true },
  { name: 'Mira Makes', price: 92.15, change: -7.85, est: false },
  { name: 'Gadget Gus', price: 118.4, change: 18.4, est: true },
  { name: 'Lola Lifts', price: 99.02, change: -0.98, est: false },
  { name: 'Chef Okonkwo', price: 110.66, change: 10.66, est: true },
  { name: 'Skate Sisters', price: 87.3, change: -12.7, est: false },
  { name: 'Paper Planets', price: 101.25, change: 1.25, est: true },
];

/** Deterministic pseudo-noise so the hero chart is identical on every load. */
const noise = (i: number) => Math.sin(i * 1.7) * 0.5 + Math.sin(i * 0.53 + 1.3) * 0.8 + Math.sin(i * 3.1) * 0.25;

export const HERO_N = 101;
export const HERO_EVERY = 12; // one verified tick per 12 samples (15 min vs. every minute, compressed)
export const HERO_SERIES: number[] = Array.from({ length: HERO_N }, (_, i) => {
  const verifiedBase = 96 + (i / (HERO_N - 1)) * 11 + Math.sin(i / 14) * 2.6;
  const isVerified = i % HERO_EVERY === 0;
  return +(verifiedBase + (isVerified ? 0 : noise(i) * 0.9)).toFixed(2);
});
export const heroIsVerified = (i: number) => i % HERO_EVERY === 0 || i === 0;
export const HERO_LO = Math.min(...HERO_SERIES) - 1.5;
export const HERO_HI = Math.max(...HERO_SERIES) + 1.5;

export const HONEST_CHART = (() => {
  const w = 760, h = 270;
  const vx = [0, 150, 300, 450, 600, 750];
  const vy = [215, 170, 190, 120, 140, 52];
  const est: string[] = [];
  for (let i = 0; i < vx.length - 1; i++) {
    const pts: string[] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const jitter = Math.sin((i * 7 + k) * 2.3) * 24;
      pts.push(`${k ? 'L' : 'M'}${(vx[i] + 5 + t * 150).toFixed(1)},${(vy[i] + (vy[i + 1] - vy[i]) * t + jitter * Math.sin(Math.PI * t)).toFixed(1)}`);
    }
    est.push(pts.join(' '));
  }
  return { w, h, vx: vx.map((x) => x + 5), vy, est };
})();
