import type { MarketQuote } from "@/types";

/**
 * Market data fetching happens server-side in netlify/functions/markets.ts
 * to avoid CORS issues with Stooq. This just calls that endpoint.
 */
export async function fetchMarketData(): Promise<MarketQuote[]> {
  const res = await fetch("/.netlify/functions/markets");
  if (!res.ok) {
    throw new Error(`Market fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.quotes ?? []) as MarketQuote[];
}
