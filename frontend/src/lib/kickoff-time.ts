// worldcup26.ir's "local_date" field is misleadingly named: despite the
// name, it is NOT the stadium's local time, and it is NOT the viewer's
// local time either. Cross-referencing the API's own published source
// data (github.com/rezarahiminia/worldcup2026 — comparing local_date
// against the raw UTC timestamp stored internally) shows a consistent
// exact 3h30m offset: local_date is Iran Standard Time (UTC+3:30, no
// DST), the API developer's own timezone, applied uniformly regardless
// of who's asking or which stadium is playing. The API never exposes a
// real UTC timestamp over HTTP — only local_date and persian_date — so
// we reconstruct true UTC here using that fixed, verified offset, then
// let the browser render it in whichever timezone the viewer's device
// is actually set to.
const IRAN_OFFSET_MINUTES = 3 * 60 + 30;

export function parseWorldcup26LocalDate(localDate: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(localDate);
  if (!match) return null;
  const [, month, day, year, hour, minute] = match;
  const asIfUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return new Date(asIfUtc - IRAN_OFFSET_MINUTES * 60_000);
}

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-BR",
};

// Renders in the viewer's own device timezone (Intl uses the runtime's
// local timezone whenever `timeZone` is omitted).
export function formatKickoffLocal(localDate: string, language: string): string {
  const date = parseWorldcup26LocalDate(localDate);
  if (!date) return localDate;
  return date.toLocaleString(LOCALE_MAP[language] ?? "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
