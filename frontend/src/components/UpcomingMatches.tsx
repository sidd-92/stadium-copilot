import { getUpcomingMatches } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Matches change status (notstarted -> live) at most once every poll
// cycle upstream, so this doesn't need aggressive polling — 60s keeps it
// fresh without hammering order-service for a list that rarely changes.
const POLL_INTERVAL_MS = 60_000;

function formatKickoff(localDate: string): string {
  // worldcup26.ir gives "MM/DD/YYYY HH:mm" with no timezone info — shown
  // as-is rather than guessing a timezone and getting it wrong.
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(localDate);
  if (!match) return localDate;
  const [, month, day, , hour, minute] = match;
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${hour}:${minute}`;
}

export function UpcomingMatches() {
  const { data: matches, loading } = usePolling(() => getUpcomingMatches(5), POLL_INTERVAL_MS, []);

  if (loading && !matches) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (!matches || matches.length === 0) {
    return null; // nothing upcoming cached yet — not worth a dedicated empty state
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming matches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {matches.map((match) => (
          <div key={match.match_id} className="flex items-center justify-between text-sm">
            <span>
              {match.home_team_name_en ?? "TBD"} vs {match.away_team_name_en ?? "TBD"}
            </span>
            <span className="text-muted-foreground">{formatKickoff(match.local_date)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
