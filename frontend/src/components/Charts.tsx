import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PortfolioAnalysis } from "../types";
import { pct, usd } from "../format";

interface ChartsProps {
  analysis: PortfolioAnalysis;
}

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #ccc",
  fontSize: 12,
};

export function Charts({ analysis }: ChartsProps) {
  const { equity_curve, drawdowns, return_distribution, correlation } = analysis;

  const dist = return_distribution.map((d) => ({
    ...d,
    mid: ((d.bin_start + d.bin_end) / 2) * 100,
    fill: (d.bin_start + d.bin_end) / 2 < 0 ? "#b00020" : "#555555",
  }));

  return (
    <div className="charts">
      <article className="panel">
        <div className="panel-head">
          <h3>Equity Curve</h3>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={equity_curve}>
              <CartesianGrid stroke="#ddd" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={48}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [usd(Number(v)), "Value"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#111"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h3>Drawdown</h3>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={drawdowns}>
              <CartesianGrid stroke="#ddd" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => pct(Number(v), 0)}
                width={48}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [pct(Number(v)), "Drawdown"]}
              />
              <Line
                type="monotone"
                dataKey="drawdown"
                stroke="#b00020"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h3>Return Distribution</h3>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dist}>
              <CartesianGrid stroke="#ddd" />
              <XAxis
                dataKey="mid"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
                minTickGap={24}
              />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [v, "Count"]}
                labelFormatter={(l) => `${Number(l).toFixed(2)}%`}
              />
              <Bar dataKey="count">
                {dist.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h3>Correlation Matrix</h3>
        </div>
        <div className="corr-wrap">
          <table className="corr-table">
            <thead>
              <tr>
                <th />
                {correlation.symbols.map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {correlation.symbols.map((row, i) => (
                <tr key={row}>
                  <th>{row}</th>
                  {correlation.matrix[i].map((val, j) => (
                    <td
                      key={`${i}-${j}`}
                      style={{
                        background: corrColor(val),
                        color: Math.abs(val) > 0.6 ? "#fff" : "#111",
                      }}
                    >
                      {val.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function corrColor(v: number): string {
  if (v >= 0) {
    return `rgba(0, 0, 0, ${Math.min(0.55, v * 0.55)})`;
  }
  return `rgba(176, 0, 32, ${Math.min(0.55, Math.abs(v) * 0.55)})`;
}
