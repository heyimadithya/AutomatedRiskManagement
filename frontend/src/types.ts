export type AssetClass = "stock" | "gold" | "silver" | "crypto";

export interface CatalogAsset {
  symbol: string;
  name: string;
  class: AssetClass;
  exchange: string;
}

export interface Quote {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  exchange: string;
  price: number;
  previous_close: number | null;
  change: number;
  change_pct: number;
  currency: string;
}

export interface RiskMetrics {
  historical_var: number;
  parametric_var: number;
  monte_carlo_var: number;
  cvar: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  volatility_annual: number;
  return_annual: number;
  calmar_ratio: number;
  skewness: number;
  kurtosis: number;
  var_dollar: number;
  cvar_dollar: number;
}

export interface PortfolioPosition {
  symbol: string;
  weight: number;
  name?: string;
  asset_class?: AssetClass;
}

export interface AssetAnalysis {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  weight: number;
  metrics: RiskMetrics;
}

export interface PortfolioAnalysis {
  period: string;
  confidence: number;
  investment: number;
  weights: Record<string, number>;
  missing_symbols: string[];
  portfolio_metrics: RiskMetrics;
  assets: AssetAnalysis[];
  correlation: {
    symbols: string[];
    matrix: number[][];
  };
  equity_curve: { date: string; value: number }[];
  drawdowns: { date: string; drawdown: number }[];
  return_distribution: {
    bin_start: number;
    bin_end: number;
    count: number;
  }[];
  live_quotes: Quote[];
}

export interface MarketOverview {
  by_class: Record<AssetClass, Quote[]>;
  quotes: Quote[];
}
