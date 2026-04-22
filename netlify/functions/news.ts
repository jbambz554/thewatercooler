import type { Handler } from "@netlify/functions";
import { XMLParser } from "fast-xml-parser";

// ==========================================================================
// CONFIG
// ==========================================================================

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
    { url: "https://sports.yahoo.com/nba/rss.xml", source: "Yahoo NBA" },
    { url: "https://sports.yahoo.com/nfl/rss.xml", source: "Yahoo NFL" },
    { url: "https://sports.yahoo.com/mlb/rss.xml", source: "Yahoo MLB" },
    { url: "https://sports.yahoo.com/nhl/rss.xml", source: "Yahoo NHL" },
    { url: "https://www.cbssports.com/rss/headlines/nba/", source: "CBS Sports NBA" },
    { url: "https://www.cbssports.com/rss/headlines/nfl/", source: "CBS Sports NFL" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml", source: "The New York Times" },
    { url: "https://feeds.bbci.co.uk/sport/rss.xml", source: "BBC Sport" },
  ],
  culture: [
    { url: "https://www.tmz.com/rss.xml", source: "TMZ" },
    { url: "https://people.com/feed/", source: "People" },
    { url: "https://www.vulture.com/rss/index.xml", source: "Vulture" },
    { url: "https://variety.com/feed/", source: "Variety" },
    { url: "https://www.hollywoodreporter.com/feed/", source: "The Hollywood Reporter" },
    { url: "https://www.theringer.com/rss/index.xml", source: "The Ringer" },
    { url: "https://ew.com/feed/", source: "Entertainment Weekly" },
  ],
};

const SOURCE_WEIGHTS: Record<string, number> = {
  "Reuters": 2.0,
  "Associated Press": 2.0,
  "The New York Times": 1.9,
  "BBC News": 1.8,
  "Wall Street Journal": 1.8,
  "Financial Times": 1.8,
  "NPR": 1.7,
  "Bloomberg": 1.8,
  "CNBC": 1.5,
  "Politico": 1.5,
  "Yahoo NBA": 1.5,
  "Yahoo NFL": 1.5,
  "Yahoo MLB": 1.5,
  "Yahoo NHL": 1.5,
  "CBS Sports NBA": 1.4,
  "CBS Sports NFL": 1.4,
  "BBC Sport": 1.2,
  "Vulture": 1.5,
  "Variety": 1.4,
  "The Hollywood Reporter": 1.4,
  "The Ringer": 1.4,
  "People": 1.1,
  "Entertainment Weekly": 1.1,
  "TMZ": 1.1,
};

const STORIES_PER_CATEGORY = 5;
const CACHE_MAX_AGE_SECONDS = 300;
const MAX_STORY_AGE_HOURS = 30;
const MIN_TRUSTWORTHY_AGE_MINUTES = 45;

// AI summarization config
const AI_MODEL = "claude-haiku-4-5-20251001";
const AI_MAX_TOKENS = 200;
const AI_TIMEOUT_MS = 8000;
const SUMMARY_MAX_CHARS = 400;

// ==========================================================================
// SUMMARY CLEANING (for RSS-derived fallback summaries)
// ==========================================================================

const NAMED_ENTITIES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&apos;": "'",
  "&lt;": "<", "&gt;": ">",
  "&ldquo;": "\u201C", "&rdquo;": "\u201D",
  "&lsquo;": "\u2018", "&rsquo;": "\u2019",
  "&mdash;": "\u2014", "&ndash;": "\u2013", "&hellip;": "\u2026",
  "&trade;": "\u2122", "&copy;": "\u00A9", "&reg;": "\u00AE",
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

function stripHtml(raw: string): string {
  if (!raw) return "";
  return decodeEntities(
    raw
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function stripBoilerplate(text: string): string {
  let t = text;
  t = t.replace(/\bThe post\s+.+?\s+appeared first on\s+[^.]+\.?\s*$/i, "");
  t = t.replace(/\b(?:Continue reading|Read more|Read the full (?:story|article)|Full story)(?:[^.]{0,80}at\s+[A-Z][A-Za-z.\s]+)?\.?\s*$/i, "");
  t = t.replace(/\s*(?:[-\u2014\u2013]|at|\|)\s*(?:the\s+)?[A-Z][A-Za-z\s]{2,30}\s*[\u00BB\u203A]?\s*$/i, "");
  t = t.replace(/\b(?:Subscribe to (?:our|the)\s+\S+|Sign up for (?:our|the)\s+\S+)[^.]*\.\s*/gi, "");
  t = t.replace(/\[(?:video|photos?|updated|breaking|exclusive|watch|listen|gallery|slideshow|podcast)\]/gi, "");
  t = t.replace(/^\s*By\s+[A-Z][A-Za-z.\-\s,]{2,50}?\s*[\u2014\u2013\-\|]\s*/, "");
  t = t.replace(/^\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+\d{4})?\s*[\u2014\u2013\-]\s*/i, "");
  t = t.replace(/^\s*\d{1,2}:\d{2}\s*(?:[AP]M)?\s*(?:GMT|UTC|EST|EDT|ET|CST|PT)?\s*[\u2014\u2013\-]\s*/i, "");
  t = t.replace(/^\s*\d+\s+(?:minute|hour|day)s?\s+ago\s*[\u2014\u2013\-]\s*/i, "");
  t = t.replace(/\s*\.\s*\.\s*\.\s*/g, "… ");
  t = t.replace(/…+/g, "…");
  t = t.replace(/\bThe article\s+.+?\s+originally appeared on\s+[^.]+\.\s*$/i, "");
  t = t.replace(/\b(?:Click|Tap)\s+here\s+to\s+[^.]+\.\s*/gi, "");
  return t.replace(/\s+/g, " ").trim();
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  const parts = text.split(/(?<=[.!?\u2026])\s+(?=[A-Z0-9"\u201C])/);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

function pickSentences(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const sentences = splitSentences(text);
  if (sentences.length === 0) return text.slice(0, maxChars).trim();

  let out = "";
  for (const s of sentences) {
    if (out.length === 0) {
      out = s;
      if (out.length >= maxChars) break;
      continue;
    }
    if (out.length + 1 + s.length > maxChars + 40) break;
    out = out + " " + s;
  }
  if (out.length > maxChars + 80) {
    const cut = out.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    out = (lastSpace > maxChars - 50 ? cut.slice(0, lastSpace) : cut) + "…";
  }
  return out;
}

function isUsefulSummary(summary: string, headline: string): boolean {
  if (!summary) return false;
  const s = summary.trim();
  if (s.length < 40) return false;
  const normS = s.toLowerCase().replace(/\s+/g, " ").trim();
  const normH = headline.toLowerCase().replace(/\s+/g, " ").trim();
  if (normS.slice(0, 30) === normH.slice(0, 30)) return false;
  if (normH.length >= 20 && normS.startsWith(normH)) return false;
  return true;
}

function buildRssSummary(
  candidates: {
    description?: string;
    summary?: string;
    contentEncoded?: string;
    content?: string;
    mediaDescription?: string;
  },
  headline: string,
  maxChars = SUMMARY_MAX_CHARS
): string {
  const fields = [
    candidates.description,
    candidates.summary,
    candidates.mediaDescription,
    candidates.contentEncoded,
    candidates.content,
  ].filter((f): f is string => typeof f === "string" && f.length > 0);

  const cleaned = fields
    .map((raw) => stripBoilerplate(stripHtml(raw)))
    .filter((s) => s.length >= 40);

  if (cleaned.length === 0) return "";

  const SWEET_MIN = 80;
  const SWEET_MAX = 800;

  let chosen = cleaned.find(
    (s) => s.length >= SWEET_MIN && s.length <= SWEET_MAX && isUsefulSummary(s, headline)
  );
  if (!chosen) {
    chosen = cleaned
      .filter((s) => isUsefulSummary(s, headline))
      .sort((a, b) => b.length - a.length)[0];
  }
  if (!chosen) {
    chosen = cleaned.sort((a, b) => b.length - a.length)[0] ?? "";
  }
  if (!chosen) return "";
  return pickSentences(chosen, maxChars);
}

function cleanHeadline(text: string): string {
  const stripped = stripHtml(text);
  return stripped.length > 300 ? stripped.slice(0, 299) + "…" : stripped;
}

// ==========================================================================
// AI SUMMARY — Claude generates real, self-contained briefing summaries
// ==========================================================================

const aiSummaryCache = new Map<string, { summary: string; expiresAt: number }>();
const AI_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCachedAiSummary(url: string): string | null {
  const entry = aiSummaryCache.get(url);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    aiSummaryCache.delete(url);
    return null;
  }
  return entry.summary;
}

function setCachedAiSummary(url: string, summary: string): void {
  aiSummaryCache.set(url, {
    summary,
    expiresAt: Date.now() + AI_CACHE_TTL_MS,
  });
  if (aiSummaryCache.size > 500) {
    const entries = Array.from(aiSummaryCache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      .slice(0, 100);
    for (const [k] of entries) aiSummaryCache.delete(k);
  }
}

interface AnthropicMessage {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
}

async function generateAiSummary(params: {
  headline: string;
  rssSnippet: string;
  source: string;
  category: CategoryId;
  apiKey: string;
}): Promise<string | null> {
  const { headline, rssSnippet, source, category, apiKey } = params;

  const systemPrompt = `You write factual, self-contained summaries of news stories for a daily briefing product called The Water Cooler. Each summary must:

- Be EXACTLY 2-3 sentences. Never 1 sentence. Never 4+ sentences.
- Tell the reader what happened, who is involved, and the key context — enough that they can close the app and hold a conversation about the story.
- Be purely factual. Do NOT editorialize, speculate, or use marketing language.
- Do NOT repeat the headline verbatim. The headline is shown separately.
- Do NOT start with "This article", "The story", "Reports say", etc. Just state the news.
- Do NOT use words like "delves into", "dives into", "explores", "unpacks".
- Stay under 400 characters total.

Output only the summary text. No preamble, no markdown, no quotation marks around your output.`;

  const userPrompt = `Category: ${category}
Source: ${source}
Headline: ${headline}
RSS snippet: ${rssSnippet || "(no snippet available)"}

Write the 2-3 sentence summary:`;

  try {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutHandle);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(`Claude API returned ${res.status}:`, body.slice(0, 200));
      return null;
    }

    const data: AnthropicMessage = await res.json();
    const textBlock = data.content?.find((b) => b.type === "text");
    const text = textBlock?.text?.trim();
    if (!text || text.length < 30) return null;

    const cleaned = text
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length > 500) {
      return pickSentences(cleaned, SUMMARY_MAX_CHARS);
    }
    return cleaned;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`AI summary generation failed: ${msg}`);
    return null;
  }
}

async function enhanceWithAiSummaries(
  stories: Story[],
  category: CategoryId
): Promise<Story[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("No ANTHROPIC_API_KEY set — skipping AI summaries");
    return stories;
  }

  const toGenerate: { index: number; story: Story }[] = [];
  const enhanced = stories.map((s, i) => {
    const cached = getCachedAiSummary(s.url);
    if (cached) return { ...s, summary: cached };
    toGenerate.push({ index: i, story: s });
    return s;
  });

  if (toGenerate.length === 0) {
    console.log(`[${category}] all summaries from cache`);
    return enhanced;
  }

  console.log(`[${category}] generating ${toGenerate.length} AI summaries (${stories.length - toGenerate.length} cached)`);

  const results = await Promise.allSettled(
    toGenerate.map((item) =>
      generateAiSummary({
        headline: item.story.headline,
        rssSnippet: item.story.summary,
        source: item.story.source,
        category,
        apiKey,
      })
    )
  );

  let successes = 0;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const item = toGenerate[i];
    if (result.status === "fulfilled" && result.value) {
      enhanced[item.index] = { ...enhanced[item.index], summary: result.value };
      setCachedAiSummary(item.story.url, result.value);
      successes++;
    }
  }

  console.log(`[${category}] AI summaries: ${successes}/${toGenerate.length} succeeded`);
  return enhanced;
}

// ==========================================================================
// TOPIC FINGERPRINTING (for clustering)
// ==========================================================================

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for",
  "from", "had", "has", "have", "he", "her", "his", "how", "i", "in", "is",
  "it", "its", "just", "me", "more", "my", "new", "no", "not", "now", "of",
  "on", "one", "or", "our", "out", "she", "so", "than", "that", "the",
  "their", "them", "there", "these", "they", "this", "to", "up", "was",
  "we", "were", "what", "when", "where", "who", "why", "will", "with",
  "you", "your", "about", "after", "all", "also", "before", "can",
  "could", "did", "do", "does", "down", "get", "go", "gone", "got", "into",
  "like", "made", "make", "most", "need", "over", "see", "seen", "still",
  "take", "taken", "tell", "told", "us", "use", "used", "vs", "via", "way",
  "ways", "went", "year", "years", "says", "said", "report", "reports",
  "reported", "live", "update", "updates", "news",
]);

const ALIASES: Record<string, string> = {
  fed: "federalreserve",
  federal: "federalreserve",
  reserve: "federalreserve",
  gop: "republicans",
  republican: "republicans",
  dem: "democrats",
  democrat: "democrats",
  democratic: "democrats",
  wall: "wallstreet",
  street: "wallstreet",
  btc: "bitcoin",
  eth: "ethereum",
  nba: "nba",
  nfl: "nfl",
  mlb: "mlb",
  nhl: "nhl",
};

interface TokenSet {
  all: Set<string>;
  distinctive: Set<string>;
}

function topicTokens(headline: string): TokenSet {
  const rawTokens = headline
    .replace(/[\u2018\u2019\u201C\u201D]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((t) => t.length > 0);

  const all = new Set<string>();
  const distinctive = new Set<string>();

  for (const raw of rawTokens) {
    const lower = raw.toLowerCase();
    if (lower.length < 3) continue;
    if (STOPWORDS.has(lower)) continue;

    const canonical = ALIASES[lower] ?? lower;
    all.add(canonical);

    const isNumber = /^\d+[a-z]*$/i.test(raw) && raw.length >= 2;
    const isAcronym = /^[A-Z]{2,5}$/.test(raw);
    const isProperNoun = /^[A-Z][a-z]+/.test(raw) && raw.length >= 3;
    if (isNumber || isAcronym || isProperNoun) {
      distinctive.add(canonical);
    }
  }

  return { all, distinctive };
}

function isSameTopic(a: TokenSet, b: TokenSet): boolean {
  let shared = 0;
  let sharedDistinctive = 0;
  for (const t of a.all) {
    if (b.all.has(t)) {
      shared++;
      if (a.distinctive.has(t) && b.distinctive.has(t)) sharedDistinctive++;
    }
  }
  if (shared < 2) return false;
  if (sharedDistinctive >= 2) return true;
  const minSize = Math.min(a.all.size, b.all.size);
  if (minSize === 0) return false;
  return shared / minSize >= 0.4 && shared >= 2;
}

// ==========================================================================
// RANKING
// ==========================================================================

interface RawStory {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  ageHours: number;
  sourceWeight: number;
  tokens: TokenSet;
}

interface Story {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  score: number;
  corroboratingSources: number;
}

function baseScore(story: RawStory): number {
  const { ageHours, sourceWeight } = story;
  if (ageHours > MAX_STORY_AGE_HOURS) return 0;

  let recency: number;
  if (ageHours <= 1) recency = 1.0;
  else if (ageHours <= 12) recency = 1.0 - (ageHours - 1) * (0.3 / 11);
  else if (ageHours <= 24) recency = 0.7 - (ageHours - 12) * (0.35 / 12);
  else recency = Math.max(0.15, 0.35 - (ageHours - 24) * (0.2 / 6));

  const ageMinutes = ageHours * 60;
  const flashPenalty = ageMinutes < MIN_TRUSTWORTHY_AGE_MINUTES ? 0.7 : 1.0;

  return recency * sourceWeight * flashPenalty;
}

function clusterAndRank(stories: RawStory[]): Story[] {
  const clusters: RawStory[][] = [];

  for (const story of stories) {
    let placed = false;
    for (const cluster of clusters) {
      if (cluster.some((c) => isSameTopic(c.tokens, story.tokens))) {
        cluster.push(story);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([story]);
  }

  const ranked: Story[] = clusters.map((cluster) => {
    const sortedByQuality = [...cluster].sort((a, b) => {
      const aHasSummary = a.summary.length >= 60 ? 1 : 0;
      const bHasSummary = b.summary.length >= 60 ? 1 : 0;
      if (aHasSummary !== bHasSummary) return bHasSummary - aHasSummary;
      return baseScore(b) - baseScore(a);
    });
    const rep = sortedByQuality[0];

    const uniqueSources = new Set(cluster.map((s) => s.source));
    const nSources = uniqueSources.size;

    const corroborationBoost = 1 + Math.log2(nSources) * 0.5;
    const finalScore = baseScore(rep) * corroborationBoost;

    return {
      id: rep.id,
      headline: rep.headline,
      summary: rep.summary,
      source: rep.source,
      url: rep.url,
      publishedAt: rep.publishedAt,
      score: finalScore,
      corroboratingSources: nSources,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

// ==========================================================================
// RSS PARSING
// ==========================================================================

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
  "media:description"?: string;
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

async function fetchFeed(url: string, source: string): Promise<RawStory[]> {
  try {
    const sourceWeight = SOURCE_WEIGHTS[source] ?? 1.0;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) {
      console.warn(`Feed ${source} returned ${res.status}`);
      return [];
    }
    const xml = await res.text();
    if (!xml || xml.length < 50) return [];

    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel;
    const atomFeed = parsed?.feed;
    const rawItems: RawItem[] = channel?.item
      ? Array.isArray(channel.item) ? channel.item : [channel.item]
      : atomFeed?.entry
      ? Array.isArray(atomFeed.entry) ? atomFeed.entry : [atomFeed.entry]
      : [];

    const now = Date.now();

    return rawItems.slice(0, 25).map((item, idx) => {
      const headline = cleanHeadline(extractText(item.title));
      const summary = buildRssSummary(
        {
          description: extractText(item.description),
          summary: extractText(item.summary),
          contentEncoded: extractText(item["content:encoded"]),
          content: extractText(item.content),
          mediaDescription: extractText(item["media:description"]),
        },
        headline,
        SUMMARY_MAX_CHARS
      );
      const url = extractLink(item);
      const publishedAt =
        extractText(item.pubDate) ||
        extractText(item.published) ||
        extractText(item.updated) ||
        new Date().toISOString();
      const published = new Date(publishedAt).getTime();
      const ageHours = Number.isNaN(published)
        ? 999
        : Math.max(0, (now - published) / (1000 * 60 * 60));

      return {
        id: `${source}-${idx}-${url}`,
        headline,
        summary,
        source,
        url,
        publishedAt,
        ageHours,
        sourceWeight,
        tokens: topicTokens(headline),
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
  const all = results
    .flat()
    .filter((s) => s.headline && s.url && s.ageHours <= MAX_STORY_AGE_HOURS);

  const perSource: Record<string, number> = {};
  for (const s of all) perSource[s.source] = (perSource[s.source] ?? 0) + 1;
  console.log(`[${category}] sources in window:`, perSource);

  const ranked = clusterAndRank(all);
  const top = ranked.slice(0, STORIES_PER_CATEGORY);

  console.log(
    `[${category}] top picks (pre-AI):`,
    top.map((s) => `"${s.headline.slice(0, 40)}..." (${s.corroboratingSources}src, ${s.score.toFixed(2)})`)
  );

  const enhanced = await enhanceWithAiSummaries(top, category);
  return enhanced;
}

// ==========================================================================
// HANDLER
// ==========================================================================

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
