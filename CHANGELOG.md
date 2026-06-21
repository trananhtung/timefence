# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-21

### Added

- `withTimeout` — time-limit a promise or `(signal) => Promise`; aborts the signal
  on timeout for real cancellation, supports an external `signal`, a custom
  `message`, and a `fallback` to resolve instead of throwing. `Infinity` disables
  the timer.
- `deadline(ms, signal?)` — a composable `AbortSignal` that trips after `ms` (with
  a `TimeoutError` reason) or when the external signal aborts; timer is `unref`'d.
- `TimeoutError` and `isTimeoutError`.
- ESM + CJS builds, types, and CI across Node 18 / 20 / 22.
