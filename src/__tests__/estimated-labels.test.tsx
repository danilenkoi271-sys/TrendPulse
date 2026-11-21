import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Artist, Tick } from '../lib/types';

vi.mock('../lib/api', async (orig) => {
  const actual = await orig<typeof import('../lib/api')>();
  return { ...actual, executeTrade: vi.fn(), fetchArtists: vi.fn(), fetchRecentTicks: vi.fn() };
});
vi.mock('../lib/supabase', () => ({
  isConfigured: true,
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => ({}),
    },
  },
}));

import * as api from '../lib/api';
import { OrderTicket } from '../components/OrderTicket';
import { PositionPanel } from '../components/PositionPanel';
import { PriceChart } from '../components/PriceChart';
import Markets from '../pages/Markets';
import App from '../App';
import { AuthProvider } from '../hooks/useAuth';

const artist: Artist = { id: 'a1', name: 'Nova Kline', youtube_channel_id: 'UC', expected_daily_views: 1000, base_price: 100, k: 0.5 };
const tick = (id: number, price: number, sim: boolean): Tick => ({ id, artist_id: 'a1', price, is_simulated: sim, created_at: new Date(1_700_000_000_000 + id * 60_000).toISOString() });

beforeEach(() => { vi.clearAllMocks(); });

describe('Estimated labelling', () => {
  it('order ticket shows "Estimated price" and an Estimated badge when the latest tick is simulated', () => {
    render(<OrderTicket artist={artist} tick={tick(2, 101.5, true)} balance={1000} sharesHeld={0} onTraded={() => {}} />);
    expect(screen.getByText('Estimated price')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Order ticket')).getAllByTestId('price-badge')[0]).toHaveTextContent('Estimated');
    expect(screen.queryByText('Verified price')).not.toBeInTheDocument();
  });

  it('order ticket says Verified when the latest tick is real', () => {
    render(<OrderTicket artist={artist} tick={tick(2, 101.5, false)} balance={1000} sharesHeld={0} onTraded={() => {}} />);
    expect(screen.getByText('Verified price')).toBeInTheDocument();
    expect(screen.getByTestId('price-badge')).toHaveTextContent('Verified');
  });

  it('review step and confirmation state the price type (estimated)', async () => {
    vi.mocked(api.executeTrade).mockResolvedValue({ price: 101.5, isSimulated: true, shares: 2 });
    const onTraded = vi.fn();
    render(<OrderTicket artist={artist} tick={tick(2, 101.5, true)} balance={1000} sharesHeld={0} onTraded={onTraded} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Shares'));
    await user.type(screen.getByLabelText('Shares'), '2');
    await user.click(screen.getByRole('button', { name: /review buy order/i }));
    expect(within(screen.getByTestId('order-review')).getByTestId('price-badge')).toHaveTextContent('Estimated');
    await user.click(screen.getByRole('button', { name: /confirm buy/i }));
    expect(api.executeTrade).toHaveBeenCalledWith('a1', 2);
    const conf = await screen.findByTestId('trade-confirmation');
    expect(within(conf).getByTestId('price-badge')).toHaveTextContent('Estimated');
    expect(conf).toHaveTextContent(/estimated price/i);
    expect(conf).toHaveTextContent('$101.50');
    expect(onTraded).toHaveBeenCalled();
  });

  it('confirmation says verified when the executed price was real', async () => {
    vi.mocked(api.executeTrade).mockResolvedValue({ price: 99, isSimulated: false, shares: -1 });
    render(<OrderTicket artist={artist} tick={tick(2, 99, false)} balance={1000} sharesHeld={3} onTraded={() => {}} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: 'Sell' }));
    await user.click(screen.getByRole('button', { name: /review sell order/i }));
    await user.click(screen.getByRole('button', { name: /confirm sell/i }));
    const conf = await screen.findByTestId('trade-confirmation');
    expect(within(conf).getByTestId('price-badge')).toHaveTextContent('Verified');
    expect(conf).toHaveTextContent(/verified price/i);
  });

  it('blocks overselling and over-budget buys in the ticket', async () => {
    render(<OrderTicket artist={artist} tick={tick(2, 100, true)} balance={150} sharesHeld={1} onTraded={() => {}} />);
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText('Shares'));
    await user.type(screen.getByLabelText('Shares'), '2');
    expect(screen.getByRole('alert')).toHaveTextContent(/more than your play-money balance/i);
    expect(screen.getByRole('button', { name: /review buy order/i })).toBeDisabled();
    await user.click(screen.getByRole('tab', { name: 'Sell' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/short selling/i);
  });

  it('position panel marks value and P&L as estimated for simulated ticks', () => {
    render(<PositionPanel shares={2} avgCost={100} tick={tick(3, 105, true)} />);
    expect(screen.getAllByText('est.').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId('price-badge')).toHaveTextContent('Estimated');
    expect(screen.getByText('+$10.00', { exact: false })).toBeInTheDocument();
  });

  it('chart draws real and simulated runs differently and includes the legend entry', () => {
    const { container } = render(<PriceChart ticks={[tick(1, 100, false), tick(2, 101, false), tick(3, 102, true), tick(4, 101.5, true)]} />);
    expect(container.querySelectorAll('[data-kind="verified"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-kind="estimated"]')).toHaveLength(1);
    expect(screen.getByText(/Estimated between updates/)).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(/Estimated/);
  });

  it('markets list shows an Estimated badge only for simulated latest ticks, Verified otherwise', async () => {
    const a2 = { ...artist, id: 'a2', name: 'DJ Marmalade' };
    vi.mocked(api.fetchArtists).mockResolvedValue([artist, a2]);
    vi.mocked(api.fetchRecentTicks).mockImplementation(async (id) => (id === 'a1' ? [tick(1, 100, false), tick(2, 102, true)] : [tick(3, 97, false)]));
    render(<MemoryRouter><Markets /></MemoryRouter>);
    const rows = await screen.findAllByRole('link');
    expect(within(rows.find((r) => r.textContent?.includes('Nova Kline'))!).getByTestId('price-badge')).toHaveTextContent('Estimated');
    expect(within(rows.find((r) => r.textContent?.includes('DJ Marmalade'))!).getByTestId('price-badge')).toHaveTextContent('Verified');
    await userEvent.setup().type(screen.getByPlaceholderText('Search artists'), 'marm');
    expect(screen.queryByText('Nova Kline')).not.toBeInTheDocument();
  });
});

describe('Play-money banner', () => {
  it.each(['/', '/login', '/markets', '/portfolio', '/nope'])('is in the header on %s', async (path) => {
    render(<MemoryRouter initialEntries={[path]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
    const banner = await screen.findByTestId('play-money-banner');
    expect(banner).toHaveTextContent('Play money. No cash value. No deposits or withdrawals.');
    expect(banner.closest('header')).not.toBeNull();
  });
});
