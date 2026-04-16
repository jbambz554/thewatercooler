import type { Story, CategoryId } from "@/types";

/**
 * All the actual RSS fetching, parsing, and ranking happens server-side in
 * netlify/functions/news.ts. This just calls that endpoint.
 *
 * To change which feeds are fetched or how stories are ranked,
 * edit netlify/functions/news.ts (not this file).
 */
export async function fetchCategoryNews(category: CategoryId): Promise<Story[]> {
  const res = await fetch(`/.netlify/functions/news?category=${category}`);
  if (!res.ok) {
    throw new Error(`News fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.stories ?? []) as Story[];
}
