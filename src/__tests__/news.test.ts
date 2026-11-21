import { describe, expect, it } from 'vitest';
import { fetchNews, impactOf, isMarketWide, mentions, newsFor, normalizeSymbol, parseGateway, type NewsItem } from '../lib/news';

describe('headline impact arrows', () => {
  it.each([
    ['Bitcoin surges past $100K as ETF inflows hit record', 'up'],
    ['Solana jumps after major partnership announced', 'up'],
    ['Exchange hacked: $200M stolen in exploit', 'down'],
    ['SEC sues major exchange as market plunges', 'down'],
    ['Ethereum developers schedule next network meeting', 'neutral'],
    ['Token rallies, then crashes', 'neutral'], // one of each cancels out
  ])('%s -> %s', (title, impact) => {
    expect(impactOf(title)).toBe(impact);
  });
});

describe('which news belongs to which market', () => {
  it('normalises Hyperliquid symbols', () => {
    expect(normalizeSymbol('kPEPE')).toBe('PEPE');
    expect(normalizeSymbol('1000SHIB')).toBe('SHIB');
    expect(normalizeSymbol('UBTC')).toBe('BTC');
    expect(normalizeSymbol('HYPE')).toBe('HYPE');
  });

  it('matches names and tickers, but not common words that look like tickers', () => {
    expect(mentions('Solana network upgrade lands', 'SOL')).toBe(true);
    expect(mentions('SOL climbs 8% overnight', 'SOL')).toBe(true);
    expect(mentions('Hyperliquid volume hits record', 'HYPE')).toBe(true);
    expect(mentions('the sol was bright, a link in the chain, hope and hype', 'SOL')).toBe(false);
    expect(mentions('a link in the chain', 'LINK')).toBe(false);
    expect(mentions('Chainlink launches new oracle', 'LINK')).toBe(true);
    expect(mentions('kPEPE memecoin jumps', 'kPEPE')).toBe(false); // "kPEPE" is not the word PEPE
    expect(mentions('PEPE memecoin jumps', 'kPEPE')).toBe(true);
  });

  it('flags market-wide headlines', () => {
    expect(isMarketWide('Fed signals rate cut as crypto rallies')).toBe(true);
    expect(isMarketWide('Local bakery wins award')).toBe(false);
  });

  const mk = (id: string, title: string, minsAgo: number): NewsItem => ({
    id, title, source: 'T', publishedAt: Date.UTC(2026, 10, 21, 12, 0) - minsAgo * 60_000, text: title, impact: impactOf(title),
  });

  it('puts asset-specific headlines first, then market-wide ones, newest first', () => {
    const items = [
      mk('1', 'Fed holds rates, crypto market steady', 5),
      mk('2', 'Solana surges on new ETF filing', 60),
      mk('3', 'Dogecoin jumps 10%', 1),
      mk('4', 'Solana outage hits validators', 20),
      mk('5', 'Local bakery wins award', 2),
    ];
    const out = newsFor(items, 'SOL').map((n) => n.id);
    expect(out).toEqual(['4', '2', '1']); // 4 newer than 2, both specific; then wide; DOGE & bakery excluded
  });

  it('returns nothing for an asset with no relevant or market-wide news', () => {
    expect(newsFor([mk('1', 'Dogecoin jumps 10%', 1)], 'SOL')).toEqual([]);
  });
});

describe('news fetching', () => {
  const gateway = (titles: string[], pub = '2026-11-21 11:00:00') => ({
    status: 'ok', feed: { title: 'Cointelegraph - The future of money' },
    items: titles.map((t, i) => ({ title: t, guid: `g${i}${t}`, pubDate: pub, description: '<p>desc &amp; more</p>', categories: ['Bitcoin'] })),
  });

  it('parses gateway items, drops stale ones and decodes text', () => {
    const now = Date.UTC(2026, 10, 21, 12, 0);
    const items = parseGateway({
      status: 'ok', feed: { title: 'CoinDesk - Latest' },
      items: [
        { title: 'Bitcoin &amp; ether rally', pubDate: '2026-11-21 10:00:00', guid: 'a' },
        { title: 'Ancient news', pubDate: '2026-11-01 10:00:00', guid: 'b' },
      ],
    }, now);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Bitcoin & ether rally');
    expect(items[0].source).toBe('CoinDesk');
    expect(items[0].impact).toBe('up');
  });

  it('merges feeds, de-duplicates by title and tolerates a failing feed', async () => {
    let n = 0;
    const impl = (async () => {
      n++;
      if (n === 2) return new Response('bad', { status: 500 });
      return new Response(JSON.stringify(gateway(n === 1 ? ['Same headline', 'Only first'] : ['Same headline', 'Only later'], n === 1 ? undefined : '2026-11-21 11:30:00')), { status: 200 });
    }) as unknown as typeof fetch;
    const realNow = Date.now;
    Date.now = () => Date.UTC(2026, 10, 21, 12, 0);
    try {
      const items = await fetchNews(impl);
      expect(items.map((i) => i.title).sort()).toEqual(['Only first', 'Only later', 'Same headline']);
      expect(n).toBe(4);
    } finally { Date.now = realNow; }
  });

  it('returns [] when every feed fails', async () => {
    const impl = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await fetchNews(impl)).toEqual([]);
  });
});
