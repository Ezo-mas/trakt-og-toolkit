# Feature plan

The roadmap for Trakt OG Toolkit: what is still to build, and the rules every feature follows. Ideas come from classic
Trakt and [Fenn3c401/Trakt.tv-Userscript-Collection](https://github.com/Fenn3c401/Trakt.tv-Userscript-Collection).
Everything is **written from scratch**: that collection is GPL-3.0 and this project is MIT, so read its docs for
behaviour, never its code. Finished features are listed at the end; their details live in NOTES.md and git history.

## Up next

| # | Feature | Needs | Status |
|---|---|---|---|
| 30 | Trakt onboarding without manual API setup | Trakt's answer on app access | blocked on Trakt |
| 27 | Resolve external site IDs for direct custom links | public lookup services | planned |
| 28 | Conditional presets and person-page custom links | genre/person metadata; 27 for anime | planned |
| 31 | Trakt ratings distribution in the summary's empty space | client ID optional | backlog |
| 23 | Test suite review and cleanup | — | before 0.4.0 |

Then live testing and the **0.4.0** release. Userscript managers only offer an update when `@version` changes, so bump
it whenever main should reach users.

**Not planned, og already ships these:** ratings distribution chart (`/stats` pages; feature 31 only mirrors it into
the summary), trailers and videos, external links and ratings strip, profile cover images, list pages, header
navigation. Also not planned: anything that unlocks VIP features, scheduled e-mail exports, fixes for the classic
site.

## Rules for every feature

**Before starting**

- Read `NOTES.md` (context, the hydration gate, the og Gecko bug) and `src/features/custom-links/` (the reference
  feature).
- Check the og route you target exists in [trakt/trakt-og](https://github.com/trakt/trakt-og)
  (`projects/client/src/routes/`) **and** is live on og.trakt.tv. Check that og doesn't already do what you are adding;
  og changes daily.
- Save a real page for fixtures: `curl -sSL https://og.trakt.tv/<path> -o /tmp/page.html`, then trim it by hand into
  `test/fixtures.js` like the existing `SHOW_HTML`.

**Where code goes**

- One folder per feature: `src/features/<name>/index.js` (mount and UI), `data.js` (pure DOM readers and transforms),
  `api.js` (Trakt calls via `apiGet` from `src/core/trakt.js`), `styles.js` (exports a CSS string).
- The feature object is `{ id, css, match(route), mount(route) }`. `mount` returns `{ node, destroy }` or `null` to be
  retried. `destroy` must remove the node, clear timers and remove listeners. Returning anything else leaks
  (see NOTES.md, "Cleanup").
- Register it with one line in `FEATURES` in `src/main.js`. That is the only shared file most features touch.
- Storage keys go in `STORAGE` in `src/core/store.js`; menu entries in `src/menu.js`. Keep those edits small, since
  other agents edit them too.
- Route info comes from `parseRoute()` in `src/core/router.js` (`name`: `title`, `seasons`, `season`, `episode`,
  `stats`, …; plus `kind`, `id`, `season`, `episode`). Extend the parser and `test/router.test.js` if you need a route
  it doesn't name.

**How it must behave**

- Never touch og's DOM before the hydration gate opens. The host already handles this; don't add your own early mount.
- Selectors: semantic classes and ids only, never `svelte-*` hashes. Insert next to og's nodes; don't move or restyle
  og's own elements.
- Prefer the public Trakt API over scraping the page. DOM reads are fine for ids og already prints.
- All CSS classes start with `ogt-`. Use `light-dark()` colours like `src/ui/styles.js`.
- No runtime dependencies. Charts are hand-written SVG; the bundle must stay a single small file.
- Missing client ID or API failure: show nothing or a one-line hint, never an error box. Log with `debugError`.
- Respect the API budget: `apiGet` caches for 8 h and limits to 4 concurrent requests. Don't fetch per-episode data
  for a whole show at once; fetch the season being viewed.

**Done means**

- `npm test` passes with new unit tests for `data.js` and an integration test that boots the built bundle on your
  fixture (see `test/integration.test.js`).
- `npm run build` succeeds, and the feature works in a real browser on og.trakt.tv (`npm run dev` + Violentmonkey, see
  NOTES.md). Check Firefox and a Chromium browser.
- README gets a short user-facing section; NOTES.md gets anything surprising you found about og.
- Don't bump the version or touch `@namespace` in `build.mjs`.

---

## 30. Trakt onboarding without manual API setup

**Status:** blocked on Trakt (2026-11-08). Goal: a user installs the script and signs in, with no developer-portal
steps.

**What we found**

- Trakt's app form offers **Development** apps only. They accept localhost redirect URIs only, and "only you and
  people you add can sign in". **Production** apps are "currently unavailable", with a pointer to support@trakt.tv.
  So one shared Toolkit app can't sign other users in, not even through device-code sign-in, which never uses the
  redirect.
- og signs in with its own Client ID through `oidc-client-ts` (auth code + PKCE against `auth.trakt.tv`). It keeps the
  user, including the access token, in `localStorage` under `oidc.user:https://auth.trakt.tv:<client_id>`, and copies
  it into an httpOnly cookie via `/api/store-token` (`trakt/trakt-og` `lib/auth/userManager.ts`). A userscript on
  og.trakt.tv could read that token.
- An email to Trakt support asks for (1) a production app, or (2) permission to make API calls with og's existing
  access token.

**Paths, by Trakt's answer**

- **Production app granted.** Ship its public Client ID as the default with the existing device flow. Later add browser
  sign-in with [PKCE](https://developer.trakt.tv/docs/pkce) through the HTTPS callback page (below). Keep **Use your
  own application** under advanced settings and never switch a signed-in session to another Client ID silently.
- **og session allowed.** Read og's access token on og.trakt.tv and send it with og's Client ID. Never refresh it
  ourselves: og rotates the refresh token on renewal, so a second refresher strands og's session. When it expires or
  a call returns 401, wait for og to renew it (or ask for a reload). Never copy it out of the page realm, store it, or
  log it. Add the storage key to `npm run drift`. Keep the toolkit's own sign-in as a fallback.
- **Neither.** Keep per-user Development apps, but replace the manual instructions with a guided setup: open the form,
  show the values to enter, then ask for the Client ID. The localhost redirect is fine, because device-code sign-in
  never uses it. Separately, check from a second account whether public (unsigned) API calls work with a shared
  Development Client ID; if they do, ship it as the default for unsigned features.

**Callback page (merged in #34).** `site/` holds a placeholder that only strips query and fragment parameters, and
`.github/workflows/pages.yml` publishes it from `main` to `https://ezo-mas.github.io/trakt-og-toolkit/callback.html`.
Before the first run, set **Settings → Pages → Source** to **GitHub Actions**. Register the address as a redirect URI
only once a production app exists, and keep the existing redirect for current sessions.

**PKCE handoff (when a production app exists).** Generate a fresh S256 verifier/challenge and unpredictable state per
attempt, and keep the verifier in the userscript. Validate state, expiry, origin and the originating session, accept a
code once, and exchange it from the userscript. The callback page must not receive or store tokens or the verifier,
load third-party scripts, or leak parameters through referrers. Handle reloads, closed tabs, denied or expired consent
and concurrent attempts. Keep device flow as the fallback until PKCE works in Violentmonkey and Tampermonkey on Firefox
and Chromium.

**Scope:** `src/config.js`, `src/settings.js`, `src/oauth-menu.js`, `src/core/{oauth,store,trakt}.js`, menu labels,
focused OAuth/menu tests and README/NOTES (the README's setup section shrinks once this lands).

**Acceptance:** a fresh install, preserved custom app settings, approval/denial/expiry, cancellation, reload, refresh,
sign-out, account switches and credentials kept out of the page. Verify with a second Trakt account.

## 27. Resolve external site IDs for direct custom links

**Status:** planned. Improve destinations that currently search because Trakt does not provide
that site's identifier. Add only specific resolvers needed by enabled presets, reusing the existing custom-links
resolution path rather than building a general API wrapper or executing JavaScript stored in templates.

- **First: Metacritic and Rotten Tomatoes.** Prefer a valid direct URL already rendered by OG (Rotten Tomatoes
  already does this). Otherwise query Wikidata by a validated movie/show TMDb or IMDb id for
  [Metacritic P1712](https://www.wikidata.org/wiki/Property:P1712) and
  [Rotten Tomatoes P1258](https://www.wikidata.org/wiki/Property:P1258). Match the media kind, validate the returned
  identifier and destination host/path, and keep the existing search when no reliable match exists.
- Resolve on demand when a user activates a link. Cache successful mappings and deduplicate in-flight requests
  by service and title id. Use a bounded timeout and short-lived missing-result cache; transient failures must not
  become permanent misses. Check service terms, CORS/GM transport requirements and request limits before wiring
  endpoints into the existing HTTP layer; add only required `@connect` hosts.
- Keep the search URL usable while resolution is pending or unavailable. Upgrade the anchor when an exact URL
  resolves; preserve normal navigation where possible. Failed lookups remain retryable and must not leave
  `javascript:void(0)` links or remove the only click handler. Ignore late results after navigation/teardown.
- Verify Metacritic/Rotten Tomatoes season routes against actual site behavior. Resolve an exact episode id/URL
  only when trustworthy mapping exists; do not manufacture an episode slug from the episode title. Fall back to
  a verified season/show page or search when the specific episode cannot be resolved.
- **Then: anime IDs.** Check a maintained mapping source for TMDb/IMDb → MAL/AniList before implementation.
  Add direct links only for unambiguous anime/season matches; keep search for missing or ambiguous results.
  Do not globally rewrite Trakt season/episode numbering using fuzzy title matches. Any necessary destination-
  specific episode mapping stays local to that destination and must be verified.

**Scope:** the existing custom-links data/API/preset modules plus the smallest lookup helper, shared public HTTP
facilities, build metadata for required hosts, fixtures, targeted resolver/integration tests and README/NOTES.
Preserve the existing direct routes and per-user server URLs; no lookup should be needed for links already exact.

**Acceptance:** test correct movie/show matches, malformed/wrong-host results, missing/ambiguous mappings, timeouts,
rate limits, concurrent clicks, retry after failure, cache reuse and navigation during lookup. Verify representative
live destinations before shipping. Lookups must not block initial page rendering or all other custom links.

## 28. Conditional presets and person-page custom links

**Status:** planned. Anime direct destinations additionally depend on feature 27's ID mapping.
Show relevant presets in the new placements without requiring users to manage separate movie/show/person lists.

- Extend existing preset kind restrictions with only the context needed by concrete presets: e.g. anime-only
  destinations when reliable genre metadata is available. Reuse DOM metadata or existing public API results;
  do not fetch every title's full details merely to decide whether to draw an icon. Unknown metadata must not
  silently delete saved links, and genre restrictions apply to known presets rather than arbitrary user templates.
- Extend the existing custom-links feature to person pages using `parseRoute`'s existing person route. Read the
  person's name and available identifiers; do not feed person ids into movie/show templates. Pick a small useful
  starting set, such as YouTube interviews and verified external profile links; do not duplicate pronunciation UI.
- Decide and document name/person-id template variables before exposing them in the editor. Unsupported
  placeholders hide the affected link safely, with existing movie/show/season/episode variables unchanged.
- Reuse the icon presentation, management UI, saved order and optional lookup behavior from 26–27. Check OG's
  native person external links first and avoid adding destinations that already cover the same need without value.

**Acceptance:** fixtures/tests cover anime versus non-anime/unknown genres, movie/show/person preset eligibility,
person variable filling and navigation between kinds, with no irrelevant presets or lost saved configuration.

## 31. Trakt ratings distribution in the summary's empty space

**Status:** backlog (2026-11-08). The action stack grew with Add to watchlist and Add to library (features 12–13),
so on movie, show, season and episode summaries the overview column under the tagline/overview text now ends well
above the buttons and leaves an empty block. Fill it with the **Trakt** section of the title's stats page: the 1–10
ratings distribution bars with the average marker, and the Rating / Votes / Most given / Liked it tiles. The user's
screenshots (2026-11-08, Dune: Prophecy show and S1E3) show the gap and og's `/stats` section to mirror.

- Check live og and `trakt/trakt-og` first: the summary's overview column, what already sits below the overview
  (playback progress on episodes, feature 2's panel), and how `/stats` renders the section, so the copy matches og's
  bar colours, labels ("Weak Sauce :(" … "Totally Ninja!"), heart icons and tile style. Build it ourselves; don't copy
  og's GPL code or styles verbatim into the MIT bundle.
- Data: with a client ID, `GET /movies/:id/ratings`, `/shows/:id/ratings`, `/shows/:id/seasons/:s/ratings` and
  `/shows/:id/seasons/:s/episodes/:e/ratings` return `rating`, `votes` and the `distribution`; the watcher share
  ("5.5% of watchers") needs the matching `/stats` endpoint's `watchers`, or drop that line. Without a client ID,
  decide between hiding the section and reading og's own `/stats` page (same origin, server-rendered); prefer the
  API per Trakt's policy. Derive Most given and Liked it (share of 7+) from the distribution.
- Only fill space that is actually empty: measure the overview column against the action stack and skip (or shrink to
  the tiles) when the overview text is long enough to reach the buttons. No layout shift for og's own content; mount
  after hydration, clean up on SPA navigation, and add a feature toggle (feature 20).
- Link the section to the title's `/stats` page. Accessible bars (names with value and label), keyboard focus, and
  no hover-only information.

**Scope:** a new `src/features/summary-ratings/` feature, shared `apiGet`, `src/ui/styles.js`, the feature registry
and menu toggle, trimmed live fixtures (summary pages plus a `/stats` capture), drift selectors, README/NOTES.

**Acceptance:** movies, shows, seasons and episodes, short and long overviews, titles with few or no votes, with and
without a client ID, Firefox and Chromium; the gap is filled without pushing og's content or the action stack.

## 23. Test suite review and cleanup

**Goal:** the suite grew feature by feature (about 390 tests in 40 files) and has leftovers: checks for removed
behaviour, overlapping integration tests, and fixtures that no longer match og.

- Remove checks that only confirm deleted code stays deleted, and merge integration tests that cover the same path.
- Replace hand-written fixtures with trimmed live captures where og's markup has moved on; keep each fixture's source
  and trakt-og commit in a comment.
- Never compare a happy-dom element in an assertion (`assert.equal(node, null)`): if it fails, Node prints the element
  and runs out of memory. Compare `Boolean(node)` or a count; there are about 30 to change.
- Run the suite with `NODE_OPTIONS=--max-old-space-size=512` while reviewing, so a runaway test fails fast.

## Shipped

Details for each are in NOTES.md and the merged PRs.

| # | Feature | Status |
|---|---|---|
| 0 | Foundation (shared CSS hook, exported `apiGet`) | done |
| 1 | Season chart | done |
| 2 | Playback progress manager (sign-in, paused playback) | done |
| 4 | Custom link presets | done |
| 5 | Small extras: name pronunciation | done; poster corners dropped |
| 6 | Last month in review card | done, 0.3.0 |
| 7–8 | Season chart: your ratings; your season and show averages | done, 0.3.0 |
| 9 | Playback extras: set progress | done |
| 10 | List preview posters link to their titles | done |
| 11 | All lists in one view | done, 0.3.0 |
| 12–13 | Add to library; one-click Add to watchlist | done, 0.3.0 |
| 15 | Season chart: remove the More button | done, 0.3.0 |
| 16 | Custom links on season and episode pages | done, 0.3.0 |
| 17 | Watchlist buttons on a person's credits | done |
| 18 | `npm run drift` covers features 12–13 and og's native modules | done |
| 19 | Undo on success notices | done |
| 20 | Turn features on and off from the menu | done |
| 21 | Month review: browse earlier months | done |
| 22, 24 | Presets that open the exact title, season or episode | done |
| 25 | Per-user server presets | done |
| 26 | Custom links below the poster, with logos and Watch Now | done |
| 29 | Shared authenticated-write queue and rate-limit handling | done |
| 3, 14 | Metadata links; Add to library on poster cards | dropped (og ships it; cards too tight) |

## Running several agents at once

- Give each agent one numbered feature from this file and tell it to read this file and `NOTES.md` first.
- Use a separate git worktree or branch per agent. The shared files are `src/main.js` (one line in `FEATURES`),
  `src/core/store.js`, `src/menu.js` and `test/fixtures.js`; resolve conflicts there by keeping both sides.
- `dist/trakt-og-toolkit.user.js` is committed. On merge conflicts in it, don't resolve by hand: run `npm run build`.
