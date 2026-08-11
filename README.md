# Automated Risk Management

**Created by Adithya Kannan**

Multi-asset portfolio risk analytics for **stocks**, **gold**, **silver**, and **crypto** — with a React frontend and a Python (FastAPI + Pandas) risk engine.

Build a portfolio, pull live Yahoo Finance prices, and compute Value at Risk (VaR), Sharpe, Sortino, Maximum Drawdown, and related risk metrics — then explore equity curves, drawdowns, return distributions, and correlations in an interactive React UI.

**Stack:** FastAPI + Pandas/NumPy/SciPy · React (Vite) · Yahoo Finance (`yfinance`)

**Live demo (GitHub Pages):** https://heyimadithya.github.io/AutomatedRiskManagement/

> GitHub Pages hosts the static UI only (no Python API). The live site shows a cached multi-asset demo. Clone the repo and run the FastAPI backend for live tickers and fresh analysis.

## What it calculates

| Metric | Description |
|--------|-------------|
| **Historical VaR** | Empirical left-tail loss at chosen confidence |
| **Parametric VaR** | Normal-distribution VaR |
| **Monte Carlo VaR** | 10,000 simulated 1-day paths |
| **CVaR / Expected Shortfall** | Average loss beyond VaR |
| **Sharpe Ratio** | Excess return ÷ annualized volatility |
| **Sortino Ratio** | Excess return ÷ downside deviation |
| **Maximum Drawdown** | Peak-to-trough capital decline |
| **Calmar, skewness, kurtosis** | Additional risk shape metrics |

Live quotes and history come from Yahoo Finance via `yfinance`.

## Features

### Multi-asset portfolio risk
- Mix **equities**, **gold**, **silver**, and **crypto** in one book
- Configurable weights, lookback window, VaR confidence, and notional investment
- Portfolio-level metrics plus per-position risk breakdown
- Side-by-side charts: equity curve, drawdown, return histogram, correlation matrix

### Real market data support
Fetch near-real-time quotes and daily history from Yahoo Finance. The UI / API accept common Yahoo tickers, including:

- **US stocks / ETFs** — e.g. `AAPL`, `NVDA`, `MSFT`, `SPY`, `QQQ`
- **Gold** — e.g. `GC=F`, `GLD`, `IAU`, `XAUUSD=X`
- **Silver** — e.g. `SI=F`, `SLV`, `XAGUSD=X`
- **Crypto** — e.g. `BTC-USD`, `ETH-USD`, `SOL-USD`, `XRP-USD`

Availability depends on Yahoo coverage; some futures / FX spot symbols can be delayed or sparse.

### Interactive research UI
- Add / remove holdings from an asset catalog
- Equal-weight or manual weight control
- Choose lookback (`1mo` → `5y`) and VaR confidence (`90%` → `99%`)
- Live market ticker strip + Refresh
- FastAPI backend + React frontend (Vite proxies `/api` in local dev)

### Math (short)

**Historical VaR (confidence \(c\))** — empirical quantile of the left tail:

\[
\mathrm{VaR}_c = -Q_{1-c}(r)
\]

**Parametric VaR** — normal assumption:

\[
\mathrm{VaR}_c = -(\mu + z_{1-c}\,\sigma)
\]

**Monte Carlo VaR** — simulate \(N\) one-day returns \(\sim \mathcal{N}(\mu, \sigma^2)\), take the same empirical quantile.

**CVaR / Expected Shortfall**:

\[
\mathrm{CVaR}_c = -\mathbb{E}[r \mid r \le - \mathrm{VaR}_c]
\]

**Sharpe** (annualized, risk-free \(r_f\)):

\[
\mathrm{Sharpe} = \frac{\bar{r}\cdot 252 - r_f}{\sigma_r\sqrt{252}}
\]

**Maximum drawdown** — worst peak-to-trough decline on the equity curve.

## Customization

### In the UI
- Change holdings (stocks, gold, silver, crypto from the catalog)
- Set investment notional (USD)
- Set lookback (`1M` / `3M` / `6M` / `1Y` / `2Y` / `5Y`)
- Tune VaR confidence (e.g. `95%`, `99%`)
- Click **Analyze Risk**

Default starter book: `AAPL` · `NVDA` · `GLD` · `SLV` · `BTC-USD` · `ETH-USD`

### Via the API

`POST /api/portfolio/analyze`

```json
{
  "positions": [
    { "symbol": "AAPL", "weight": 0.2 },
    { "symbol": "NVDA", "weight": 0.15 },
    { "symbol": "GLD", "weight": 0.15 },
    { "symbol": "SLV", "weight": 0.1 },
    { "symbol": "BTC-USD", "weight": 0.25 },
    { "symbol": "ETH-USD", "weight": 0.15 }
  ],
  "period": "1y",
  "confidence": 0.95,
  "investment": 100000
}
```

Other useful endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/catalog` | Asset catalog (optional `?asset_class=`) |
| `GET` | `/api/market-overview` | Live multi-asset snapshot |
| `GET` | `/api/quotes?symbols=AAPL,GLD,BTC-USD` | Live quotes |
| `GET` | `/api/history/{symbol}?period=1y` | Price history + single-asset metrics |

Examples to try: `RELIANCE.NS`, `TSLA`, `BTC-USD`, `GC=F`, `SLV`, `SPY`.

## Intended use
- Learning portfolio risk concepts (VaR vs CVaR, Sharpe vs Sortino, drawdowns)
- Comparing risk across stocks, metals, and crypto in one book
- Building intuition for diversification via correlation matrices
- Generating research inputs for further portfolio or trading strategy work

Educational tooling only — **not investment advice**. Market data can be delayed and may fail for some tickers depending on Yahoo Finance availability.

## Project layout

```
backend/
  main.py             # FastAPI entrypoint + risk engine
  requirements.txt
frontend/             # React + TypeScript UI (Vite)
  src/
    components/       # Header, ticker, builder, metrics, charts, table
    api.ts            # API client
    App.tsx
start.bat             # Windows helper to launch API + UI
README.md
```

## Run locally

Requires **Python 3.11+** and **Node 20+**.

### Installation

```bash
git clone https://github.com/heyimadithya/AutomatedRiskManagement.git
cd AutomatedRiskManagement
```

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8001
```

API docs: http://127.0.0.1:8001/docs

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

Vite proxies `/api/*` → `http://127.0.0.1:8001`.

Or double-click `start.bat` on Windows to launch both.
