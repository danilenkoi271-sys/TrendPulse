import { describe, expect, it, vi } from 'vitest';
import perpsFixture from './fixtures/perps.json';
import spotFixture from './fixtures/spot.json';
import { fetchMarkets, parsePerps, parseSpot } from '../lib/hyperliquid';
import { formatPct, formatPrice, formatVolume, trend } from '../lib/format';
import { loadSelection, saveSelection, DEFAULT_SELECTION } from '../lib/settings';

describe('Hyperliquid parsing (real captured responses)', () => {
  it('maps perps: mark price, 24h change from prevDayPx, 24h notional volume', () => {
    const markets = parsePerps(perpsFixture);
    const btc = markets.find((m) => m.key === 'perp:BTC')!;
    const raw = (perpsFixture as unknown as [unknown, { markPx: string; prevDayPx: string; dayNtlVlm: string }[]])[1][0];
    expect(btc.kind).toBe('perp');
    expect(btc.price).toBe(parseFloat(raw.markPx));
    expect(btc.volume).toBeCloseTo(parseFloat(raw.dayNtlVlm));
    expect(btc.changePct).toBeCloseTo(((parseFloat(raw.markPx) - parseFloat(raw.prevDayPx)) / parseFloat(raw.prevDayPx)) * 100, 8);
    const live = (perpsFixture as unknown as [{ universe: { isDelisted?: boolean }[] }, { markPx: string }[]])[0].universe.filter((u, i) => !u.isDelisted && parseFloat((perpsFixture as unknown as [unknown, { markPx: string }[]])[1][i].markPx) > 0).length;
    expect(markets).toHaveLength(live);
  });

  it('resolves @-style spot pair names to BASE/QUOTE and keeps named pairs', () => {
    const markets = parseSpot(spotFixture);
    const keys = markets.map((m) => m.key);
    expect(keys[0]).toBe('spot:PURR/USDC');
    expect(keys[1]).toBe('spot:HFUN/USDC'); // "@1" -> HFUN/USDC
    expect(markets[1].base).toBe('HFUN');
    expect(markets.every((m) => m.kind === 'spot' && m.price > 0)).toBe(true);
  });

  it('skips delisted perps and entries without a price', () => {
    const raw = [
      { universe: [{ name: 'AAA' }, { name: 'OLD', isDelisted: true }, { name: 'ZERO' }] },
      [{ markPx: '2', prevDayPx: '1', dayNtlVlm: '10' }, { markPx: '5', prevDayPx: '5', dayNtlVlm: '1' }, { markPx: '0', prevDayPx: '0', dayNtlVlm: '0' }],
    ];
    expect(parsePerps(raw).map((m) => m.label)).toEqual(['AAA']);
  });

  it('fetches only the requested kinds, and tolerates one kind failing', async () => {
    const calls: string[] = [];
    const impl = vi.fn(async (_url: string, init?: RequestInit) => {
      const type = JSON.parse(String(init?.body)).type as string;
      calls.push(type);
      if (type === 'spotMetaAndAssetCtxs') return new Response('nope', { status: 500 });
      return new Response(JSON.stringify(perpsFixture), { status: 200 });
    }) as unknown as typeof fetch;

    const live = parsePerps(perpsFixture).length;
    expect((await fetchMarkets({ perp: true, spot: false, fetchImpl: impl })).length).toBe(live);
    expect(calls).toEqual(['metaAndAssetCtxs']);

    calls.length = 0;
    expect((await fetchMarkets({ fetchImpl: impl })).length).toBe(live); // spot failed, perps still show
    expect(calls.sort()).toEqual(['metaAndAssetCtxs', 'spotMetaAndAssetCtxs']);

    const dead = (async () => new Response('x', { status: 503 })) as unknown as typeof fetch;
    await expect(fetchMarkets({ fetchImpl: dead })).rejects.toThrow(/503/);
  });
});

describe('formatting', () => {
  it('formats prices for any magnitude', () => {
    expect(formatPrice(59021.3)).toBe('$59,021.30');
    expect(formatPrice(1626.4)).toBe('$1,626.40');
    expect(formatPrice(1.6264)).toBe('$1.6264');
    expect(formatPrice(0.070299)).toBe('$0.07030');
    expect(formatPrice(0.00004961)).toBe('$0.00004961');
  });
  it('formats volume compactly', () => {
    expect(formatVolume(5865463156.71)).toBe('$5.87B');
    expect(formatVolume(42_500_000)).toBe('$42.50M');
    expect(formatVolume(13_040)).toBe('$13.0K');
    expect(formatVolume(850)).toBe('$850');
  });
  it('formats change with an explicit sign', () => {
    expect(formatPct(4.8)).toBe('+4.80%');
    expect(formatPct(-1.234)).toBe('-1.23%');
    expect(formatPct(0)).toBe('0.00%');
    expect(trend(-0.1)).toBe('down');
  });
});

describe('settings', () => {
  it('round-trips the selection in order and falls back to defaults', () => {
    localStorage.clear();
    expect(loadSelection()).toEqual(DEFAULT_SELECTION);
    saveSelection(['perp:ETH', 'spot:HYPE/USDC', 'perp:BTC']);
    expect(loadSelection()).toEqual(['perp:ETH', 'spot:HYPE/USDC', 'perp:BTC']);
    localStorage.setItem('hl-led-board.v1', '{not json');
    expect(loadSelection()).toEqual(DEFAULT_SELECTION);
  });
});
