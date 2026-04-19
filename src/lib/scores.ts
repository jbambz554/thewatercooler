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

const TOTAL_GAMES_CAP = 10; // max games shown across all leagues combined
const CACHE_MAX_AGE_SECONDS = 60; // live data — short cache

// ==========================================================================
// OUTPUT SHAPE (what the client gets)
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
  statusDetail: string;   // "Final", "Q3 5:23", "8:00 PM ET", etc.
  startTime: string;      // ISO
  home: Team;
  away: Team;
  rank: number;           // lower = more important for display ordering
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

/**
 * Score stat competitions so we can sort across leagues:
 *   - live games (state "in") rank highest
 *   - upcoming today rank next
 *   - finished today rank last
 * Within each bucket, closer-in-time games bubble up.
 */
function rankGame(state: string, startMs: number, nowMs: number): number {
  const bucket = state === "in" ? 0 : state === "pre" ? 1 : 2;
  const timeDistance = Math.abs(startMs - nowMs);
  return bucket * 1_000_000_000 + timeDistance;
}

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

        return {
          id: `${league}-${ev.id}`,
          league,
          leagueLabel: LEAGUE_LABELS[league],
          state,
          statusDetail,
          startTime: ev.date,
          home: parseTeam(home),
          away: parseTeam(away),
          rank: rankGame(state, startMs, now),
        };
      })
      .filter((g): g is Game => g !== null);
  } catch (err) {
    console.warn(`Failed to fetch ${league}:`, err);
    return [];
  }
}

// ==========================================================================
// HANDLER
// ==========================================================================

export const handler: Handler = async () => {
  const leagues: League[] = ["nba", "nfl", "mlb", "nhl"];
  const results = await Promise.all(leagues.map(fetchLeague));
  const allGames = results.flat();

  // Count per league for logging
  const perLeague: Record<string, number> = {};
  for (const g of allGames) perLeague[g.league] = (perLeague[g.league] ?? 0) + 1;
  console.log(`Scoreboard pulled ${allGames.length} games:`, perLeague);

  // Sort by rank (live first, then upcoming, then finished)
  allGames.sort((a, b) => a.rank - b.rank);

  // Try to give each active league at least 1 game if available —
  // otherwise fill remaining slots with the top-ranked games.
  const chosen: Game[] = [];
  const seenIds = new Set<string>();

  // Pass 1: one game per league (top-ranked in each)
  for (const league of leagues) {
    const first = allGames.find((g) => g.league === league && !seenIds.has(g.id));
    if (first) {
      chosen.push(first);
      seenIds.add(first.id);
    }
  }

  // Pass 2: fill remaining slots by overall rank
  for (const g of allGames) {
    if (chosen.length >= TOTAL_GAMES_CAP) break;
    if (!seenIds.has(g.id)) {
      chosen.push(g);
      seenIds.add(g.id);
    }
  }

  // Final sort so the final list is still in rank order
  chosen.sort((a, b) => a.rank - b.rank);

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
