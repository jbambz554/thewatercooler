import type { Category } from "@/types";

export const CATEGORIES: Category[] = [
  { id: "markets", label: "Markets", description: "Wall Street, crypto, and the money moving the world." },
  { id: "politics", label: "Politics", description: "Washington, the states, and the power plays shaping policy." },
  { id: "global", label: "Global", description: "What's happening beyond our borders, and why it matters." },
  { id: "sports", label: "Sports", description: "Scores, trades, and the storylines driving the leagues." },
  { id: "culture", label: "Pop Culture", description: "Entertainment, internet, and what everyone's talking about." },
];

export const NEWS_REFRESH_MS = 5 * 60 * 1000;
export const MARKET_REFRESH_MS = 60 * 1000;
