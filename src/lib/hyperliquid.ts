// Hyperliquid public info API: https://api.hyperliquid.xyz/info (CORS-enabled, no key needed).

export const HL_URL = 'https://api.hyperliquid.xyz/info';

export interface Market {
  /** Stable id used for selection: `perp:BTC` or `spot:HYPE/USDC`. */
  key: string;
  kind: 'perp' | 'spot';
  /** What the board shows: `BTC`, `HYPE/USDC`. */
  label: string;
  /** Base asset symbol, used to match news. */
  base: string;
  price: number;
  prevDayPx: number;
  /** 24h notional volume in USD. */
  volume: number;
  /** 24h price change in percent (mark price vs. price 24h ago). */
  changePct: number;
}

type Ctx = { markPx?: string | null; midPx?: string | null; prevDayPx?: string | null; dayNtlVlm?: string | null };
interface PerpMeta { universe: { name: string; isDelisted?: boolean }[] }
interface SpotMeta { tokens: { name: string; index: number }[]; universe: { name: string; tokens: [number, number] }[] }

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : NaN;
};

function build(key: string, kind: Market['kind'], label: string, base: string, ctx: Ctx): Market | null {
  const price = num(ctx.markPx) || num(ctx.midPx);
  if (!(price > 0)) return null;
  const prev = num(ctx.prevDayPx);
  const volume = num(ctx.dayNtlVlm);
  return {
    key, kind, label, base, price,
    prevDayPx: Number.isFinite(prev) ? prev : price,
    volume: Number.isFinite(volume) ? volume : 0,
    changePct: prev > 0 ? ((price - prev) / prev) * 100 : 0,
  };
}

/** `metaAndAssetCtxs` response -> perp markets (delisted ones skipped). */
export function parsePerps(raw: unknown): Market[] {
  const [meta, ctxs] = raw as [PerpMeta, Ctx[]];
  const out: Market[] = [];
  meta.universe.forEach((u, i) => {
    if (u.isDelisted || !ctxs[i]) return;
    const m = build(`perp:${u.name}`, 'perp', u.name, u.name, ctxs[i]);
    if (m) out.push(m);
  });
  return out;
}

/** `spotMetaAndAssetCtxs` response -> spot markets. `@107`-style pair names are resolved to `BASE/QUOTE`. */
export function parseSpot(raw: unknown): Market[] {
  const [meta, ctxs] = raw as [SpotMeta, Ctx[]];
  const tokenName = new Map(meta.tokens.map((t) => [t.index, t.name]));
  const out: Market[] = [];
  meta.universe.forEach((u, i) => {
    if (!ctxs[i]) return;
    const base = tokenName.get(u.tokens[0]) ?? u.name;
    const quote = tokenName.get(u.tokens[1]) ?? 'USDC';
    const label = u.name.startsWith('@') ? `${base}/${quote}` : u.name;
    const m = build(`spot:${label}`, 'spot', label, base, ctxs[i]);
    if (m) out.push(m);
  });
  return out;
}

async function post(body: object, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(HL_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Hyperliquid responded ${res.status}`);
  return res.json();
}

export interface FetchOptions { perp?: boolean; spot?: boolean; fetchImpl?: typeof fetch }

/** Fetches the requested market kinds in parallel. One failing kind doesn't hide the other; both failing throws. */
export async function fetchMarkets({ perp = true, spot = true, fetchImpl = fetch }: FetchOptions = {}): Promise<Market[]> {
  const jobs: Promise<Market[]>[] = [];
  if (perp) jobs.push(post({ type: 'metaAndAssetCtxs' }, fetchImpl).then(parsePerps));
  if (spot) jobs.push(post({ type: 'spotMetaAndAssetCtxs' }, fetchImpl).then(parseSpot));
  const settled = await Promise.allSettled(jobs);
  const ok = settled.filter((s): s is PromiseFulfilledResult<Market[]> => s.status === 'fulfilled');
  if (ok.length === 0) {
    const first = settled.find((s): s is PromiseRejectedResult => s.status === 'rejected');
    throw first?.reason instanceof Error ? first.reason : new Error('Could not reach Hyperliquid');
  }
  return ok.flatMap((s) => s.value);
}
