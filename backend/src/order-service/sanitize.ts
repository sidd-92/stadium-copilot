// Menu browsing has no auth (fans hit it straight off a QR code), and its
// query params flow into Gemini prompts. Treat every param as hostile:
// strip anything outside a small allow-listed character set and cap
// length before it's used for filtering or reaches a prompt.
const ALLOWED_CHARS = /[^a-z0-9,\- ]/gi;
const MAX_LEN = 200;

export function sanitizeUserInput(raw: string | undefined): string {
  if (!raw) return "";
  return raw.replace(ALLOWED_CHARS, "").slice(0, MAX_LEN).trim();
}

export function parseDietaryTags(raw: string | undefined): string[] {
  const cleaned = sanitizeUserInput(raw);
  if (!cleaned) return [];
  return cleaned
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
}
