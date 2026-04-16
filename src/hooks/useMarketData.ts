import { useEffect, useRef, useState } from "react";
import type { MarketQuote } from "@/types";
import { fetchMarketData } from "@/lib/markets";
import { MARKET_REFRESH_MS } from "@/lib/config";

interface MarketState {
  quotes: MarketQuote[];
  isLoading: boolean;
  lastUpdated: number | null;
}

export function useMarketData(): MarketState {
  const [state, setState] = useState<MarketState>({
    quotes: [],
    isLoading: true,
    lastUpdated: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const load = async () => {
      try {
        const quotes = await fetchMarketData();
        if (!mountedRef.current) return;
        setState({ quotes, isLoading: false, lastUpdated: Date.now() });
      } catch {
        if (!mountedRef.current) return;
        setState((s) => ({ ...s, isLoading: false }));
      }
    };

    load();
    const interval = setInterval(load, MARKET_REFRESH_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  return state;
}
