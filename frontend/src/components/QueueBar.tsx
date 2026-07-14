import { useLanguage } from "@/lib/language";
import { T } from "@/lib/translations";

// Thresholds mirror menu-service.ts's queueLabel() on the backend so the
// UI's wording always matches what the Gemini-generated summary implies.
function queueLevel(queueLength: number): "low" | "moderate" | "high" {
  if (queueLength <= 5) return "low";
  if (queueLength <= 15) return "moderate";
  return "high";
}

const LEVEL_CONFIG: Record<"low" | "moderate" | "high", { fill: number; color: string; labelKey: string }> = {
  low: { fill: 0.2, color: "var(--sc-mint)", labelKey: "queueShort" },
  moderate: { fill: 0.55, color: "var(--sc-gold)", labelKey: "queueMod" },
  high: { fill: 0.9, color: "var(--sc-ember)", labelKey: "queueLong" },
};

export function QueueBar({ queueLength }: { queueLength: number }) {
  const { language } = useLanguage();
  const t = T[language];
  const level = queueLevel(queueLength);
  const { fill, color, labelKey } = LEVEL_CONFIG[level];
  // queue_length_estimate is a people-count, not minutes — same ~1.5
  // min/person conversion order-store.ts's estimateEtaMinutes uses for
  // the queue portion of an order's ETA, so the two numbers agree.
  const estimatedMinutes = Math.round(queueLength * 1.5);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--sc-graphite)]">{t[labelKey]}</span>
        <span className="text-xs font-bold" style={{ color }}>
          ~{estimatedMinutes} {t.minutes}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--sc-surface-2)]">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${fill * 100}%`, background: color }}
        />
      </div>
    </div>
  );
}
