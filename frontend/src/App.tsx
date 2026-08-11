import { useCallback, useEffect, useState } from "react";
import { Header } from "./components/Header";
import { MarketTicker } from "./components/MarketTicker";
import { PortfolioBuilder } from "./components/PortfolioBuilder";
import { MetricsGrid } from "./components/MetricsGrid";
import { Charts } from "./components/Charts";
import { AssetTable } from "./components/AssetTable";
import { analyzePortfolio, fetchCatalog, fetchMarketOverview } from "./api";
import type {
  CatalogAsset,
  PortfolioAnalysis,
  PortfolioPosition,
  Quote,
} from "./types";
import "./styles.css";

const DEFAULT_POSITIONS: PortfolioPosition[] = [
  { symbol: "AAPL", weight: 0.2, name: "Apple Inc.", asset_class: "stock" },
  { symbol: "NVDA", weight: 0.15, name: "NVIDIA Corp.", asset_class: "stock" },
  { symbol: "GLD", weight: 0.15, name: "SPDR Gold Shares", asset_class: "gold" },
  { symbol: "SLV", weight: 0.1, name: "iShares Silver Trust", asset_class: "silver" },
  { symbol: "BTC-USD", weight: 0.25, name: "Bitcoin", asset_class: "crypto" },
  { symbol: "ETH-USD", weight: 0.15, name: "Ethereum", asset_class: "crypto" },
];

export default function App() {
  const [catalog, setCatalog] = useState<CatalogAsset[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [positions, setPositions] = useState<PortfolioPosition[]>(DEFAULT_POSITIONS);
  const [period, setPeriod] = useState("1y");
  const [confidence, setConfidence] = useState(0.95);
  const [investment, setInvestment] = useState(100_000);
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadMarket = useCallback(async () => {
    setLoadingMarket(true);
    try {
      const [cat, market] = await Promise.all([
        fetchCatalog(),
        fetchMarketOverview(),
      ]);
      setCatalog(cat.assets);
      setQuotes(market.quotes);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load market data");
    } finally {
      setLoadingMarket(false);
    }
  }, []);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzePortfolio({
        positions: positions.map(({ symbol, weight }) => ({ symbol, weight })),
        period,
        confidence,
        investment,
      });
      setAnalysis(result);
      if (result.live_quotes?.length) {
        setQuotes((prev) => {
          const map = new Map(prev.map((q) => [q.symbol, q]));
          result.live_quotes.forEach((q) => map.set(q.symbol, q));
          return Array.from(map.values());
        });
      }
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [positions, period, confidence, investment]);

  useEffect(() => {
    void loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    void runAnalysis();
    // Initial analysis on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadMarket();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [loadMarket]);

  function addAsset(asset: CatalogAsset) {
    setPositions((prev) => {
      if (prev.some((p) => p.symbol === asset.symbol)) return prev;
      const next = [
        ...prev,
        {
          symbol: asset.symbol,
          weight: 0.1,
          name: asset.name,
          asset_class: asset.class,
        },
      ];
      const eq = 1 / next.length;
      return next.map((p) => ({ ...p, weight: eq }));
    });
  }

  function removeAsset(symbol: string) {
    setPositions((prev) => {
      const next = prev.filter((p) => p.symbol !== symbol);
      if (!next.length) return next;
      const eq = 1 / next.length;
      return next.map((p) => ({ ...p, weight: eq }));
    });
  }

  function changeWeight(symbol: string, weight: number) {
    setPositions((prev) =>
      prev.map((p) => (p.symbol === symbol ? { ...p, weight } : p))
    );
  }

  function equalWeight() {
    setPositions((prev) => {
      if (!prev.length) return prev;
      const eq = 1 / prev.length;
      return prev.map((p) => ({ ...p, weight: eq }));
    });
  }

  return (
    <div className="app">
      <Header
        lastUpdated={lastUpdated}
        onRefresh={() => {
          void loadMarket();
          void runAnalysis();
        }}
        loading={loadingMarket || analyzing}
      />
      <MarketTicker quotes={quotes} />

      <main className="layout">
        <PortfolioBuilder
          catalog={catalog}
          positions={positions}
          period={period}
          confidence={confidence}
          investment={investment}
          analyzing={analyzing}
          onAdd={addAsset}
          onRemove={removeAsset}
          onWeightChange={changeWeight}
          onEqualWeight={equalWeight}
          onPeriodChange={setPeriod}
          onConfidenceChange={setConfidence}
          onInvestmentChange={setInvestment}
          onAnalyze={() => void runAnalysis()}
        />

        <div className="main-col">
          {error && (
            <div className="banner error" role="alert">
              {error}
            </div>
          )}

          {!analysis && !error && (
            <div className="banner info">Loading analysis...</div>
          )}

          {analysis && (
            <>
              <section>
                <div className="panel-head">
                  <h2>Portfolio Risk</h2>
                  <p>
                    {analysis.period} lookback,{" "}
                    {(analysis.confidence * 100).toFixed(0)}% VaR confidence
                  </p>
                </div>
                <MetricsGrid
                  metrics={analysis.portfolio_metrics}
                  confidence={analysis.confidence}
                  investment={analysis.investment}
                />
              </section>

              <Charts analysis={analysis} />
              <AssetTable assets={analysis.assets} quotes={analysis.live_quotes} />
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <span>
          Data via Yahoo Finance · Educational risk analytics — not investment advice
        </span>
        <span>Created by Adithya Kannan</span>
      </footer>
    </div>
  );
}
