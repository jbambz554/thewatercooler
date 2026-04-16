# The Water Cooler

Your 15-minute briefing on what matters. A daily news site covering markets, politics, global news, sports, and pop culture — auto-fetched from trusted RSS feeds and ranked by importance.

## Architecture

- **Frontend:** Vite + React + TypeScript + Tailwind (the part users see)
- **Backend:** Two Netlify Functions that run server-side (no CORS issues, no API keys needed)
  - `netlify/functions/news.ts` — fetches RSS feeds, parses them, ranks stories, returns top 5
  - `netlify/functions/markets.ts` — fetches S&P/Dow/Nasdaq from Stooq and BTC/ETH from CoinGecko
- **Hosting:** Netlify (free tier is more than enough)

The server responses are CDN-cached, so your site stays fast even with many visitors and doesn't hammer the upstream feeds.

## How to deploy the first time

1. Push this project to a GitHub repo
2. On netlify.com, click "Add new site" → "Import from Git" → pick the repo
3. Netlify auto-detects everything from `netlify.toml` — no settings to change. Click Deploy.
4. Done. Your site is live at `yourname.netlify.app`.

## How to edit it (no-terminal workflow)

You don't need to run anything locally. All edits happen directly on GitHub:

1. Open the file you want to edit on github.com
2. Click the pencil icon (top right)
3. Paste in new contents
4. Click "Commit changes"
5. Netlify auto-deploys in about a minute

## The files you'll actually want to edit

### To change feeds, sources, ranking, or number of stories → `netlify/functions/news.ts`

At the top of that file you'll find:

- **`FEEDS`** — the RSS URL + label for each category. Add, remove, or swap outlets freely.
- **`SOURCE_WEIGHTS`** — a number (roughly 0.8 to 1.5) per source. Higher = that outlet's headlines get ranked higher.
- **`STORIES_PER_CATEGORY`** — currently 5. Change to whatever.
- **`scoreStory()`** — the actual ranking formula if you want to tune how recency, source weight, and headline length interact.

### To change market data → `netlify/functions/markets.ts`

`INDICES` controls the stock indices; the crypto block controls which coins appear.

### To change UI text, tab labels, or descriptions → `src/lib/config.ts`

Short, safe edits. Just change the strings.

### To change visual design → `src/index.css`

Look for the `:root` block at the top — that's where all the colors and accents live.

## How the ranking works

Each story gets a score = **recency × source weight × headline length factor**:

1. **Recency** decays exponentially. A 1-hour-old story scores ~0.88, a 12-hour-old story scores ~0.22, a 24-hour-old story scores ~0.05.
2. **Source weight** is a flat multiplier per outlet (Reuters 1.5, Variety 1.2, etc.).
3. **Headline length** gives a small bump to headlines in the 40–90 character sweet spot.

After scoring, near-duplicate headlines are de-duped (first 40 alphanumeric chars, lowercased), and the top 5 by score are returned.

## Market data

- **Indices (S&P, Dow, Nasdaq):** Stooq — free, no API key, ~15 min delay
- **Crypto (BTC, ETH):** CoinGecko public API — free, real-time

If any upstream source is slow or down, the function hides that quote rather than showing stale data.

## Running locally (optional, for previewing changes)

If you want to test before pushing to GitHub:

```bash
npm install
npm install -g netlify-cli
netlify dev
```

`netlify dev` runs the frontend AND the functions together on one local URL. Plain `npm run dev` also works but the functions won't run — you'd just see "unavailable" for news and markets.

## What's free about this

- Netlify hosting: free tier covers 100GB bandwidth/month
- Netlify Functions: free tier covers 125,000 invocations/month
- RSS feeds: free (public URLs)
- Stooq: free
- CoinGecko public API: free

No subscriptions. No watermarks.
