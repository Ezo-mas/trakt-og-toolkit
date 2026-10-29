# Notes

Working notes and known issues. Newest first.

## 2026-10-29

### Context

- og.trakt.tv launched publicly today. Routes are still missing and the app is changing daily.
- Treat disappearing UI and hydration errors as possible og launch bugs first: re-test with the toolkit disabled before
  changing our mount logic.
- Keep selectors semantic and mounting defensive. Do not build features on routes og has not shipped yet; revisit
  season/episode/chart pages once the routes settle.

### Verified

- v0.1.1 trailer works in the real browser (Tampermonkey + user's client ID).
- Episode pickers now get real counts from `/shows/:id/seasons?extended=full`.
- 21 tests passing (`npm test`).

### Fixed in v0.1.2 (needs a logged-in retest): og UI disappears after load

On a movie page (observed on *The Dog Stars*, 2026), these og elements render during load and then vanish:

- the `WATCH NOW / 0 services` overlay on the poster,
- the purple `ADD TO HISTORY` button,
- the blue `LISTED ON / Watchlist` button (the library button).

`CHECK IN` stayed, and the console showed Svelte's `hydration_mismatch`.

Reproduced in Brave/Chromium (Playwright, logged out):

- Without the toolkit: no `hydration_mismatch`.
- With the toolkit: the panel was inserted at ~700 ms, long before SvelteKit hydrated (~1.9 s), and the mismatch appeared.
- Delaying the first mount to `load` + 750 ms on SvelteKit pages removed the mismatch, and the panel still mounted.

Changes:

- `whenHeadReady()` waits for `<head>` before booting. A real `document-start` injection (Brave) was throwing at
  `injectStyles()` because neither `<head>` nor `<html>` existed yet; the whole script aborted.
- The feature host opens only after `load` + 750 ms on SvelteKit pages, so nothing is inserted into the tree while
  Svelte is hydrating. Non-Svelte pages (and the happy-dom tests) still mount immediately.

Still to verify on Zen/Firefox with a logged-in session: whether `WATCH NOW`, `ADD TO HISTORY` and `LISTED ON` survive
now. If they still vanish without the toolkit, it is an og launch bug.

Do not chase the `Security Error: ... may not load or link to file:///` message: the bundle has no `file:` references,
and the error points at og's inline script (`injectedScript` line 290/369).

### Dev environment

Use Violentmonkey's **Track external edits** rather than the Tampermonkey update-URL loop:

1. `npm run dev` starts the esbuild watcher and serves `dist/` on `http://localhost:8787`.
2. Open `http://localhost:8787/trakt-og-toolkit.user.js` in Violentmonkey and click **Track external edits**
   (enable **Reload tab** too).
3. Keep the installer tab open; every rebuild is picked up and the og tab reloads.
4. Use `PORT=8788 npm run dev` if 8787 is taken.

No version bump and no manual "check for updates". Disable the Tampermonkey copy while doing this so only one panel
mounts. Keep Tampermonkey for release smoke tests.

### Later

- Season, episode and chart pages do not mount yet (by design; only `route.name === 'title'` matches).
- Playback progress, average ratings and the season chart are still on the roadmap.
