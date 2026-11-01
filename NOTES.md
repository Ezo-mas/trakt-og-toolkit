# Notes

Working notes and known issues. Newest first.

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
  save at the wider width. Actual Zen signed-in zoom remains unverified.

- Poster-card shortcuts now hide when their action bar/rating would overflow, measured with the shortcut
  present. A ResizeObserver, window resize and font-load updates restore the shortcut when space returns.
  This follows actual card space at any zoom rather than guessing zoom from display pixel density; fanart
  cards retain their existing layout. Cleanup disconnects observers and removes listeners.
  Full tests/build pass. Captured OG markup/CSS in Chromium and Firefox verified wide → narrow → wide
  transitions: shortcut visible → hidden → visible, no action-bar overflow, and a successful mocked save.
  Actual browser zoom on the signed-in history page remains a live check.

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
