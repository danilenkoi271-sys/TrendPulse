export interface Artist {
  id: string;
  name: string;
  youtube_channel_id: string;
  expected_daily_views: number;
  base_price: number;
  k: number;
}

export interface Tick {
  id: number;
  artist_id: string;
  price: number;
  is_simulated: boolean;
  created_at: string;
}

export interface Holding {
  artist_id: string;
  name: string;
  shares: number;
  latest_price: number;
  price_is_simulated: boolean;
  price_at: string;
  avg_cost: number;
  market_value: number;
  unrealised_pnl: number;
}

export interface PortfolioSummary {
  balance: number;
  holdings_value: number;
  total_value: number;
  unrealised_pnl: number;
  any_estimated: boolean;
  holdings: Holding[];
}

export interface TradeRow {
  id: number;
  artist_id: string;
  shares: number;
  price: number;
  price_is_simulated: boolean;
  created_at: string;
  artists: { name: string } | null;
}

export type Range = '1H' | '1D' | '1W' | '1M';
