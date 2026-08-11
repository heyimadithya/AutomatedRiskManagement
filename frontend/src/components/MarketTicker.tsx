import type { Quote } from "../types";
import { signedPct, usd } from "../format";

interface MarketTickerProps {
  quotes: Quote[];
}

export function MarketTicker({ quotes }: MarketTickerProps) {
  if (!quotes.length) {
    return <div className="ticker ticker-empty">Loading prices...</div>;
  }

  return (
    <div className="ticker" aria-label="Live market prices">
      {quotes.map((q) => (
        <span key={q.symbol} className="ticker-item">
          <span className="ticker-sym">{q.symbol}</span>
          <span>{usd(q.price, q.price >= 100 ? 2 : 4)}</span>
          <span className={q.change_pct >= 0 ? "up" : "down"}>
            {signedPct(q.change_pct)}
          </span>
        </span>
      ))}
    </div>
  );
}
