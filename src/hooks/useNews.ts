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

const cache: Partial<Record<CategoryId, { stories: Story[]; fetchedAt: number }>> = {};

export function useNews(category: CategoryId): NewsState & { refetch: () => void } {
  const [state, setState] = useState<NewsState>(() => {
    const cached = cache[category];
    if (cached) {
      return {
        stories: cached.stories,
        isLoading: false,
        error: null,
        lastUpdated: cached.fetchedAt,
      };
    }
    return { stories: [], isLoading: true, error: null, lastUpdated: null };
  });

  const mountedRef = useRef(true);
  const activeCategoryRef = useRef(category);

  useEffect(() => {
    mountedRef.current = true;
    activeCategoryRef.current = category;

    const cached = cache[category];
    const isStale = !cached || Date.now() - cached.fetchedAt > NEWS_REFRESH_MS;

    if (cached) {
      setState({
        stories: cached.stories,
        isLoading: isStale,
        error: null,
        lastUpdated: cached.fetchedAt,
      });
    } else {
      setState({ stories: [], isLoading: true, error: null, lastUpdated: null });
    }

    const load = async () => {
      const requestedCategory = category;
      try {
        const stories = await fetchCategoryNews(requestedCategory);
        if (!mountedRef.current) return;
        cache[requestedCategory] = { stories, fetchedAt: Date.now() };
        if (activeCategoryRef.current !== requestedCategory) return;
        setState({ stories, isLoading: false, error: null, lastUpdated: Date.now() });
      } catch (err) {
        if (!mountedRef.current) return;
        if (activeCategoryRef.current !== requestedCategory) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        }));
      }
    };

    if (isStale) load();

    const interval = setInterval(load, NEWS_REFRESH_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [category]);

  const refetch = () => {
    const requestedCategory = category;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    fetchCategoryNews(requestedCategory)
      .then((stories) => {
        if (!mountedRef.current) return;
        cache[requestedCategory] = { stories, fetchedAt: Date.now() };
        if (activeCategoryRef.current !== requestedCategory) return;
        setState({ stories, isLoading: false, error: null, lastUpdated: Date.now() });
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        if (activeCategoryRef.current !== requestedCategory) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err.message : "Something went wrong",
        }));
      });
  };

  return { ...state, refetch };
}
