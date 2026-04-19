import { useScores } from "@/hooks/useScores";
import type { Game, GameTeam } from "@/lib/scores";

interface ScoreboardProps {
  active: boolean;
}

const LEAGUE_COLORS: Record<string, string> = {
  NBA: "hsl(28 85% 50%)",
  NFL: "hsl(358 65% 48%)",
  MLB: "hsl(215 55% 45%)",
  NHL: "hsl(205 40% 40%)",
};

// Clean up ESPN's verbose status strings for tight mobile cards.
// Examples of ESPN's shortDetail strings and what we convert them to:
//   "4/19 - 6:30 PM EDT"   ->  "6:30 PM"         (date is redundant — they're today)
//   "Q4 10:45"             ->  "Q4 10:45"        (already short)
//   "Top 6th"              ->  "Top 6th"         (already short)
//   "Final"                ->  "Final"           (already short)
//   "End of 3rd Quarter"   ->  "End 3rd"         (compress)
function cleanStatus(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();

  // Strip date prefix like "4/19 - " if present
  s = s.replace(/^\d{1,2}\/\d{1,2}\s*-\s*/, "");
  // Strip timezone abbreviation at end ("6:30 PM EDT" -> "6:30 PM")
  s = s.replace(/\s+(?:EDT|EST|CDT|CST|MDT|MST|PDT|PST|AKDT|AKST|HST|UTC|GMT)\s*$/i, "");
  // Compress "End of Xth Quarter/Period" -> "End Xth"
  s = s.replace(/^End of (\d+(?:st|nd|rd|th))\s*(?:Quarter|Period|Inning)?/i, "End $1");
  // Compress "Xth Quarter" -> "Qx" (NBA/NFL-ish)
  s = s.replace(/^(\d+)(?:st|nd|rd|th)\s+Quarter/i, "Q$1");
  // Compress "Xth Period" -> "Px" (NHL)
  s = s.replace(/^(\d+)(?:st|nd|rd|th)\s+Period/i, "P$1");

  return s;
}

function TeamRow({ team, state }: { team: GameTeam; state: Game["state"] }) {
  const isFinished = state === "post";
  const isLive = state === "in";
  const dimLoser = (isFinished || isLive) && !team.winner && team.score > 0;

  return (
    <div className={`flex items-center justify-between gap-2 ${dimLoser ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        {team.logo ? (
          <img
            src={team.logo}
            alt=""
            className="w-5 h-5 shrink-0 object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-5 h-5 shrink-0" />
        )}
        <span className="font-display font-semibold text-sm truncate">
          {team.abbr}
        </span>
      </div>
      <span className="font-display font-bold text-base tabular-nums shrink-0">
        {state === "pre" ? "—" : team.score}
      </span>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const leagueColor = LEAGUE_COLORS[game.leagueLabel] ?? "hsl(25 10% 45%)";
  const isLive = game.state === "in";
  const statusText = cleanStatus(game.statusDetail);

  return (
    <div className="flex flex-col gap-1.5 py-3 px-3 sm:px-4 border-r border-b border-border min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold leading-tight shrink-0"
          style={{ color: leagueColor }}
        >
          {game.leagueLabel}
          {game.isPlayoff && (
            <span className="ml-1 text-[9px] font-bold opacity-80">• PLAYOFFS</span>
          )}
        </span>
        <span
          className={`
            text-[10px] font-mono tabular-nums leading-tight text-right min-w-0
            ${isLive ? "text-up font-semibold" : "text-muted-foreground"}
          `}
        >
          {isLive && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-up mr-1 animate-pulse align-middle" />
          )}
          {statusText}
        </span>
      </div>
      <TeamRow team={game.away} state={game.state} />
      <TeamRow team={game.home} state={game.state} />
    </div>
  );
}

const Scoreboard = ({ active }: ScoreboardProps) => {
  const { games, isLoading } = useScores(active);

  if (isLoading && games.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="py-3 px-4 space-y-2 border-r border-b border-border">
              <div className="h-2.5 w-10 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card p-4">
        <p className="text-sm text-muted-foreground text-center">
          No games scheduled right now. Check back later.
        </p>
      </div>
    );
  }

  const displayed = games.slice(0, 8);

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {displayed.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;
