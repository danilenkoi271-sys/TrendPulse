# Hyperliquid LED Board

A full-screen LED scoreboard for [Hyperliquid](https://hyperliquid.xyz) perps and spot markets. It shows one market at a
time in big amber dot-matrix type: the **name**, the **price**, **24h volume** and **24h % change**, with a scrolling
**news ticker** underneath. A green ▲ or red ▼ on each headline shows the direction the news is likely to push the price.

- Prices refresh **every 10 seconds**.
- The board moves to the next market **every 30 seconds**.
- Before you start, pick which perps and spot markets to cycle through (search, filter, top-10 shortcut). Your
  choice and its order are remembered in the browser.
- **Full screen:** the start screen's *Start full screen* button hides the browser chrome. In full screen, **tap or click
  anywhere** (or press Space / → ) to jump to the next market; the 30 second timer restarts. ← goes back. Press Esc to leave.
- The screen is kept awake while the board runs (where the browser supports it).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (relative paths, host it anywhere)
npm test
```

No backend and no API keys: the browser calls Hyperliquid's public info API directly (it allows cross-origin requests).

## Data

| What | Source |
|---|---|
| Price, 24h volume, 24h change | `POST https://api.hyperliquid.xyz/info` with `metaAndAssetCtxs` (perps) and `spotMetaAndAssetCtxs` (spot). Price is the mark price; 24h change is mark price vs. `prevDayPx`; volume is `dayNtlVlm` in USD. |
| News | Public crypto RSS feeds (Cointelegraph, CoinDesk, Decrypt, The Block), converted to JSON by the `api.rss2json.com` gateway, refreshed every 5 minutes. |

Only the market kinds you selected are fetched on each refresh.

### How news is matched and scored

- **Which market a headline belongs to:** it mentions the asset by name or ticker (tickers match case-sensitively so words
  like "link" or "sol" in prose don't count). Headlines about the whole market (Bitcoin, ETFs, the Fed, regulation,
  stablecoins…) appear on every market, after the asset-specific ones.
- **The arrow:** a keyword heuristic on the headline (words like *surges, approval, inflows* vs. *hack, lawsuit, plunge,
  delisting*). Mixed or neutral headlines get a grey ■. It is an automatic estimate, not analysis, and will sometimes be wrong.

## Limitations

- The news gateway is a free third-party service; if it is down or rate limited, the ticker says "NEWS UNAVAILABLE" and prices keep working.
- iPhone Safari has no Fullscreen API. Use Share → Add to Home Screen; the included web manifest then runs it full screen.
- If a price refresh fails the board keeps the last numbers and shows OFFLINE in the corner until the next success.
- Timing constants live in `src/lib/timing.ts`.

> Hyperliquid prices shown here are for information only. This is not financial advice.
