import type { Story, CategoryId } from "@/types";

export async function fetchCategoryNews(category: CategoryId): Promise<Story[]> {
  const res = await fetch(`/.netlify/functions/news?category=${category}`);
  if (!res.ok) {
    throw new Error(`News fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.stories ?? []) as Story[];
}
