import { useEffect, useRef, useState } from "react";
import type { Story, CategoryId } from "@/types";
import { fetchCategoryNews } from "@/lib/news";
import { NEWS_REFRESH_MS } from "@/lib/config";

interface NewsState {
  stories: Story[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Simple in-memory cache across tab switches so we don't refetch every time
const cache: Partial<Record<CategoryId, { stories: Story[]; fetchedAt: number }>> = {};

export function useNews(category: CategoryId): NewsState & { refetch: () => void } {
  const [state, setState] = useState<NewsState>(() => {
    const cached = cache[category];
    return {
      stories: cached?.stories ?? [],
      isLoading: !cached,
      error: null,
      lastUpdated: cached?.fetchedAt ?? null,
    };
  });

  const mountedRef = useRef(true);

  const load = async () => {
    setState((s) => ({ ...s, isLoading: s.stories.length === 0, error: null }));
    try {
      const stories = await fetchCategoryNews(category);
      if (!mountedRef.current) return;
      cache[category] = { stories, fetchedAt: Date.now() };
      setState({ stories, isLoading: false, error: null, lastUpdated: Date.now() });
    } catch (err) {
      if (!mountedRef.current) return;
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const cached = cache[category];
    const isStale = !cached || Date.now() - cached.fetchedAt > NEWS_REFRESH_MS;

    if (isStale) {
      load();
    } else {
      setState({
        stories: cached.stories,
        isLoading: false,
        error: null,
        lastUpdated: cached.fetchedAt,
      });
    }

    const interval = setInterval(load, NEWS_REFRESH_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return { ...state, refetch: load };
}
