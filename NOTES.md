# Notes

Working notes and known issues. Newest first.

## 2026-10-29

### OAuth review fixes

- Sign-in accepts any non-empty registered redirect URI and defaults to the README's
  `http://localhost:5173/callback`. It is passed to refresh; device authorization still does not redirect.
- Only explicit refresh rejection (HTTP 400/401) clears the session. Network errors, timeouts, rate limits,
  server errors, and malformed success responses preserve stored tokens and show a safe retry message.
- Polling notifications appear only when their state changes; repeated pending or slow-down replies stay quiet.

### OAuth device flow (feature 2, phase A)

- Checked the current official [authentication guide](https://developer.trakt.tv/docs/authentication-oauth),
  [PKCE guide](https://developer.trakt.tv/docs/pkce), and endpoint contracts in
  [trakt/api-help](https://github.com/trakt/api-help/blob/28e57aa64da82139abc4185fda4096adc8352ca3/projects/api/src/contracts/oauth/index.ts)
  (retrieved 2026-10-29, commit `28e57aa64da82139abc4185fda4096adc8352ca3`).
- The current device token schema marks `client_secret` optional and deprecated. No secret is requested, stored,
  or sent. PKCE is documented for authorization-code redirects, with no challenge/verifier fields in the device
  schemas; this implementation retains device flow without inventing a PKCE device extension.
- All OAuth calls now belong on **auth.trakt.tv**, including refresh and revocation; resource calls stay on
  api.trakt.tv. Added the userscript `@connect` permission for the auth host.
- Refresh requires the app's registered `redirect_uri` in the documented schema. The sign-in menu asks for it,
  despite the device flow having no redirect page. Refresh tokens rotate and are single-use: one shared refresh
  promise prevents concurrent calls from consuming the same token twice.
- Device status codes: 400 pending, 404 invalid, 409 already used, 410 expired, 418 denied, 429 slow down. The HTTP
  layer already supports POST bodies; only cancellation and opt-out of automatic retries were needed. Polling
  waits the server interval and adds five seconds on 429, stopping at the server lifetime or cancellation.
- Tokens use GM storage only, never the page's localStorage fallback. Auth errors discard remote bodies and
  original errors, so `debugError` cannot dump credentials. No tokens or secrets are put in URLs or messages.
- Phase A has menu actions only; there is no new route, page fixture, playback badge or progress manager.
  Existing DOM integration tests remain relevant; OAuth tests use mocked GM requests and deterministic timers.
- Real sign-in, actual refresh/revocation against Trakt, and Firefox/Chromium extension behavior remain unverified;
  no user credentials or account were available. API assumptions above were checked against official source docs,
  not a live authenticated exchange.

### Context

- og.trakt.tv launched publicly today and is changing daily. Its source is public at
  [trakt/trakt-og](https://github.com/trakt/trakt-og); check there before building anything.
- og's source now has routes for seasons, a single season, episodes, `/seasons/all` and `/stats` (title, season and
  episode). Confirm each one is live on og.trakt.tv before a feature depends on it.
- Treat disappearing UI as a possible og launch bug first: re-test with the toolkit disabled before changing mount logic.
- Keep selectors semantic (`.summary-frame`, `#overview`, `.top`) and mounting defensive. Never use `svelte-*` hashes.
- The feature plan lives in `PLAN.md`.

### Already in og, do not rebuild

Checked against the trakt-og source:

- Ratings distribution chart: `/movies/:id/stats`, `/shows/:id/stats`, season and episode `/stats`.
- Trailers and videos: `/videos` subpages and og's own `VideoPopup`. The toolkit's trailer player is removed.
- External links to IMDb, TMDb, JustWatch, Wikipedia and socials, and the external ratings strip.
- Profile cover images, lists pages (personal, collaborations, liked, official), the header and search.

### v0.1.4: cleanup

- The panel is **custom links only**: the trailer player, YouTube modal, `getTrailer` and the `youtube-nocookie`
  `@connect` are gone. The feature moved from `features/watch-now/` to `features/custom-links/`, and the panel id is now
  `ogt-custom-links`. The storage key is still `watch.customLinks`, so saved links are kept.
- Fixed the panel's mount handle. It returned a bare function, but the feature host expects `{ node, destroy }`. The
  host never saw the node and never removed the panel on navigation. In the test harness the old handle hung and memory
  climbed to ~450 MB in 8 s; the fixed code finishes in ~3 s at ~105 MB. A test now covers leaving a title page.
- Removed unused helpers (`waitFor`, `on`, `isInternalHref`, `hasPlaceholder`, `youtubeId`, `isTitlePage`,
  `isAuthError`, `EXAMPLE_LINKS`) and unused CSS (modal, duplicate `.ogt-hint`).
- The `build.mjs` header now reads name, version and `@match` hosts from `src/meta.js`. Do not change `@namespace`:
  userscript managers use it to identify the script, and a new one installs a second copy.
- 24 tests pass (`npm test`).

### Hydration gate (kept)

`src/core/hydration.js` stays. It fixes the real v0.1.2 problem: mounting before SvelteKit hydrates causes
`hydration_mismatch` and Svelte drops server-rendered blocks. That reproduces in Chromium too.

1. Read `node_ids` from SvelteKit's inline bootstrap script (`kit.start(..., { node_ids: [...] })`).
2. Wait for the matching `/_app/immutable/nodes/<id>.*.js` resources (`PerformanceObserver` + resource timing).
3. Wait for SvelteKit `nodes/` + `chunks/` activity to go quiet (300 ms), then settle (600 ms).
4. Fall back to a 1.5 s settle when the ids cannot be read; hard cap at 15 s.

A `PerformanceObserver` started at document-start keeps its own map of module entries, so Firefox's 250-entry
resource-timing buffer cannot evict them. Nothing touches og's DOM before `initial mount after hydration` is logged.
The gate only applies to the first page load; client-side navigation has no hydration.

### og Gecko bug: the ratings strip disappears

The disappearing ratings strip is og's own `RatingsStrip` component. It reproduces with the toolkit disabled on
Zen/Firefox and works on Brave/Chromium, so it is an og bug. Do not change the toolkit's mount logic for it. If you need
to confirm, check for a second installed copy of the script first, then A/B test with the toolkit disabled.

### Dev environment

Use Violentmonkey's **Track external edits** rather than the Tampermonkey update-URL loop:

1. `npm run dev` starts the esbuild watcher and serves `dist/` on `http://localhost:8787`.
2. Open `http://localhost:8787/trakt-og-toolkit.user.js` in Violentmonkey and click **Track external edits**
   (enable **Reload tab** too).
3. Keep the installer tab open; every rebuild is picked up and the og tab reloads.
4. Use `PORT=8788 npm run dev` if 8787 is taken.

No version bump and no manual "check for updates". Disable the Tampermonkey copy while doing this so only one panel
mounts. Keep Tampermonkey for release smoke tests.

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
