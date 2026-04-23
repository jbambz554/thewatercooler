import type { Config } from "@netlify/functions";

type CategoryId = "markets" | "politics" | "global" | "sports" | "culture";
const CATEGORIES: CategoryId[] = ["markets", "politics", "global", "sports", "culture"];

/**
 * Scheduled function — runs every 5 minutes.
 * Hits each category's news endpoint to keep the cache warm, so real users
 * always hit pre-generated data and never pay the 3-5s AI generation cost.
 */
export default async (req: Request) => {
  // URL.CONTEXT_URL is injected by Netlify; fall back to SITE_URL / deploy URL
  const baseUrl =
    process.env.URL ||
    process.env.DEPLOY_PRIME_URL ||
    process.env.DEPLOY_URL ||
    "";

  if (!baseUrl) {
    console.warn("No site URL available, skipping warmup");
    return new Response("No site URL", { status: 500 });
  }

  console.log(`Warmup starting at ${new Date().toISOString()} against ${baseUrl}`);

  const results = await Promise.allSettled(
    CATEGORIES.map(async (category) => {
      const url = `${baseUrl}/.netlify/functions/news?category=${category}&_warmup=1`;
      const start = Date.now();
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "WaterCoolerWarmup/1.0" },
          // Don't wait forever — if a category is slow, move on
          signal: AbortSignal.timeout(30_000),
        });
        const elapsed = Date.now() - start;
        if (!res.ok) {
          console.warn(`Warmup ${category} returned ${res.status} in ${elapsed}ms`);
          return { category, ok: false, status: res.status, elapsed };
        }
        const data = await res.json();
        const stories = Array.isArray(data.stories) ? data.stories.length : 0;
        console.log(`Warmup ${category}: ${stories} stories in ${elapsed}ms`);
        return { category, ok: true, stories, elapsed };
      } catch (err) {
        const elapsed = Date.now() - start;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Warmup ${category} failed in ${elapsed}ms: ${msg}`);
        return { category, ok: false, error: msg, elapsed };
      }
    })
  );

  const successes = results.filter(
    (r) => r.status === "fulfilled" && (r.value as { ok: boolean }).ok
  ).length;

  console.log(`Warmup complete: ${successes}/${CATEGORIES.length} succeeded`);

  return new Response(
    JSON.stringify({
      ok: true,
      successes,
      total: CATEGORIES.length,
      at: new Date().toISOString(),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};

export const config: Config = {
  schedule: "*/5 * * * *", // every 5 minutes
};
