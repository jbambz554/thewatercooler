export type CategoryId = "markets" | "politics" | "global" | "sports" | "culture";

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
}

export interface Story {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string; // ISO date
  score: number; // importance score (computed server-side)
}

export interface MarketQuote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
}
