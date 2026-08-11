import type {
  CatalogAsset,
  MarketOverview,
  PortfolioAnalysis,
  PortfolioPosition,
  Quote,
} from "./types";

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json() as Promise<T>;
}

function demoUrl(file: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}${file}`;
}

async function loadDemoPortfolio(): Promise<PortfolioAnalysis> {
  const res = await fetch(demoUrl("demo-portfolio.json"));
  if (!res.ok) {
    throw new Error(
      "Demo dataset missing. Run the FastAPI backend locally for live analysis."
    );
  }
  return res.json() as Promise<PortfolioAnalysis>;
}

async function loadDemoOverview(): Promise<MarketOverview> {
  const res = await fetch(demoUrl("demo-overview.json"));
  if (!res.ok) {
    throw new Error("Demo market overview missing.");
  }
  return res.json() as Promise<MarketOverview>;
}

async function loadDemoCatalog(): Promise<{ assets: CatalogAsset[] }> {
  const res = await fetch(demoUrl("demo-catalog.json"));
  if (!res.ok) {
    throw new Error("Demo catalog missing.");
  }
  return res.json() as Promise<{ assets: CatalogAsset[] }>;
}

export async function fetchCatalog(assetClass?: string) {
  try {
    const q = assetClass ? `?asset_class=${assetClass}` : "";
    return await request<{ assets: CatalogAsset[] }>(`/api/catalog${q}`);
  } catch {
    const demo = await loadDemoCatalog();
    if (!assetClass) return demo;
    return {
      assets: demo.assets.filter((a) => a.class === assetClass),
    };
  }
}

export async function fetchMarketOverview() {
  try {
    return await request<MarketOverview>("/api/market-overview");
  } catch {
    return loadDemoOverview();
  }
}

export async function fetchQuotes(symbols: string[]) {
  try {
    return await request<{ quotes: Quote[]; count: number }>(
      `/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`
    );
  } catch {
    const overview = await loadDemoOverview();
    const set = new Set(symbols.map((s) => s.toUpperCase()));
    const quotes = overview.quotes.filter((q) => set.has(q.symbol.toUpperCase()));
    return { quotes, count: quotes.length };
  }
}

export async function analyzePortfolio(payload: {
  positions: PortfolioPosition[];
  period: string;
  confidence: number;
  investment: number;
}) {
  try {
    return await request<PortfolioAnalysis>("/api/portfolio/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // GitHub Pages hosts the static UI only (no Python API).
    return loadDemoPortfolio();
  }
}
