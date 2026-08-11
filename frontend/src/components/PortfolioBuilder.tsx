import { Minus, Plus, Trash2 } from "lucide-react";
import type { CatalogAsset, PortfolioPosition } from "../types";
import { classLabel } from "../format";

interface PortfolioBuilderProps {
  catalog: CatalogAsset[];
  positions: PortfolioPosition[];
  period: string;
  confidence: number;
  investment: number;
  analyzing: boolean;
  onAdd: (asset: CatalogAsset) => void;
  onRemove: (symbol: string) => void;
  onWeightChange: (symbol: string, weight: number) => void;
  onEqualWeight: () => void;
  onPeriodChange: (period: string) => void;
  onConfidenceChange: (confidence: number) => void;
  onInvestmentChange: (investment: number) => void;
  onAnalyze: () => void;
}

const PERIODS = [
  { value: "1mo", label: "1M" },
  { value: "3mo", label: "3M" },
  { value: "6mo", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "5y", label: "5Y" },
];

export function PortfolioBuilder({
  catalog,
  positions,
  period,
  confidence,
  investment,
  analyzing,
  onAdd,
  onRemove,
  onWeightChange,
  onEqualWeight,
  onPeriodChange,
  onConfidenceChange,
  onInvestmentChange,
  onAnalyze,
}: PortfolioBuilderProps) {
  const weightSum = positions.reduce((s, p) => s + p.weight, 0);
  const selected = new Set(positions.map((p) => p.symbol));

  const byClass = (cls: string) => catalog.filter((a) => a.class === cls);

  return (
    <aside className="builder panel">
      <div className="panel-head">
        <h2>Portfolio</h2>
      </div>

      <label className="field">
        <span>Investment (USD)</span>
        <input
          type="number"
          min={1000}
          step={1000}
          value={investment}
          onChange={(e) => onInvestmentChange(Number(e.target.value))}
        />
      </label>

      <div className="field">
        <span>Lookback</span>
        <div className="segmented">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={period === p.value ? "active" : ""}
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>VaR confidence · {(confidence * 100).toFixed(0)}%</span>
        <input
          type="range"
          min={0.9}
          max={0.99}
          step={0.01}
          value={confidence}
          onChange={(e) => onConfidenceChange(Number(e.target.value))}
        />
      </label>

      <div className="positions">
        <div className="positions-head">
          <h3>Holdings</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onEqualWeight}>
            Equal weight
          </button>
        </div>
        {positions.length === 0 && (
          <p className="muted">Add assets from the catalog below.</p>
        )}
        {positions.map((p) => (
          <div key={p.symbol} className="position-row">
            <div className="position-meta">
              <span className={`pill pill-${p.asset_class}`}>{p.asset_class}</span>
              <strong className="mono">{p.symbol}</strong>
            </div>
            <div className="weight-ctrl">
              <button
                type="button"
                aria-label="Decrease weight"
                onClick={() => onWeightChange(p.symbol, Math.max(0.01, p.weight - 0.05))}
              >
                <Minus size={14} />
              </button>
              <input
                className="mono"
                type="number"
                min={1}
                max={100}
                step={1}
                value={Math.round(p.weight * 100)}
                onChange={(e) =>
                  onWeightChange(p.symbol, Math.min(1, Math.max(0.01, Number(e.target.value) / 100)))
                }
              />
              <span className="muted">%</span>
              <button
                type="button"
                aria-label="Increase weight"
                onClick={() => onWeightChange(p.symbol, Math.min(1, p.weight + 0.05))}
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                className="danger"
                aria-label={`Remove ${p.symbol}`}
                onClick={() => onRemove(p.symbol)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <div className={`weight-sum ${Math.abs(weightSum - 1) < 0.02 ? "ok" : "warn"}`}>
          Weights: {(weightSum * 100).toFixed(0)}%
          {Math.abs(weightSum - 1) >= 0.02 && " · must total ~100%"}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary analyze-btn"
        disabled={analyzing || positions.length === 0 || Math.abs(weightSum - 1) >= 0.02}
        onClick={onAnalyze}
      >
        {analyzing ? "Calculating risk…" : "Analyze Risk"}
      </button>

      <div className="catalog">
        <h3>Asset catalog</h3>
        {(["stock", "gold", "silver", "crypto"] as const).map((cls) => (
          <div key={cls} className="catalog-group">
            <h4>{classLabel(cls)}</h4>
            <div className="catalog-grid">
              {byClass(cls).map((asset) => {
                const added = selected.has(asset.symbol);
                return (
                  <button
                    key={asset.symbol}
                    type="button"
                    className={`catalog-chip ${added ? "added" : ""}`}
                    disabled={added}
                    onClick={() => onAdd(asset)}
                    title={asset.name}
                  >
                    <span className="mono">{asset.symbol}</span>
                    <span className="chip-name">{asset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
