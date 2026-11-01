# Feature plan

What to bring back from classic Trakt (ideas from
[Fenn3c401/Trakt.tv-Userscript-Collection](https://github.com/Fenn3c401/Trakt.tv-Userscript-Collection)) now that
og.trakt.tv is live. Everything is **written from scratch**: that collection is GPL-3.0 and this project is MIT, so read
its docs for behaviour, never copy its code.

Each feature below is sized for one agent. Read "Rules for every feature" first.

## Status

| # | Feature | Needs | Can run in parallel with |
|---|---|---|---|
| 0 | Foundation (shared CSS hook, exported `apiGet`) | — | done |
| 1 | Season chart | client ID optional | done |
| 2 | Playback progress manager | OAuth | done |
| 3 | Metadata links | — | dropped: og ships it |
| 4 | Custom link presets | done | 1, 2, 3 |
| 5 | Small extras | — | pronunciation done; poster corners dropped |
| 6 | Last month in review card | OAuth | done |
| 7 | Season chart: your ratings + watchers/comments | OAuth (ratings) | done |
| 8 | Your personal season and show averages | OAuth | done |
| 9 | Playback extras: set progress | OAuth | small |
| 10 | List preview posters link to titles | check og first | small |
| 11 | All lists in one view | OAuth or public | lowest value |
| 12 | Add to library button | OAuth | done; user verified in Zen and Brave with real API |
| 13 | One-click Add to watchlist | OAuth | done; user verified in Zen and Brave with real API |
| 14 | Add to library on poster cards | OAuth | deferred; card layout undecided |

**Not planned, og already ships these:** ratings distribution chart (`/stats` pages), trailers and videos, external
links and ratings strip, profile cover images, list pages, header navigation. Also not planned: anything that unlocks
VIP features, scheduled e-mail exports, bug-fix patches for the classic site.

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

## 1. Season chart

**Status:** done (verified in Chromium and Zen/Firefox with og's ratings; the API path with a client ID is not yet checked).

**Already in og (checked 2026-10-29 on Breaking Bad):** every season card shows its rating (e.g. 90%), the season
page header shows the season rating, and every episode row shows its rating (e.g. 83%). Don't add badges for those.

**Goal:** a line chart of episode ratings on the season page (`/shows/:id/seasons/:season`), so the shape of a season
is visible at a glance. og doesn't have one.

**Data:** `GET /shows/:id/seasons/:season?extended=full` → each episode's `rating` (0–10), `votes`, `title`. Without a
client ID, read the rows instead: `section.episodes article.row`, `.titles .number` (`1x01`), `.rating-trigger .value`
(`83%`). Rows can be re-sorted by the user, so sort by episode number.

**Build:** a panel inserted before `section.episodes`; an SVG line with a dot per episode linking to it; a fixed-ish Y
scale (top 100%, bottom 50% or lower if needed) so seasons compare honestly; a dashed season-average line; hollow dots
for episodes under 10 votes, left out of the average; keyboard-focusable dots and light/dark colours.

**Later:**

- Your ratings and watchers/comments series: now feature 7.
- Vote counts next to og's episode percentages (og shows the % only).

## 2. Playback progress manager

**Goal:** see and manage partially watched movies and episodes (what a media player left paused). og has no UI for
this: its Progress page only has Watching, Rewatching and Dropped tabs.

**This needs signing in to Trakt** using the toolkit’s own OAuth connection (phase A).

### Phase A: OAuth (blocks phase B)

**Status:** done. Verified live against Trakt (sign-in, refresh, 401 retry, revoke) and in Violentmonkey; see NOTES.md. Phase B is below.

**Current API docs:** device flow no longer requires a client secret; OAuth uses `auth.trakt.tv`. PKCE is documented for the redirect-based authorization-code flow only. See NOTES.md for sources. The secret requirement below is superseded by these current docs.

- Use the device code flow, which needs no redirect page: `POST /oauth/device/code` with the client ID, show the user
  the code and verification URL, poll `POST /oauth/device/token`, then store the access and refresh tokens in GM
  storage. Refresh with `POST /oauth/token` before expiry.
- The token endpoints need the app's **client secret**. Each user brings their own app, so they paste their own
  secret into the menu, like the client ID. Store it only in GM storage, never in the source or the bundle. First
  check whether Trakt supports PKCE for this; if it does, prefer it and drop the secret.
- Add an `apiAuth(method, path, body)` next to `apiGet` in `src/core/trakt.js`, with no caching for authenticated
  calls, and a `isSignedIn()` helper. Menu entries: sign in, sign out, show signed-in user.
- Never read og's session cookie or its `/api/` endpoints. The toolkit signs in on its own.

### Phase B: the feature

**Status:** done: movie/episode badges and an on-demand paused-playback section above og’s user progress list.
Verified 2026-10-29 on a real account in Violentmonkey (badge, overview load, delete); see NOTES.md.

- Data: `GET /sync/playback/movies` and `/sync/playback/episodes` (progress %, `paused_at`, ids). Clear one with
  `DELETE /sync/playback/:id`.
- **Badges:** a small progress bar or "42%" badge on movie and episode pages that have saved progress, with a "clear"
  action.
- **Overview page:** a list of all paused items (poster, title, %, paused date) with clear, multi-select clear, and
  "clear everything older than N days". Mount it where it fits og's layout best, such as a section on the user's
  progress page. Confirm the location in og first.
- Setting progress manually ("mark as 50%") uses `POST /scrobble/pause`. That shows up as real playback activity on
  the account, so ask for confirmation and make it a later, optional step.
- Bulk actions: confirm before deleting, and go through the request queue so 4 concurrent requests is the most it
  sends.

**Agent split:** one agent does phase A alone, because it touches shared files (`trakt.js`, `settings.js`, `menu.js`,
`store.js`). After it's merged, phase B can run alongside anything else.

## 3. Metadata links (dropped)

og already does this. Its title pages link genres, network, studios, languages and country to filtered
`/movies/popular?…` and `/shows/popular?…` pages. og had these links for VIPs only until trakt-og commit `6337c09`
(2026-10-26) opened them to every member. Only the year and certification inside og's `<h1>` stay plain text, and
editing inside og's own heading isn't worth the risk for two links.

## 4. Custom link presets

**Status:** done

**Goal:** the custom links panel is empty until the user types templates. Offer an optional preset pack of popular,
legitimate services so it's useful straight away.

**Build:**

- A preset list in `src/features/custom-links/presets.js`: for example Letterboxd (movies), Rotten Tomatoes search,
  Metacritic search, Wikipedia search, Stremio, Plex search, AniList/MyAnimeList search for anime titles. Each preset
  is `{ label, url, kinds: ['movie'|'show'] }` so it only appears where it makes sense. Don't include piracy or torrent
  sites.
- An "Add presets…" chip that opens a checklist; the chosen ones are copied into the user's links (they can then edit or
  remove them as usual). Don't auto-enable anything.
- Replace the `window.prompt` add/remove flow with a small inline editor (label + URL fields, delete button, drag or
  up/down to reorder). Keep the menu entries working.
- Keep the storage key `watch.customLinks` and its `{ label, url }` shape, adding optional fields only, so existing
  links survive.

## 5. Small extras (after 1–4)

- **Name pronunciation:** a button on `/people/:id` that fetches Forvo's public search page and plays the first
  recording whose word matches the name, retrying with the next recording if audio fails and falling back to a Forvo
  search link. Forvo's API needs a key, so the page's `Play(...)` handlers are parsed instead. **Done.**
- **Poster rating corners (dropped):** og already does this. Its `CornerRating` component puts your own rating in the
  corner of posters and fanart cards in lists, charts, search, progress, history, calendars and more, and has done
  since og's first import (trakt-og `233a935`, 2026-09-30).
- **All lists in one view:** moved to feature 11.

## 6. Last month in review card

**Status:** done; verified 2026-11-01 on a real account in Zen + Violentmonkey.

**Goal:** bring back classic Trakt's "your *March* in review" dashboard card: a summary of last month on the dashboard,
without opening Month in Review on trakt.tv.

**Already in og (checked 2026-10-30, trakt-og `27d7dbc`):** the dashboard's month strip (`RecapRibbon`, a
`nav.ribbon` with plays per month) links each past month to Month in Review on v3. The Last 30 Days panel and the
profile watch-time box also exist (both hide with no recent plays). None of them is a last-month card, so this is new.

**Data (signed in, via `apiAuth`):**

- Plays and hours: `GET /sync/history?start_at=<first of last month>&end_at=<first of this month>&extended=full`,
  paginated (`page`, `limit=100`, read `X-Pagination-Page-Count`). Hours = sum of each item's `runtime`.
  `apiAuth` only allows `extended=images` today: extend it with a validated option for these query keys rather than
  free-form query strings.
- First play of the month: the oldest history entry; its fanart (`extended=images`) is the card background.
- Ratings given: `GET /sync/ratings` (all types), count those with `rated_at` inside the month.
- Comments: `GET /users/me/comments` (paginated), count those with `created_at` inside the month.
- Use the user's time zone for month boundaries (the browser's `Intl` zone), and cache the result for the month in GM
  storage keyed by user and month, since last month's numbers don't change. Refetch at most daily in the first days of
  a month, while late syncs can still land.

**Build:**

- Mount under og's month strip (`nav.ribbon`) on the dashboard (`/` when signed in to og, plus `/dashboard`). Add a
  `dashboard` route name to `parseRoute` if needed.
- The card: "your *<month>* in review" heading, plays, hours, ratings and comments tiles, the first play (title and
  episode), the fanart background, and a link to the full Month in Review on trakt.tv (og's own `traktUrls.monthInReview`
  format). A hide button that remembers the dismissed month.
- Nothing when signed out of the toolkit or with zero plays last month; a one-line hint on API failure.
- January shows December of the previous year.

**Checks:** the og drift table (`scripts/og-drift-checks.mjs`) can't fetch the signed-in dashboard, so add
`nav.ribbon` as "not checked (needs login)" like the progress page, and verify on a real account.

## 7. Season chart: your ratings, watchers and comments

**Status:** done with feature 8; verified 2026-11-01 in Zen + Violentmonkey with test ratings on a real account.

**Goal:** what classic's seasons chart had and ours doesn't: your own ratings as a second line next to the community
one, plus optional watchers and comments series. og shows your rating on each episode row (a corner badge), but never
as a shape across the season.

- **Your ratings:** `GET /sync/ratings/episodes` via `apiAuth` (one call, all your episode ratings; cache it in memory
  for ~10 minutes and share it with feature 8). Filter to this show and season by the show's Trakt id (the season
  page's API data from `getSeasonEpisodes` has it) and episode number. Draw a second line in a distinct colour with
  its own dots; episodes you haven't rated are gaps, not zeros. A legend says which line is which. Signed out: chart
  unchanged.
- **Watchers and comments:** off by default, behind a "More" toggle in the chart panel. On demand, fetch
  `GET /shows/:id/seasons/:season/episodes/:episode/stats` for each episode of the viewed season only, through the
  existing request queue, and draw watchers and comments on a secondary right-hand axis (they're counts, not %).
  Skip seasons with more than ~30 episodes, or ask first.
- Keep the chart's fixed Y scale for ratings. Keyboard/accessible names for the new dots, as for the existing ones.

## 8. Your personal averages

**Status:** done with feature 7, sharing one ten-minute episode-ratings cache. Season cards show your average after
the episode count; the show-wide line was cut after a live look. og keeps its own badge for a season rating you set
directly, so there is no season-ratings fetch.

**Goal:** classic's "Average Season And Episode Ratings": your own average, which og never shows.

- Same ratings data as feature 7 (one fetch, shared cache). Also `GET /sync/ratings/seasons` if you rate seasons.
- **Season page:** "Your average: 7.8 (6 of 7 episodes rated)" in the chart's summary line.
- **Show page (season cards) and `/shows/:id/seasons`:** your average per season as a small badge next to og's
  community %, and a show-wide "your average" (episodes only, plain mean, with the count).
- Only show an average when at least 2 episodes are rated; label it clearly as yours so it isn't read as Trakt's.

## 9. Playback extras: set progress

**Goal:** classic's manager could also set progress. Add it as an opt-in action.

- On a movie or episode page with no saved progress (and in the overview), a "Save progress…" action: enter a %,
  confirm, then `POST /scrobble/start` + `POST /scrobble/pause` at that %, as the live test did. Warn in the confirm
  that it may briefly show as "watching" on the profile. Never send `/scrobble/stop` (that can mark it watched).
- **Renew:** classic offered it, but Trakt's current docs (trakt/api-help `28e57aa`) say nothing about paused
  playback expiring. Don't build it unless entries are seen to disappear.

## 10. List preview posters link to their titles

**Goal:** on og, the poster stack of a list card (`ListRow`, the `a.fan` element) links to the list itself and is
hidden from screen readers. Classic made each poster link to its own title and added your rating corners.

- **Check first:** whether og's list card markup exposes which title each poster is (an id, slug or image path that
  maps to one). If not, the list items would need an API call per card (`GET /users/:id/lists/:list/items`, limited),
  which is probably not worth it. Report and stop if so.
- Rating corners: og's `CornerRating` already exists on posters elsewhere; only add one here if the stack doesn't.

## 11. All lists in one view (lowest value)

**Goal:** classic's "All-In-One Lists View": personal, collaborations and liked lists on one page. og still splits
them across `/users/:id/lists`, `/collaborations` and `/liked`.

- A "Show all my lists" button on the personal lists page that appends the other two groups below, each under its own
  heading, from `GET /users/:id/lists/collaborations` and `GET /users/:id/likes/lists` (check the current endpoints).
- Only worth it for people with many lists; build last, or skip.

## 12. Add to library button

**Status:** done; user confirmed on a real account with the real Trakt API in Zen and Brave on 2026-11-01.
An **Add to library** action in the title, season and episode action stack, using the toolkit's own
sign-in and `POST /sync/collection` with the current date. Whole shows confirm the aired-episode count and skip
specials; the button hides when og shows its own library control. Success uses the shared native-first
notification with the title. Movie/show additions request OG’s own read-only collection refresh; unavailable
native integration and season/episode pages retain the reload fallback. Module discovery overlaps the save;
a disabled updating row fills the native-refresh handoff. No toolkit library action on cards.

- A whole-show add uses one uncached `GET /shows/:id/seasons?extended=full,episodes`, which includes each
  episode's `first_aired` (`extended=episodes` alone does not). The Simpsons, 39 seasons: about 1 MB in 1 s.

## 13. One-click Add to watchlist

**Status:** implemented on movie, show, season and episode pages, plus movie/whole-show poster and fanart cards
beside the lists button. Season and episode cards, including Up Next, have no shortcut.
Poster shortcuts hide only in the 1.5–<1.8dppx resolution band (150–170% zoom on a 1x desktop display),
returning at 180%. No fixed card-width cutoff; display-scaling limitations are documented in README.md.
The user confirmed the feature on a real account with the real Trakt API in Zen and Brave on 2026-11-01.
Unit tests and built-bundle integration tests pass. Movie/show saves now request OG's native picker membership refresh without opening it; seasons/episodes
retain the reload fallback. Saved-page browser checks and the user’s live confirmation are recorded in NOTES.md.
Success notifications try OG's native notifier, with a matching top-right fallback when unavailable.

**Goal:** og's "Listed on" button opens a list picker; adding to the watchlist takes several clicks. Add a separate
button that only adds to the watchlist.

- `POST /sync/watchlist` with the title's Trakt id, through the toolkit's sign-in, the same way feature 12 does
  `/sync/collection`. Movies and shows (seasons and episodes are allowed by the API, but check what og shows).
- Hide it when og already shows the title as on the watchlist; reuse feature 12's mount point, styling and
  native-state observer.
- **Check first:** whether og has added a direct watchlist action since 2026-10-30.

## 14. Add to library on poster cards

**Status:** deferred pending the card-space decision; excluded from `fix/library-button`.

**Goal:** feature 12 added **Add to library** to title, season and episode pages, but poster cards (show page season
cards, lists, search, dashboards) still can't add. og hides the card's library control too: its quick icons only
show it for items already in the library (trakt-og `1cd3142`, `LIBRARY_ADDING = false`; see NOTES.md).

- An icon-only action in the card's `.quick-icons .actions`, the same size as og's own (`--action-width`, 28px on
  `.small` cards), with og's collection glyph and a tooltip. Click confirms like feature 12 (aired-episode count for
  shows and seasons, specials excluded for whole shows), then reuses feature 12's `libraryApi`.
- The card's own link gives the title (`a.poster` href → movie, show, season or episode route); no page-level route.
- Hide it on cards where og already shows its library control, and after a successful add.
- **Space:** fits. og showed its own library icon in this slot on every card until `1cd3142` hid it (the removed
  `LibrarySyncLink` card variant used the same size), so it takes back an existing gap rather than adding one.
- **Check first:** whether og has turned `LIBRARY_ADDING` back on.

---

## Running several agents at once

- Give each agent one numbered feature from this file and tell it to read this file and `NOTES.md` first.
- Use a separate git worktree or branch per agent. The only shared files are `src/main.js` (one line in `FEATURES`),
  `src/core/store.js`, `src/menu.js` and `test/fixtures.js`. Merge conflicts there are small; resolve them by keeping
  both sides.
- Start feature 2 phase A before or alongside 1, 3 and 4. Don't start 2 phase B, or the OAuth parts of 1 and 5, until
  phase A is merged.
- `dist/trakt-og-toolkit.user.js` is committed. On merge conflicts in it, don't resolve by hand: run `npm run build`.
