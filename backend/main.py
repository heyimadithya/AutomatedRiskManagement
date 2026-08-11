"""
Automated Risk Management — FastAPI backend
Real-time multi-asset portfolio risk analytics (stocks, gold, silver, crypto).
"""

from __future__ import annotations

from typing import Literal

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy import stats

app = FastAPI(
    title="Automated Risk Management API",
    description="Portfolio risk metrics for stocks, precious metals, and crypto",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AssetClass = Literal["stock", "gold", "silver", "crypto"]

# Canonical tickers for Yahoo Finance
ASSET_CATALOG: dict[str, dict] = {
    # Equities
    "AAPL": {"name": "Apple Inc.", "class": "stock", "exchange": "NASDAQ"},
    "MSFT": {"name": "Microsoft Corp.", "class": "stock", "exchange": "NASDAQ"},
    "GOOGL": {"name": "Alphabet Inc.", "class": "stock", "exchange": "NASDAQ"},
    "AMZN": {"name": "Amazon.com Inc.", "class": "stock", "exchange": "NASDAQ"},
    "NVDA": {"name": "NVIDIA Corp.", "class": "stock", "exchange": "NASDAQ"},
    "META": {"name": "Meta Platforms", "class": "stock", "exchange": "NASDAQ"},
    "TSLA": {"name": "Tesla Inc.", "class": "stock", "exchange": "NASDAQ"},
    "JPM": {"name": "JPMorgan Chase", "class": "stock", "exchange": "NYSE"},
    "V": {"name": "Visa Inc.", "class": "stock", "exchange": "NYSE"},
    "JNJ": {"name": "Johnson & Johnson", "class": "stock", "exchange": "NYSE"},
    "SPY": {"name": "S&P 500 ETF", "class": "stock", "exchange": "NYSE"},
    "QQQ": {"name": "Nasdaq-100 ETF", "class": "stock", "exchange": "NASDAQ"},
    # Gold
    "GC=F": {"name": "Gold Futures", "class": "gold", "exchange": "COMEX"},
    "GLD": {"name": "SPDR Gold Shares", "class": "gold", "exchange": "NYSE"},
    "IAU": {"name": "iShares Gold Trust", "class": "gold", "exchange": "NYSE"},
    "XAUUSD=X": {"name": "Gold Spot (USD/oz)", "class": "gold", "exchange": "FX"},
    # Silver
    "SI=F": {"name": "Silver Futures", "class": "silver", "exchange": "COMEX"},
    "SLV": {"name": "iShares Silver Trust", "class": "silver", "exchange": "NYSE"},
    "XAGUSD=X": {"name": "Silver Spot (USD/oz)", "class": "silver", "exchange": "FX"},
    # Crypto
    "BTC-USD": {"name": "Bitcoin", "class": "crypto", "exchange": "Crypto"},
    "ETH-USD": {"name": "Ethereum", "class": "crypto", "exchange": "Crypto"},
    "SOL-USD": {"name": "Solana", "class": "crypto", "exchange": "Crypto"},
    "BNB-USD": {"name": "BNB", "class": "crypto", "exchange": "Crypto"},
    "XRP-USD": {"name": "XRP", "class": "crypto", "exchange": "Crypto"},
    "ADA-USD": {"name": "Cardano", "class": "crypto", "exchange": "Crypto"},
    "DOGE-USD": {"name": "Dogecoin", "class": "crypto", "exchange": "Crypto"},
    "AVAX-USD": {"name": "Avalanche", "class": "crypto", "exchange": "Crypto"},
}

RISK_FREE_RATE = 0.043  # ~4.3% annualized US T-bill proxy


# ---------- Models ----------

class PortfolioPosition(BaseModel):
    symbol: str
    weight: float = Field(..., gt=0, le=1, description="Portfolio weight (0–1)")


class PortfolioRequest(BaseModel):
    positions: list[PortfolioPosition]
    period: str = Field(default="1y", description="History window: 1mo, 3mo, 6mo, 1y, 2y, 5y")
    confidence: float = Field(default=0.95, ge=0.9, le=0.99)
    investment: float = Field(default=100_000, gt=0, description="Portfolio notional USD")


class RiskMetrics(BaseModel):
    historical_var: float
    parametric_var: float
    monte_carlo_var: float
    cvar: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    volatility_annual: float
    return_annual: float
    calmar_ratio: float
    skewness: float
    kurtosis: float
    var_dollar: float
    cvar_dollar: float


# ---------- Data helpers ----------

def _normalize_symbol(symbol: str) -> str:
    return symbol.strip().upper()


def fetch_prices(symbols: list[str], period: str = "1y") -> pd.DataFrame:
    """Download adjusted close prices for one or more symbols."""
    symbols = [_normalize_symbol(s) for s in symbols]
    data = yf.download(
        symbols,
        period=period,
        auto_adjust=True,
        progress=False,
        threads=True,
    )
    if data.empty:
        raise HTTPException(status_code=404, detail=f"No price data for {symbols}")

    if isinstance(data.columns, pd.MultiIndex):
        closes = data["Close"].copy()
    else:
        closes = data[["Close"]].copy()
        closes.columns = symbols

    closes = closes.dropna(how="all").ffill().dropna()
    if closes.empty:
        raise HTTPException(status_code=404, detail="Insufficient price history")
    return closes


def fetch_live_quotes(symbols: list[str]) -> list[dict]:
    """Fetch near-real-time quotes via yfinance."""
    results = []
    for symbol in symbols:
        sym = _normalize_symbol(symbol)
        try:
            t = yf.Ticker(sym)
            info = t.fast_info
            price = getattr(info, "last_price", None) or getattr(info, "lastPrice", None)
            prev = getattr(info, "previous_close", None) or getattr(info, "previousClose", None)
            if price is None:
                hist = t.history(period="2d")
                if hist.empty:
                    continue
                price = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else price
            change = float(price) - float(prev) if prev else 0.0
            change_pct = (change / float(prev) * 100) if prev else 0.0
            meta = ASSET_CATALOG.get(sym, {"name": sym, "class": "stock", "exchange": "—"})
            results.append(
                {
                    "symbol": sym,
                    "name": meta["name"],
                    "asset_class": meta["class"],
                    "exchange": meta["exchange"],
                    "price": round(float(price), 4),
                    "previous_close": round(float(prev), 4) if prev else None,
                    "change": round(change, 4),
                    "change_pct": round(change_pct, 4),
                    "currency": "USD",
                }
            )
        except Exception:
            continue
    return results


# ---------- Risk engine ----------

def compute_returns(prices: pd.Series | pd.DataFrame) -> pd.Series | pd.DataFrame:
    return prices.pct_change().dropna()


def historical_var(returns: pd.Series, confidence: float = 0.95) -> float:
    """Left-tail historical VaR (positive number = loss)."""
    return float(-np.percentile(returns, (1 - confidence) * 100))


def parametric_var(returns: pd.Series, confidence: float = 0.95) -> float:
    mu, sigma = float(returns.mean()), float(returns.std(ddof=1))
    z = stats.norm.ppf(1 - confidence)
    return float(-(mu + z * sigma))


def monte_carlo_var(
    returns: pd.Series,
    confidence: float = 0.95,
    simulations: int = 10_000,
    horizon_days: int = 1,
) -> float:
    mu, sigma = float(returns.mean()), float(returns.std(ddof=1))
    rng = np.random.default_rng(42)
    sims = rng.normal(mu * horizon_days, sigma * np.sqrt(horizon_days), simulations)
    return float(-np.percentile(sims, (1 - confidence) * 100))


def conditional_var(returns: pd.Series, confidence: float = 0.95) -> float:
    """Expected Shortfall / CVaR."""
    cutoff = -historical_var(returns, confidence)
    tail = returns[returns <= cutoff]
    if tail.empty:
        return historical_var(returns, confidence)
    return float(-tail.mean())


def max_drawdown(prices: pd.Series) -> float:
    cumulative = prices / prices.iloc[0]
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    return float(drawdown.min())  # negative


def sharpe_ratio(returns: pd.Series, risk_free: float = RISK_FREE_RATE) -> float:
    excess = returns.mean() * 252 - risk_free
    vol = returns.std(ddof=1) * np.sqrt(252)
    if vol == 0 or np.isnan(vol):
        return 0.0
    return float(excess / vol)


def sortino_ratio(returns: pd.Series, risk_free: float = RISK_FREE_RATE) -> float:
    excess = returns.mean() * 252 - risk_free
    downside = returns[returns < 0]
    downside_std = float(downside.std(ddof=1) * np.sqrt(252)) if len(downside) > 1 else 0.0
    if downside_std == 0 or np.isnan(downside_std):
        return 0.0
    return float(excess / downside_std)


def annualized_return(returns: pd.Series) -> float:
    return float(returns.mean() * 252)


def annualized_vol(returns: pd.Series) -> float:
    return float(returns.std(ddof=1) * np.sqrt(252))


def calmar_ratio(ann_return: float, mdd: float) -> float:
    if mdd == 0:
        return 0.0
    return float(ann_return / abs(mdd))


def portfolio_series(
    prices: pd.DataFrame, weights: dict[str, float]
) -> tuple[pd.Series, pd.Series]:
    cols = [c for c in prices.columns if c in weights]
    if not cols:
        raise HTTPException(status_code=400, detail="No overlapping symbols in price data")
    w = np.array([weights[c] for c in cols], dtype=float)
    w = w / w.sum()
    rets = prices[cols].pct_change().dropna()
    port_rets = (rets * w).sum(axis=1)
    # Reconstruct price index from returns
    port_price = (1 + port_rets).cumprod()
    port_price = pd.concat([pd.Series([1.0], index=[prices.index[0]]), port_price])
    return port_price, port_rets


def full_risk_metrics(
    prices: pd.Series,
    returns: pd.Series,
    confidence: float,
    investment: float,
) -> RiskMetrics:
    h_var = historical_var(returns, confidence)
    p_var = parametric_var(returns, confidence)
    mc_var = monte_carlo_var(returns, confidence)
    cvar = conditional_var(returns, confidence)
    mdd = max_drawdown(prices)
    ann_ret = annualized_return(returns)
    ann_vol = annualized_vol(returns)
    sharpe = sharpe_ratio(returns)
    sortino = sortino_ratio(returns)
    calmar = calmar_ratio(ann_ret, mdd)

    return RiskMetrics(
        historical_var=round(h_var, 6),
        parametric_var=round(p_var, 6),
        monte_carlo_var=round(mc_var, 6),
        cvar=round(cvar, 6),
        sharpe_ratio=round(sharpe, 4),
        sortino_ratio=round(sortino, 4),
        max_drawdown=round(mdd, 6),
        volatility_annual=round(ann_vol, 6),
        return_annual=round(ann_ret, 6),
        calmar_ratio=round(calmar, 4),
        skewness=round(float(returns.skew()), 4),
        kurtosis=round(float(returns.kurtosis()), 4),
        var_dollar=round(h_var * investment, 2),
        cvar_dollar=round(cvar * investment, 2),
    )


def drawdown_series(prices: pd.Series) -> list[dict]:
    cumulative = prices / prices.iloc[0]
    running_max = cumulative.cummax()
    dd = (cumulative - running_max) / running_max
    out = []
    for ts, val in dd.items():
        out.append({"date": ts.strftime("%Y-%m-%d"), "drawdown": round(float(val), 6)})
    return out


# ---------- Routes ----------

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "risk-management-api"}


@app.get("/api/catalog")
def catalog(asset_class: AssetClass | None = None):
    items = []
    for symbol, meta in ASSET_CATALOG.items():
        if asset_class and meta["class"] != asset_class:
            continue
        items.append({"symbol": symbol, **meta})
    return {"assets": items}


@app.get("/api/quotes")
def quotes(
    symbols: str = Query(..., description="Comma-separated Yahoo Finance tickers"),
):
    syms = [s.strip() for s in symbols.split(",") if s.strip()]
    if not syms:
        raise HTTPException(status_code=400, detail="Provide at least one symbol")
    data = fetch_live_quotes(syms)
    if not data:
        raise HTTPException(status_code=404, detail="Unable to fetch quotes")
    return {"quotes": data, "count": len(data)}


@app.get("/api/market-overview")
def market_overview():
    """Live snapshot across asset classes."""
    watchlist = [
        "SPY", "QQQ", "AAPL", "NVDA",
        "GC=F", "GLD", "SI=F", "SLV",
        "BTC-USD", "ETH-USD", "SOL-USD",
    ]
    quotes_data = fetch_live_quotes(watchlist)
    by_class: dict[str, list] = {"stock": [], "gold": [], "silver": [], "crypto": []}
    for q in quotes_data:
        by_class.setdefault(q["asset_class"], []).append(q)
    return {"by_class": by_class, "quotes": quotes_data}


@app.get("/api/history/{symbol}")
def history(
    symbol: str,
    period: str = Query(default="1y"),
):
    prices = fetch_prices([symbol], period)
    col = prices.columns[0]
    series = prices[col]
    rets = compute_returns(series)
    points = [
        {
            "date": ts.strftime("%Y-%m-%d"),
            "price": round(float(p), 4),
            "return": round(float(rets.get(ts, 0.0)), 6) if ts in rets.index else None,
        }
        for ts, p in series.items()
    ]
    return {
        "symbol": _normalize_symbol(symbol),
        "period": period,
        "points": points,
        "metrics": full_risk_metrics(series, rets, 0.95, 100_000).model_dump(),
    }


@app.post("/api/portfolio/analyze")
def analyze_portfolio(req: PortfolioRequest):
    if not req.positions:
        raise HTTPException(status_code=400, detail="Portfolio is empty")

    total_w = sum(p.weight for p in req.positions)
    if abs(total_w - 1.0) > 0.02:
        raise HTTPException(
            status_code=400,
            detail=f"Weights must sum to ~1.0 (got {total_w:.4f})",
        )

    symbols = [_normalize_symbol(p.symbol) for p in req.positions]
    weights = {_normalize_symbol(p.symbol): p.weight for p in req.positions}

    prices = fetch_prices(symbols, req.period)
    # Align columns to requested symbols that actually returned
    available = [s for s in symbols if s in prices.columns]
    missing = [s for s in symbols if s not in prices.columns]
    if not available:
        raise HTTPException(status_code=404, detail="No price data for portfolio symbols")

    weights = {s: weights[s] for s in available}
    # Renormalize if some missing
    w_sum = sum(weights.values())
    weights = {k: v / w_sum for k, v in weights.items()}

    port_price, port_rets = portfolio_series(prices, weights)
    metrics = full_risk_metrics(port_price, port_rets, req.confidence, req.investment)

    # Per-asset metrics
    assets = []
    for sym in available:
        s_prices = prices[sym].dropna()
        s_rets = compute_returns(s_prices)
        meta = ASSET_CATALOG.get(sym, {"name": sym, "class": "stock", "exchange": "—"})
        assets.append(
            {
                "symbol": sym,
                "name": meta["name"],
                "asset_class": meta["class"],
                "weight": round(weights[sym], 4),
                "metrics": full_risk_metrics(
                    s_prices, s_rets, req.confidence, req.investment * weights[sym]
                ).model_dump(),
            }
        )

    # Correlation matrix
    rets_df = prices[available].pct_change().dropna()
    corr = rets_df.corr()
    correlation = {
        "symbols": available,
        "matrix": [[round(float(corr.loc[a, b]), 4) for b in available] for a in available],
    }

    # Equity curve + drawdown
    equity = [
        {"date": ts.strftime("%Y-%m-%d"), "value": round(float(v) * req.investment, 2)}
        for ts, v in port_price.items()
    ]
    drawdowns = drawdown_series(port_price)

    # Return distribution histogram bins
    hist_counts, hist_edges = np.histogram(port_rets.values, bins=40)
    distribution = [
        {
            "bin_start": round(float(hist_edges[i]), 5),
            "bin_end": round(float(hist_edges[i + 1]), 5),
            "count": int(hist_counts[i]),
        }
        for i in range(len(hist_counts))
    ]

    # Live quotes for positions
    live = fetch_live_quotes(available)

    return {
        "period": req.period,
        "confidence": req.confidence,
        "investment": req.investment,
        "weights": weights,
        "missing_symbols": missing,
        "portfolio_metrics": metrics.model_dump(),
        "assets": assets,
        "correlation": correlation,
        "equity_curve": equity,
        "drawdowns": drawdowns,
        "return_distribution": distribution,
        "live_quotes": live,
    }


@app.get("/")
def root():
    return {
        "message": "Automated Risk Management API",
        "docs": "/docs",
        "health": "/api/health",
    }
