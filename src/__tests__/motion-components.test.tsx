import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  isConfigured: true,
  supabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}) } },
}));

import { Odometer } from '../components/Odometer';
import { HeroChart } from '../components/landing/HeroChart';
import { Scrolly } from '../components/landing/Scrolly';
import { HERO_N, heroIsVerified } from '../components/landing/sample';

describe('Odometer', () => {
  it('exposes the plain number to assistive tech and rolls one column per digit', () => {
    const { container } = render(<Odometer value="$1,234.50" />);
    expect(screen.getByText('$1,234.50')).toHaveClass('sr-only');
    expect(container.querySelectorAll('.odo__col')).toHaveLength(6);
    // "$1,234.50": the digit 3 column is translated by 3 rows (10% of the strip each)
    const strips = [...container.querySelectorAll<HTMLElement>('.odo__strip')].map((s) => s.style.transform);
    expect(strips).toEqual(['translateY(-10%)', 'translateY(-20%)', 'translateY(-30%)', 'translateY(-40%)', 'translateY(-50%)', 'translateY(0%)']);
  });
});

describe('landing visuals stay honest', () => {
  it('hero chart always labels its figure Verified or Estimated, and as sample data', () => {
    render(<HeroChart />);
    const chart = screen.getByTestId('hero-chart');
    expect(within(chart).getByText('Sample data')).toBeInTheDocument();
    // newest point is an estimate
    expect(heroIsVerified(HERO_N - 1)).toBe(false);
    expect(within(chart).getByTestId('price-badge')).toHaveTextContent('Estimated');
  });

  it('pinned story marks its sample ticket price as estimated', () => {
    render(<MemoryRouter><Scrolly /></MemoryRouter>);
    expect(screen.getAllByText('Sample data').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('price-badge').some((b) => b.textContent === 'Estimated')).toBe(true);
  });
});
