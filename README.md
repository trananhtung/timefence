# timefence

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)

> Put a **time limit** on any promise — with real **`AbortSignal` cancellation** and a composable **deadline** signal. **Zero dependencies**.

[![CI](https://github.com/trananhtung/timefence/actions/workflows/ci.yml/badge.svg)](https://github.com/trananhtung/timefence/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/timefence.svg)](https://www.npmjs.com/package/timefence)
[![bundle size](https://img.shields.io/bundlephobia/minzip/timefence)](https://bundlephobia.com/package/timefence)
[![types](https://img.shields.io/npm/types/timefence.svg)](https://www.npmjs.com/package/timefence)
[![license](https://img.shields.io/npm/l/timefence.svg)](./LICENSE)

`Promise.race([op, timer])` "times out" — but the slow operation keeps running in
the background, holding a socket open and burning quota. `timefence` gives the
operation an `AbortSignal` that fires on timeout, so the underlying `fetch` (or any
cooperative work) is actually **cancelled**, not just ignored.

```ts
import { withTimeout } from "timefence";

// On timeout, the fetch is aborted — not left dangling.
const res = await withTimeout((signal) => fetch(url, { signal }), 5000);
```

## Why timefence?

- **Real cancellation.** The function form receives an `AbortSignal` that fires on
  timeout *or* when your own `signal` aborts — wire it to `fetch`/streams.
- **Fallback or throw.** Reject with a typed `TimeoutError`, or resolve with a
  `fallback` value when you'd rather degrade than fail.
- **Composable deadlines.** `deadline(ms, signal?)` returns an `AbortSignal` that
  trips after `ms` (or earlier if your signal aborts) — like `AbortSignal.timeout`
  but composable, with an `unref`'d timer so it won't keep Node alive.
- **Zero dependencies**, ESM + CJS + types.

## Install

```bash
npm install timefence
# or: pnpm add timefence  /  yarn add timefence  /  bun add timefence
```

## API

### `withTimeout(input, ms, options?) → Promise<T>`

`input` is a promise, or `(signal) => Promise` (preferred — enables cancellation).

```ts
await withTimeout(slowPromise, 1000);                         // throws TimeoutError
await withTimeout((s) => fetch(url, { signal: s }), 1000);     // aborts the fetch
await withTimeout(loadFresh(), 800, { fallback: () => cached });
```

| Option     | Type                    | Default | Description                                          |
| ---------- | ----------------------- | ------- | ---------------------------------------------------- |
| `message`  | `string`                | —       | Message for the thrown `TimeoutError`.               |
| `signal`   | `AbortSignal`           | —       | Cancel early from outside (rejects with its reason). |
| `fallback` | `() => T \| Promise<T>` | —       | Resolve with this on timeout instead of throwing.    |

`ms = Infinity` disables the timeout while still honoring `signal`.

### `deadline(ms, signal?) → AbortSignal`

```ts
const signal = deadline(10_000, userSignal);
await fetch(url, { signal });          // aborts after 10s, or when userSignal does
```

### `TimeoutError` / `isTimeoutError(err)`

```ts
try {
  await withTimeout(op, 1000);
} catch (err) {
  if (isTimeoutError(err)) retryOrDegrade();
  else throw err;
}
```

## Pairs well with

- [`retryfn`](https://www.npmjs.com/package/retryfn) — retry an operation that timed out.
- [`runpool`](https://www.npmjs.com/package/runpool) / [`ratebucket`](https://www.npmjs.com/package/ratebucket) — bound concurrency and rate; `timefence` bounds *time*.

## Contributors ✨

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind are welcome — code, docs, bug reports, ideas, reviews! See the [emoji key](https://allcontributors.org/docs/en/emoji-key) for how each contribution is recognized, and open a PR or issue to get involved.

Thanks goes to these wonderful people:

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/trananhtung"><img src="https://avatars.githubusercontent.com/u/30992229?v=4?s=100" width="100px;" alt="Tung Tran"/><br /><sub><b>Tung Tran</b></sub></a><br /><a href="https://github.com/trananhtung/timefence/commits?author=trananhtung" title="Code">💻</a> <a href="#maintenance-trananhtung" title="Maintenance">🚧</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

[MIT](./LICENSE) © Tung Tran
