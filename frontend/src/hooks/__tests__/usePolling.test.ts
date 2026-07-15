import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePolling } from "@/hooks/usePolling";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches immediately on mount", async () => {
    const fetcher = vi.fn().mockResolvedValue("first");

    const { result } = renderHook(() => usePolling(fetcher, 1000, []));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("first");
    expect(result.current.loading).toBe(false);
  });

  it("polls again after each interval elapses", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");

    renderHook(() => usePolling(fetcher, 1000, []));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("stops polling and does not update state after unmount", async () => {
    const fetcher = vi.fn().mockResolvedValue("value");

    const { unmount } = renderHook(() => usePolling(fetcher, 1000, []));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // interval was cleared on unmount, so no further fetches happen
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps last-known-good data and surfaces the error when a poll fails", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("ok").mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(() => usePolling(fetcher, 1000, []));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toBe("ok");
    expect(result.current.error).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.data).toBe("ok");
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("network down");
  });
});
