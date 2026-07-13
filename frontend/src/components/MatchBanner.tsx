import { getMatch } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL: Record<string, string> = {
  live: "LIVE",
  notstarted: "Not started",
  finished: "Finished",
};

export function MatchBanner({ matchId }: { matchId: string }) {
  const { data: match, loading } = usePolling(() => getMatch(matchId), 20_000, [matchId]);

  if (loading && !match) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  if (!match) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-center text-sm text-muted-foreground">
          No live match data right now.
        </CardContent>
      </Card>
    );
  }

  const isLive = match.time_elapsed === "live";
  const statusLabel = STATUS_LABEL[match.time_elapsed] ?? match.time_elapsed;

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold">{match.home_team_name_en ?? "TBD"}</span>
          <span className="text-2xl font-bold tabular-nums">
            {match.home_score} – {match.away_score}
          </span>
          <span className="font-semibold">{match.away_team_name_en ?? "TBD"}</span>
        </div>
        <Badge variant={isLive ? "default" : "secondary"} className={isLive ? "animate-pulse" : ""}>
          {statusLabel}
        </Badge>
      </CardContent>
    </Card>
  );
}
