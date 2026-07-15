import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getMatch } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { useLanguage } from "@/hooks/useLanguage";
import { T } from "@/lib/translations";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABEL_KEY: Record<string, string> = {
  live: "live",
  notstarted: "notStarted",
  finished: "finished",
};

function LivePulseBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--sc-ember)] px-2.5 py-1 text-[10px] font-bold tracking-wider text-white">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-white"
        style={{ animation: "sc-pulse 1.8s ease-in-out infinite" }}
      />
      {label}
    </span>
  );
}

export function MatchBanner({ matchId }: { matchId: string }) {
  const { language } = useLanguage();
  const t = T[language];
  const { data: match, loading } = usePolling(() => getMatch(matchId), 20_000, [matchId]);

  if (loading && !match) {
    return <Skeleton className="h-28 w-full rounded-2xl" />;
  }

  if (!match) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--sc-border)] bg-[var(--sc-card)] py-6 text-center text-sm text-[var(--sc-mist)]">
        {t.noLiveMatch}
      </div>
    );
  }

  const isLive = match.time_elapsed === "live";
  const statusLabel = t[STATUS_LABEL_KEY[match.time_elapsed]] ?? match.time_elapsed;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[var(--sc-space)] px-5 py-5">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(232,50,26,0.12), transparent 60%)" }}
      />

      <div className="relative mb-4 flex items-center gap-2">
        {isLive ? (
          <LivePulseBadge label={statusLabel} />
        ) : (
          <span className="rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white/60">
            {statusLabel}
          </span>
        )}
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex-1 text-left">
          <div className="text-[13px] font-bold tracking-wide text-white">
            {match.home_team_name_en ?? "TBD"}
          </div>
        </div>
        <div className="shrink-0 px-2 text-center">
          <div className="text-[40px] font-light tabular-nums leading-none tracking-tight text-white">
            {match.home_score} – {match.away_score}
          </div>
        </div>
        <div className="flex-1 text-right">
          <div className="text-[13px] font-bold tracking-wide text-white">
            {match.away_team_name_en ?? "TBD"}
          </div>
        </div>
      </div>

      <Link
        to={`/matches/${match.match_id}`}
        className="relative mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-[13px] font-semibold text-white/80"
      >
        {t.viewDetails}
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
