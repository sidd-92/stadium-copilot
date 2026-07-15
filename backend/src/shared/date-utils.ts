// worldcup26.ir's local_date is "MM/DD/YYYY HH:mm" — not directly
// sortable as a string, so parse it into a real Date for ordering.
// Malformed/missing dates sort last rather than throwing.
export function parseLocalDate(localDate: string): number {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(localDate);
  if (!match) return Number.POSITIVE_INFINITY;
  const [, month, day, year, hour, minute] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
}
