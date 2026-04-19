import { useScores } from "@/hooks/useScores";
import type { Game, GameTeam } from "@/lib/scores";

interface ScoreboardProps {
  active: boolean;
}

// Small colored pill for each league so scanning is easier
const LEAGUE_COLORS: Record<string, string> = {
  NBA: "hsl(28 85% 50%)",
  NFL: "hsl(358 65% 48%)",
  MLB: "hsl(215 55% 45%)",
  NHL: "hsl(205 40% 40%)",
};

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

  return (
    <div className="flex flex-col gap-1.5 py-3 px-3 sm:px-4 border-r border-b sm:border-b-0 border-border last:border-r-0 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] uppercase tracking-wider font-semibold"
          style={{ color: leagueColor }}
        >
          {game.leagueLabel}
        </span>
        <span
          className={`
            text-[10px] font-mono tabular-nums truncate
            ${isLive ? "text-up font-semibold" : "text-muted-foreground"}
          `}
        >
          {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-up mr-1 animate-pulse" />}
          {game.statusDetail}
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
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="py-3 px-4 space-y-2">
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

  // Display up to 5 games across the top row on desktop, 2 per row on mobile
  const displayed = games.slice(0, 5);

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="grid grid-cols-2 md:grid-cols-5">
        {displayed.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;
