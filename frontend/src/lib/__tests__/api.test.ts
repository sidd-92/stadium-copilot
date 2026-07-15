import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getMatch, getMenu, getStandOrders } from "@/lib/api";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws ApiError with the status and message from a non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { error: "stand offline" }));

    await expect(getStandOrders("stand-1")).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      message: "stand offline",
    });

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { error: "stand offline" }));
    await expect(getStandOrders("stand-1")).rejects.toBeInstanceOf(ApiError);
  });

  it("falls back to statusText when the error body has no error field or isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expect(getStandOrders("stand-1")).rejects.toMatchObject({
      status: 503,
      message: "Service Unavailable",
    });
  });

  it("getMatch returns null on a 404 instead of throwing, per its documented behavior", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(404, { error: "not found" }));

    const result = await getMatch("match-1");

    expect(result).toBeNull();
  });

  it("getMatch rethrows for non-404 errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(500, { error: "boom" }));

    await expect(getMatch("match-1")).rejects.toBeInstanceOf(ApiError);
  });

  it("getMatch resolves with the match on success", async () => {
    const match = { match_id: "match-1" };
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, match));

    const result = await getMatch("match-1");

    expect(result).toEqual(match);
  });

  it("getMenu builds a URL with no query params when none are given", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { menu: [] }));

    await getMenu("stand-1");

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://localhost:8080/menu/stand-1");
  });

  it("getMenu builds a URL with dietary and language query params", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { menu: [] }));

    await getMenu("stand-1", { dietary: ["vegan", "gluten_free"], language: "fr" });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://localhost:8080/menu/stand-1?dietary=vegan%2Cgluten_free&language=fr");
  });

  it("getMenu encodes the stand id in the path", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { menu: [] }));

    await getMenu("stand/with slash");

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("http://localhost:8080/menu/stand%2Fwith%20slash");
  });
});
