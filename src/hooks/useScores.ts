import { useEffect, useRef, useState } from "react";
import { fetchScores, type Game } from "@/lib/scores";

const SCORES_REFRESH_MS = 30_000; // 30 seconds — live data deserves fast updates

interface ScoresState {
  games: Game[];
  isLoading: boolean;
  lastUpdated: number | null;
}

export function useScores(enabled: boolean): ScoresState {
  const [state, setState] = useState<ScoresState>({
    games: [],
    isLoading: enabled,
    lastUpdated: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) {
      return () => {
        mountedRef.current = false;
      };
    }

    const load = async () => {
      try {
        const games = await fetchScores();
        if (!mountedRef.current) return;
        setState({ games, isLoading: false, lastUpdated: Date.now() });
      } catch {
        if (!mountedRef.current) return;
        setState((s) => ({ ...s, isLoading: false }));
      }
    };

    load();
    const interval = setInterval(load, SCORES_REFRESH_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [enabled]);

  return state;
}
