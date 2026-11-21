// News: public crypto RSS feeds, converted to JSON by the rss2json gateway (CORS-enabled, no key).
// Impact arrows come from a keyword heuristic on the headline. It is an estimate, not analysis.

export const FEEDS = [
  'https://cointelegraph.com/rss',
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://decrypt.co/feed',
  'https://www.theblock.co/rss.xml',
];
export const GATEWAY = 'https://api.rss2json.com/v1/api.json?rss_url=';
const MAX_AGE_MS = 48 * 3600_000;

export type Impact = 'up' | 'down' | 'neutral';

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: number;
  /** Headline + short description, used for relevance matching. */
  text: string;
  impact: Impact;
}

// --- Sentiment (headline keywords) ------------------------------------------------------------

const BULL = /\b(surge[sd]?|soar(s|ed|ing)?|rall(y|ies|ied)|jump(s|ed)?|climb(s|ed)?|gain(s|ed)?|rise[sn]?|rising|record(-high)?|all-time high|ath|approv(e|es|ed|al)|adopt(s|ed|ion)?|partner(s|ship)?|launch(es|ed)?|upgrade[sd]?|inflows?|bullish|breakout|breaks? above|accumulat\w*|buys?|bought|integrat\w*|listing|lists|boost(s|ed)?|recover(s|ed|y)?|rebound(s|ed)?|spike[sd]?|outperform\w*|milestone|institutional demand|etf (approved|inflows?)|win(s)?)\b/i;
const BEAR = /\b(plung(e|es|ed)|crash(es|ed)?|drop(s|ped)?|fall(s|en)?|slump(s|ed)?|tumbl(e|es|ed)|sink(s)?|sank|declin(e|es|ed)|hack(s|ed)?|exploit(s|ed)?|breach(ed)?|stolen|theft|ban(s|ned)?|lawsuit|sue[sd]?|charges?|charged|outflows?|sell-?off|dump(s|ed)?|liquidat\w*|bearish|delist\w*|fraud|bankrupt\w*|insolven\w*|probe[sd]?|investigat\w*|fine[sd]?|warning|warns?|rug ?pull|collapse[sd]?|loses|lost|slide[sd]?|retreat(s|ed)?|reject(s|ed)?|denies|denied|crackdown|shutdown|halt(s|ed)?|vulnerab\w*|scam)\b/i;

export function scoreSentiment(title: string): number {
  const bull = (title.match(new RegExp(BULL.source, 'gi')) ?? []).length;
  const bear = (title.match(new RegExp(BEAR.source, 'gi')) ?? []).length;
  return bull - bear;
}

export function impactOf(title: string): Impact {
  const s = scoreSentiment(title);
  return s > 0 ? 'up' : s < 0 ? 'down' : 'neutral';
}

// --- Relevance ---------------------------------------------------------------------------------

const NAMES: Record<string, string[]> = {
  BTC: ['bitcoin'], ETH: ['ethereum', 'ether'], SOL: ['solana'], HYPE: ['hyperliquid'], XRP: ['ripple'],
  DOGE: ['dogecoin'], BNB: ['binance coin', 'bnb chain'], ADA: ['cardano'], AVAX: ['avalanche'], LINK: ['chainlink'],
  SUI: [], TON: ['toncoin', 'the open network'], LTC: ['litecoin'], DOT: ['polkadot'], TRX: ['tron'],
  NEAR: ['near protocol'], APT: ['aptos'], ARB: ['arbitrum'], OP: ['optimism'], PEPE: ['pepe'],
  WIF: ['dogwifhat'], AAVE: ['aave'], UNI: ['uniswap'], BCH: ['bitcoin cash'], ATOM: ['cosmos'],
  FIL: ['filecoin'], INJ: ['injective'], TIA: ['celestia'], SEI: [], ENA: ['ethena'], ONDO: [],
  BONK: ['bonk'], SHIB: ['shiba inu'], MATIC: ['polygon'], POL: ['polygon'], PENGU: ['pudgy penguins'],
  TRUMP: ['trump coin'], FARTCOIN: ['fartcoin'], XLM: ['stellar'], HBAR: ['hedera'], ICP: ['internet computer'],
};

/** `kPEPE` -> PEPE, `1000SHIB` -> SHIB, `UBTC` (Unit wrapped) -> BTC. */
export function normalizeSymbol(base: string): string {
  let s = base.trim();
  if (/^k[A-Z]{2,}/.test(s)) s = s.slice(1);
  s = s.replace(/^1000+/, '');
  if (/^U[A-Z]{2,}/.test(s) && NAMES[s.slice(1)]) s = s.slice(1);
  return s.toUpperCase();
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Does this text talk about the given asset? Tickers match case-sensitively (so "sol"/"link"/"op" in prose don't). */
export function mentions(text: string, base: string): boolean {
  const sym = normalizeSymbol(base);
  if (new RegExp(`(^|[^A-Za-z0-9])\\$?${esc(sym)}([^A-Za-z0-9]|$)`).test(text)) return true;
  const names = NAMES[sym] ?? (sym.length >= 5 ? [sym.toLowerCase()] : []);
  return names.some((n) => new RegExp(`\\b${esc(n)}\\b`, 'i').test(text));
}

const MARKET_WIDE = /\b(crypto(currenc(y|ies))?( market)?|digital assets?|fed|federal reserve|fomc|inflation|interest rates?|rate (cut|hike)s?|sec|cftc|etfs?|regulat\w*|stablecoins?|tariffs?|treasury|liquidations?|bitcoin|btc)\b/i;

export const isMarketWide = (text: string): boolean => MARKET_WIDE.test(text);

/** News for one asset: items that mention it first, then market-wide headlines. Newest first within each group. */
export function newsFor(items: NewsItem[], base: string, limit = 14): NewsItem[] {
  const specific: NewsItem[] = [];
  const wide: NewsItem[] = [];
  for (const it of items) {
    if (mentions(it.text, base)) specific.push(it);
    else if (isMarketWide(it.title)) wide.push(it);
  }
  const byNew = (a: NewsItem, b: NewsItem) => b.publishedAt - a.publishedAt;
  return [...specific.sort(byNew), ...wide.sort(byNew)].slice(0, limit);
}

// --- Fetching ----------------------------------------------------------------------------------

interface GatewayItem { title?: string; pubDate?: string; link?: string; guid?: string; description?: string; categories?: string[] }
interface GatewayResponse { status?: string; feed?: { title?: string }; items?: GatewayItem[] }

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#8217': '\u2019', '#8216': '\u2018', '#8220': '\u201c', '#8221': '\u201d', '#8211': '\u2013', '#8212': '\u2014' };
const decodeEntities = (s: string) => s.replace(/&(#?[a-z0-9]+);/gi, (_m, e: string) => ENTITIES[e.toLowerCase()] ?? ' ');
const stripHtml = (s: string) => decodeEntities(s.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const decodeTitle = stripHtml;

export function parseGateway(res: GatewayResponse, now = Date.now()): NewsItem[] {
  if (res.status !== 'ok' || !res.items) return [];
  const source = res.feed?.title?.split(' - ')[0] ?? 'NEWS';
  const out: NewsItem[] = [];
  for (const it of res.items) {
    if (!it.title) continue;
    const t = it.pubDate ? Date.parse(it.pubDate.replace(' ', 'T') + 'Z') : now;
    const publishedAt = Number.isFinite(t) ? t : now;
    if (now - publishedAt > MAX_AGE_MS) continue;
    const title = decodeTitle(it.title);
    out.push({
      id: it.guid || it.link || title,
      title, source, publishedAt,
      text: `${title} ${(it.categories ?? []).join(' ')} ${stripHtml(it.description ?? '').slice(0, 280)}`,
      impact: impactOf(title),
    });
  }
  return out;
}

/** Fetches every feed independently; a failing feed is skipped. Returns [] when nothing could be loaded. */
export async function fetchNews(fetchImpl: typeof fetch = fetch): Promise<NewsItem[]> {
  const settled = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetchImpl(`${GATEWAY}${encodeURIComponent(feed)}`);
      if (!res.ok) throw new Error(`news ${res.status}`);
      return parseGateway((await res.json()) as GatewayResponse);
    }),
  );
  const seen = new Set<string>();
  const all: NewsItem[] = [];
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue;
    for (const it of s.value) {
      const k = it.title.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      all.push(it);
    }
  }
  return all.sort((a, b) => b.publishedAt - a.publishedAt);
}
