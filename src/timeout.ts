/** Error thrown when an operation exceeds its time budget. */
export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

/** `true` if `err` is a {@link TimeoutError}. */
export function isTimeoutError(err: unknown): err is TimeoutError {
  return err instanceof Error && err.name === "TimeoutError";
}

function abortError(signal?: AbortSignal): unknown {
  return signal?.reason ?? new DOMException("This operation was aborted", "AbortError");
}

/** Options for {@link withTimeout}. */
export interface WithTimeoutOptions<T> {
  /** Message for the thrown {@link TimeoutError}. */
  message?: string;
  /** External signal that cancels the operation early. */
  signal?: AbortSignal;
  /** If provided, resolve with this instead of rejecting when the time runs out. */
  fallback?: () => T | Promise<T>;
}

/**
 * Run an operation with a time limit.
 *
 * `input` may be a promise, or a function receiving an `AbortSignal` that fires
 * when the deadline (or an external `signal`) is reached — so cooperative work
 * (`fetch`, etc.) is actually cancelled, not just abandoned.
 *
 * @example
 * ```ts
 * // Function form: the fetch is aborted on timeout.
 * const res = await withTimeout((signal) => fetch(url, { signal }), 5000);
 *
 * // Fallback instead of throwing:
 * const data = await withTimeout(loadFresh(), 800, { fallback: () => cached });
 * ```
 *
 * @param input - A promise, or `(signal) => Promise`.
 * @param ms - Timeout in ms. `Infinity` disables the timeout (abort still works).
 * @throws {TimeoutError} on timeout (unless `fallback` is given); rejects if the
 *   external `signal` aborts.
 */
export function withTimeout<T>(
  input: Promise<T> | ((signal: AbortSignal) => Promise<T> | T),
  ms: number,
  options: WithTimeoutOptions<T> = {},
): Promise<T> {
  const { signal: external, message, fallback } = options;

  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settled = false;

    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    };
    const settle = (action: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      action();
    };

    function onExternalAbort(): void {
      controller.abort(external?.reason);
      settle(() => reject(abortError(external)));
    }

    if (external) {
      if (external.aborted) {
        controller.abort(external.reason);
        return settle(() => reject(abortError(external)));
      }
      external.addEventListener("abort", onExternalAbort, { once: true });
    }

    const onTimeout = (): void => {
      const err = new TimeoutError(message ?? `Operation timed out after ${ms} ms`);
      controller.abort(err);
      if (fallback) {
        Promise.resolve()
          .then(fallback)
          .then(
            (value) => settle(() => resolve(value)),
            (e) => settle(() => reject(e)),
          );
      } else {
        settle(() => reject(err));
      }
    };

    if (Number.isFinite(ms) && ms >= 0) {
      timer = setTimeout(onTimeout, ms);
    }

    let source: Promise<T>;
    if (typeof input === "function") {
      try {
        source = Promise.resolve((input as (s: AbortSignal) => Promise<T> | T)(controller.signal));
      } catch (err) {
        source = Promise.reject(err);
      }
    } else {
      source = Promise.resolve(input);
    }

    source.then(
      (value) => settle(() => resolve(value)),
      (err) => settle(() => reject(err)),
    );
  });
}

/**
 * Create an `AbortSignal` that aborts after `ms` (with a {@link TimeoutError}
 * reason), optionally composed with an external `signal` that aborts it earlier.
 *
 * Like `AbortSignal.timeout`, but composable and with a typed reason. The
 * internal timer is `unref`'d so it never keeps a Node process alive.
 *
 * @example
 * ```ts
 * const res = await fetch(url, { signal: deadline(10_000, userSignal) });
 * ```
 */
export function deadline(ms: number, signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }

  if (Number.isFinite(ms) && ms >= 0) {
    const timer = setTimeout(
      () => controller.abort(new TimeoutError(`Deadline of ${ms} ms exceeded`)),
      ms,
    );
    (timer as { unref?: () => void }).unref?.();
    controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  }

  return controller.signal;
}
