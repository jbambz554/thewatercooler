import type { MarketQuote } from "@/types";

export async function fetchMarketData(): Promise<MarketQuote[]> {
  const res = await fetch("/.netlify/functions/markets");
  if (!res.ok) {
    throw new Error(`Market fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.quotes ?? []) as MarketQuote[];
}
