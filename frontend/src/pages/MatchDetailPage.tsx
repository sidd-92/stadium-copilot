import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { getMatch } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import { useLanguage } from "@/hooks/useLanguage";
import { T } from "@/lib/translations";
import { formatKickoffLocal } from "@/lib/kickoff-time";
import { Skeleton } from "@/components/ui/skeleton";

// worldcup26.ir gives a status enum (notstarted/live/finished), not a
// running minute clock — so the timeline shows discrete milestones
// rather than fabricating a fake elapsed-minute position.
const STATUS_PERCENT: Record<string, number> = {
  notstarted: 0,
  live: 50,
  finished: 100,
};

const STATUS_LABEL_KEY: Record<string, string> = {
  live: "live",
  notstarted: "notStarted",
  finished: "finished",
};

export function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { language } = useLanguage();
  const t = T[language];
  const { data: match, loading } = usePolling(() => getMatch(matchId!), 20_000, [matchId]);

  if (!matchId) return null;

  if (loading && !match) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="mx-auto max-w-lg p-4 text-center text-[var(--sc-mist)]">{t.noLiveMatch}</div>
    );
  }

  const percent = STATUS_PERCENT[match.time_elapsed] ?? 0;
  const isLive = match.time_elapsed === "live";

  return (
    <div className="min-h-screen bg-[var(--sc-surface)]">
      {/* Dark hero */}
      <div className="relative overflow-hidden bg-[var(--sc-space)] px-5 py-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(232,50,26,0.08), transparent 70%)" }}
        />

        <div className="relative mb-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1 text-[13px] font-semibold text-white/60">
            <ArrowLeft size={16} />
            {t.back}
          </Link>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sc-ember)] px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-white">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-white/80"
                style={{ animation: "sc-pulse 1.8s infinite" }}
              />
              {t.live}
            </span>
          )}
        </div>

        <div className="relative flex flex-col items-center gap-1">
          <div className="text-base font-bold tracking-wide text-white">{match.home_team_name_en ?? "TBD"}</div>
          <div className="py-2 text-[64px] font-light leading-none tracking-tight text-white tabular-nums">
            {match.home_score} <span className="text-white/20 font-extralight">–</span> {match.away_score}
          </div>
          <div className="text-base font-bold tracking-wide text-white">{match.away_team_name_en ?? "TBD"}</div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-5 py-5">
        <div className="mb-4 text-[11px] font-bold tracking-wide text-[var(--sc-ember)]">
          {match.group} · {match.type.toUpperCase()}
        </div>

        <div className="relative mb-2.5 h-1.5 rounded-full bg-[var(--sc-surface-2)]">
          <div
            className="h-full rounded-full"
            style={{ width: `${percent}%`, background: "linear-gradient(90deg, var(--sc-ember), var(--sc-gold))" }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white"
            style={{ left: `${percent}%`, background: "var(--sc-gold)", boxShadow: "0 0 0 2px var(--sc-gold)" }}
          />
        </div>

        <div className="flex justify-between text-center">
          <div>
            <div className="text-[11px] font-semibold text-[var(--sc-ink)]">Kickoff</div>
          </div>
          <div>
            <div className={`text-[11px] font-bold ${isLive ? "text-[var(--sc-gold)]" : "text-[var(--sc-mist)]"}`}>
              {t[STATUS_LABEL_KEY[match.time_elapsed] ?? "live"] ?? match.time_elapsed}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[var(--sc-mist)]">FT</div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--sc-border)] bg-[var(--sc-card)] px-4 py-3 text-xs text-[var(--sc-graphite)]">
          {formatKickoffLocal(match.local_date, language)} (your local time) · Stadium {match.stadium_id}
        </div>
      </div>
    </div>
  );
}
