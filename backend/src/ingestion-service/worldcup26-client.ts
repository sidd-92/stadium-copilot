import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import type { RawMatch } from "./types";

const BASE_URL = process.env.WORLDCUP26_BASE_URL ?? "https://worldcup26.ir";

// Name only, not the value — the JWT itself is registered/authenticated
// out-of-band by a human and its value lives only in Secret Manager.
const JWT_SECRET_NAME = process.env.WORLDCUP26_JWT_SECRET_NAME ?? "worldcup26-jwt-token";

export class RateLimitedError extends Error {
  constructor() {
    super("worldcup26.ir rate limited this request (429)");
    this.name = "RateLimitedError";
  }
}

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

const secretClient = new SecretManagerServiceClient();

// Cached for the container's lifetime — the JWT is valid for 84 days, so
// re-reading Secret Manager on every 15-30s poll would be pure waste.
let cachedToken: string | null = null;

async function getToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  const projectId = await secretClient.getProjectId();
  const name = `projects/${projectId}/secrets/${JWT_SECRET_NAME}/versions/latest`;
  const [version] = await secretClient.accessSecretVersion({ name });
  const payload = version.payload?.data?.toString();

  if (!payload) {
    throw new Error(`Secret Manager returned no payload for ${JWT_SECRET_NAME}`);
  }

  cachedToken = payload;
  return cachedToken;
}

// GET /health needs no auth. Used to tell "API is fully down" apart from
// "my token is bad" or "I'm rate limited" when a poll fails.
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchGames(): Promise<RawMatch[]> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/get/games`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    throw new RateLimitedError();
  }

  if (!res.ok) {
    throw new UpstreamError(`worldcup26.ir GET /get/games returned ${res.status}`);
  }

  const body = (await res.json()) as { games?: RawMatch[] };
  return body.games ?? [];
}

// Test-only: module-level token cache otherwise leaks across test cases.
export function __resetTokenCacheForTests(): void {
  cachedToken = null;
}
