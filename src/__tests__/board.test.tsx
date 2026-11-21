import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Market } from '../lib/hyperliquid';
import type { NewsItem } from '../lib/news';

vi.mock('../lib/hyperliquid', async (orig) => ({ ...(await orig<typeof import('../lib/hyperliquid')>()), fetchMarkets: vi.fn() }));
vi.mock('../lib/news', async (orig) => ({ ...(await orig<typeof import('../lib/news')>()), fetchNews: vi.fn() }));
vi.mock('../lib/fullscreen', async (orig) => ({ ...(await orig<typeof import('../lib/fullscreen')>()), enterFullscreen: vi.fn(async () => true), fullscreenSupported: () => true }));

import { fetchMarkets } from '../lib/hyperliquid';
import { fetchNews } from '../lib/news';
import { enterFullscreen } from '../lib/fullscreen';
import { Display } from '../components/Display';
import { Config } from '../components/Config';

const mkt = (label: string, price: number, prev: number, vol: number, kind: 'perp' | 'spot' = 'perp'): Market => ({
  key: `${kind}:${label}`, kind, label, base: label.split('/')[0], price, prevDayPx: prev, volume: vol, changePct: ((price - prev) / prev) * 100,
});
const news = (title: string, impact: NewsItem['impact'], id = title): NewsItem => ({ id, title, source: 'T', publishedAt: Date.now(), text: title, impact });

let btcPrice = 59000;
const feed = () => [mkt('BTC', btcPrice, 61000, 5_865_463_156), mkt('ETH', 1626.4, 1734.9, 1_898_046_754), mkt('SOL', 140, 130, 900_000_000)];

beforeEach(() => {
  vi.useFakeTimers();
  btcPrice = 59000;
  vi.mocked(fetchMarkets).mockImplementation(async () => feed());
  vi.mocked(fetchNews).mockResolvedValue([
    news('Bitcoin surges as ETF inflows hit record', 'up'),
    news('Exchange hacked, Bitcoin plunges', 'down'),
    news('Ethereum developers meet', 'neutral'),
  ]);
});
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

const flush = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

describe('Display', () => {
  it('shows name, price, 24h volume and 24h change for the current market', async () => {
    render(<Display selected={['perp:BTC', 'perp:ETH']} onOpenSettings={() => {}} />);
    await flush();
    expect(screen.getByTestId('name')).toHaveTextContent('BTC');
    expect(screen.getByTestId('price')).toHaveTextContent('$59,000.00');
    expect(screen.getByTestId('volume')).toHaveTextContent('$5.87B');
    expect(screen.getByTestId('change')).toHaveTextContent('-3.28%');
    expect(screen.getByTestId('change')).toHaveClass('down');
    expect(screen.getByTestId('kind')).toHaveTextContent('PERP');
  });

  it('refreshes prices every 10 seconds', async () => {
    render(<Display selected={['perp:BTC']} onOpenSettings={() => {}} />);
    await flush();
    expect(fetchMarkets).toHaveBeenCalledTimes(1);
    btcPrice = 59500;
    await flush(9_000);
    expect(fetchMarkets).toHaveBeenCalledTimes(1);
    await flush(1_000);
    expect(fetchMarkets).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('price')).toHaveTextContent('$59,500.00');
    await flush(10_000);
    expect(fetchMarkets).toHaveBeenCalledTimes(3);
  });

  it('only requests the market kinds that are selected', async () => {
    render(<Display selected={['perp:BTC']} onOpenSettings={() => {}} />);
    await flush();
    expect(fetchMarkets).toHaveBeenLastCalledWith({ perp: true, spot: false });
  });

  it('moves to the next market every 30 seconds and wraps around', async () => {
    render(<Display selected={['perp:BTC', 'perp:ETH']} onOpenSettings={() => {}} />);
    await flush();
    expect(screen.getByTestId('name')).toHaveTextContent('BTC');
    await flush(29_000);
    expect(screen.getByTestId('name')).toHaveTextContent('BTC');
    await flush(1_000);
    expect(screen.getByTestId('name')).toHaveTextContent('ETH');
    await flush(30_000);
    expect(screen.getByTestId('name')).toHaveTextContent('BTC');
  });

  it('tapping anywhere goes to the next market and restarts the 30 second timer', async () => {
    render(<Display selected={['perp:BTC', 'perp:ETH', 'perp:SOL']} onOpenSettings={() => {}} />);
    await flush();
    await flush(20_000);
    fireEvent.click(screen.getByTestId('board'));
    expect(screen.getByTestId('name')).toHaveTextContent('ETH');
    await flush(29_000); // would have auto-advanced at the old 30s mark if the timer had not restarted
    expect(screen.getByTestId('name')).toHaveTextContent('ETH');
    await flush(1_000);
    expect(screen.getByTestId('name')).toHaveTextContent('SOL');
  });

  it('shows green/red arrows on headlines for the current market and scrolls them', async () => {
    const { container } = render(<Display selected={['perp:BTC', 'perp:ETH']} onOpenSettings={() => {}} />);
    await flush();
    const ups = container.querySelectorAll('.n-up');
    const downs = container.querySelectorAll('.n-down');
    expect(ups.length).toBeGreaterThan(0);
    expect(downs.length).toBeGreaterThan(0);
    expect(ups[0]).toHaveTextContent('▲');
    expect(downs[0]).toHaveTextContent('▼');
    expect(container.querySelector('.news__track')).toBeInTheDocument();
    // ETH shows its own headline first, then market-wide (Bitcoin/ETF) ones
    fireEvent.click(screen.getByTestId('board'));
    const text = container.querySelector('.news__track')!.textContent!;
    expect(text.indexOf('Ethereum developers meet')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('Ethereum developers meet')).toBeLessThan(text.indexOf('ETF inflows hit record'));
  });

  it('keeps showing the last prices and flags OFFLINE when a refresh fails', async () => {
    render(<Display selected={['perp:BTC']} onOpenSettings={() => {}} />);
    await flush();
    vi.mocked(fetchMarkets).mockRejectedValueOnce(new Error('network'));
    await flush(10_000);
    expect(screen.getByTestId('status')).toHaveTextContent('OFFLINE');
    expect(screen.getByTestId('price')).toHaveTextContent('$59,000.00');
    await flush(10_000);
    expect(screen.getByTestId('status')).not.toHaveTextContent('OFFLINE');
  });

  it('says so when news is unavailable instead of showing nothing', async () => {
    vi.mocked(fetchNews).mockResolvedValue([]);
    const { container } = render(<Display selected={['perp:BTC']} onOpenSettings={() => {}} />);
    await flush();
    expect(container.textContent).toContain('NEWS UNAVAILABLE');
  });

  it('skips selected markets that Hyperliquid no longer lists', async () => {
    render(<Display selected={['perp:GONE', 'perp:ETH']} onOpenSettings={() => {}} />);
    await flush();
    expect(screen.getByTestId('name')).toHaveTextContent('ETH');
  });

  it('offers a way back to settings only outside full screen', async () => {
    const open = vi.fn();
    render(<Display selected={['perp:BTC']} onOpenSettings={open} />);
    await flush();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'SETTINGS' })); });
    expect(open).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('name')).toHaveTextContent('BTC'); // clicking settings must not also skip ahead
  });
});

describe('Config', () => {
  beforeEach(() => { vi.useRealTimers(); });

  const markets = [mkt('BTC', 59000, 61000, 5e9), mkt('ETH', 1626, 1734, 2e9), mkt('HYPE/USDC', 30, 28, 1e8, 'spot')];

  it('lists markets by volume, lets you pick and order them, and starts full screen', async () => {
    vi.mocked(fetchMarkets).mockResolvedValue(markets);
    const onStart = vi.fn();
    render(<Config initial={[]} onStart={onStart} />);
    const user = userEvent.setup();
    await screen.findByText('HYPE/USDC');
    expect(screen.getByRole('button', { name: 'START FULL SCREEN' })).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /ETH/ }));
    await user.click(screen.getByRole('checkbox', { name: /BTC/ }));
    expect(screen.getByTestId('count')).toHaveTextContent('2 SELECTED');

    await user.click(screen.getByRole('button', { name: 'START FULL SCREEN' }));
    expect(enterFullscreen).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(['perp:ETH', 'perp:BTC']); // cycle order = pick order
  });

  it('filters by type and by search', async () => {
    vi.mocked(fetchMarkets).mockResolvedValue(markets);
    render(<Config initial={['perp:BTC']} onStart={() => {}} />);
    const user = userEvent.setup();
    await screen.findByText('HYPE/USDC');
    await user.click(screen.getByRole('tab', { name: 'SPOT' }));
    expect(screen.queryByRole('checkbox', { name: /ETH/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'ALL' }));
    await user.type(screen.getByLabelText('Search markets'), 'eth');
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('starts in a window without requesting full screen', async () => {
    vi.mocked(fetchMarkets).mockResolvedValue(markets);
    const onStart = vi.fn();
    render(<Config initial={['perp:BTC']} onStart={onStart} />);
    await screen.findByText('HYPE/USDC');
    await userEvent.setup().click(screen.getByRole('button', { name: 'START IN WINDOW' }));
    expect(enterFullscreen).not.toHaveBeenCalled();
    expect(onStart).toHaveBeenCalledWith(['perp:BTC']);
  });

  it('shows an error with retry when Hyperliquid is unreachable', async () => {
    vi.mocked(fetchMarkets).mockRejectedValueOnce(new Error('Hyperliquid responded 503')).mockResolvedValue(markets);
    render(<Config initial={[]} onStart={() => {}} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('503');
    await userEvent.setup().click(screen.getByRole('button', { name: 'RETRY' }));
    expect(await screen.findByText('HYPE/USDC')).toBeInTheDocument();
  });
});
