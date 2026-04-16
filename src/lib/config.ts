import type { Category } from "@/types";

/**
 * Category metadata for the UI. Edit labels or descriptions freely;
 * the ids are also used on the server, so don't change those without
 * also updating netlify/functions/news.ts.
 */
export const CATEGORIES: Category[] = [
  { id: "markets", label: "Markets", description: "Wall Street, crypto, and the money moving the world." },
  { id: "politics", label: "Politics", description: "Washington, the states, and the power plays shaping policy." },
  { id: "global", label: "Global", description: "What's happening beyond our borders, and why it matters." },
  { id: "sports", label: "Sports", description: "Scores, trades, and the storylines driving the leagues." },
  { id: "culture", label: "Pop Culture", description: "Entertainment, internet, and what everyone's talking about." },
];

/** How often the client refetches news while the page is open. */
export const NEWS_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/** How often the client refetches market data. */
export const MARKET_REFRESH_MS = 60 * 1000; // 1 minute
