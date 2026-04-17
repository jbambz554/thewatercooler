import type { Handler } from "@netlify/functions";
import { XMLParser } from "fast-xml-parser";

type CategoryId = "markets" | "politics" | "global" | "sports" | "culture";

const FEEDS: Record<CategoryId, { url: string; source: string }[]> = {
  markets: [
    { url: "https://feeds.content.dowjones.io/public/rss/RSSMarketsMain", source: "Wall Street Journal" },
    { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", source: "CNBC" },
    { url: "https://www.ft.com/markets?format=rss", source: "Financial Times" },
  ],
  politics: [
    { url: "https://feeds.npr.org/1014/rss.xml", source: "NPR" },
    { url: "https://www.politico.com/rss/politics08.xml", source: "Politico" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", source: "The New York Times" },
  ],
  global: [
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "The New York Times" },
    { url: "https://feeds.npr.org/1004/rss.xml", source: "NPR" },
  ],
  sports: [
    { url: "https://www.espn.com/espn/rss/nba/news", source: "ESPN NBA" },
    { url: "https://www.espn.com/espn/rss/nfl/news", source: "ESPN NFL" },
    { url: "https://www.espn.com/espn/rss/mlb/news", source: "ESPN MLB" },
    { url: "https://www.espn.com/espn/rss/nhl/news", source: "ESPN NHL" },
    { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport" },
  ],
  culture: [
    { url: "https://people.com/feed/", source: "People" },
    { url: "https://www.tmz.com/rss.xml", source: "TMZ" },
    { url: "https://variety.com/feed/", source: "Variety" },
    { url: "https://www.hollywoodreporter.com/feed/", source: "The Hollywood Reporter" },
    { url: "https://www.vulture.com/rss/index.xml", source: "Vulture" },
  ],
};

const SOURCE_WEIGHTS: Record<string, number> = {
  "Reuters": 1.5,
  "Associated Press": 1.5,
  "BBC News": 1.4,
  "NPR": 1.3,
  "The New York Times": 1.4,
  "CNBC": 1.3,
  "Bloomberg": 1.4,
  "Wall Street Journal": 1.4,
  "Financial Times": 1.4,
  "Politico": 1.3,
  "ESPN NBA": 1.5,
  "ESPN NFL": 1.5,
  "ESPN MLB": 1.5,
  "ESPN NHL": 1.5,
  "BBC Sport": 1.0,
  "People": 1.4,
  "TMZ": 1.3,
  "Variety": 1.3,
  "The Hollywood Reporter": 1.3,
  "Vulture": 1.2,
};

const STORIES_PER_CATEGORY = 5;
const CACHE_MAX_AGE_SECONDS = 300;

const NAMED_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
  "&lsquo;": "\u2018",
  "&rsquo;": "\u2019",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&hellip;": "\u2026",
  "&trade;": "\u2122",
  "&copy;": "\u00A9",
  "&reg;": "\u00AE",
};

function decodeEntities(str: string): string {
  if (!str || str.indexOf("&") === -1) return str;
  let out = str.replace(/&(?:amp;)?#(\d+);/g, (_m, dec: string) => {
    const code = parseInt(dec, 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
  });
  out = out.replace(/&(?:amp;)?#x([0-9a-fA-F]+);/g, (_m, hex: string) => {
    const code = parseInt(hex, 16);
    return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
  });
  out = out.replace(/&[a-zA-Z]+;/g, (m) => NAMED_ENTITIES[m] ?? m);
  return out;
}

function cleanSummary(html: string, max = 180): string {
  if (!html) return "";
  const stripped = decodeEntities(
    html
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > max ? stripped.slice(0, max - 1) + "…" : stripped;
}

function cleanHeadline(text: string): string {
  return cleanSummary(text, 300);
}

interface Story {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  score: number;
}

function scoreStory(publishedAt: string, sourceWeight: number, headline: string): number {
  const now = Date.now();
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 0;
  const ageHours = Math.max(0, (now - published) / (1000 * 60 * 60));
  const recency = Math.exp(-ageHours / 8);
  const len = headline.length;
  const lengthFactor = len < 20 ? 0.7 : len > 140 ? 0.8 : len >= 40 && len <= 90 ? 1.05 : 1.0;
  return recency * sourceWeight * lengthFactor;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  textNodeName: "#text",
  trimValues: true,
});

interface RawItem {
  title?: string;
  link?: string;
  pubDate?: string;
  published?: string;
  updated?: string;
  description?: string;
  summary?: string;
  content?: string;
  "content:encoded"?: string;
  __cdata?: string;
}

function extractText(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__cdata === "string") return obj.__cdata;
    if (typeof obj["#text"] === "string") return obj["#text"];
  }
  return "";
}

function extractLink(item: RawItem): string {
  const link = (item as unknown as Record<string, unknown>).link;
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    const alt = link.find(
      (l: unknown) =>
        typeof l === "object" &&
        l !== null &&
        (l as Record<string, unknown>)["@_rel"] === "alternate"
    );
    const chosen = alt ?? link[0];
    if (typeof chosen === "object" && chosen !== null) {
      const href = (chosen as Record<string, unknown>)["@_href"];
      if (typeof href === "string") return href;
    }
  }
  if (link && typeof link === "object") {
    const obj = link as Record<string, unknown>;
    if (typeof obj["@_href"] === "string") return obj["@_href"];
    if (typeof obj["#text"] === "string") return obj["#text"];
  }
  return "";
}

async function fetchFeed(url: string, source: string): Promise<Story[]> {
  try {
    const sourceWeight = SOURCE_WEIGHTS[source] ?? 1.0;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WaterCoolerBot/1.0; +https://thewatercooler.netlify.app)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`Feed ${source} returned ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const parsed = parser.parse(xml);

    const channel = parsed?.rss?.channel;
    const atomFeed = parsed?.feed;
    const rawItems: RawItem[] = channel?.item
      ? Array.isArray(channel.item)
        ? channel.item
        : [channel.item]
      : atomFeed?.entry
      ? Array.isArray(atomFeed.entry)
        ? atomFeed.entry
        : [atomFeed.entry]
      : [];

    return rawItems.slice(0, 20).map((item, idx) => {
      const headline = cleanHeadline(extractText(item.title));
      const summary = cleanSummary(
        extractText(item.description) ||
          extractText(item.summary) ||
          extractText(item["content:encoded"]) ||
          extractText(item.content)
      );
      const url = extractLink(item);
      const publishedAt =
        extractText(item.pubDate) ||
        extractText(item.published) ||
        extractText(item.updated) ||
        new Date().toISOString();

      return {
        id: `${source}-${idx}-${url}`,
        headline,
        summary,
        source,
        url,
        publishedAt,
        score: scoreStory(publishedAt, sourceWeight, headline),
      };
    });
  } catch (err) {
    console.warn(`Failed to fetch ${source}:`, err);
    return [];
  }
}

async function getCategoryNews(category: CategoryId): Promise<Story[]> {
  const feeds = FEEDS[category] ?? [];
  const results = await Promise.all(feeds.map((f) => fetchFeed(f.url, f.source)));
  const all = results.flat().filter((s) => s.headline && s.url);

  const seen = new Set<string>();
  const deduped: Story[] = [];
  for (const story of all.sort((a, b) => b.score - a.score)) {
    const key = story.headline.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(story);
  }

  return deduped.slice(0, STORIES_PER_CATEGORY);
}

const VALID_CATEGORIES: CategoryId[] = ["markets", "politics", "global", "sports", "culture"];

export const handler: Handler = async (event) => {
  const category = event.queryStringParameters?.category as CategoryId | undefined;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid or missing ?category parameter" }),
    };
  }

  try {
    const stories = await getCategoryNews(category);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=60, s-maxage=${CACHE_MAX_AGE_SECONDS}`,
      },
      body: JSON.stringify({ category, stories, fetchedAt: new Date().toISOString() }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to load news" }),
    };
  }
};
