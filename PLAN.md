# Feature plan

The roadmap for Trakt OG Toolkit: what is still to build, and the rules every feature follows. Ideas come from classic
Trakt and [Fenn3c401/Trakt.tv-Userscript-Collection](https://github.com/Fenn3c401/Trakt.tv-Userscript-Collection).
Everything is **written from scratch**: that collection is GPL-3.0 and this project is MIT, so read its docs for
behaviour, never its code. Finished features are listed at the end; their details live in NOTES.md and git history.

## Up next

Nothing is queued; v0.4.0 released everything shipped since v0.3.0. Userscript managers only offer an update when `@version`
changes, so bump it whenever main should reach users.

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
- Save a real page for fixtures: `curl -sSL https://og.trakt.tv/<path> -o /tmp/page.html` (or
  `npm run drift -- --save <dir>` for the drift pages), then trim it into `test/fixtures.js` like the existing
  `SHOW_HTML`. Say in a comment where it came from: the capture date and the trakt-og commit at that date.

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
  fixture (see `test/integration.test.js`). Run it with `NODE_OPTIONS=--max-old-space-size=512` so a runaway test
  fails fast.
- In tests, wait with `waitFor` from `test/wait.js` for anything that should happen; a fixed `wait()` is only for
  proving that something does not. Never put a happy-dom node in an equality assertion (`assert.equal(node, null)`,
  `assert.equal(a, b)`): a failure prints the node and runs Node out of memory. Use `Boolean(node)` or
  `assert.ok(a === b)`.
- `npm run build` succeeds, and the feature works in a real browser on og.trakt.tv (`npm run dev` + Violentmonkey, see
  NOTES.md). Check Firefox and a Chromium browser.
- README gets a short user-facing section; NOTES.md gets anything surprising you found about og.
- Don't bump the version or touch `@namespace` in `build.mjs`.

---

## Deferred

- **Anime ID mapping (from 27 and 28).** MyAnimeList and AniList stay searches. Before building direct links, find a
  maintained TMDb/IMDb → MAL/AniList mapping source, and link only unambiguous anime or season matches.
- **A shared production Trakt app (from 30): not happening.** Trakt doesn't grant production apps for tools that add
  features to its own product, so the toolkit reuses og's session instead, with a per-user app as the fallback. The
  PKCE browser sign-in and the `site/` callback page it was meant for have no use without one.

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
| 26 | Custom links below the poster, with logos and Watch Now | done, 0.4.0 |
| 29 | Shared authenticated-write queue and rate-limit handling | done, 0.4.0 |
| 23 | Test suite review and cleanup | done, 0.4.0 |
| 27 | Direct custom links from external ids (Rotten Tomatoes, Metacritic) | done, 0.4.0; anime deferred |
| 28 | Conditional presets and person-page custom links | done, 0.4.0; anime deferred |
| 30 | No API setup: reuse og's session | done, 0.4.0 |
| 31 | Trakt ratings chart in the summary's empty space | done, 0.4.0 |
| 3, 14 | Metadata links; Add to library on poster cards | dropped (og ships it; cards too tight) |

## Running several agents at once

- Give each agent one numbered feature from this file and tell it to read this file and `NOTES.md` first.
- Use a separate git worktree or branch per agent. The shared files are `src/main.js` (one line in `FEATURES`),
  `src/core/store.js`, `src/menu.js` and `test/fixtures.js`; resolve conflicts there by keeping both sides.
- `dist/trakt-og-toolkit.user.js` is committed. On merge conflicts in it, don't resolve by hand: run `npm run build`.
