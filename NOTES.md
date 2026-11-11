# Notes

Working notes and known issues. Newest first.

## 2026-11-11: menu toggle state (feature 37)

- Feature toggles and debug logging read `✅ <feature>` or `⬜ <feature>` in the userscript menu instead of
  `Toggle <feature>`. After a click, every toggle is unregistered and registered again so the labels follow the
  state; they are the last menu entries, so their order holds. Debug logging moved from the middle of the menu into
  that group.
- This needs `GM_unregisterMenuCommand` (granted in the header). A manager without it keeps the plain `Toggle <feature>` labels
  rather than gaining duplicates. Violentmonkey builds that return no command id unregister by caption, so the caption
  is the fallback id. Changes from another tab (`features.disabled`, `debug`) relabel this tab's menu too.
- The menu closes after a click as before; reopening it shows the new state.

## 2026-11-11: CSV export (feature 34)

- Live og (2026-11-11, trakt-og `d320877`): personal, collaboration and liked list pages use
  `/users/:id/lists/:slug`; collaboration and liked links point at the list owner, so that path is also the API owner
  path. Liked official lists use `/lists/official/:slug`; their items endpoints take a numeric Trakt list id, so the
  exporter first reads `/lists/:slug` and, if it is missing or resolves to a personal list sharing the slug, searches
  `/search/list` for the official list. `parseRoute` names the three shapes `list` and `official-list` (comments and
  smart-list details stay `other`). They share the watchlist's `section.title-row .title-bar .actions` mount point,
  before `.share`.
- List items come from `/users/:id/lists/:slug/items`; official lists from `/lists/:id/items` after that resolution;
  the watchlist uses `/users/:id/watchlist`. All send 100 per page and return
  `{ type, movie|show|season|episode|person, show?, rank, listed_at, notes }`. Both transports read
  `x-pagination-page-count`; public item reads bypass the shared cache and keep the header. Once a count is known it
  carries across pages and bounds batches of up to four requests. Without a count, reads proceed one at a time until
  a short page. A required page with a malformed payload fails the export. Without a count, the exporter checks one
  item past the 20,000-item limit to distinguish a full export from an oversized list. The page filter does not
  affect the export.
- CSV columns are rank, type, title, year, season, episode, Trakt/IMDb/TMDb ids, listed date and notes. Movies and
  shows use their own title/year. Seasons use the show title with the season number. Episodes include both the show
  and episode title, with season and episode numbers. The UTF-8 file starts with a byte-order mark for Excel. Fields
  are quoted per RFC 4180 with CRLF rows, and formula markers (`=`, `+`, `-`, `@`
  and their full-width forms) get a leading apostrophe, including after leading whitespace or control characters, so
  spreadsheets do not evaluate them. The browser keeps the download's Blob URL alive for a minute after the click.
- The exporter and the watchlist picker share `readPages` in `src/core/pages.js`: page 1 alone, then batches of four
  once a page count is known, one at a time to a short page without one, and a one-item check past the cap. An empty
  page fails the read when Trakt counts several pages. The exporter passes `stopAtLimit` and fails on an oversized
  list; the picker reads up to its cap and shows a note. Public picker reads now also ask `apiGet` for the page count.
- Fixture `LIST_PAGE_HTML` mirrors the live list title bar. Tests cover normalization for all item kinds, quoting and
  formula guards including leading controls and full-width markers, filenames, both paging paths, fresh repeat
  exports, header-led short pages, cap errors, personal and watchlist downloads, official summary/id resolution,
  same-slug personal-list avoidance, empty lists, private/missing/expired credentials, navigation during a read and
  teardown. Drift checks the list actions and bundle mount/toggle on the live personal and official list pages.

## 2026-11-11: auto-update URLs (feature 32)

- The built header carries `@homepageURL`, `@supportURL`, `@downloadURL` for `dist/trakt-og-toolkit.user.js` on
  `main`, and `@updateURL` for `dist/trakt-og-toolkit.meta.js`, a header-only copy the build writes so update checks
  don't fetch the whole bundle. All four are built from `REPO` and `DIR` in `src/meta.js`. A manager only learns these from an installed header that already has them.
  A copy installed from the raw link before this change still tracks that same URL, so the bumped release reaches
  it and its header teaches the copy the URLs. Copies from a saved file need one reinstall; after that they follow
  `@version`.
- `test/userscript-header.test.js` reads the committed bundle and `.meta.js`, so it fails when the header was
  changed without `npm run build`. Version bumps still happen at release, when `src/meta.js` and `dist/` are rebuilt together.

## 2026-11-11: random watchlist pick (feature 33)

- Live og (2026-11-11, trakt-og `d320877`): the watchlist filter is `?display=movie|show|season|episode` on
  `/users/:id/watchlist`; `/watchlist/movies` and the other type paths answer 301 to the bare page. The picker reads
  `display` when a pick starts, so og's in-place filter changes need no remount.
- The stable insertion point is `section.title-row .title-bar .actions`, before og's `.share` control. The list's
  heading is `h2#list-title` and the filters sit in a separate section above it.
- API entries are `{ type, movie|show|season|episode, show? }`. Seasons wrap `{ number, ids }` and episodes
  `{ title, season, number }`; both link through `show.ids.slug`. Reads use `/users/:id/watchlist[/movies|shows|
  seasons|episodes]` with 100 per page. Page 1 is read alone; once Trakt sends a page count, the rest are read four at
  a time, and without one, pages are read one by one until a short one. An empty signed-in body or 204 counts as an
  empty page. The picker shows a note when the 50-page read limit bounds the candidate pool; a list with no page count
  whose 50 pages are all full gets one more one-entry read to check whether anything is past the limit.
  og's session or the toolkit sign-in is used for private profiles; without either the button shows a one-line hint.
- The picker checks the media filter again after each list read; if it changed, it reads for the current filter. A read
  that fails after the filter changed asks to try again instead of clearing silently.
  Same-path query changes reported by the router clear a pick or status message from the previous filter. Loaded
  entries are kept for five minutes so **Pick again** does not repeat the whole list fetch.
- An expired og session gets og's reload message; missing credentials, private lists and 404s keep their one-line
  hints. Results carry the full label in `title` and announce the pick through a visually hidden live region.
- Fixture `WATCHLIST_PAGE_HTML` is the live `/users/justin/watchlist` (323 items) trimmed to the filter links, title
  bar and items section. Tests cover normalization, filter mapping, mid-read and post-pick filter changes, seasons and
  episodes, empty lists, expired og sessions, both paging paths, repeat avoidance, private-list hints and teardown.
  The watched-title filter remains out of scope.
- Public watchlist reads pass `{ ttl: 0 }` so the picker's five-minute cache controls freshness. Rerolls sample
  evenly among the remaining entries and can repeat a lone candidate.

## v0.4.0 (2026-11-10)

Release of everything since v0.3.0, so userscript managers offer the update:

- **No API setup when signed into og.trakt.tv:** watchlist, library, playback, ratings, All lists and month review use
  og's own session (30). The toolkit's own app sign-in still works and wins while it is signed in. Account changes in
  og or in another tab rebuild the toolkit's personal features; an expired og session asks for a reload.
- **Custom links:** shown below the poster with service logos and inside Watch Now (26); presets open the exact title,
  season or episode (22, 24), with per-user server presets (25), direct links resolved from external ids (27), and
  genre-conditional presets plus links on person pages (28).
- **Trakt ratings chart** in the empty space of the summary (31).
- **Playback:** set saved progress (9). **Month review:** browse earlier months (21).
- **Watchlist** shortcuts and **Watchlist all** on a person's credits (17); **Undo** on success notices (19).
- **List previews** link posters to their titles (10). og-styled dialogs replace the browser's.
- **Features can be turned on and off** from the menu (20).
- Writes share one rate-limited queue that follows Trakt's limits (29). Test suite review (23) and wider
  `npm run drift` coverage (18), now with signed-in page checks via `--signed-in <dir>`.
- Removed the `site/` OAuth callback page and its GitHub Pages workflow: Trakt won't grant the production app it was
  for, so browser (PKCE) sign-in is not coming.

The user verified the og-session features, expiry, sign-out, account switching and cross-tab changes on real accounts
in Zen with Violentmonkey.

## 2026-11-09: og's session instead of a production app (feature 30)

- Trakt's answer was that the toolkit may use og's existing session; no production app is available. Authenticated
  calls now use og's access token with og's Client ID when the toolkit has no sign-in of its own. The toolkit's
  per-user app and device sign-in stay as the fallback and take priority when connected.
- Live og (2026-11-09): `lib/auth/userManager.ts` creates oidc-client-ts with `authority: https://auth.trakt.tv`,
  the public client ID `WfAlMngFsnQNotPX9sfCtKX_8ml3Ga9Nwmiqcu4_hRI`, `automaticSilentRenew: false` and
  `userStore: WebStorageStateStore({ store: localStorage })`. Its `_userStoreKey` is
  `user:${authority}:${client_id}` and the store prefix is `oidc.`, so the entry is
  `oidc.user:https://auth.trakt.tv:<client_id>`. The value carries the access token, refresh token, profile and
  `expires_at` (seconds).
- `src/core/og-session.js` reads only the entry for the pinned `OG_SESSION_CLIENT_ID` on every call, returns
  `{ clientId, accessToken, expiresAt, accountKey }` and writes nothing. A leftover entry for an older client is
  ignored even when it expires later. Refresh tokens and ID tokens stay unread; the profile is used only to derive
  an in-memory `trakt:`/`sub:`/`user:` account key, which is never stored, logged or put in an error.
- A token renewal keeps the same account key, so it does not invalidate anything. Observed og login, logout and
  account replacement advance a session version; signing back into the same account therefore does not revive
  queued work from before the gap. An account replacement also aborts in-flight work and a late 401 is never
  retried as the new account. og's observed login/logout/account replacement emits the internal
  `ogt:ogsessionchange` on a microtask; `oauth.js` promotes it to `ogt:authchange` only while og is the active
  credential, so an og switch in another tab cannot cancel or reset work under the toolkit's own tokens. The host
  rebuilds every `authScoped` feature from its mount state, so personal rows, selections, dialogs and listeners
  cannot survive an account change; All lists reopens its active view on that remount. Module-level
  ratings/playback/month-review caches still reset on the same notification. `apiAuth` refreshes only the
  toolkit's own tokens; og's token is never refreshed, because og rotates its refresh token and a second refresher
  would strand og's session.
- Cross-tab `storage` notifications also feed the session revision. Only localStorage changes for the pinned og key
  (or `clear()`) count; unrelated keys, sessionStorage and same-account token renewals are ignored. The handler orders
  each notification against the entry this tab last read: a logout/login that finishes before notifications arrive
  still cancels old queued work, while a delayed notification cannot regress an account a direct read already
  observed. Storage areas are compared by their pinned entry because Firefox/Violentmonkey Xray wrappers need not be
  identical objects.
- `apiGet` uses a configured client ID when present and otherwise sends public metadata through og's connection,
  preserving the URL and query so `getJSON` caching still works. Watchlist, library and playback lookups therefore
  work without manual setup. A public 401 retries once only when og rotated the token for the same account.
- `getSessionGeneration()` includes og's revision only while og's session is the active credential, so an og change
  in another tab cannot abort queued work under the toolkit's own tokens. og entry parsing is cached by raw value
  (`isSignedIn()` runs from every `match()` and per-row `alive()`), a non-write request reads and freezes the live
  session before `ensureAuth()` can await a refresh, and an expired og entry makes public metadata lookups fall back
  to `MissingClientIdError`, while a token the API rejects before its expiry keeps og's reload message.
- Editing or clearing the API client ID dispatches `ogt:authchange`: it can switch the active credential from the
  toolkit's own tokens to og's session, which may be a different account, so features and caches must rebuild.
- Changes to the client ID or the toolkit's tokens made in another tab do the same through
  `GM_addValueChangeListener`, so background tabs do not keep the previous account's data until a reload. The header
  must `@grant` it: managers hide ungranted GM APIs, and the guard would silently skip the listener. A token refresh
  in another tab rewrites the tokens for the same session and is ignored; only a sign-in, sign-out or a different
  `client_id` rebuilds. Browser-checked with two same-origin tabs of a saved og lists page and Violentmonkey-like
  shims (the pane blocks og.trakt.tv from loading a localhost bundle, and a real manager was not available).
- A failed All lists remount keeps its reopen request until the route leaves that profile's lists page; leaving it
  drops the request, so coming back later does not reopen the view by itself.
- Expired `expires_at` is checked in `beforeSend` as well as before a request, so a write that waited for an HTTP
  slot cannot dispatch after the token expired. Nothing from og's entry is cleared on failure. User-facing watchlist,
  library, playback and sign-in hints mention og.trakt.tv; the menu's **Sign out** leaves og's session alone.
- `npm run drift` follows the root layout to og's user manager and fails if its client ID differs from
  `OG_SESSION_CLIENT_ID`, then checks the authority and reads the oidc chunk for the
  `user:${authority}:${client_id}` key and `oidc.` prefix. It reports drift instead of silently reading a renamed key.
- Tests: `test/og-session.test.js` (key parsing, current-key choice over a longer-lived stale entry, account-change
  events, blocked storage), `test/og-session-auth.test.js` (og client ID and bearer, no auth.trakt.tv call, own
  sign-in priority, unchanged/rotated 401s, account-switch and same-account logout/login aborts, dispatch-time expiry,
  public lookups and caching, sanitized errors) and `test/og-session-integration.test.js` (built bundle reads the page
  entry, sends it, stores nothing and leaves sign-out to og). Built-bundle regressions cover playback and All lists
  resets on account changes.
- Expired og session (user live test, 2026-11-10): Add to watchlist/library start with a public lookup, which used to
  throw a plain `MissingClientIdError` and read like a missing client ID. Lookups with an expired or rejected og token
  now throw a `MissingClientIdError` that carries og's reload message and `ogSession`, so metadata fallbacks still
  work while actions and All lists say to reload. To hold an entry past expiry in testing, block og's auth requests
  in the network tab, or og renews it first.
- Live (2026-11-10, Zen + Violentmonkey, two accounts): writes, signed-in reads, playback, sign-out and account
  switching work through og's session. Trakt keeps a replaced session usable for about a minute, so a write right
  after switching accounts can still land on the previous one; that is Trakt's session lifetime, not the toolkit.
- Signed-in drift: og redirects `/users/<you>/progress` and `/dashboard` to sign-in without its httpOnly session
  cookie, and the drift script never handles that cookie. Save those pages' rendered DOM from a signed-in browser
  (`document.documentElement.outerHTML` once loaded; og draws the dashboard's `nav.ribbon` client-side, so server HTML
  lacks it) as `progress.html` and `dashboard.html`, then run `npm run drift -- --signed-in <dir>`. Checked
  2026-11-10 in the browser pane: `section.progress` and `nav.ribbon` both present.
- The summary ratings chart still requires a configured client ID; the season chart keeps its DOM fallback when no
  API lookup is possible. `isSignedIn()` stays true for an expired og entry so actions can surface the reload message
  instead of disappearing.

## 2026-11-09: test suite review (feature 23)

- **Element assertions:** a probe that wrapped `node:assert` for one full run found 25 equality checks with a
  happy-dom node as an argument (mostly `document.activeElement` and `parentElement` comparisons) plus about 70
  `assert.equal(<query>, null)` checks that would print a node if they ever failed. All now use `assert.ok(a === b)`
  or `assert.equal(Boolean(query), false)`, so a failing check reports a boolean instead of running Node out of
  memory. PLAN.md's "Done means" carries the rule.
- **Timing:** `test/wait.js` has `waitFor(condition, { message })`, which polls until the expected state appears,
  and `wait()`, kept for checks that something does *not* happen. Six idle full runs passed; flakes only showed
  with all eight cores busy (`node -e "for(;;){}"` per core): `summary-ratings` read the watchers tile before it
  filled, the credits native-reload test counted reads before they finished, and a Rotten Tomatoes test read the
  chips 60 ms after a 20 ms mocked lookup (its hover/focus siblings now wait for the upgraded href too). Those,
  `library-feedback` (the 2026-11-08 flake) and every sleep sized to clear the one-second write pacing or the
  one-second native-toast fallback (`wait(1200)`–`wait(1500)` in the watchlist, credits, cards, Undo and playback
  tests) now wait on conditions; the two local `waitFor` copies use the shared one. The short settle sleeps after
  boot remain and passed every loaded run; convert one when it flakes.
- **Dead code:** `readCreditRoute` was used only by its tests since the grid-view change; the credits feature reads
  rows with `readCardRoute` and picks them with its `article.credit-row` selector. The season-row check moved to
  `readCardRoute`, and the stray-row check now runs on the built bundle (a `div` copy of a credit row gets no
  shortcut).
- **Overlap:** `library.test.js`'s built-bundle test repeated `library-feedback`'s; its only unique steps (sign-in
  guidance, then a save after connecting, and removal on navigation) became one test there. The your-ratings
  "fresh live markup" test and its 2026-10-31 `LIVE_RATINGS_*` strings went too: the default season and show
  fixtures are live captures now, and its subtitle check joined the main test. No test only checked that removed
  code stayed removed; those had already gone with features 15 and 26.
- **Fixtures, re-captured live 2026-11-09 (trakt-og `3e65cd7`):** `npm run drift` passed on every page, but the
  hand-written fixtures had drifted. The show fixture put TVDB in the ratings strip (og keeps it only in the sidebar
  `ul.external-links`) and its season cards lacked og's `poster-grid`, `poster-wrapper` and `titles` wrappers. The
  movie fixture used invented ids (`tt0465676`/TMDb `8967`; The Dark (2005) is `tt0411267`/`17`) and its sidebar
  carried Breaking Bad's links, so one page held two IMDb ids. Season rows are now og's `fanart-card` with a
  `button.rating-trigger.card`, season and episode sidebars carry their own links, the episode page lost a
  `section.episodes` og does not render, and the person fixture's extra h1 is og's real splash heading. Forvo
  answers scripted fetches with 403, so its fixtures were not re-captured.
- Validation: `npm test` (446 tests) passes idle and in three full runs with every core busy; `npm run drift` all ok;
  `npm run build` output is unchanged (the removed export was already tree-shaken). Breaking the credits selector on
  purpose makes the new stray-row test fail.


## 2026-11-09: Trakt ratings chart in the summary gap (feature 31)

- og's summary is `#overview .top`, a two-column grid: `.details` (stats list, tagline, overview) and `.actions` (the
  action stack). Both are grid items stretched to the row height, so neither box says where its content ends; the
  first live build measured the stretched `.actions` box, which already included our chart, and never hid. The chart
  now compares the lowest visible child of each column.
- Sizes are fixed so the fit is exact: chart 104px (+20px gap), tiles 60px (+16px). `layoutFor()` picks `full`,
  `chart` or nothing; showing only what fits means og's row never grows. Re-checked on a zero-delay timer from a
  MutationObserver on `.top` (buttons arriving, "Read more" class changes), a ResizeObserver on both columns, and
  window resize. The in-app browser pane renders nothing while in the background, so neither ResizeObserver nor
  `requestAnimationFrame` fired there; the timer keeps the check independent of painting.
- Data: `GET {movie|show|season|episode}/ratings` (seasons wrap it in `trakt`), an hour's cache, hidden under 10 votes.
  The votes tile's "% of watchers" uses the matching `/stats` `watchers`, requested only once the tiles are showing.
  og rounds shares (5,029 of 91,913 is "5.5%") but truncates the rating percentage (7.45 is "74%"); the tiles follow.
- og's stats bars run from `#616161` (1) to `#b70a0a` (10) with matching hearts (measured 2026-11-09); the chart uses
  those values, its own markup and CSS. The Most given tile shows the score large and its name smaller, because
  "10 · Totally Ninja!" does not fit a ~130px tile.
- Review fixes (2026-11-09): below 992px og stacks `.actions` under `.details` (one 535px column at 900px), so the
  stack's height read as free space and the chart pushed the row down; it now needs the actions column to start right
  of the details column. og names the rating from the truncated average (8.79 is "87% Great", not "Superb") and keeps
  a watcher-share decimal only under 10% ("5.5%", but "21%"), checked on The Matrix's stats page. The header centres
  its arrow instead of baseline-aligning it (an SVG has no baseline).
- Live check (2026-11-09, 1366px, jsDelivr bundle): Dune: Prophecy show and S1E3 and The Matrix filled the gap
  (Matrix with tiles: 87% Superb, 61,907 votes, 20.5% of watchers, 10 most given, 93% liked); season 1 fit the chart
  only; season 2 (2 votes) stayed hidden; adding 180px of content to `.details` hid it with og's row unchanged.

## 2026-11-09: decorated summary titles (Breaking Bad's element tiles)

- After hydration, og redraws Breaking Bad's show-page `h1` as periodic-table tiles: `span.element-title` holds a
  `.visually-hidden` span with the plain title and an `aria-hidden` copy built from `.tile` spans ("35 Br 79.904"). The
  server HTML still has the plain text, and trakt/trakt-og had no such component yet, so it ships live first. Only
  that page used it (seasons, episodes, El Camino, Better Call Saul, The Matrix and Dune: Prophecy were plain).
- The custom-links reader fell back to the whole heading's text, so `{title}` became "Breaking Bad 35Br79.904eaking
  56Ba137.327d 2008 TV-MA…" and broke search links; the library notice read only direct text nodes and got nothing.
- `headingTitle()` in `src/core/dom.js` now prefers a `.visually-hidden` title inside the h1 (skipping the year,
  certification and tooltip) and otherwise keeps the direct-text-node rule. Both readers use it. The fixture
  `ELEMENT_TITLE_SHOW_HTML` is the live hydrated heading with svelte classes stripped.

## 2026-11-09: feature 27 review follow-ups

- Network/timeout and 5xx failures now share a ten-second Wikidata cooldown without caching a missing mapping.
  Longer `Retry-After` waits and existing cooldowns are preserved; hover/focus keeps search usable until retry.

- Restored OG’s direct RT links from `.ratings-strip` alongside `ul.external-links`; unrelated page links remain
  excluded. Tests use the header ratings markup for movie/show links and retain search on seasons without a link.
- Lookup starts on pointer hover or keyboard focus, with click/middle-click fallback. Links reuse cached URLs when
  drawn, preserving direct destinations for copy-link and context-menu navigation after redraws. A fast unresolved
  click can still open search; page rendering never waits for Wikidata.
- Requests send a versioned `Api-User-Agent` with the repository contact URL, following Wikimedia’s
  [browser-script guidance](https://www.mediawiki.org/wiki/API:Etiquette#The_User-Agent_header). Removed the redundant
  config wrapper and unused normalization argument.

## 2026-11-08: external-id resolution for direct custom links (feature 27)

- Metacritic and Rotten Tomatoes reuse a valid direct URL from OG's native `ul.external-links` strip. Comments,
  related-title anchors and other page links are ignored, so an unrelated Metacritic URL cannot redirect the current
  title. Without a native URL, `resolve.js` queries Wikidata P1258/P1712 by a validated TMDb or IMDb id, with the
  media-class check and strict destination prefix validation from the original feature 27 work.
- The resolver is wired into the current feature 26 sidebar: compact service links and both Watch Now surfaces all
  attach the same lazy behavior through `presetResolver` and `resolveCustomLinks`' stored `source`. The old panel,
  old tests and old bundle were not restored. A cold click keeps search; a cached mapping upgrades the href before
  navigation. Late results are rejected after teardown, navigation or a changed href.
- Lookups dedupe by service/kind/title id, time out at 8 s, cache hits for a day and genuine misses for five minutes,
  and leave transport failures retryable. Only `@connect query.wikidata.org` was added.
- Review fix: a 429 now records a Wikidata-wide cooldown from `Retry-After` (falling back to 60 s when the header is
  absent) and returns `null`, leaving the search URL in place. `HttpError` carries response headers and `getJSON`
  accepts bounded timeout/retry options so the resolver does not wait through the shared transport's retry loop.
  Both destinations share one cooldown, so switching service or title cannot bypass throttling. Concurrent 429s
  preserve the longest deadline. Cached mappings and native links remain usable during the cooldown.
- `readTitleData` now emits `metacriticUrl` alongside `rottenTomatoesUrl`; both presets declare a `directVar` and
  resolver, and the template values expose the validated native URL without treating it as a user placeholder.
- Tests cover native-strip scoping against unrelated comment links, direct Metacritic/RT reuse, resolver activation,
  misses/ambiguity, failure retry, concurrent chips, navigation during lookup, 429 cooldown (with and without
  `Retry-After`), and built-bundle cooldown behavior. Anime remains search-only; its maintained mapping data was not
  added. The resolver cache is in-memory per page instance.

## 2026-11-09: conditional presets and person-page custom links (feature 28)

- YouTube interviews uses the CC0 Simple Icons YouTube mark from the same 16.36.0 release as the other bundled
  logos. Fixed URLs without placeholders remain available on person pages as part of the shared saved link list.

- OG's live person page carries IMDb/TMDb in `aside.sidebar ul.external-links`, and title genres in an overview
  `li` whose `span.label` reads "Genres". The first implementation searched every `genres=` link and every person
  IMDb link, so a "Browse drama" navigation link could establish genres and a comment could supply another person's
  id. Both readers now require the native field and return `null` when it is missing. The person reader only accepts
  exact-host HTTPS `imdb.com/name/nm…` and `themoviedb.org/person/…` paths in the native strip.
- `readGenres()` scopes to `#overview` (falling back to `.summary-frame`), finds the labeled Genres `li`, and only
  accepts og-origin `/shows/popular` or `/movies/popular` links with a `genres=` value. Unknown metadata stays `null`,
  so MyAnimeList and AniList remain available; a known non-anime list hides them from the checklist and rendered
  links. The filter applies only to the built-in preset URLs, so user-edited templates are unrestricted. Hidden
  presets stay in `watch.customLinks` and return on an anime title.
- Person pages use `readPersonData()` for the `.summary .summary-title h1` name and the native IDs. Templates get only
  `{person}`, `{personid}`, `{personimdb}` and `{persontmdb}`; title variables stay absent, and person IDs never enter
  title templates. Missing values hide just the affected link. `YouTube interviews` is the only new person preset;
  og already supplies IMDb/TMDb/Wikipedia/social profile links, and pronunciation remains separate.
- The feature is wired into the current feature 26 sidebar, icon groups, modal preset checklist and saved order.
  Person routes use the existing `parseRoute` kind, skip season controls and show lookups, and mount above the native
  `ul.external-links` strip. The old stash's panel, tests and bundle were not restored.
- Tests cover the two review reproductions at reader and built-bundle level, plus anime/non-anime/unknown genre
  visibility, saved-link preservation, person variables, person-only preset eligibility, native-strip ID scoping and
  the current sidebar/dialog. The full suite and build pass. Limitation: season and episode pages usually have no
  genre field, so those pages fail open and keep anime presets; no extra title-detail request is made. Anime
  destinations remain searches, and feature 27's external-ID resolution remains separate.


## 2026-11-08: clicked custom links turned red (feature 26)

- og styles every link with `a:is(:hover, :focus) { color: var(--color-link-hover); text-decoration: underline; }`
  (specificity 0-1-1). A mouse click leaves the tile focused (`:focus` but not `:focus-visible`), so that rule beat the
  bare `.ogt-service-link` colour and the tile and its monochrome icon went `#af0e14` and underlined until focus moved.
  Reproduced live with a real click on og.trakt.tv (script `focus()` in an unfocused pane matches neither state);
  `.ogt-service-link:focus` and `.ogt-watch-now-link:focus` now restate the resting colour. happy-dom gives `:is()` no
  specificity and lacks `light-dark()`, so the test only checks the rules exist.

## 2026-11-08: picker episodes for IMDb and OpenSubtitles (feature 26)

- Of the presets, only Stremio (`{imdb}:{season}:{episode}`) and TMDb (`tv/:id/season/:s/episode/:e`) could open the
  picked episode; IMDb and OpenSubtitles need the episode's own IMDb id, which og only links on episode pages, so from
  the picker they opened the season. The panel now asks `GET /shows/:id/seasons/:s/episodes/:e` for it (basic response
  carries `ids.imdb`) when a link's templates use `{episodeimdb}`/`{episodeimdbnum}`, a client ID is set and og's page
  gave none. Results (including an id-less one) are kept per `season:episode` for the panel's life, so each episode is
  asked once; a failed request is forgotten so picking it again retries. Until it returns, the links keep the season
  route. DMM has no episode route; the rest are show-level or search.

## 2026-11-08: grouped custom-link strip and og-style controls (feature 26)

- The single dense grid interleaved full-row services with logo tiles and looked scattered. The strip now renders
  three groups in saved order within each: `.ogt-links-services` (full-row logo + name), `.ogt-links-logos` (4-column
  square tiles, og's external-link grid) and `.ogt-links-texts` (2-column text tiles).
- JustWatch is now a `reference` link: og shows it as an external-link icon and its Watch Now dialog is already
  “Powered by JustWatch”, so it no longer takes a service row or a Your services tile.
- Season/Episode pickers copy og's dropdown triggers (34px, `#232323` with a `#3b3b3b` border, 8px radius); the visible
  word is dropped because the options already read “Season 1”/“Episode 1” (kept for screen readers). The number
  fallback for long seasons shows an “Ep.” prefix (each picker is only ~84px wide in og's sidebar).
- Add presets / Servers / Edit links are `.ogt-manage-button`s: a 3-column row of square glass tiles with a stroked
  icon and short label (full names on `aria-label` and `title`), replacing the `.ogt-chip` pills.

## 2026-11-08: service logos instead of monograms (feature 26)

- The user wanted real service logos (reference look: Fenn3c401's script, logo tiles plus a monochrome icon strip).
  og's sidebar `ul.external-links` is a 4-column grid of square ghost tiles (`rgba(255,255,255,.05)`, 8px radius,
  6px gap) with inline monochrome SVGs and `--color-site-*` brand colours on hover; the strip now uses the same grid.
  Reference links are square logo tiles; watch/library links are 2-column logo-and-name tiles tinted with the brand
  colour; links without a mark are 2-column text tiles. `grid-auto-flow: dense` packs them in saved order.
- Logos: `brand-paths.js` holds 15 single-path marks from simple-icons 16.36.0 (CC0; IMDb, Letterboxd, Rotten
  Tomatoes, Wikipedia, MyAnimeList, Metacritic, Stremio, Plex, AniList, Jellyfin, Emby, Radarr, Sonarr, MDBList,
  Trakt), about 12 kB. simple-icons has no TMDb, TVDB, JustWatch, Seerr, OpenSubtitles or DMM. og's own TMDb/TVDB/
  JustWatch/IMDb/Wikipedia marks are cloned from the page's `ul.external-links` when og shows them (trakt-og draws them
  from `lib/icons/sites` and `icons/kit`, GPL-3, so they are reused at runtime, not copied into this MIT bundle).
  DMM, OpenSubtitles and Seerr keep word marks. Brand colours prefer og's `--color-site-*` tokens.
- Trakt's Watch Now logos come from `media.trakt.tv/watchnow/sources/<id>.webp`; of our services only `plex` exists
  there, so they were not used.
- Watch Now tiles copy og's provider tiles (measured live): 118px grid columns with 16px/14px gaps, a 118x56 logo card
  with 8px radius, and a 12px note (“Your service”, “Add to library”).
- og's sidebar is only ~173px wide, so a watch/library tile takes the whole strip row (logo + name); 2-column tiles
  truncated names to “St…”. The strip is flat (no panel box), like og's own sidebar groups.
- Live check (2026-11-08): the built bundle was loaded into og.trakt.tv via jsDelivr (og's CSP allows it and
  `unsafe-eval`) on `/shows/cyberpunk-edgerunners` at 1280px: strip above `ul.external-links`, og-native IMDb/TMDb/
  Wikipedia marks, bundled logos for the rest, and three Your services tiles beside og's Netflix tiles. Headless
  Playwright is blocked by Cloudflare. Under 768px og shows a full-page “made for bigger screens” / “turn your tablet
  sideways” splash in device emulation.
- og is desktop-only for now (user, 2026-11-08), so the `.phone-tools` placement, its `matchMedia` listener and their
  tests were removed; the panel always lives in `aside.sidebar`. The phone Watch Now dialog still exists in og's
  markup, so it keeps the Your services section and its drift check.

## 2026-11-08: custom links below the poster and in Watch Now (feature 26)

- Live captures of `/movies/the-matrix-1999`, `/shows/breaking-bad`
  (`/shows/breaking-bad/seasons/1`, `/shows/breaking-bad/seasons/1/episodes/1`) on 2026-11-08 show the stable
  insertion points: `aside.sidebar` with `.summary-poster`, `.watch-now`, a native `dialog > .streaming-links` and
  `ul.external-links`; seasons/episodes wrap the poster in `a.poster-link`, and the phone Watch Now dialog is a
  sibling in `.actions`/`.details`.
- The compact strip is inserted directly before `ul.external-links`, falling back to after `.watch-now`, after the
  poster, then the sidebar end. A `matchMedia('(max-width: 767px)')` listener moves the same node into `.phone-tools`
  and back on resize. The management editor, presets and servers forms live in one `<dialog>` appended to `body`, not
  inside the movable panel, so a breakpoint change cannot close an open modal or leave stale focus state.
- Presets now declare `icon` and `surface` (`watch`, `library`, `reference`). Known marks are local colored monograms;
  unknown/custom labels render as text chips. Every compact anchor has an `aria-label`, a tooltip and a focus style.
  Edited preset URLs keep their icon and surface when their label still names a known service, so an edited Emby or
  Jellyfin search path stays in Watch Now.
- Only `watch`/`library` links are appended to summary Watch Now dialogs, as a scoped **Your services** section behind
  a direct `.watch-now + dialog` check. Native provider sections, availability counts, controls and external links are
  not touched. The empty live state still has a 0-services button and a dialog with og's “No watch now links in the
  United States yet.” message; **Your services** is appended below that message. The compact fallback remains only for
  the defensive case where no Watch Now dialog exists at all. Reference links never enter Watch Now.
- The mutation observer watches only `aside.sidebar`, `#overview` and `.phone-tools`; observer batches reuse the links
  resolved by the last `renderLinks()` instead of re-reading GM storage and re-resolving every template. It still
  moves the panel and refreshes the scoped Watch Now section after lazy content settles.
- Added current-markup fixtures (movie, show, season, episode and an empty 0-services movie) plus built-bundle tests for
  placement, icons/fallbacks, scoped dialog sections, native counts, the empty Watch Now state, edited-label surfaces,
  breakpoint changes with an open modal, narrow placement, repeated modal opens and SPA teardown. Pure tests cover
  preset surfaces/icons, order preservation and filtering. Review follow-up: Plex, Jellyfin and Emby now use distinct
  `PLEX`/`JF`/`EMBY` monograms instead of one play glyph, OpenSubtitles uses yellow-on-dark instead of IMDb's
  dark-on-yellow, and Seerr uses `SEER` rather than `?`. Drift checks now run the sidebar and desktop/phone Watch Now
  selectors on season and episode pages as well; the full season/episode captures also carry the chart anchors.
- Validation: `npm run build`; focused `custom-links-presentation`, `data`, `presets`, `og-drift` and
  `integration` tests; then the full `npm test` suite (371/371). Firefox headless checked the built userscript in a
  fresh profile with desktop and narrow viewports; Chromium was not installed in this environment.
- Test-only follow-up for the feature 23 review: `test/playback-integration.test.js` now checks `dialog[open]`
  rather than any `dialog`, because the closed custom-links management dialog is intentionally present on title pages.
  The old assertion failed and Node tried to print a happy-dom node, which OOM-killed the file.

## 2026-11-07: shared authenticated-write queue (feature 29)

- Trakt's current rate-limit page (`developer.trakt.tv/docs/rate-limiting`, checked 2026-11-07) sets
  `AUTHED_API_POST_LIMIT` to one call per second for POST/PUT/DELETE, and says to wait at least the full
  `Retry-After` on 429 (otherwise use exponential backoff with jitter and limited retries). The queue follows that:
  one FIFO chain in `src/core/trakt.js`, serial sends, at least 1000 ms between dispatches, two 429 retries, and the
  final 429 also blocks later writes for its `Retry-After`. The pacing timestamp is recorded at actual dispatch inside
  `beforeSend`, not while a write waits for a transport slot, so a delayed first write cannot consume the next write's
  spacing.
- `Retry-After` is used only when the header is present and a valid non-negative number. Missing headers use 1 s and
  2 s base delays with ±50% jitter, bounded at 30 s. The parser checks for a non-empty header before `Number()`,
  because `Number(null)` is `0` and would have skipped the fallback. A valid `Retry-After` is never shortened.
- Only 429s and 401s are resent. A request records the session generation that started it and the token actually
  handed to the transport (which can be newer than its pre-slot snapshot). A 401 refreshes and resends once through
  the same pacing and cancellation checks; a second 401 for that session clears tokens. A 401 arriving after a
  different account connected is abandoned without refreshing or clearing the replacement account's tokens. 5xx,
  timeout and network failures surface without replay, since a write may already have been accepted.
- A queued write captures OAuth's session generation and the client ID when it is enqueued. `clearTokens()` and a
  successful sign-in bump the generation; the queue rechecks generation, client ID and the current token after every
  wait and after a refresh. The final check runs in `http.js`'s `beforeSend`, after the request acquires one of the
  transport's four slots and immediately before the send, so signing out while four GETs hold the slots still prevents
  the old write. Sign-out or an account switch rejects queued work and releases the queue.
- Features can also pass their own `{ active, signal }` operation guard as `apiAuth`'s optional fifth argument. The
  Watchlist, Library and Playback callers forward guards when they have one; the final `beforeSend` rechecks `active`
  too, so navigation or teardown cannot leave a delayed write running. Adds and Undos without a guard keep their old
  request shape. Playback's start respects that page guard, but its completion pause is session-scoped: once
  `/scrobble/start` has been sent, leaving the page must not suppress the pause that saves progress, since start has
  already removed the old entry. A sign-out or account change still rejects the pause.
- Device polling, token refresh and revoke still call the OAuth endpoints directly. A write holds only its queue
  slot while refreshing, never a transport slot, so refresh cannot deadlock behind the write waiting for it. GETs are
  unchanged: not queued or paced, with the same caching and four-way concurrency.
- `src/core/http.js` no longer caps the public transport's `Retry-After` wait at 10 s. Its 429/5xx retries now wait
  the server's full delay; missing headers keep the existing linear fallback.
- Tests: `test/write-queue.test.js` mocks `Date`/`setTimeout` and `GM_xmlhttpRequest` for FIFO order, one-second
  spacing, a 30 s `Retry-After`, missing-header backoff, exhausted retries, queue recovery after 5xx/network
  failures, abort during a wait, sign-out and re-sign-in, refresh without deadlock, 401 resend pacing, unchanged
  GETs, and the public transport's long `Retry-After`. It also covers a sign-out during a four-GET slot wait, pacing
  stamped after a slot wait, and an inactive feature guard cancelling a queued write; it also covers a token rotated
  while a write waited for a slot. The built-bundle credit test navigates after queueing a second addition and asserts
  only the first was sent, while the playback test navigates after start and asserts the pause still completes. The
  auth tests also cover a late 401 from an old session after another account connects. Existing built-bundle tests that
  perform two or more writes now wait past the pacing interval (playback start+pause, Undo, bulk Watchlist all and
  credit-row retries).
- Review fixes: a `Retry-After` above 60 s (`MAX_RETRY_WAIT_MS` in `http.js`) is not waited through in place. A public
  GET sleeps while holding one of the four transport slots, and a write blocks the whole queue with its button busy,
  so a long block would freeze the page's API calls or leave Watchlist all spinning for minutes. Instead the 429 is
  returned/thrown at once (never retried early), and later writes inside that block fail fast with status 429, which
  the features already turn into "Trakt rate limited this request; try again later." Playback's bulk clear now shows
  "Clearing N items…" after confirmation, since paced deletes take about a second each.
- No live account writes were made while developing this. Limitation: pacing is per page instance; other tabs and
  apps share the user's server-side limit, so 429 handling remains necessary and there is no cross-tab coordinator.

## 2026-11-07: preset review fix (PR 31)

- Episode pages read `{episodeimdb}` only from an IMDb title link that is not a season list
  (`/title/ttSHOW/episodes?season=N`). Live og (2026-11-07) links an episode without its own id to an IMDb
  `find?q=…&s=ep` search, but if it ever fell back to the show's season list, IMDb and OpenSubtitles would have treated
  the show id as the episode's. Route spot-checks (TVDB dereferrer, Letterboxd IMDb/TMDb, TMDb episode, DMM movie,
  MyAnimeList/JustWatch/Wikipedia/TVDB searches) all resolved; MDBList and OpenSubtitles are behind bot checks.
## 2026-11-07: Rotten Tomatoes native title URLs

- The Rotten Tomatoes preset now reuses the title URL already rendered by OG, falling back to its stored search
  template when missing. Only HTTPS links on the exact Rotten Tomatoes host and the current movie/show path type
  are accepted; search links, unrelated domains, credentials and nonstandard ports are ignored. No slug guessing or
  extra lookup is involved, and user-edited URLs remain untouched.
- Metacritic's supplied movie, season and episode URLs resolve to direct pages. Its preset remains a search:
  the site uses its own title/episode slugs, which cannot reliably be reconstructed from the ids currently available.
- Built-bundle tests cover direct movie/show/season URLs, search fallbacks and refreshes; reader checks cover
  lookalike domains, search URLs, wrong kinds and credentials.

## 2026-11-07: PR 31 review fixes and direct links

- Preset kind restrictions now apply when resolving saved links, not just in the add checklist. Radarr/Letterboxd
  stay off show pages and Sonarr/TVDB stay off movies; arbitrary user-defined links keep their existing behavior.
- Picker detection inspects all applicable preset routes via `presetTemplateUrls`, and adding presets calls the
  same refresh path as editing links. A remembered season/episode is visible and editable even when the stored
  preset URL only contains the search fallback. Deep-only presets now initialize the usual first-season/episode
  selection when season data is available, just like explicit season/episode templates.
- MDBList's IMDb redirect routes were confirmed on its own site: `/movie/tt0133093` redirects to
  `/movie/a2na-the-matrix`, and `/show/tt0944947` to `/show/8pll-game-of-thrones`. Added those exact routes before
  the existing searches; the earlier assumption that only MDBList slugs could open titles was incorrect.
- IMDb episode pages now use `{episodeimdb}`, retaining leading zeroes from the episode's own external-link ID.
  The show/season and search routes remain fallbacks. No new lookup or ID-mapping service was introduced.
- Regression tests cover globally stored kind-specific presets, remembered selections, adding deep presets,
  direct MDBList routes/search fallbacks and the IMDb episode route. Build, full tests and diff checks passed
  after merging main; server-template menu validation is preserved in the shared dialog UI.

## 2026-11-06: more link presets and per-user server presets (features 24–25)

- Live og.trakt.tv checks with Playwright (2026-11-06) show the external-link strip varies by page: a movie has
  IMDb, Letterboxd, TMDb, Rotten Tomatoes, JustWatch, an official site, Fanart.tv and Wikipedia; a show has IMDb,
  TMDb, TVDB, Fanart.tv, JustWatch, Wikipedia and socials; season and episode pages have IMDb, TMDb and a Wikipedia
  search. The new presets cover every templateable one so the links survive when the strip is missing.
- Verified exact routes in the browser: IMDb `title/{imdb}` and `title/{imdb}/episodes?season={season}`; TMDb
  `movie/{tmdb}`, `tv/{tmdb}`, `tv/{tmdb}/season/{season}` and `.../episode/{episode}`; TVDB
  `dereferrer/series/{tvdb}`; Letterboxd `imdb/{imdb}` and `tmdb/{tmdb}`. Rotten Tomatoes, Wikipedia, JustWatch,
  MyAnimeList and TVDB search URLs all returned 200. The search fallbacks stay in the stored preset.
- TVDB added a `{tvdb}` placeholder. The show strip carries it (`dereferrer/series/81189`); season and episode strips
  do not, so `lookUpShow` now requests it through `GET /shows/:id` when a stored preset needs it. `showTemplateData`
  validates the API's `ids.tvdb` like the other ids.
- DMM's source confirms `movie/[imdbid]` and `show/[imdbid]/[seasonNum]`; a signed-out browser visit redirects to
  `/start`, so the deep routes assume the user is signed in to DMM. It has no episode route, hence season links.
- MDBList: exact title URLs carry an MDBList-only slug prefix (`3tb7f-resident-evil`,
  `c5do-star-wars-the-clone-wars`) that Trakt does not expose. The site's own forms are `/movies/?q_title=` and
  `/shows/?q_title=` and accept a title or IMDb id, so MDBList ships as movie and show searches. Automated `q_title`
  requests returned 403; the browser check remains for the user.
- OpenSubtitles: an Anubis challenge blocks automated checks. The routes (confirmed by the user and the search
  documentation) are `imdbid-{number}` for a movie or episode, `pimdbid-{number}` for a show, and
  `pimdbid-{number}/season-{n}` for a season. Numbers drop `tt` and leading zeroes (`tt0458290` -> `458290`). An
  episode page's strip carries the episode's own IMDb id (`tt0959621` in the fixture), exposed as
  `{episodeimdbnum}`; without it the season route is the fallback. The `idmovie-` routes use OpenSubtitles' internal
  movie id and cannot be built from Trakt ids. Fanart stays out per the user.
- Server presets (feature 25): Jellyfin, Emby, Radarr, Sonarr and Seerr are self-hosted, so the preset URLs use
  `{jellyfin}`, `{emby}`, `{radarr}`, `{sonarr}` and `{seerr}`. The base URLs are stored per browser in
  `watch.servers` by **Servers…** in the custom-links panel. A bare host gets `http://`; HTTPS, a port and a base
  path are kept, and the trailing slash is removed. Credentials, query strings and fragments are rejected instead of
  silently dropped, and non-HTTP schemes such as `mailto:`/`file:`/`ftp:` are rejected before the host is parsed. The
  presets are disabled in the checklist until their host is set. Server placeholders are filled raw because
  percent-encoding would break `://` and paths; titles and ids stay URL-encoded. Only `{jellyfin}`, `{emby}`,
  `{radarr}`, `{sonarr}` and `{seerr}` are server templates; the editor, renderer and menu add-link prompt share that
  check, so `{title}/…` is not accepted as one.
- Radarr uses `/add/new?term=imdb:{imdb}` then `tmdb:{tmdb}`, with a title search fallback; Sonarr uses
  `tvdb:{tvdb}` with a title fallback; Seerr uses `/movie/{tmdb}` and `/tv/{tmdb}` with a search fallback.
  Jellyfin and Emby cannot deep-link from Trakt ids, so they open their web search:
  `{jellyfin}/web/#/search?query={title}` and
  `{emby}/web/index.html#!/list/list.html?type=search&searchtext={title}`. Jellyfin's route comes from the current
  `jellyfin-web` route table (`search`, no `.html`, reading `?query=`). Emby's route comes from the current 4.9 web
  UI (`/web/index.html#!/list/list.html?type=search`) plus the `searchtext` search field; no live Emby server was
  available to confirm the full path. These paths vary by web-client version, so the presets are editable and the
  README says so. No public hosts are shipped.
- Tests: `test/presets.test.js` covers the exact and search routes, including TVDB, Letterboxd, DMM, MDBList,
  OpenSubtitles and the five server presets; `test/data.test.js` covers reading `tvdb` and the episode IMDb id from
  the strip and the API, plus server template vars and validation; `test/text.test.js` covers raw server filling; the
  built-bundle tests check IMDb, TMDb and Letterboxd on a movie, the TVDB show lookup on a season page, the
  MDBList/OpenSubtitles routes, arbitrary-placeholder rejection, the menu add-link prompt, and configuring server
  hosts before adding Jellyfin/Emby/Seerr links.

## 2026-11-07: keep Watchlist all available in grid view (PR 26)

- The same bulk button remains in `#credits .toolbar .controls` in list and grid views. Grid candidates come from
  `#credits article.poster-card` and the existing whole-title route reader; Known For posters outside credits are
  excluded. The shared bulk path deduplicates routes, ignores hidden cards and keeps known membership/add/Undo
  state when switching views. Empty selections keep a visible disabled button with neutral wording.
- OG’s grid credits have poster title links; native list controls are present in the live screenshots, though
  current upstream `PersonPage.svelte` at `14388594` also permits cards without a listTarget/picker. Bulk candidates
  support both shapes, and native reloads include available grid controls without adding new per-card buttons. Notice timing, refresh queue
  supersession and toolbar styling from the preceding review fixes are preserved.
- Built-bundle tests switch list → grid → list, verify toolbar placement and payloads, retain add state, restore
  counts with Undo, and skip hidden/duplicate/known-added titles plus posters outside the credits section. Grid
  controls also refresh after add/Undo. Build, full suite and diff checks pass.

## 2026-11-07: Watchlist all review fixes (PR 26)

- The bulk notice, Undo and the unlocked rows no longer wait for native reloads: on a 200-credit page those are
  ~200 sequential-ish OG picker loads. Refreshes now run after the operation finishes, and a newer refresh (Undo's)
  stops an older queue so the two do not interleave.
- OG's grid view (`.view-toggle`) renders poster cards, not `article.credit-row`, so the row shortcuts don't appear
  there and the bulk button now hides instead of showing a disabled "already on your watchlist" state.
  The Department filter re-renders rows (checked live on `/people/bryan-cranston`), so the count follows it.
- The button drops `.ogt-chip` (its hover recoloured the text with a panel-only variable) and matches the
  34px height and font of OG's toolbar triggers.

## 2026-11-07: native watchlist refresh after bulk credit changes

- Bulk add and Undo now reuse `createNativeWatchlistRefresh().refresh`, as the individual watchlist shortcut
  already does. OG rereads its own membership through ArrowDown; the picker stays closed and no native write is
  sent. At most four native loads run at once. Confirmed additions also refresh if a later batch fails.
- Refreshes follow the operation's page/auth guard, skip removed/reused rows and signed-out native sessions, and
  stop scheduling work after navigation. The success notice/Undo originally appeared after native reloads finished (changed in the review fixes above).
- Built-bundle regression checks cover native membership after add and Undo, bounded loads and no picker clicks/popups.

## 2026-11-07: finish and review Watchlist all (PR 26)

- Merged main and moved the bulk confirmation to the shared og-styled dialog. The page/auth epoch is captured
  before opening it; stale confirmations send nothing. Bulk add/undo lock row actions until they finish, and an old
  operation cannot clear a newer session's busy flag. Hidden rows are excluded and toolbar replacements remount the button.
- Sync responses must account for every submitted movie/show before their shortcuts hide. Each confirmed batch
  updates shared state immediately, so a later error keeps completed rows hidden and reports the confirmed counts.
  Unknown not-found IDs leave affected shortcuts available. Bulk notices use the shared notifier with a count summary.
- Bulk Undo reuses the existing removal API, bounded to 100 titles per request, and restores shortcuts after each
  confirmed removal. A failed later removal can be retried without repeating completed batches. Undo is offered only
  when all successful titles are new and identifiable; mixed new/existing results cannot safely identify new titles.
  Removal responses now require valid deletion counts. Bulk operations skip per-credit native picker refreshes;
  reload remains the fallback. Added the credits toolbar selector to drift checks.
- Regression checks cover partial batches, malformed responses, cancellation, row locking, hidden rows, toolbar
  replacement, safe Undo and mixed-response protection. Build, full tests, focused Undo retry test, diff check
  and live drift checks passed (all six pages plus native modules). Live authenticated writes were not exercised.

## 2026-11-06: og-styled dialogs instead of the browser's

- Every `window.confirm` / `window.prompt` (playback clear and save progress, library add, the custom-link and
  client-ID menu commands, the sign-in redirect URI) now goes through `src/ui/dialog.js`: `confirmDialog()` and
  `promptDialog()` return promises. It is a native modal `<dialog>` like og's `Dialog.svelte` (trakt-og
  `fea92af`), so focus stays inside, Esc cancels and focus goes back to the opener. Its look uses og's own tokens:
  `--color-dialog-bg`, the uppercase title bar (`--color-dialog-title-*`), and the art dialogs' footer, field and
  red primary button (`--color-dialog-art-*`, `--color-control-*`, `--brand-primary`), with fallbacks outside og.
- `promptDialog({ validate })` keeps the dialog open and shows the error under the field, so bad input no longer
  needs a second round trip. Save progress now asks once: the "may briefly show as watching" warning is in the
  prompt, not a separate confirm.
- The API-side confirm callbacks (`playbackApi.clearItems`, `libraryApi.add`) now await their answer, and re-check
  the session/page afterwards, since the page can change while a dialog is open.
- Without `showModal` (very old engines) the helpers fall back to the native dialogs.
- Tests: `test/dialog.test.js` covers labels, focus, buttons, Esc, close and validation. `test/dialogs.js` is a
  helper that answers dialogs in integration tests the way the old `window.confirm` mocks did. happy-dom shares
  element classes between windows, so it answers only its own window's dialogs. Checked on live og (a movie page)
  with the built CSS: title bar, field, inline error and Esc all look and behave like og's modals.

## 2026-11-05: set playback progress (feature 9)

- Trakt's current scrobble contract (`trakt/trakt-api` `projects/api/src/contracts/scrobble`): a movie request
  carries `movie.title`, `movie.year` and `movie.ids`; an episode request carries only `episode.ids` (no show).
  Start then pause at the same percentage saves paused playback; stop is deliberately never sent because it can
  mark the item watched. The confirm warns that the profile may briefly show it as watching.
- Movie pages look up the page's movie for title/year/ids. Episode pages look up the episode for its ids. Overview
  rows use the ids already present in `/sync/playback/episodes`; older entries without `episode.ids` fall back to
  the show slug/season/episode lookup. The title page's panel is now shown when no saved item exists instead of
  being hidden, with the save action in it, and next to **Clear** when one does (prefilled with its value). A
  cleared title-page panel stays visible with the same action.
- The contract says start "will remove any playback progress if it exists". So a pause that fails after a
  successful start has lost the old progress: `setProgress` flags that error `partial` and the panel says so
  instead of a generic retry message. The session epoch is taken before the movie/episode lookup, so signing out
  mid-lookup sends nothing.
- `normalizeProgress` accepts 1–100 after rounding to one decimal (strings from the prompt included) and rejects
  empty or out-of-range input. 0 is refused because Trakt ignores scrobbles under 1% (422 on stop) and start would
  already have removed the old progress; **Clear** is the way to remove it. The playback cache is invalidated after
  each write so the badge/list refreshes immediately.
- Tests: `test/playback-data.test.js` covers progress normalization and both scrobble bodies;
  `test/playback-api.test.js` covers start→pause order, episode-id fallback, invalid input, partial failure and
  session changes during lookups; `test/playback-integration.test.js` covers the empty and existing title-page
  actions, overview rows, warnings/cancellation, the failed-pause message and that `/scrobble/stop` is never sent.
- Not verified against the live API yet: whether pause at the same percentage right after start is accepted for
  every item, and how long the "watching" status lingers.

## 2026-11-05: list preview titles (feature 10)

- Live `/users/justin/lists` capture: every list row's fan is `a.fan[aria-hidden]` with five `.slot` spans;
  the only title metadata is the tooltip text and the poster URL. The media path carries the type and Trakt id
  (`images/shows/000/199/343/posters/thumb/...` -> show 199343), so no list-items API reads are needed.
- `ListRow.css` already gives `.slot` `position: relative`, but the fan is an anchor, so a nested title anchor
  would be invalid. Clicks on a slot are delegated to the derived title URL and stop the fan's list navigation;
  a visually hidden `nav` after the fan carries real title links for keyboard and screen-reader use.
- The feature runs only on list pages and scans page-wide like the card shortcuts, so rows added or replaced
  later, including the All lists fallback, get previews too. It adds no wrapper around og's poster stack and
  does not change its layout.
- Tests: `test/list-preview.test.js` covers URL parsing and tooltip titles;
  `test/list-preview-integration.test.js` covers the built bundle, pointer activation, later and removed rows,
  nav links and route teardown.
- Plain clicks call `.click()` on the matching hidden link, so SvelteKit's router handles them like any other
  link (no full reload); middle and Ctrl/Cmd/Shift clicks open the title with `window.open(href, '_blank')`.
- Rating corners: og's `ListRow.svelte` (trakt-og `fea92af`) renders no `CornerRating` on the fan, so this adds one.
  `corner-rating.js` copies `CornerRating.svelte`'s geometry and uses og's own `--rating-N` tokens (`tokens.css`);
  the first draft redefined them on `:root`, which would override og's theme. A slot is a sliver showing the left
  edge of a full poster, so the badge sits at `calc(var(--poster-width) - 30px)`, the poster's own corner, and shows
  when that poster opens on hover; in og's narrow layout (`@container (width < 520px)`, whole posters side by side)
  it sits at the slot's right edge. Checked on live `/users/justin/lists` at desktop and 420px widths.
- `ratingsApi.loadTitles()` reads `/sync/ratings/movies` and `/sync/ratings/shows` (not the full `/sync/ratings`,
  which includes every episode rating) with its own 10-minute cache and in-flight promise; sharing the episode
  loader's flight would have handed `load()` the wrong shape. Each corner is keyed by `kind:id:rating`, so a
  replaced poster or a sign-out (`ogt:authchange`) replaces or removes it. Signed out, nothing is requested.
- Tests: `test/list-preview-integration.test.js` also covers plain/middle/modified clicks, corners on the right
  posters, poster changes and sign-out; `test/list-preview-ratings.test.js` the badge; `test/your-ratings.test.js`
  the separate title cache.

## 2026-11-05: Watchlist all on person credits (feature 17, bulk part)

- The bulk action extends the existing shortcut factory instead of adding a parallel subsystem: it shares the
  entries/states map, per-route busy/undo state, native-watchlist hiding and row observers. It only adds one
  `Watchlist all (N)` button in `#credits .toolbar .controls`; N is the deduplicated count of currently shown rows
  that are neither native-watchlisted nor already added by the toolkit.
- `watchlistBulkItems` uses each credit row's route slug and drops seasons/episodes; `watchlistBulkBody` sends
  `{ movies: [{ ids: { slug } }], shows: [...] }`. No per-title `GET` lookups are made. `watchlistApi.addMany` chunks
  at 100 items per `POST /sync/watchlist`, so a 211-credit page makes three writes rather than 211.
- The response aggregation supplies `added`, `existing`, `notFound` and the keys that succeeded. Added and existing
  rows hide their shortcuts; `not_found` rows stay visible. The notice says `Watchlist: N added, N already there,
  N not found.`, and cancelling the single confirm sends nothing. Native picker refresh is skipped for the whole
  page because the per-control picker path is not appropriate for 200 simultaneous rows; reload remains the fallback.
- Tests: `test/watchlist.test.js` covers slug-only items, deduplication, season exclusion, batching, partial
  not-found mapping and signed-out/cancelled paths. `test/watchlist-credits-integration.test.js` covers the toolbar
  button/count, one slug POST, native/individual skipping, partial counts, cancellation, lazy rows and teardown.

## 2026-11-04/05: custom link presets that open the exact title (feature 22)

- Stremio's web route is `#/detail/:type/:id/:videoId?` (`src/routes/MetaDetails/MetaDetails.js`, `development`
  branch): MetaDetails reads `type`, `id` and `videoId` from `useParams()`. The preset's deep routes, most specific
  first: `detail/series/{imdb}/{imdb}:{season}:{episode}`, `detail/series/{imdb}?season={season}`,
  `detail/movie/{imdb}`, `detail/series/{imdb}`. Show and episode routes were clicked through in a real browser on
  2026-11-05.
- Seasons need `?season=`: the first click-through landed season pages on the plain series view. Stremio's
  `useSeason.js` reads `?season=` with `useSearchParams` when no video id sets one (its own season select writes
  that), and `?season=0` selects specials. The episode route still wins whenever `{episode}` has a value.
- The episode id is the addon stream request id, not a list filter: `useMetaDetails` passes it as `streamPath`
  (`stream/series/{videoId}.json`), so the episode link opens that episode's streams. Stremio's own links
  percent-encode its colons, but `useParams()` decodes the segment, so raw colons land on the same value.
- A preset may carry a `deep` list of exact-item templates. Stored links keep the old `{ label, url }` shape with the
  search URL, so existing links, custom links and duplicate detection are unchanged; `resolvePresetUrl` swaps in a
  deep template only when every placeholder it needs has a value, otherwise the search URL stays. The season/episode
  picker re-resolves the href on change. A user-edited Stremio URL no longer matches the preset and stays as typed.
- `lookUpShow` also checks the deep templates. A season page gets `{imdb}` from og's IMDb link, so its route fills
  without a client ID; an episode page's IMDb link is the episode's own, so the exact-episode link needs the
  client-ID show lookup and otherwise falls back to search.
- The other presets stay search-only. Plex and Jellyfin need their own ids, Metacritic and AniList have no episode
  pages, and og already links TMDb, IMDb, Letterboxd, Rotten Tomatoes and Wikipedia (Trakt is the same site).
- Tests: `test/presets.test.js` covers the four Stremio routes, fallback, page-kind filtering and the template list;
  built-bundle tests cover movie, show, season, episode fallback, the client-ID lookup and picker updates.

## 2026-11-04: month review browsing (feature 21)

- `monthSpan(year, month)` and `shiftMonth` centralize local calendar months; `lastMonth` is now a thin wrapper.
  Earlier months are settled and stay cached indefinitely, while the last month keeps the existing daily refresh
  during the first seven days (`monthCacheFresh`). Keys stay `review.<user>.<YYYY-MM>`.
- The oldest history month is found lazily on the first previous click, so a dashboard visit without browsing pays
  no extra request. `/sync/history?page=1&limit=100` supplies `X-Pagination-Page-Count`; the last page's oldest
  `watched_at` gives the stop month. The answer is cached in memory for the signed-in session and cleared on
  `ogt:authchange`.
- The card rerenders per month. Next is disabled on last month; previous is disabled on the first history month.
  Earlier months with no plays show an empty card, so gaps between plays remain navigable instead of dead-ending.
  Hide stores last month's dismissal key whichever month is on screen (storing the viewed month's key would bring the
  card back on the next visit and blank it when browsing to that month), and only last month's load honors it. The
  initial zero-play last month stays hidden. A failed step while browsing keeps the current month and shows a toast.
- Browsing reuses the account from the first load: `loadReview(span, now, user)` only calls `/users/me` for the
  initial month. In-flight loads dedupe by month so quickly clicking the same target shares one request set.
- Layout: the arrows sit in the card's bottom row, right of the "Month in Review" link, as SVG chevrons in flat
  translucent 36px chips with the dashboard tiles' radius. Hide is a chip of the same style at the top right, 80px wide
  so its edges line up with the arrow pair below.
- Tests: unit coverage for month shifting/cache freshness and a built-bundle test that browses two months back,
  returns through a cached month, checks the single account lookup and verifies both arrow stops, and one that hides
  while viewing an earlier month.

## 2026-11-04: watchlist shortcuts on person credits (feature 17, per-row part)

- Live `/people/bryan-cranston` capture (2026-11-04): 211 `article.credit-row` entries, each with an
  `a.poster` link to `/movies/:slug` or `/shows/:slug`, and the same card-sized `ListControl`
  (`.quick-icons.small.row .list-control.card.small`) used on posters. Guest credits show the show link and a
  "1 episode" pill, so the whole show is the right watchlist target. There is no native watchlist shortcut in
  the row: only watched, lists, play and rating.
- The row action strip sets `--quick-icons-row-cell: 32px` for `--bar` and `--action-width`, so the shortcut uses
  the card button markup, icon and styling with those variables and no poster-zoom hiding. It inserts directly
  after the `.list-control`, inside `.tools`. Cards and credit rows share one factory
  (`src/features/watchlist/shortcuts.js`: state per route, add/undo, native-membership hiding, the picker refresh);
  each feature only supplies its targets, route reader, class and CSS. The picker trigger and popover have the same
  shape as cards, so movie/show additions refresh og's own membership without opening the popup.
- The page rendered all credits server-side in this capture; no load-more button or lazy rows were found. The
  feature still observes the document and handles rows swapped or added later, and it is keyed by route so a
  title listed twice shares one in-flight add.
- Bulk **Watchlist all** was added the next day; see the 2026-11-05 entry above.
- Tests: `test/watchlist.test.js` covers credit-row route/control reading;
  `test/watchlist-credits-integration.test.js` covers built-bundle mounting, movie/show adds, native membership,
  custom-list names, lazy/removed rows, signed-out guidance and route teardown. `npm run drift` now checks the
  credit-row poster link and list control on the live person page.

## 2026-11-03: feature toggles (feature 20)

- Disabled feature ids live in `features.disabled` (GM storage). Storing the disabled list instead of an enabled list
  keeps every new feature on by default and lets removed features leave harmless stale ids behind. Malformed values and
  non-string entries are ignored.
- `createFeatureHost` takes an `isEnabled(id)` predicate. It checks that before `match`, so a disabled feature is not
  mounted and any existing node is destroyed. Commands dispatch `ogt:featurechange`, which main wires to the same
  host sync used by auth changes and route settles; re-enabling mounts again without a reload. Injected feature CSS is
  page-wide and stays in place while a feature is off.
- Toggle entries use `FEATURE_LABELS` in `menu.js` and appear in `FEATURES` order after the other commands.
  Managers that cannot relabel commands show `Toggle <label>` and report the new state in a toast.
- Drift: panel pages now name their feature. On live `og.trakt.tv` captures the script boots the bundle once normally
  and once with `features.disabled` set to that feature, then reports drift if the panel still mounts. The origin is
  explicit (`OG_ORIGIN = 'https://og.trakt.tv'`); no classic `trakt.tv` page is fetched. This doubles the bundle boots
  for panel pages, so the daily check takes roughly 10 seconds longer and peaks around 1.4 GB RSS (27 s locally).
- Tests: `test/features-menu.test.js` covers host skip/destroy/remount, all menu labels, immediate toggle persistence,
  stored-off loading and malformed storage. `npm test` and `npm run build` pass.

## 2026-11-03: drift coverage for watchlist/library actions and native modules (feature 18)

- Live page checks now cover features 12–13: `.summary-frame #overview .top .actions`, the summary
  `.list-control.summary`, its `button[aria-controls][aria-keyshortcuts~="ArrowDown"]` picker trigger, and
  `.quick-icons .list-control.card` on the `/movies/trending` listing page. The listing page is a separate drift page;
  it has no toolkit panel to boot.
- Native modules are checked statically. A page gives the SvelteKit app entry (`/_app/immutable/entry/app.*.js`); app.js
  gives `../nodes/0.*.js`; the root layout gives its same-origin static imports. The imports feed the same
  `nativeToastImports`/`isNativeToastStore` and `nativeLibraryImports`/`isNativeLibraryStore` validators the runtime
  uses, and only already-loaded public chunks are read. Missing layout/import/store is drift. No page-realm script is
  injected and no account is used.
- The drift script uses an explicit `OG_ORIGIN = 'https://og.trakt.tv'`; it never fetches classic `trakt.tv`. The
  current live layout and app entry resolve the root and both stores as of this check.
- Tests: `test/og-drift.test.js` covers the action/list-control/picker/card selectors and the static native discovery
  (app entry → root layout → chunk validation, missing layout, missing stores). `npm run drift` was run live against
  og.trakt.tv; all pages and the native row passed.
- `npm run drift` peaks around 1 GB RSS (main was ~860 MB before the listing page): happy-dom parses each full live page
  and boots the bundle into it. Don't run it under the 512 MB test heap cap; that cap is for `npm test`.

## 2026-11-03: undo on success notices (feature 19)

- Undo lives on the toolkit's matching fallback notice, not og's native toaster. Undoable saves therefore show the
  fallback notice directly; the native notifier is still preferred for other toolkit notices (and for additions that
  were already on the list, which get no Undo). This keeps the button inside the notice, as og's private Svelte toast
  store has no action API. The small in-place Undo variant was dropped: exercising it in a built-bundle native-toast
  harness made happy-dom grow until the test process ran out of memory.
- Remove calls use the exact add body: `POST /sync/watchlist/remove` or `POST /sync/collection/remove`. Undo restores
  the action locally and then requests the same native refresh as the add (watchlist picker read for movies/shows,
  native overlay refresh for library titles).
- Undo is offered only when nothing pre-existed: watchlist checks the add response's `added` count for that media type
  (`existing` gets no Undo); collection requires `added > 0` with `updated` and `existing` both 0 (api-help's
  `collectionAddResponseSchema` reports all three). The collection response reports only counts, not which ids were
  updated or already there, so a mixed season/show add is intentionally left without Undo rather than removing items
  that were already in the library.
- After navigating away, the notice's Undo is removed on click with a short note instead of writing: the page that made
  the save is gone, so it can't restore its button.
- `watchlistApi` and `libraryApi` now return the save `body` and an `undoable` flag. Each feature tracks an operation
  generation so an Undo started while the add's native refresh is still running is not overwritten by that add's
  `finally` block.
- Tests: `test/undo.test.js` covers the remove bodies, the `existing`/`updated` guards, fallback toast failure and
  retry, the stale-page Undo, and built-bundle Undo for the watchlist page, library page and cards. Existing
  notification assertions now read `.ogt-watchlist-toast__message`, since the notice also contains Close/Undo text.

## v0.3.0 (2026-11-03)

Release of everything since v0.2.0, so userscript managers offer the update:

- **Season chart:** your own ratings as a blue line with your average, plus a heart average on season cards
  (features 7 and 8). The More button and its watchers/comments lines are gone (15).
- **Last month in review** card on the dashboard (6).
- **Add to library** on title, season and episode pages, and one-click **Add to watchlist** on pages and movie/show
  cards, with og-style notices and og's own state refreshed without a reload (12 and 13).
- **All lists** in og's Lists dropdown: personal, collaborations and liked lists in one scroll, styled like og's rows (11).
- **Custom links** on season and episode pages use the show's title and ids, and take the season and episode from the
  page (16).

The user verified the watchlist, library and all-lists features on a real account in Zen and Brave. 238 tests pass.

## 2026-11-03: all lists in one view (feature 11)

- The first version (a **Show all lists** button below the personal list) was replaced: **All lists** is now a choice
  in og's own Lists dropdown (`ListsPage.svelte`), added after Collaborations as a real link to
  `/users/:id/lists#ogt-all-lists`. On the personal page the click switches in place; from smart, collaborations and
  liked pages og's router follows the link and the hash opens the view. Any other dropdown choice restores og's view.
- Routes (trakt-og d41f511): `/users/:id/lists`, `/smart-lists`, `/lists/collaborations`, `/lists/liked`,
  `/lists/liked/official`. `parseRoute` names them; single lists, `/smart-lists/:slug` and comments stay `other`.
- Requests follow `loadLists.ts`: collaborations in one request (not paginated); liked lists in pages of 250, up to
  ten, newest first. Signed in, both go through the toolkit's OAuth (private lists the viewer can see, page-count
  header); signed out, `apiGet` with the client ID reads liked pages until a short one, since the public cache keeps
  no headers. `/users/:id/likes/lists` sends empty posters, so each liked row reads `/lists/:id?extended=images` as it
  nears the viewport (as og's `fetchListPosters.ts` does), once per list per page load.
- Styling: rows use ListRow's markup. When the page has a native row, the view takes `section.lists`' and its
  container's classes, rows take ListRow's `svelte-*` scope class, and the likes, count, tag, share and progress
  elements are cloned from og's own (tooltips stripped), so og's CSS styles them. The toolkit CSS applies only under
  `.ogt-all-lists--fallback` (a profile with no personal rows). Checked against a saved live page with og's CSS.
- Tags follow `ListTag.svelte`: Private, Following (friends), the blue Link (shared by link), Official List.
- Like og's rows: owners get og's VIP label (Director, VIP, OG/EP tag from the list's `user` fields, cloned from a
  native `.label-vip` when the page has one, else drawn with og's VipLabel CSS ported to `.ogt-vip`; the years star
  is left out), descriptions keep single-newline line breaks, and signed in, the
  likes pill is filled (GlassAction `tinted selected`, solid thumb) for lists the viewer liked. On the viewer's own
  profile that's every liked row; elsewhere it reads the viewer's liked lists too. Not copied: og's "Following"
  relation tag on owners the viewer follows (needs the viewer's network).
- Dropped from the second draft: "Stop collaborating". og's `leaveList.ts` calls `DELETE /lists/:id/collaborators/:user`,
  which it notes has no public API contract (official client only), so it would fail for a toolkit app; it was also
  irreversible without a confirm. Likes stay a count: the toolkit doesn't like or unlike lists.
- Tests: `all-lists.test.js` (data) and `all-lists-integration.test.js` (built bundle on a trimmed live page fixture,
  `ALL_LISTS_HTML`): menu placement, in-place switch and restore, native classes, liked paging signed in and out,
  the link from other pages, pages left alone, error messages and the fallback.
- Live check in a userscript manager, signed in and out: done by the user (2026-11-10).

## 2026-11-02: season chart cleanup and show-aware custom links (features 15 and 16)

- Feature 15 removed the chart's **More** button, watchers/comments lines, right-hand count axis, legend entry and the
  per-episode `/stats` requests. `getEpisodeStats`, `mapStats`, `drawExtras` and the 30-episode skip hint are gone;
  the personal ratings line now draws in `season-chart/personal.js`. The static Y scale is back to the 12px right
  gutter. `your-ratings-integration` now asserts that neither normal nor 31-episode seasons make a `/stats` request.
- Feature 16 fixed custom links on season and episode pages rather than hiding the panel. Live checks on
  2026-11-02 (`/shows/breaking-bad/seasons/1` and `/episodes/1`): the headings are **Season 1** / **1x01 Pilot**
  with that season or episode's year, so title/year were wrong. The show name is available as the first
  `.title-tags a[href^="/shows/"]` link to the show root. og's TMDb links start with the show id on both pages
  (`tv/1396/season/1`, `tv/1396/season/1/episode/1`) and the season page's IMDb link is the show's
  (`tt0903747/episodes?season=1`), so those are read from the page; an episode page's IMDb link is the episode's
  (`tt0959621`) and is not reused.
- Only what the page lacks is looked up: the show's year, and an episode page's IMDb id. With a client ID, the panel
  fetches the basic `GET /shows/:id` (title, year and ids; `extended=full` isn't needed) once a link needs one of
  those, checked on every render, so a link added in the editor triggers it too. `showTemplateData` fills only the
  missing values. `{season}`/`{episode}` come from `selectionForRoute`:
  season pages have the route season and no episode, episode pages have both, and title pages keep the picker and
  stored selection. Season/episode pages never render the picker and never call the seasons endpoint.
- Without a client ID, season/episode pages still use the show link for the title and og's show ids, while `{year}`
  links (and `{imdb}` on episode pages) stay hidden instead of pointing at the season/episode. The page year is that season or episode's, so
  it is not used as a fallback. Title pages are unchanged.
- New live-shaped season and episode fixtures, `readTitleData`/`selectionForRoute`/`showTemplateData` unit tests, and
  built-bundle integration tests cover the API-filled, no-client-ID and episode-IMDb cases. `npm run drift` checks the
  show link and the show-id links on live season and episode pages.
- Test pitfall: a failing `assert.equal(element, undefined)` on a happy-dom element makes Node print the element, which
  runs the test process out of memory. Compare a boolean instead.

## 2026-11-01: library feedback and native refresh (feature 12)

- Live confirmation: the user tested and confirmed both PRs on a real account in Zen and Brave, using the
  real Trakt API. This includes their confirmation after the latest library handoff change and supersedes
  the general pending-live-verification notes. Individual failure/CSP/account-switch cases were not enumerated.

- The user's recording confirms native library controls refresh, with a short gap after success. OG's native
  removal updates its local overlay optimistically, while toolkit additions wait for OG's authoritative reads.
  There is no artificial delay to remove. Start public overlay-module discovery alongside the toolkit lookup/
  save instead of after it; native account reads still begin only on successful POST. While refreshing, retain
  a disabled **Updating library…** row until OG renders its own control (or refresh ends). This prevents the
  empty-slot/layout jump without faking membership or a clickable remove action. Full network latency cannot
  be eliminated by this change. Auth changes/failures reset the pending row as before.
  Full tests/build pass; the built-bundle test proves discovery happens during a held lookup and the row
  remains disabled through a held native refresh. Actual OG/Svelte Chromium and Firefox checks with delayed
  native responses pass: the pending row and native control occupy the same vertical slot, with one toolkit
  POST and no page errors. The user’s recording confirms the prior signed-in movie add/native-remove flow;
  the user subsequently confirmed the updated feature live in Zen and Brave (see above).

- Branch `fix/library-button` starts at `e739dce` on `feature/watchlist-button`, retaining its watchlist work.
  No toolkit library shortcut is added to cards, and no version is bumped.
- Library success now says **You added TITLE to your library.** through the same native notifier and styled
  fallback used by watchlist. The title is read from OG’s SummaryTitle text nodes, excluding the separate year
  and certification. No extra API request is needed; the collection payload, aired-episode confirmation and
  specials handling are unchanged. All existing library title/season/episode actions share this notification.
- Verified upstream main is still `4bdefaf4e` on this check. MediaCollection’s `open` does not reload collection
  state and may have no rendered control when uncollected. The list-picker refresh cannot update collection.
  `startOverlay` uses `overlay.recheck()` on visibility (throttled to once/minute); its `refresh()` bypasses
  that throttle, reads last activities, and reloads stale collection slices through OG’s own viewer fetch.
- A temporary page-realm module bridge discovers the already-loaded overlay import from the root layout’s
  start/stop/recheck usage, validates the collectionCounts/state/refresh/recheck/patch shape and calls only
  `refresh()`. It never calls start/stop/reset/patch, reads tokens, fakes a native write or copies toolkit
  collection results into OG. Thus different OG/toolkit accounts remain separate. Positive signed-in header
  markup is required; movies and whole shows only. Season/episode pages retain the reload fallback.
- Module discovery is shared with native toast discovery under `src/ui/`, reading cached same-origin public
  JavaScript without credentials and without fixed hashes/export aliases. The success UI and its CSS are now
  shared too; old watchlist exports/classes stay compatible. Library refresh cleanup covers errors, timeout,
  account changes and navigation. Library lookups/results now also check the current path and connected node.
- Unit/built-bundle tests cover title extraction, loaded-module discovery, movie/show refresh, separate
  accounts, signed-out OG, blocked modules, native read failures, failed writes, navigation/auth races and
  native removal restoring the toolkit action. `npm test` passes (25 test files) and `npm run build` succeeds.
- Browser validation uses the actual captured OG Svelte app, real overlay `start`/`refresh`, collection controls
  and Toaster, with an isolated mock overlay user/header and all API responses mocked. Chromium and Firefox
  each passed movie/show × native/fallback notification cases: one toolkit POST, a second native activity
  check, collected state and native controls updated, no popup, no remaining bridge scripts or page errors.
  Chromium with a real CSP blocking inline scripts kept the addition, showed one fallback, left native state
  unchanged and cleaned up the blocked bridge. Watchlist’s native/fallback title notifications, matching
  dimensions (subpixel tolerance), stacking and Close behavior also passed in both browsers after sharing UI.
  The user subsequently confirmed both features on a real account in Zen and Brave (see above).

## 2026-11-01: one-click watchlist (feature 13)

- Live confirmation: the user tested and confirmed both features in PR #10 (watchlist) and PR #11 (library)
  on a real account, in Zen and Brave, using the real Trakt API. This supersedes the general pending-live-check
  notes below. Earlier local browser checks remain identified as mocked; the user did not enumerate every
  media type or failure scenario individually.

- User clarified their Firefox failure is specifically 150–170% zoom; 180% grows the cards again. Removed
  the fixed-width container query and all geometry/ResizeObserver hiding. Poster-only CSS now hides at
  1.5 <= resolution < 1.8dppx and restores at 1.8dppx. Narrow cards alone no longer hide the shortcut.
  This maps to that zoom band on a 1x/100%-scaled desktop; CSS resolution includes display scaling, so
  this is an explicitly documented approximation, not a universal exact-zoom detector. Native membership
  hiding, movie/show scope and fanart layout stay unchanged. Earlier overflow approaches below are superseded.
  Full tests/build pass. Captured-page Chromium/Firefox checks emulate 1.0/1.3/1.5/1.7/1.8/2.0dppx at
  150px and 240px card widths, verifying the media rule rather than actual browser toolbar zoom. The
  user subsequently confirmed both features live in Zen and Brave; see the confirmation above.

- User reported the first space-based fix still clips Social Feed ratings at 150% in Zen. The earlier browser
  check converted a fanart card and tested only two widths; it did not validate the actual signed-in Social
  Feed at 150%. A saved real poster with a modeled native rating button did not reproduce that exact failure.
  Added an independent CSS container-query fallback: poster action bars at 180 CSS px or narrower hide the
  toolkit icon regardless of JS overflow measurements. This preserves native card sizes and does not depend
  on devicePixelRatio or hide wide cards on high-DPI displays. Also measure the actions plus full rating text
  (Range bounds/padding) so a clipping rating wrapper cannot disguise the needed width. Built-bundle tests
  cover a clipped rating whose outer bar reports no overflow. Full tests/build pass. Chromium and Firefox
  verified the CSS fallback on captured real poster markup across 150/180/182/183/200px outer widths,
  deliberately overriding JS dimensions to report spare room; CSS hid/restored correctly, with a mocked
  save at the wider width. Zen signed-in zoom was later verified by the user (2026-11-10).

- Poster-card shortcuts now hide when their action bar/rating would overflow, measured with the shortcut
  present. A ResizeObserver, window resize and font-load updates restore the shortcut when space returns.
  This follows actual card space at any zoom rather than guessing zoom from display pixel density; fanart
  cards retain their existing layout. Cleanup disconnects observers and removes listeners.
  Full tests/build pass. Captured OG markup/CSS in Chromium and Firefox verified wide → narrow → wide
  transitions: shortcut visible → hidden → visible, no action-bar overflow, and a successful mocked save.
  Browser zoom on the signed-in history page was later verified by the user (2026-11-10).

- Restricted card shortcuts to movies and whole shows at the user’s request. Up Next episode cards and season
  cards have no bookmark action, even when their subtitles link to the parent show. Recycled cards lose the
  shortcut when their canonical link becomes an episode/season. Title-page actions remain unchanged.
  Unit and built-bundle integration tests cover excluded cards and show-to-episode recycling.

- Softened the card bookmark to OG's muted list-action blue (`--brand-fifth`) instead of bright cyan, with rounded
  stroke joins. Hover uses the same muted blue; title-page action styling is unchanged.
- Success notifications now match OG's wording: **You added <title> to your watchlist.**, including when native
  refresh is unavailable. The title comes from the existing public API lookup, with no extra request; both
  the native bridge and fallback render it as text, including punctuation/markup-looking titles.
  Verified the exact Spider-Man example in native/fallback paths in Chromium and Firefox. A Chromium native
  test also rendered a title containing quotes, `</script>` and an HTML-looking image as literal text without
  creating HTML or running its handler; unit/built-bundle tests cover API title propagation on pages and cards.
  The account distinction stays in button tooltips/README, rather than the success message. Native refresh
  failure no longer repeats the success toast with a reload hint; the addition is already saved.
  Checked `components/toast/toast.svelte.ts` and `Toaster.svelte`: OG's notifications are a private reactive Svelte
  store, with no public window API or custom-event listener for external callers.
- At the user's request, tested importing that store in the page realm: it does drive OG's real notifier.
  The toolkit now discovers the root layout's toast import using its `list`/`dismiss` references, validates
  the loaded module's `list`/`success`/`error`/`dismiss` shape, and invokes `success` through a temporary module
  script in the page realm. Importing from a userscript sandbox alone would create a separate Svelte singleton.
  No build hash/export alias is fixed in the source. Only already-loaded, same-origin immutable public assets
  are eligible, fetched with `credentials: omit`/`force-cache`; discovery is cached for the page and bounded.
  The bridge removes its script/listener and times out to the fallback if CSP or module changes block it.
- The fallback is independent toolkit markup using OG's toast design tokens: top right below the header, dark
  glass, green check/timer, Close button, five-second dismissal, pause on hover/focus and one second after leaving.
  It stacks below existing native notices rather than overlapping or modifying them, and respects reduced motion.
  Other toolkit notifications keep their existing appearance. No additional API writes or userscript grants.
- Notification validation: `npm test` and build pass; pure discovery/validation tests plus fallback dismissal and
  stacking tests. Chromium 156 and Firefox 157 booted the actual captured signed-out OG page and its real public
  Svelte modules (not a modeled Toaster), then the built bundle saved through mocked GM requests. Both rendered
  the actual native success toast with one POST and no fallback/remaining bridge script. Deliberately changed
  the discovery response to test fallback: both matched native width (360px), font (14px), background and height
  (52px), sat 8px below an existing native toast, and dismissed via Close. Also injected a real browser CSP
  blocking inline module scripts: both browsers recorded the blocked bridge, removed it, and showed exactly
  the matching fallback with one mocked POST and no page errors. Chromium also verified pause past five seconds
  on hover, continued pause with keyboard focus, then dismissal one second after leaving. The saved page's UTC
  zone must match the test browser, or OG's date-zone invalidation loops when its data requests are blocked.
  Live Violentmonkey/Tampermonkey sandbox and CSP behavior still need the user's check; discovery/bridge failures
  use the matching fallback rather than losing the success notification.

- Native-refresh follow-up: movie/show saves now ask OG's existing `MediaList` control to reread membership.
  Its `ArrowDown` handler calls `open(true)` (always the picker read, even if QUICK_ADD is later enabled), then
  `loadPickerLists` → `syncPickerOverlay` patches the same shared state used by OG's title buttons, card tooltips
  and picker rows. Cancel the picker's opening `beforetoggle` event after reconciliation so no popup appears.
  No native button click, second write, Svelte module import, cookie/token read or toolkit call to an og endpoint.
  The native app performs its own reads using its own account, so different accounts are not falsely reconciled.
- Only attempt this with positive signed-in header markup (`header.top-nav .profile`), an idle closed picker,
  and its advertised ArrowDown shortcut/controlled popover. Missing/signed-out/busy controls and native load
  failures preserve the successful toolkit add; reloading remains the fallback for native state. Auth changes and teardown remove
  refresh listeners/observers. The guard remains until the native load completes, including slow requests.
  Source detail: `loadPickerLists` explicitly omits fresh season/episode Watchlist membership, so those saves
  retain the reload fallback rather than claiming the picker can refresh them.
- Refresh validation: unit tests cover the forced read-only event, popup suppression, signed-out/busy/open
  controls, season/episode skips, native load failures and cleanup. Built-bundle tests model MediaList's event
  contract to check one toolkit POST, no native click/write, updated title/card/picker membership, preservation
  of custom lists, different accounts, a preserved successful add on native failure, and no refresh after a
  rejected POST. Saved-page Chromium 156 and Firefox 157 checks passed for title and card actions using the
  real Popover API with a modeled native loader: one POST, one native read, checked Watchlist row, canceled
  popup opening and no page errors. This still needs a real signed-in userscript-manager check of the native
  refresh path.
- Follow-up: the user confirmed title-page adding works with the toolkit on their own account (browser/media
  types unspecified). Added a bookmark shortcut immediately after the blue lists control on poster/fanart cards,
  including cards inserted or recycled during browsing. This extends feature 13; feature 14 (library on cards)
  was later dropped: cards are too tight, and the watchlist is the card action that makes sense.
- Card check: saved live `/movies/trending` and checked `QuickIcons`, `PosterCard`, `FanartCard`, `MediaList`,
  `Tooltip` and `ListedTip` at the upstream commit below. Cards still use the picker. The canonical image link
  identifies each card's own movie/show/season/episode, rather than the page route or a subtitle's parent show.
  Native `aria-describedby` points to an always-rendered tooltip; only its `.listed-tip` link to
  `/users/:slug/watchlist` proves Watchlist membership. A custom list named Watchlist uses `/lists/:id` and
  does not hide the shortcut. No per-card requests occur until clicking, and no og session/internal API is read.
- Card buttons share the existing API and bookmark glyph. Within a mounted page, duplicate card URLs share busy
  and successful-add state. Native removal restores the shortcut, sign-in changes clear local state, and pending
  lookups cancel on navigation, card removal or recycling. A hydration-gated observer handles lazy/replaced
  controls; teardown removes the observer, marker and all per-card listeners/buttons. Small cards use og's 28px
  action width and 34px button height; full cards use og's action width and 40px bar height.
- Card validation: new data-reader tests and built-bundle integration coverage for all four media types, lazy and
  recycled cards, duplicate saves, native custom/mixed-list membership, failure/retry, account changes and
  navigation. Local saved-page Chromium 156/Firefox 157 checks passed with mocked GM/API responses and og's CSS:
  fanart controls match 35×40px native buttons; poster controls match 28×34px; keyboard focus, exact-item POST,
  success hiding and no page errors. Live signed-in card clicking and native tooltip/overlay updates in the
  userscript manager still need a user check.
- Started from main `1746380`. Checked live signed-out HTML for `/movies/fight-club-1999`,
  `/shows/breaking-bad`, `/shows/breaking-bad/seasons/1` and `/shows/breaking-bad/seasons/1/episodes/1`.
  All have `.summary-frame #overview .top .actions .action-buttons` and **Add to list**, not a direct watchlist
  action. `WATCHLIST_HTML` is a hand-trimmed fixture of that shared structure.
- Checked full trakt-og history at `4bdefaf4e`: `ActionButtons.svelte` delegates to `MediaList.svelte`.
  `git log -S 'quickAdd'` and `git log -S 'QUICK_ADD'` trace `QUICK_ADD = false` to `858973bfb`
  (2026-10-28): always open prompts because users cannot change the old quick-add account settings in og.
  `ff795e338` also labels the signed-out button **Add to list**. `git log -S 'watchlist'` on `ActionButtons`
  shows no subsequent standalone title-page action. A separate direct `WatchlistButton.svelte` exists, but its
  current callers are dashboard `RecommendationSpotlight` and onboarding `PickPoster`, not title pages
  (checked callers and `git log -S 'WatchlistButton'`). All four title routes exist in the source.
- `SeasonPage` and `EpisodePage` also pass their exact `listTarget` to `ActionButtons` and get the same picker.
  The toolkit therefore offers one-click adds on those pages too. Movies/shows resolve through their public
  detail endpoint; seasons resolve through `/shows/:id/seasons` by season number (including season 0);
  episodes use their exact detail endpoint. No collection expansion, aired-date filtering or confirmation is
  needed: each POST to `/sync/watchlist` contains one numeric Trakt ID under its own media type.
- Native `.selected` alone means membership in any list, not necessarily Watchlist. Read **Listed On** plus
  `.detail` equal to **Watchlist** or beginning **Watchlist +**; **3 lists** keeps the action visible.
  The source-derived signed-in variants are tested separately from the live signed-out fixture.
  As with library, a mutation observer follows native changes, success hides locally, and a native
  watchlisted → not-watchlisted transition restores the action. Toolkit and OG accounts can differ.
- Shared `src/ui/action-button.js` extracts only feature 12's CSS and action-stack lookup; its generated CSS,
  collection requests, observer and sign-in behavior are unchanged. Watchlist accepts a positive matching
  `added` or `existing` count; empty responses and any non-empty/malformed `not_found` entries fail visibly.
  Auth changes/navigation cancel pending lookups and ignore late write results. No authenticated watchlist
  prefetch or private response cache was added.
- Validation: `npm run build` and `npm test` pass, including library tests and watchlist unit/built-bundle
  tests for all four media types, sign-in guidance, duplicate clicks, native changes, rejected additions,
  account changes and navigation. Playwright's live og navigation returned Cloudflare 403, while browser-UA
  curl captures succeeded. Local Chromium/Firefox checks use that captured movie HTML and og's downloaded CSS,
  the built bundle at document-start, and mocked GM/API responses; they do not run Svelte or a userscript manager.
  Passed in Chromium 156 and Firefox 157 at 1280px and 800px: 60px action height, keyboard focus, exact POST,
  success hiding, native mixed-list removal restoring the action, sign-out guidance, navigation cleanup and no
  page errors. At 390px og's own `MobileSplash` clips the app and prevents interaction; no phone pass is claimed.
  The user subsequently confirmed actual title-page adding (see above). Remaining specific checks in Chromium
  and Firefox with Violentmonkey: card writes, season/episode support if not covered by that confirmation,
  OG's live overlay updating/removing Watchlist alongside other lists, and differing OG/toolkit accounts.

## 2026-11-01: last month in review (feature 6)

- og check (trakt-og `4bdefaf4e`: `DashboardPage.svelte`, `RecapRibbon`, `LastThirtyDaysPanel`,
  `traktUrls.monthInReview`; `git log -S monthInReview`): og has the month strip and rolling thirty-day stats, but no
  last-calendar-month card. Its review URL is `https://app.trakt.tv/users/:slug/mir/:year/:month`.
- The dashboard is session-only, so signed-out captures of `/` and `/dashboard` have no `nav.ribbon`; the integration
  fixture is transcribed from `RecapRibbon`. The drift check lists it as "not checked (needs login)".
- `apiAuth` takes an allowlist of query options (`page`, `limit`, `start_at`, `end_at`, `extended`); `apiAuthPage`
  also returns `X-Pagination-Page-Count`. History and comments are paginated. `/sync/ratings` has no date filter, so
  it is fetched once unpaginated (Trakt returns everything without `page`) and filtered locally.
- Counts use a half-open local calendar month, so boundary plays are not counted twice. Hours include rewatches and
  skip missing runtimes. The month name is always English, like og.
- Cache and dismissal are private GM storage keyed by account slug and month; the first seven days refresh at most
  daily for late syncs.
- History's `extended=images` fanart is the 1280px `medium` size; the card swaps in `full` (1920px). A fanart that
  fails to load is removed, leaving the plain background.
- Styling matches og: `--brand-primary` red, Figtree via og's font variables, og container widths so the card lines
  up with the ribbon and Up Next. Verified live 2026-11-01 on a real account (first play a movie); an episode first
  play was checked with a mocked mockup at desktop and phone widths.

## 2026-11-01: personal ratings (features 7 and 8)

- og check (trakt-og `4bdefaf4e`, `SeasonPage`, `ShowPage`, `ShowSeasonsPage`, `SeasonsGrid`; `git log -S`): og shows
  neither a personal episode-rating line nor episode-derived personal averages. Its season-rating corner
  (`userRating={state.rating}`, since `233a9354e`) is a rating you set on the season itself, not an average.
- `/sync/ratings/episodes` is shared by both features, deduplicated in flight and cached in memory for ten minutes;
  auth changes clear it and drop late results. The season episodes endpoint has no parent show id, so slugs resolve
  through the ratings response's show ids.
- Season cards (show page and `/seasons`) have og's quick-icons strip, a fixed-height flex row with `overflow:
  hidden` (`QuickIcons.svelte`). A badge after og's heart percentage was clipped by about 75% of its last digit, so
  the personal average joins the card subtitle instead ("13 episodes · ♥ 7.5" in blue, full text on hover). A show-wide
  average line above the seasons looked out of place without a chart, so it was cut.
- `/shows/:id/seasons/all` is og's "All Episodes" list, not a seasons grid; the router names it `all-episodes` and no
  feature mounts there.
- Verified live 2026-11-01 in Zen + Violentmonkey with test ratings on Breaking Bad 1x01–1x05 and 2x01–2x02 (added and
  then removed through the API): chart line with gaps, season summaries, card badges.

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
  tested against a trimmed fixture; live playback in a userscript manager was later verified by the user (2026-11-10).

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
