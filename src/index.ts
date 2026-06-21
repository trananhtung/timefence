/**
 * timefence — put a time limit on any promise, with real AbortSignal cancellation
 * and a composable deadline signal. Zero dependencies.
 *
 * @packageDocumentation
 */

export {
  withTimeout,
  deadline,
  TimeoutError,
  isTimeoutError,
  type WithTimeoutOptions,
} from "./timeout.js";
