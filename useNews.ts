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

// Module-level cache keyed by category. Persists across tab switches.
const cache: Partial<Record<CategoryId, { stories: Story[]; fetchedAt: number }>> = {};

export function useNews(category: CategoryId): NewsState & { refetch: () => void } {
  // Initialize from cache for the CURRENT category, not whatever category was
  // active last time this hook rendered. Using a function initializer means
  // this only runs on mount; the effect below handles subsequent changes.
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
  // Track the category this hook instance is currently displaying so we can
  // ignore in-flight responses when the user has already switched tabs again.
  const activeCategoryRef = useRef(category);

  useEffect(() => {
    mountedRef.current = true;
    activeCategoryRef.current = category;

    const cached = cache[category];
    const isStale = !cached || Date.now() - cached.fetchedAt > NEWS_REFRESH_MS;

    // When the category changes, reset to either the cached stories for that
    // category (instant) or an empty loading state (so we never show the
    // previous tab's stories).
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
      // Capture which category we're loading for so we can ignore the response
      // if the user has already switched tabs by the time it arrives.
      const requestedCategory = category;
      try {
        const stories = await fetchCategoryNews(requestedCategory);
        if (!mountedRef.current) return;
        cache[requestedCategory] = { stories, fetchedAt: Date.now() };
        // Only update UI state if we're still on this category
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
