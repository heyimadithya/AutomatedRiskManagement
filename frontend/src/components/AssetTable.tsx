import type { AssetAnalysis, Quote } from "../types";
import { pct, num, usd, signedPct } from "../format";

interface AssetTableProps {
  assets: AssetAnalysis[];
  quotes: Quote[];
}

export function AssetTable({ assets, quotes }: AssetTableProps) {
  const quoteMap = Object.fromEntries(quotes.map((q) => [q.symbol, q]));

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Position Breakdown</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Class</th>
              <th>Weight</th>
              <th>Live</th>
              <th>Chg</th>
              <th>VaR</th>
              <th>Sharpe</th>
              <th>Max DD</th>
              <th>Vol</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const q = quoteMap[a.symbol];
              return (
                <tr key={a.symbol}>
                  <td>
                    <strong className="mono">{a.symbol}</strong>
                    <div className="muted small">{a.name}</div>
                  </td>
                  <td>{a.asset_class}</td>
                  <td className="mono">{pct(a.weight, 0)}</td>
                  <td className="mono">
                    {q ? usd(q.price, q.price >= 100 ? 2 : 4) : "—"}
                  </td>
                  <td className={`mono ${q ? (q.change_pct >= 0 ? "up" : "down") : ""}`}>
                    {q ? signedPct(q.change_pct) : "—"}
                  </td>
                  <td className="mono">{pct(a.metrics.historical_var)}</td>
                  <td className="mono">{num(a.metrics.sharpe_ratio, 2)}</td>
                  <td className="mono">{pct(a.metrics.max_drawdown)}</td>
                  <td className="mono">{pct(a.metrics.volatility_annual)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
