export type LeagueId = "nba" | "nfl" | "mlb" | "nhl";

export interface GameTeam {
  abbr: string;
  name: string;
  logo: string;
  score: number;
  winner: boolean;
}

export interface Game {
  id: string;
  league: LeagueId;
  leagueLabel: string;
  state: "pre" | "in" | "post";
  statusDetail: string;
  startTime: string;
  home: GameTeam;
  away: GameTeam;
  isPlayoff: boolean;
}

export async function fetchScores(): Promise<Game[]> {
  const res = await fetch("/.netlify/functions/scores");
  if (!res.ok) {
    throw new Error(`Scores fetch failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.games ?? []) as Game[];
}
