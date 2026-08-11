export function pct(value: number, digits = 2): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function usd(value: number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
  }).format(value);
}

export function num(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function signedPct(value: number, digits = 2): string {
  const v = value.toFixed(digits);
  return value > 0 ? `+${v}%` : `${v}%`;
}

export function classLabel(assetClass: string): string {
  const map: Record<string, string> = {
    stock: "Equities",
    gold: "Gold",
    silver: "Silver",
    crypto: "Crypto",
  };
  return map[assetClass] || assetClass;
}
