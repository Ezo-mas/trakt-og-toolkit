# Notes

Working notes and known issues. Newest first.

## 2026-10-31: personal ratings (features 7 and 8)

- Later verification: Playwright browser access became available. The built bundle passed a real Chromium DOM
  smoke check on locally served OG fixtures with mocked GM/API responses: three personal dots, 6.0 average,
  four on-demand episode-stat requests, Less hiding counts, sign-out removing personal points, and the show-wide
  average plus season badge. npm test and npm run build passed again. Live og.trakt.tv still returned
  Cloudflare HTTP 403, so real-account and userscript-manager verification remain pending.


- Checked live signed-out Breaking Bad show, seasons overview and season-1 HTML (saved with curl), plus trakt-og
  `4bdefaf4e` under `projects/client/src`: `SeasonPage.svelte`, `ShowPage.svelte`, `ShowSeasonsPage.svelte`,
  `SeasonsGrid.svelte`, and the show/season routes. Neither personal episode-rating lines nor episode-derived
  personal season/show averages are rendered there. `git log -S'Your average'` across the client and
  `git log -S'average'` / `-S'chart'` in the show components found no implementation.
- OG's direct season-rating corner (`userRating={state.rating}`) dates to import `233a9354e`;
  it is a season rating, not an average of episode ratings. We leave it to OG and do not fetch season ratings.
- `/sync/ratings/episodes` is shared by both features, deduplicated in flight and cached in memory for ten minutes.
  Auth events invalidate it and reject old in-flight results. Slugs resolve to the response's numeric show ID;
  episode identity includes show, season and number. The season episode endpoint itself does not return a parent
  show ID, despite the original plan's assumption.
- Community chart bars stay in place. Personal ratings use a blue line with gaps and accessible episode links;
  the ratings scale extends below 50% when needed. Count series use a separate right axis and fetch only on More,
  through apiGet's shared queue, skipping seasons over 30 episodes. Averages require two ratings and show counts.
- Fresh live captures were trimmed into `LIVE_RATINGS_SEASON_HTML` and `LIVE_RATINGS_SHOW_HTML` in fixtures.js.
  Built-bundle tests cover both, navigation/cache sharing, private late results after sign-out, and the More limit.
- Browser inventory returned “browser access host is unavailable”. Live signed-in behavior, real authenticated
  ratings responses, and Firefox/Chromium userscript-manager rendering could not be verified in this session.
  Happy-dom bundle checks are not claimed as live browser verification.

## v0.2.0 (2026-10-30)

- Added a daily live markup and bundle-mount drift check; the signed-in playback overview cannot be checked.

Release of everything since v0.1.4: season chart, OAuth device sign-in, paused-playback badges and manager, custom
link presets and inline editor, and Forvo pronunciation on person pages. Metadata links and poster rating corners were
dropped because og ships them. Tested in Chromium and Zen (Firefox); playback verified on a real account.

## 2026-10-30

### Check og before building anything (it ships daily)

Several planned features turned out to be in og already, some added days before launch. Before planning or briefing a
feature, check all three, not just one:

1. **Live pages** (`curl` with a browser `User-Agent`): is the thing visible, is it a link, is it hidden when empty?
2. **trakt-og source, full history**: `git clone https://github.com/trakt/trakt-og` (not `--depth 1`), then
   `git log -S'<symbol>'` to see when and why something appeared. Features were often VIP-gated first
   (`isVip ? … : undefined`) and opened later.
3. **Signed-in-only UI**: profile boxes and dashboard panels pick or hide themselves based on your data, so "I can't see
   it" may just mean no recent activity.

Found this way (2026-10-30, trakt-og `27d7dbc`): metadata links (opened to everyone in `6337c09`, 2026-10-26), poster
rating corners (`CornerRating`, since the first import), MyAnimeList ratings and links on anime (`a297089`), the
dashboard Last 30 Days panel (`LastThirtyDaysPanel`, hidden with no plays in 30 days or when a grandfathered VIP hid
stats), the profile watch-time box (one of ~11 boxes; og shows the best-scoring 4), and the dashboard month strip
(`RecapRibbon`, `nav.ribbon`; past months link to Month in Review on trakt.tv).

### Season chart: full width, then bars

- The chart draws at the panel's real width (180px tall, text and marks unscaled) and redraws on resize.
  **ResizeObserver on an `<svg>` reports its drawing's bounding box, not its layout box**, so it never fires when the
  panel widens. Observe a wrapper `div` instead.
- It is now a bar chart: one slot per episode, bars ≤ 24px with a 4px rounded top, square at the fixed 50% floor.
  Colour is og's own `var(--rating-N)` with `N = clamp(trunc(percent / 10), 1, 10)`, the same rule as og's hearts
  (`QuickIcons.svelte`). og's 7–9 reds are close (`#9e2424`, `#a81918`, `#b11010`), so most bars in a typical season
  look alike; only big drops change colour. Labels only on best and worst, with a halo over the average line.

### Playback overview placement

og's progress page has a black page background; `section.progress` is full width (grey, from og's logged-in layout,
not from the section's own CSS) with og's `Container` column inside. Mounting before the section left our panel on a
black band. It now goes **inside** `section.progress` as its first child, in a column using og's global
`--container-sm/md/lg` (740/960/1160px) and `--gutter` variables, so it shares og's background and lines up with
og's list.

### og hides its library button for titles not in your library

Deliberate in og: trakt-og `1cd3142` (2026-10-26) with `LIBRARY_ADDING = false` in
`components/collection/libraryAdding.ts`. og's library only shows what Plex and Jellyfin sync, so it offers no add
control; the button appears only for items already in the library (to remove them or edit metadata), and never when
signed out. The toolkit's **Add to library** fills that gap and hides itself whenever og shows its own control. If og
flips the flag back, og's "Add to library" button appears and the toolkit's hides itself.

### Testing without an og login

- **Local preview of a real page:** save the page with `curl`, strip `<script>` and `modulepreload` links, add
  `<base href="https://og.trakt.tv/">`, inline `dist/trakt-og-toolkit.user.js`, and serve it from `localhost`. The
  hydration gate falls back to its settle timer. For a signed-in feature, define `GM_getValue` with a fake token and a
  `GM_xmlhttpRequest` stub before the bundle.
- **Playwright** can't reach og.trakt.tv, so pages come out unstyled: download og's `_app/immutable/assets/*.css`
  next to the preview and rewrite `../../_app/` to `/_app/`. Element screenshots then match og.
- **The Claude desktop browser pane** renders no frames while it's hidden, so ResizeObserver and
  `requestAnimationFrame` never fire there until a screenshot is taken.
- **Real-account playback without a syncing app:** sign in a throwaway Node session through the toolkit's own
  `signIn` (the account owner approves the device code), then `POST /scrobble/start` + `POST /scrobble/pause` at a
  progress like 35%. That creates a paused entry without marking anything watched; never call `/scrobble/stop`. Node
  requests to Trakt need a `User-Agent`, or Cloudflare returns 403. Revoke the script's token afterwards.
- `npm run drift` can't check signed-in pages (`/users/:id/progress`, the dashboard); verify those on a real account.

### Pronunciation via Forvo (feature 5)

- Forvo's search page embeds recording paths as base64 in `onclick="Play(id,'<mp3>','<ogg>',…)"`. Decoding yields
  paths like `9574522/39/9574522_39_4307585.mp3`; the page's inline `_AUDIO_HTTP_HOST` (here `audio12.forvo.com`)
  supplies the origin. Normal MP3/OGG files live under `/mp3/` and `/ogg/`. The high-quality paths
  `/audios/mp3/` and `/audios/ogg/` are only used when the normal file is absent; that pattern is unverified.
- The lookup runs on the first click, not on mount, and uses `GM_xmlhttpRequest` (`@connect forvo.com`). Parsed
  results are cached in memory for 10 minutes, up to 20 names. Recordings are kept only when the `Play(...)` word
  matches the person's name (case and whitespace are ignored), and the first match is played.
- If a recording's audio fails, the next cached recording is tried before showing `Audio unavailable.`; later clicks
  toggle pause. A Forvo search link is shown when lookup fails, nothing matches or every recording fails.
- curl to Forvo's search returned Cloudflare 403 in this environment, while an audio HEAD returned 200. Parsing was
  tested against a trimmed fixture; live in-browser playback in a userscript manager is still unverified.

## 2026-10-29

### Custom link preset URL checks (feature 4)

- MyAnimeList's older `/anime.php?q=` search URL returned 404 with a browser-like user agent. The preset uses the current
  `/search/all?q=` route instead; it searches across MAL categories, so anime results may appear alongside other types.
- The other preset search URLs returned HTTP 200 when checked with a browser-like user agent. AniList and MyAnimeList
  are offered for both page kinds because og does not reliably identify anime.
- Dropped Letterboxd, Rotten Tomatoes and Wikipedia presets: og's title pages already link all three (checked on
  movies, shows and two anime titles). Metacritic stays: og shows its score but doesn't link to it.
- Dropped the MyAnimeList preset on 2026-10-30: trakt-og `a297089` (2026-10-29) shows a MAL rating on anime that
  links straight to the MAL entry, which beats a search link.
- Stremio's official web source defines `/search` and reads the `search` query parameter. Plex's hash search route
  matches a Plex URL example, but curl only checks the hosted app shell for Stremio and Plex because it does not send
  URL fragments. Neither route had a browser click-through check in this environment.

### OAuth live check (2026-10-29, real account)

- Passed against Trakt: device sign-in, `/users/me`, forced refresh (both tokens rotate, 7-day expiry), the old
  refresh token is rejected with 400 after use, and a bad access token refreshes once and retries.
- Revocation works but is not instant: after `POST /oauth/revoke` returns 200, the access token keeps working
  for 30–60 s (cached on Trakt's side). Don't treat a still-working token right after sign-out as a failed revoke.
- Cloudflare in front of Trakt returns 403 to Node's default user agent. Browsers are fine; scripts and tests
  that hit the real API must send a `User-Agent`.

### Playback manager (feature 2, phase B)

- Checked official [sync endpoint contracts](https://github.com/trakt/api-help/blob/28e57aa64da82139abc4185fda4096adc8352ca3/projects/api/src/contracts/sync/index.ts)
  and playback response schemas at `28e57aa64da82139abc4185fda4096adc8352ca3` on 2026-10-29.
  GET `/sync/playback/movies` returns `{ id, progress, paused_at, type, movie }`; episodes return
  `{ id, progress, paused_at, type, episode, show }`. The top-level ID is the playback ID, not the media ID.
  DELETE `/sync/playback/:id` returns 204; invalid IDs return 404. Progress is already a 0–100 percentage.
- Pagination is opt-in: omitting page/limit returns the entire set. This lets both lists load in just two calls.
  Posters require `extended=images`; images are string arrays, may omit the HTTPS scheme, and episode entries
  use the parent show's poster. Missing images get a placeholder; only HTTPS media.trakt.tv images are displayed.
- `apiAuth` previously rejected all query strings. It still rejects raw query strings, but now has a fourth
  options argument accepting only `{ extended: 'images' }` on GET. Credentials remain in headers, never URLs.
- Placement checked against [trakt-og](https://github.com/trakt/trakt-og/tree/3bc2aae65d1a17d5c57360706b3f6745fcd10319)
  routes `movies/[id]`, `shows/[id]/seasons/[season]/episodes/[episode]`, and
  `users/[id]/progress/[[type=progressType]]/[...sort]`. ProgressList renders `section.progress` and Watching,
  Rewatching and Dropped tabs; ProgressPage reads watched/up-next progress, not paused playback. Its loader allows
  only the og user's own progress page. The new section sits immediately above that list, with an explicit toolkit
  account label because og and toolkit may be signed in to different Trakt accounts. Its Load button fetches on demand.
  Badges go after `.summary-frame #overview .top`, through the existing hydration-gated feature host.
- Playback cache/deduplication is memory-only for 60 seconds, independent of the public GET cache. Auth-change
  events discard private cached/in-flight results, remove signed-out UI, and stop queued deletes after a session
  change. Deletes confirm the deduplicated item count, run at most four authenticated requests concurrently through
  the shared HTTP queue, invalidate cached data, report partial failures and reload the list.
- Network policy denied live requests to og.trakt.tv (movie, episode and progress attempts returned 403). No new
  live HTML could be captured. Movie integration tests reuse the existing trimmed markup; new episode and progress
  fixtures are explicitly source-derived mirrors of EpisodePage/SummaryFrame/ProgressList at the og commit above.
  They are not claimed as live captures. Real account fetches/deletes and live Firefox/Chromium extension testing
  remain unverified. A local headless Chromium check with mocked account data passed overview rendering, confirmed
  age-based deletion and list refresh; this does not establish live userscript-manager compatibility. No scrobble/pause
  requests or manual progress setting were implemented.
- Later the same day: anchors checked against live og (`#overview .top` on movie and episode pages) and og's source
  (`section.progress` in `ProgressList.svelte`; the progress page needs an og login). Real-account check in
  Violentmonkey passed: a test entry made with `POST /scrobble/start` + `/scrobble/pause` (35%, no watch recorded)
  showed as a badge and in the overview, and clearing it deleted it on Trakt. Without a syncing app, that
  start+pause pair is the easiest way to create test playback.

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
- Added 2026-10-30: metadata links on title pages, your rating in poster corners, MyAnimeList ratings on anime, the
  dashboard Last 30 Days panel and profile watch-time box. See "Check og before building anything" above.

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
