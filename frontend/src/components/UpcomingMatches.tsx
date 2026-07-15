import { getUpcomingMatches } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { useLanguage } from "@/hooks/useLanguage";
import { T } from "@/lib/translations";
import { formatKickoffLocal } from "@/lib/kickoff-time";
import { Skeleton } from "@/components/ui/skeleton";

// Matches change status (notstarted -> live) at most once every poll
// cycle upstream, so this doesn't need aggressive polling — 60s keeps it
// fresh without hammering order-service for a list that rarely changes.
const POLL_INTERVAL_MS = 60_000;

export function UpcomingMatches() {
  const { language } = useLanguage();
  const t = T[language];
  const { data: matches, loading } = usePolling(() => getUpcomingMatches(5), POLL_INTERVAL_MS, []);

  if (loading && !matches) {
    return <Skeleton className="h-32 w-full rounded-2xl" />;
  }

  if (!matches || matches.length === 0) {
    return null; // nothing upcoming cached yet — not worth a dedicated empty state
  }

  return (
    <div>
      <div className="mb-2.5 text-[11px] font-bold tracking-wide text-[var(--sc-ember)]">
        {t.upcomingMatches.toUpperCase()}
      </div>
      <div className="space-y-2">
        {matches.map((match) => (
          <div
            key={match.match_id}
            className="rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-4 py-3"
          >
            <div className="truncate text-[15px] font-semibold tracking-tight text-[var(--sc-ink)]">
              {match.home_team_name_en ?? "TBD"}{" "}
              <span className="font-normal text-[var(--sc-mist)]">vs</span> {match.away_team_name_en ?? "TBD"}
            </div>
            <div className="mt-0.5 text-[11px] font-semibold text-[var(--sc-graphite)]">
              {formatKickoffLocal(match.local_date, language)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
