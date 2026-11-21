import { supabase } from './supabase';
import { RANGE_MS, downsample, mergeTicks } from './ticks';
import type { Artist, PortfolioSummary, Range, Tick, TradeRow } from './types';

const PAGE = 1000;
const TICK_COLS = 'id, artist_id, price, is_simulated, created_at';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function fetchArtists(): Promise<Artist[]> {
  return check(await supabase.from('artists').select('*').order('name'));
}

export async function fetchArtist(id: string): Promise<Artist | null> {
  return check(await supabase.from('artists').select('*').eq('id', id).maybeSingle());
}

/** The most recent `limit` ticks of any kind, ascending. */
export async function fetchRecentTicks(artistId: string, limit: number): Promise<Tick[]> {
  const rows = check(
    await supabase.from('price_ticks').select(TICK_COLS).eq('artist_id', artistId).order('id', { ascending: false }).limit(limit),
  ) as Tick[];
  return rows.reverse();
}

export async function fetchTicksAfter(artistId: string, afterId: number): Promise<Tick[]> {
  return check(
    await supabase.from('price_ticks').select(TICK_COLS).eq('artist_id', artistId).gt('id', afterId).order('id').limit(PAGE),
  ) as Tick[];
}

export async function fetchLastReal(artistId: string): Promise<Tick | null> {
  return check(
    await supabase.from('price_ticks').select(TICK_COLS).eq('artist_id', artistId).eq('is_simulated', false).order('id', { ascending: false }).limit(1).maybeSingle(),
  ) as Tick | null;
}

async function paged(build: (from: number, to: number) => PromiseLike<{ data: Tick[] | null; error: { message: string } | null }>, maxPages = 6): Promise<Tick[]> {
  const out: Tick[] = [];
  for (let p = 0; p < maxPages; p++) {
    const rows = check(await build(p * PAGE, p * PAGE + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/**
 * Ticks for the chart. 1H/1D load every tick. 1W/1M would be tens of thousands of
 * per-minute estimates, so they load verified ticks only, plus all ticks from the last hour.
 */
export async function fetchChartTicks(artistId: string, range: Range): Promise<Tick[]> {
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const base = (from: string) => (a: number, b: number) =>
    supabase.from('price_ticks').select(TICK_COLS).eq('artist_id', artistId).gte('created_at', from).order('id').range(a, b) as unknown as PromiseLike<{ data: Tick[] | null; error: { message: string } | null }>;

  if (range === '1H' || range === '1D') {
    return downsample(await paged(base(since(RANGE_MS[range]))), 400);
  }
  const real = await paged((a, b) =>
    supabase.from('price_ticks').select(TICK_COLS).eq('artist_id', artistId).eq('is_simulated', false).gte('created_at', since(RANGE_MS[range])).order('id').range(a, b) as unknown as PromiseLike<{ data: Tick[] | null; error: { message: string } | null }>,
  );
  const recent = await paged(base(since(RANGE_MS['1H'])));
  return downsample(mergeTicks(real, recent), 400);
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  return check(await supabase.rpc('portfolio_summary')) as PortfolioSummary;
}

export async function fetchTrades(limit = 100): Promise<TradeRow[]> {
  return check(
    await supabase.from('trades').select('id, artist_id, shares, price, price_is_simulated, created_at, artists(name)').order('id', { ascending: false }).limit(limit),
  ) as unknown as TradeRow[];
}

export interface TradeReceipt { price: number; isSimulated: boolean; shares: number }

export async function executeTrade(artistId: string, shares: number): Promise<TradeReceipt> {
  const { data, error } = await supabase.rpc('trade', { p_artist: artistId, p_shares: shares });
  if (error) throw new Error(friendlyTradeError(error));
  // trade() returns only the price; read the ledger row it just wrote to learn the price type.
  const last = check(
    await supabase.from('trades').select('price, price_is_simulated').eq('artist_id', artistId).order('id', { ascending: false }).limit(1).maybeSingle(),
  ) as { price: number; price_is_simulated: boolean } | null;
  return { price: Number(data), isSimulated: last?.price_is_simulated ?? false, shares };
}

export function friendlyTradeError(e: { message: string; code?: string }): string {
  const m = e.message ?? '';
  if (m.includes('profiles_balance_check')) return 'Not enough play-money balance for that order.';
  if (m.includes('holdings_shares_check') || m.includes('cannot sell shares')) return "You can't sell more shares than you hold. Short selling isn't available.";
  if (m.includes('no price available')) return 'This artist has no price yet. Try again in a minute.';
  if (m.includes('order too small')) return 'That order is too small. Try a larger share amount.';
  if (m.includes('shares must be non-zero')) return 'Enter a number of shares.';
  if (m.includes('not authenticated')) return 'Please sign in again.';
  return 'The order could not be placed. Nothing was changed.';
}
