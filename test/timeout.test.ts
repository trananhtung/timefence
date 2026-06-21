import { describe, expect, it, vi } from "vitest";
import { withTimeout, deadline, TimeoutError, isTimeoutError } from "../src/timeout.js";

const delay = (ms: number, value?: unknown) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

describe("withTimeout", () => {
  it("resolves when the operation finishes in time", async () => {
    expect(await withTimeout(delay(5, "ok"), 100)).toBe("ok");
  });

  it("rejects with a TimeoutError when too slow", async () => {
    await expect(withTimeout(delay(100, "late"), 10)).rejects.toBeInstanceOf(TimeoutError);
  });

  it("propagates the operation's own rejection", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 100)).rejects.toThrow("boom");
  });

  it("passes an AbortSignal to the function form and aborts it on timeout", async () => {
    let aborted = false;
    await withTimeout(
      (signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(signal.reason);
          });
        }),
      10,
    ).catch(() => {});
    expect(aborted).toBe(true);
  });

  it("resolves with a fallback instead of throwing on timeout", async () => {
    const out = await withTimeout(delay(100, "slow"), 10, { fallback: () => "cached" });
    expect(out).toBe("cached");
  });

  it("rejects when an external signal aborts", async () => {
    const ac = new AbortController();
    const p = withTimeout(delay(1000), 1000, { signal: ac.signal });
    ac.abort();
    await expect(p).rejects.toBeDefined();
  });

  it("rejects immediately if the external signal is already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    const fn = vi.fn(() => delay(10));
    await expect(withTimeout(fn as never, 100, { signal: ac.signal })).rejects.toBeDefined();
  });

  it("uses a custom message", async () => {
    await expect(withTimeout(delay(100), 10, { message: "too slow!" })).rejects.toThrow("too slow!");
  });

  it("never times out when ms is Infinity", async () => {
    expect(await withTimeout(delay(20, "done"), Infinity)).toBe("done");
  });
});

describe("deadline", () => {
  it("aborts after the given time with a TimeoutError reason", async () => {
    const signal = deadline(10);
    await delay(30);
    expect(signal.aborted).toBe(true);
    expect(isTimeoutError(signal.reason)).toBe(true);
  });

  it("is already aborted when the external signal is aborted", () => {
    const ac = new AbortController();
    ac.abort(new Error("user cancel"));
    const signal = deadline(1000, ac.signal);
    expect(signal.aborted).toBe(true);
  });

  it("aborts early when the external signal aborts", async () => {
    const ac = new AbortController();
    const signal = deadline(1000, ac.signal);
    expect(signal.aborted).toBe(false);
    ac.abort();
    await Promise.resolve();
    expect(signal.aborted).toBe(true);
  });
});

describe("isTimeoutError", () => {
  it("identifies TimeoutError instances", () => {
    expect(isTimeoutError(new TimeoutError())).toBe(true);
    expect(isTimeoutError(new Error("nope"))).toBe(false);
  });
});
