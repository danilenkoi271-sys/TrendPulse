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

/** Tiny deterministic sparkline path for the sample cards (viewBox 0 0 100 36). */
export function miniPath(seed: number, up: boolean): string {
  const pts: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const trend = (up ? 1 : -1) * (i / 20) * 14;
    const y = 18 - trend + Math.sin(i * 1.3 + seed) * 4 + Math.cos(i * 0.7 + seed * 2) * 3;
    pts.push(`${i ? 'L' : 'M'}${(i * 5).toFixed(1)},${Math.min(33, Math.max(3, y)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// Verified points (every 15 minutes in the real product), x in 0..400.
const VERIFIED: [number, number][] = [[0, 96.0], [67, 97.6], [133, 96.9], [200, 99.4], [267, 101.8], [333, 100.9], [400, 103.1]];
// A handful of estimated ticks after the last verified one, x in 400..500. Always within 5% of 103.1.
const ESTIMATED: [number, number][] = [[400, 103.1], [412, 104.4], [425, 102.2], [438, 105.0], [450, 103.9], [463, 106.1], [475, 104.1], [488, 105.6], [500, 104.8]];

const W = 520, H = 250, PX = 12, PT = 18, PB = 22, LO = 93, HI = 109;
const X = (x: number) => PX + (x / 500) * (W - PX * 2);
const Y = (p: number) => PT + (1 - (p - LO) / (HI - LO)) * (H - PT - PB);

function smooth(pts: [number, number][]): string {
  const p = pts.map(([x, y]) => [X(x), Y(y)]);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export const HERO_CHART = {
  W, H,
  verifiedPath: smooth(VERIFIED),
  estimatedPath: ESTIMATED.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' '),
  verifiedDots: VERIFIED.map(([x, y]) => [X(x), Y(y)] as [number, number]),
  last: [X(500), Y(104.8)] as [number, number],
  areaPath: `${smooth(VERIFIED)} L${X(400)},${H - PB} L${X(0)},${H - PB} Z`,
};

export const HONEST_CHART = (() => {
  const w = 760, h = 270;
  const vx = [0, 150, 300, 450, 600, 750];
  const vy = [215, 170, 190, 120, 140, 52];
  const segs: string[] = [];
  const est: string[] = [];
  for (let i = 0; i < vx.length - 1; i++) {
    segs.push(`M${vx[i] + 5},${vy[i]} L${vx[i + 1] + 5},${vy[i + 1]}`);
    // wobble between verified points: estimated ticks stay near the earlier verified point
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
