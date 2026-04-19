import type { Handler } from "@netlify/functions";

// ==========================================================================
// CONFIG
// ==========================================================================

type League = "nba" | "nfl" | "mlb" | "nhl";

const LEAGUE_ENDPOINTS: Record<League, string> = {
  nba: "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
  nfl: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
  mlb: "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  nhl: "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
};

const TOTAL_GAMES_CAP = 8;
const NHL_PLAYOFF_CAP = 2;
const CACHE_MAX_AGE_SECONDS = 60;

// ==========================================================================
// OUTPUT SHAPE
// ==========================================================================

interface Team {
  abbr: string;
  name: string;
  logo: string;
  score: number;
  winner: boolean;
}

interface Game {
  id: string;
  league: League;
  leagueLabel: string;
  state: "pre" | "in" | "post";
  statusDetail: string;
  startTime: string;
  home: Team;
  away: Team;
  isPlayoff: boolean;
  seasonTypeId: number;       // 2 = regular, 3 = postseason
  liveness: number;           // 0 = live, 1 = upcoming, 2 = finished
  timeDistance: number;       // abs distance from now in ms (for within-bucket sort)
}

// ==========================================================================
// PARSING
// ==========================================================================

const LEAGUE_LABELS: Record<League, string> = {
  nba: "NBA",
  nfl: "NFL",
  mlb: "MLB",
  nhl: "NHL",
};

interface ESPNCompetitor {
  homeAway: "home" | "away";
  team: {
    abbreviation: string;
    displayName: string;
    shortDisplayName?: string;
    logo?: string;
  };
  score?: string;
  winner?: boolean;
}

interface ESPNEvent {
  id: string;
  date: string;
  season?: {
    type?: number;
    slug?: string;
  };
  status?: {
    type?: {
      state?: string;
      shortDetail?: string;
      completed?: boolean;
    };
  };
  competitions?: Array<{
    competitors?: ESPNCompetitor[];
  }>;
}

interface ESPNResponse {
  events?: ESPNEvent[];
}

function parseTeam(c: ESPNCompetitor): Team {
  return {
    abbr: c.team.abbreviation ?? "",
    name: c.team.shortDisplayName ?? c.team.displayName ?? "",
    logo: c.team.logo ?? "",
    score: parseInt(c.score ?? "0", 10) || 0,
    winner: !!c.winner,
  };
}

async function fetchLeague(league: League): Promise<Game[]> {
  try {
    const res = await fetch(LEAGUE_ENDPOINTS[league], {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WaterCoolerBot/1.0)",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) {
      console.warn(`ESPN ${league} returned ${res.status}`);
      return [];
    }
    const data: ESPNResponse = await res.json();
    const events = data.events ?? [];
    const now = Date.now();

    return events
      .map((ev): Game | null => {
        const comp = ev.competitions?.[0];
        if (!comp?.competitors || comp.competitors.length < 2) return null;

        const home = comp.competitors.find((c) => c.homeAway === "home");
        const away = comp.competitors.find((c) => c.homeAway === "away");
        if (!home || !away) return null;

        const state = (ev.status?.type?.state ?? "pre") as "pre" | "in" | "post";
        const statusDetail = ev.status?.type?.shortDetail ?? "";
        const startMs = new Date(ev.date).getTime();

        // Season type: 2 = regular season, 3 = postseason/playoffs
        const seasonTypeId = ev.season?.type ?? 2;
        const isPlayoff =
          seasonTypeId === 3 ||
          (ev.season?.slug?.toLowerCase().includes("post") ?? false);

        const liveness = state === "in" ? 0 : state === "pre" ? 1 : 2;
        const timeDistance = Math.abs(startMs - now);

        return {
          id: `${league}-${ev.id}`,
          league,
          leagueLabel: LEAGUE_LABELS[league],
          state,
          statusDetail,
          startTime: ev.date,
          home: parseTeam(home),
          away: parseTeam(away),
          isPlayoff,
          seasonTypeId,
          liveness,
          timeDistance,
        };
      })
      .filter((g): g is Game => g !== null);
  } catch (err) {
    console.warn(`Failed to fetch ${league}:`, err);
    return [];
  }
}

// ==========================================================================
// PRIORITY / SELECTION LOGIC
// ==========================================================================

/**
 * Sort games within a group by liveness then time proximity:
 *   1) Live games first
 *   2) Upcoming next (soonest first)
 *   3) Finished last (most recent first)
 */
function byRelevance(a: Game, b: Game): number {
  if (a.liveness !== b.liveness) return a.liveness - b.liveness;
  return a.timeDistance - b.timeDistance;
}

function selectGames(all: Game[]): Game[] {
  const chosen: Game[] = [];
  const seen = new Set<string>();

  const add = (g: Game) => {
    if (seen.has(g.id) || chosen.length >= TOTAL_GAMES_CAP) return;
    chosen.push(g);
    seen.add(g.id);
  };

  // === PRIORITY 1: All NBA playoff games today ===
  const nbaPlayoffs = all
    .filter((g) => g.league === "nba" && g.isPlayoff)
    .sort(byRelevance);
  nbaPlayoffs.forEach(add);

  // === PRIORITY 2: Up to 2 NHL playoff games ===
  const nhlPlayoffs = all
    .filter((g) => g.league === "nhl" && g.isPlayoff)
    .sort(byRelevance)
    .slice(0, NHL_PLAYOFF_CAP);
  nhlPlayoffs.forEach(add);

  // === PRIORITY 3: MLB games (fill remaining) ===
  const mlb = all.filter((g) => g.league === "mlb").sort(byRelevance);
  mlb.forEach(add);

  // === FALLBACKS if not enough priority games (off-season, quiet day, etc.) ===

  // Fallback A: any remaining NBA games (regular season)
  const nbaRest = all.filter((g) => g.league === "nba" && !g.isPlayoff).sort(byRelevance);
  nbaRest.forEach(add);

  // Fallback B: any remaining NHL games (regular season)
  const nhlRest = all.filter((g) => g.league === "nhl" && !g.isPlayoff).sort(byRelevance);
  nhlRest.forEach(add);

  // Fallback C: NFL games (lowest priority since they likely aren't in-season during playoffs)
  const nfl = all.filter((g) => g.league === "nfl").sort(byRelevance);
  nfl.forEach(add);

  return chosen;
}

// ==========================================================================
// HANDLER
// ==========================================================================

export const handler: Handler = async () => {
  const leagues: League[] = ["nba", "nfl", "mlb", "nhl"];
  const results = await Promise.all(leagues.map(fetchLeague));
  const allGames = results.flat();

  // Debug logging
  const stats: Record<string, { total: number; playoff: number; live: number }> = {};
  for (const g of allGames) {
    if (!stats[g.league]) stats[g.league] = { total: 0, playoff: 0, live: 0 };
    stats[g.league].total++;
    if (g.isPlayoff) stats[g.league].playoff++;
    if (g.liveness === 0) stats[g.league].live++;
  }
  console.log("Scoreboard stats:", JSON.stringify(stats));

  const chosen = selectGames(allGames);
  console.log(
    `Selected ${chosen.length} games:`,
    chosen.map((g) => `${g.leagueLabel}${g.isPlayoff ? "🏆" : ""} ${g.away.abbr}@${g.home.abbr}`).join(", ")
  );

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=30, s-maxage=${CACHE_MAX_AGE_SECONDS}`,
    },
    body: JSON.stringify({
      games: chosen,
      fetchedAt: new Date().toISOString(),
    }),
  };
};
