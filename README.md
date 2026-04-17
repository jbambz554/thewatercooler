# The Water Cooler

Your 5-minute briefing on what matters. A daily news site covering markets, politics, global news, sports, and pop culture — auto-fetched from trusted RSS feeds and ranked by importance.

## Architecture

- **Frontend:** Vite + React + TypeScript + Tailwind
- **Backend:** Two Netlify Functions (server-side, no CORS issues, no API keys)
  - `netlify/functions/news.ts` — fetches RSS feeds, parses, ranks, returns top 5 per category
  - `netlify/functions/markets.ts` — fetches S&P/Dow/Nasdaq from Stooq and BTC/ETH from CoinGecko
- **Hosting:** Netlify free tier

## How to deploy

1. Push this project to a GitHub repo
2. On netlify.com, "Add new site" → "Import from Git" → pick the repo
3. Netlify auto-detects everything from `netlify.toml`. Click Deploy.

## How to edit

All edits can happen directly on github.com — no terminal required. Click any file, click the pencil icon, make changes, commit.

### To change feeds, sources, or ranking → `netlify/functions/news.ts`

At the top of that file:
- **`FEEDS`** — RSS URL + label for each category
- **`SOURCE_WEIGHTS`** — multiplier per outlet (Reuters 1.5, etc.)
- **`STORIES_PER_CATEGORY`** — currently 5
- **`scoreStory()`** — the ranking formula

### To change market data → `netlify/functions/markets.ts`

`INDICES` controls stock indices; the crypto block controls which coins.

### To change UI → `src/lib/config.ts`

Categories, labels, refresh intervals.

### To change visuals → `src/index.css`

The `:root` block has all theme colors.

## Ranking

Stories are scored by: **recency × source weight × headline length factor**

Near-duplicate headlines are de-duped, top 5 by score are returned.

## Market data sources

- **Indices:** Stooq (free, ~15 min delay)
- **Crypto:** CoinGecko (free, real-time)

## Running locally

```bash
npm install
npm install -g netlify-cli
netlify dev
```
