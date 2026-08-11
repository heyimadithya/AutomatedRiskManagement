import type { RiskMetrics } from "../types";
import { pct, usd, num } from "../format";

interface MetricsGridProps {
  metrics: RiskMetrics;
  confidence: number;
  investment: number;
}

export function MetricsGrid({ metrics, confidence, investment }: MetricsGridProps) {
  const cards = [
    {
      label: `Historical VaR (${(confidence * 100).toFixed(0)}%)`,
      value: pct(metrics.historical_var),
      sub: usd(metrics.var_dollar) + " at risk",
      tone: "risk" as const,
    },
    {
      label: "Parametric VaR",
      value: pct(metrics.parametric_var),
      sub: "Normal distribution",
      tone: "risk" as const,
    },
    {
      label: "Monte Carlo VaR",
      value: pct(metrics.monte_carlo_var),
      sub: "10k simulations",
      tone: "risk" as const,
    },
    {
      label: "CVaR / Expected Shortfall",
      value: pct(metrics.cvar),
      sub: usd(metrics.cvar_dollar) + " avg tail loss",
      tone: "risk" as const,
    },
    {
      label: "Sharpe Ratio",
      value: num(metrics.sharpe_ratio, 3),
      sub: "Excess return / vol",
      tone: metrics.sharpe_ratio >= 1 ? ("good" as const) : ("neutral" as const),
    },
    {
      label: "Sortino Ratio",
      value: num(metrics.sortino_ratio, 3),
      sub: "Downside risk only",
      tone: metrics.sortino_ratio >= 1 ? ("good" as const) : ("neutral" as const),
    },
    {
      label: "Max Drawdown",
      value: pct(metrics.max_drawdown),
      sub: "Peak-to-trough",
      tone: "risk" as const,
    },
    {
      label: "Annualized Volatility",
      value: pct(metrics.volatility_annual),
      sub: `On ${usd(investment, 0)} notional`,
      tone: "neutral" as const,
    },
    {
      label: "Annualized Return",
      value: pct(metrics.return_annual),
      sub: `Calmar ${num(metrics.calmar_ratio, 2)}`,
      tone: metrics.return_annual >= 0 ? ("good" as const) : ("risk" as const),
    },
    {
      label: "Skewness / Kurtosis",
      value: `${num(metrics.skewness, 2)} / ${num(metrics.kurtosis, 2)}`,
      sub: "Distribution shape",
      tone: "neutral" as const,
    },
  ];

  return (
    <section className="metrics-grid">
      {cards.map((c) => (
        <article key={c.label} className={`metric-card tone-${c.tone}`}>
          <p className="metric-label">{c.label}</p>
          <p className="metric-value mono">{c.value}</p>
          <p className="metric-sub">{c.sub}</p>
        </article>
      ))}
    </section>
  );
}
