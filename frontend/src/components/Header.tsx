import { RefreshCw } from "lucide-react";

interface HeaderProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
}

export function Header({ lastUpdated, onRefresh, loading }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="brand-name">AUTOMATED RISK MANAGEMENT</h1>
      <div className="header-actions">
        {lastUpdated && (
          <span className="timestamp">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          type="button"
          className="btn"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : undefined} />
          Refresh
        </button>
      </div>
    </header>
  );
}
