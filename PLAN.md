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
| 11 | All lists in one view | client ID; OAuth optional | done |
| 12 | Add to library button | OAuth | done; user verified in Zen and Brave with real API |
| 13 | One-click Add to watchlist | OAuth | done; user verified in Zen and Brave with real API |
| 14 | Add to library on poster cards | OAuth | dropped: cards too tight; watchlist fits cards better |
| 15 | Season chart: remove the More button | — | done |
| 16 | Custom links on season and episode pages | client ID optional | done |
| 17 | Watchlist buttons on a person's credits | OAuth | done; per-row shortcuts and Watchlist all |
| 18 | `npm run drift`: cover features 12–13 and og's native modules | — | done |
| 19 | Undo on success notices | OAuth | done |
| 20 | Turn features on and off from the menu | — | done |
| 21 | Month review: browse earlier months | OAuth | done |
| 22 | Custom link presets that open the exact show, season or episode | — | done |
| 23 | Test suite review and cleanup | — | last |
| 24 | More exact-title link presets | — | done |
| 25 | Per-user server presets | — | done |
| 26 | Custom links below the poster, with icons and Watch Now integration | check current OG markup | planned; first |
| 27 | Resolve external site IDs for direct custom links | 26; public lookup services | planned; after 26 |
| 28 | Conditional presets and person-page custom links | 26; genre/person metadata | planned; after 26; anime mapping after 27 |
| 29 | Shared authenticated-write queue and rate-limit handling | existing OAuth | done |
| 30 | Trakt onboarding without manual API setup | publisher-registered app; HTTPS callback for PKCE | planned; device flow first, PKCE later |

**Released:** 0.3.0 on 2026-11-03 (features 6–8, 11–13, 15 and 16). Bump the version again whenever main should
reach userscript managers; they only offer an update when `@version` changes.

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

**Status:** done (2026-11-05). A **Save progress…** action appears on movie and episode pages (with or without
saved playback) and on every row in the overview. It asks for a 1–100 percentage, confirms with a watching-status
warning, then sends `/scrobble/start` and `/scrobble/pause`; it never sends `/scrobble/stop`.

**Goal:** classic's manager could also set progress. Add it as an opt-in action.

- On a movie or episode page with no saved progress (and in the overview), a "Save progress…" action: enter a %,
  confirm, then `POST /scrobble/start` + `POST /scrobble/pause` at that %, as the live test did. Warn in the confirm
  that it may briefly show as "watching" on the profile. Never send `/scrobble/stop` (that can mark it watched).
- **Renew:** classic offered it, but Trakt's current docs (trakt/api-help `28e57aa`) say nothing about paused
  playback expiring. Don't build it unless entries are seen to disappear.

## 10. List preview posters link to their titles

**Status:** done (2026-11-05). Media URLs in the fan (`/images/shows/000/199/343/posters/...`) carry the
media type and Trakt id, so each slot gets a pointer shortcut to `/shows/:id` or `/movies/:id` without any
API reads; a visually hidden list after the stack exposes the same links to screen readers. og's fan link to
the list stays unchanged. og's `ListRow` fan has no `CornerRating`, so with the toolkit sign-in your movie and
show ratings get og's corner badge on each poster.

**Goal:** on og, the poster stack of a list card (`ListRow`, the `a.fan` element) links to the list itself and is
hidden from screen readers. Classic made each poster link to its own title and added your rating corners.

- **Check first:** whether og's list card markup exposes which title each poster is (an id, slug or image path that
  maps to one). If not, the list items would need an API call per card (`GET /users/:id/lists/:list/items`, limited),
  which is probably not worth it. Report and stop if so.
- Rating corners: og's `CornerRating` already exists on posters elsewhere; only add one here if the stack doesn't.

## 11. All lists in one view

**Status:** done (2026-11-03). An **All lists** choice in og's Lists dropdown; see README and NOTES.md.

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

**Status:** dropped (2026-11-01). og's cards are tighter than classic Trakt's, and browser zoom makes the fit
harder still (feature 13 already has to hide its poster shortcut at 150–170%). One-click add to watchlist is the
action that makes sense on a card; adding to the library stays on title, season and episode pages (feature 12).
The notes below are kept for reference.

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

## 15. Season chart: remove the More button

**Status:** done (2026-11-02). The More button, watchers/comments lines, right count axis, stats requests and the
30-episode limit are removed. The your-ratings line and its legend remain; normal and long seasons make no `/stats`
requests.

**Goal:** feature 7's **More** button adds watchers (green) and comments (purple dashed) lines to the season chart.
On a real season (2026-11-01, 22 episodes) both say almost nothing: watchers barely move (about 41.4k down to 40k)
on an axis from 0, so the line sits flat on the 100% gridline and looks like a rating; comments are a few dozen
against that scale, so their line is pinned at 0. It also costs one stats request per episode.

- Remove the More/Less button, the right count axis, both lines, their legend entry and the stats requests
  (`getEpisodeStats`, `mapStats`, the 30-episode limit and its hints).
- Keep the your-ratings line and its legend.
- Update README, NOTES.md and tests.

## 16. Custom links on season and episode pages

**Status:** done (2026-11-02): the **Fix** option. The show title comes from og's show link and its TMDb (and, on
season pages, IMDb) id from og's own links; the year, and an episode page's IMDb id, from `GET /shows/:id`; and
`{season}`/`{episode}` come from the route instead of the picker. Season and episode pages no longer show pickers or
use the page's episode ids; title pages are unchanged.

**Problem:** the custom links panel mounts on every show route, but `readTitleData` reads the page it is on, not
the show. On season and episode pages the heading is the season or episode title, the year is that page's, and
the IMDb/TMDB IDs come from og's link strip there, which only has the episode's IMDb and TMDB links (seasons have
none). So `{title}`, `{year}`, `{imdb}` and `{tmdb}` either point at the wrong thing or are empty.

**Decide first** (one of):
- **Fix:** fill the variables with the show's values (show title, year and IDs from `GET /shows/:id?extended=full`,
  or carried over from the show page), and preset `{season}`/`{episode}` from the route instead of the picker.
- **Match og:** show the panel only on movie and show title pages, like og's own strip, which has no custom links
  on seasons and only IMDb/TMDB on episodes.

Either way, add tests with season and episode fixtures, and update README.

## 17. Watchlist buttons on a person's credits

**Status:** done (2026-11-05) as its own **Watchlist credit shortcuts** toggle. Per-row shortcuts hide when the
native list tooltip includes Watchlist or after an add. **Watchlist all (N)** sits beside the credits toolbar's sort
controls; it counts the currently shown rows that still need adding, confirms once, and posts their slugs to
`/sync/watchlist` in batches of 100. The notice reports added/already-there/not-found counts, added rows lose their
shortcut, and not-found rows stay available. It reuses the shared shortcut state and reloads native membership through the existing read-only picker path
with at most four loads at once. Live `article.credit-row` markup was checked: the poster link names the movie/show and the row
reuses the card-sized `ListControl`, with no native watchlist action. The captured page rendered all 211 credits at
once; the feature still follows rows added later. Bulk Undo is available for wholly new additions; mixed
new/existing responses have no Undo. Confirmed batches remain marked if a later batch fails.

**Goal:** a person's page (`/people/:id`) lists their credits by year, each row with og's own action strip (watched,
lists, play, rating). Like cards, the lists icon opens the picker, so adding to the watchlist takes several clicks.
Feature 13's card shortcut doesn't reach these rows: they aren't `.poster-card`/`.fanart-card`.

- **Per row:** the same bookmark shortcut as feature 13's cards, after the lists icon in the row's action strip.
  Movie rows add the movie; show rows (including "1 episode" guest credits) add the whole show. Reuse
  `watchlistApi`, the notification, the native refresh and the hide-when-watchlisted logic from feature 13.
- **Watchlist all:** one button near the Department/Sort controls that adds every credit currently shown (the selected
  department and filters, not the person's whole career). Confirm first with the count ("Add 93 titles to your
  watchlist?"), skip rows og already shows as watchlisted, and send one `POST /sync/watchlist` with all of them
  (in batches if Trakt limits the size). Report added/existing/not found counts.
- **Check first:** the credits row markup at the current og commit, whether og added its own quick watchlist since,
  and how the page loads more credits (lazy rows must get shortcuts too). IDs: prefer the row's link slug; resolve
  Trakt IDs the same way feature 13 does.

## 18. `npm run drift`: cover features 12–13 and og's native modules

**Status:** done (2026-11-03). `npm run drift` now checks the title action stack, the summary list control and picker
trigger, and card quick-icon list controls on `/movies/trending`. A separate static check follows the live og app entry
to the root layout, reads its same-origin static imports, and validates the toast and library-refresh store shapes with
`nativeToastImports`/`isNativeToastStore` and `nativeLibraryImports`/`isNativeLibraryStore`. Missing layouts, imports or
stores are reported as drift; no page realm or sign-in is used.

**Goal:** the daily drift check (`scripts/og-drift-checks.mjs`) only covers markup for custom links, the season chart,
playback and pronunciation. Features 12 and 13 depend on more, and when it changes they fall back quietly (toolkit
notice instead of og's, reload instead of refresh), so nobody notices.

- Markup: the title action stack (`findActionStack`), the summary list control and its `aria-keyshortcuts` picker
  trigger, and card `.quick-icons` list controls on a listing page such as `/movies/trending`.
- Native modules, statically: fetch the root layout (`/_app/immutable/nodes/0.*.js`), then run `nativeToastImports`
  + `isNativeToastStore` and `nativeLibraryImports` + `isNativeLibraryStore` on it and its imports. Report "not found"
  as drift. No page-realm code, no sign-in.

## 19. Undo on success notices

**Status:** done (2026-11-03). Undo appears on the toolkit's matching fallback notice for newly added titles and
library items; undoable saves use that notice because og's native notifier can't take a button. It sends the same body
to the remove endpoint, restores the action and runs the same native refresh. Existing watchlist entries and collection
adds that touched already-collected items get no Undo. Built-bundle tests cover the watchlist, library and card paths.

**Goal:** card and credits shortcuts are one click, so misclicks happen. Add **Undo** to the toolkit's watchlist and
library success notices (the fallback toast; og's native notifier can't take a button).

- Undo sends `POST /sync/watchlist/remove` or `POST /sync/collection/remove` with the same body as the add, then
  restores the button and requests the same native refresh.
- Only for the toolkit's own fallback notice, or show a small Undo in the button's place when og's notice was used.
- Don't remove items that were already on the list before the click (`existing` in the add response).

## 20. Turn features on and off from the menu

**Status:** done (2026-11-03). One **toggle** entry per feature in the userscript menu, backed by a disabled-id list in
GM storage. The host skips disabled features before matching and destroys their mounted nodes on the next sync; the
menu dispatches `ogt:featurechange` so a toggle takes effect without a reload. `npm run drift` also boots each live
og.trakt.tv page with its panel's feature disabled and reports drift if the panel still mounts.

**Goal:** about ten features now; let people hide the ones they don't want without editing the script.

- One toggle per feature in the toolkit menu, stored with `GM_setValue`; the host skips disabled features and
  removes their nodes when toggled off.
- Everything on by default.

## 21. Month review: browse earlier months

**Status:** done (2026-11-04). Previous/next arrows step through earlier months. Next stops at last month;
previous stops at the month holding the oldest history entry. Every month reuses the account/month cache, and
months with no plays stay navigable with an empty card. The oldest month is looked up lazily on the first
previous click: read the first history page for `X-Pagination-Page-Count`, then read the last page.

**Goal:** the dashboard card only shows last month. Add previous/next arrows to step through earlier months.

- Same requests as now with a different date range; cache each month.
- Stop at the account's first history entry; no next arrow past last month.

## 22. Custom link presets that open the exact show, season or episode

**Status:** done (2026-11-04). Stremio's preset opens the exact movie, show, season or episode through
`#/detail/:type/:id/:videoId?`, with `?season=` selecting the season when no episode id is given (added 2026-11-05),
and falls back to its existing search URL when the page lacks the IMDb id. Show and episode deep links were clicked
through on 2026-11-05; the season shape follows `useSeason` in Stremio's source. Metacritic, Plex and AniList stay
searches: their destination identifiers are not available in the existing template data. Metacritic does have
season/episode pages; feature 27 plans a verified identifier lookup rather than guessing slugs. TMDb, IMDb, Letterboxd, Rotten
Tomatoes, Wikipedia and Trakt itself are already linked by og or are the same site, so feature 22 added no presets for
them; feature 24 later added them as presets so they survive a missing external-link strip.

**Goal:** the four presets (Metacritic, Stremio, Plex, AniList) all search `{title}`. That's right for sites without
deep links, but on a season or episode page a site that can open that exact item should go there. Feature 16 already
fills `{imdb}`, `{tmdb}`, `{season}` and `{episode}` with the show's values.

- Stremio: `https://web.stremio.com/#/detail/series/{imdb}` for the show and
  `…/detail/series/{imdb}/{imdb}:{season}:{episode}` for an episode (movies: `#/detail/movie/{imdb}`). Open each by hand
  first; this shape is the usual one but unverified.
- Look for others that take IMDb or TMDb ids plus season/episode in the URL (for example TMDb itself, Trakt classic,
  subtitle sites); retain search when the destination needs ids we cannot resolve reliably. Feature 27 covers
  explicit external-id lookups; do not assume Metacritic lacks episode pages.
- A preset can be several templates; a link with a placeholder the page lacks already hides itself, so an episode
  template simply doesn't show on show or movie pages. Keep the search preset as the fallback.

## 24. More exact-title link presets

**Status:** done (2026-11-06). Added presets for og's external-link services (IMDb, TMDb, TVDB, Letterboxd,
Rotten Tomatoes, Wikipedia, JustWatch and MyAnimeList), plus Debrid Media Manager, MDBList and OpenSubtitles.
IMDb, TMDb, TVDB, Letterboxd, Stremio and DMM try exact routes first; every preset keeps a fallback where one
exists. TVDB added a `{tvdb}` placeholder, read from og's show strip and filled through `GET /shows/:id` on season
and episode pages. MDBList uses IMDb redirect routes for exact movies/shows and retains its separate search forms
as fallbacks. OpenSubtitles uses IMDb numbers through `{imdbnum}`, with `{episodeimdbnum}` read from an episode page's
strip. Fanart.tv stays out. Seerr/Jellyseerr needs each user's own host; official/social links are title-specific
and cannot be templated.

**Goal:** feature 22 gave presets a `deep` list but only Stremio used it. Add exact routes where the page has an id
(`{imdb}`, `{tmdb}`, `{tvdb}`) plus `{season}`/`{episode}`, and keep a search fallback. Check each route live first.

- **IMDb:** title, season and search fallback.
- **TMDb:** movie, show, season, episode and search fallback.
- **TVDB:** show via `dereferrer/series/{tvdb}` and search fallback.
- **Letterboxd:** movie via IMDb or TMDb and search fallback.
- **Rotten Tomatoes:** reuse OG’s direct title link when available, with search as fallback.
- **Wikipedia, JustWatch, MyAnimeList:** search-only presets.
- **Debrid Media Manager:** movie, show and season routes by IMDb id; signed-out visits redirect to `/start`.
- **MDBList:** exact movies/shows through `/movie/{imdb}` and `/show/{imdb}` (redirects to canonical slugs);
  search fallbacks use `/movies/?q_title=` and `/shows/?q_title=`.
- **OpenSubtitles:** movie/episode `imdbid-{imdbnum}`, show `pimdbid-{imdbnum}`, season
  `pimdbid-{imdbnum}/season-{season}`; `{episodeimdbnum}` comes from the episode strip, with the season as fallback.
- **Fanart.tv:** skipped; it remains out of scope.
- **Overseerr / Jellyseerr:** `/movie/{tmdb}` and `/tv/{tmdb}` on the user's own host, so there is no global host;
  feature 25 adds the preset with a per-user server URL.

## 25. Per-user server presets

**Status:** done (2026-11-06). Added a **Servers…** view to the custom-links panel for Jellyfin, Emby, Radarr,
Sonarr and Seerr base URLs, stored in `watch.servers`. The five presets use `{jellyfin}`, `{emby}`, `{radarr}`,
`{sonarr}` and `{seerr}` placeholders, and stay disabled in the preset checklist until their host is configured.
Server URLs are normalized with a scheme (bare hosts get `http://`) and can include a base path. They are filled
raw, unlike the URL-encoded title and id placeholders.

**Presets:** Radarr uses `/add/new?term=imdb:{imdb}` or `tmdb:{tmdb}` (title search fallback), Sonarr uses
`tvdb:{tvdb}` (title fallback), and Seerr opens `/movie/{tmdb}` or `/tv/{tmdb}` (title search fallback).
Jellyfin and Emby cannot deep-link a Trakt title without their own item ids, so they open the web search route;
those paths vary by server version and the preset can be edited. Fanart.tv remains out of scope, and no public
server hosts are shipped.

## 26. Custom links below the poster, with icons and Watch Now integration

**Status:** done (2026-11-08). The links now sit in the sidebar above og's external links, grouped as service rows,
a 4-column logo grid (Simple Icons, CC0, plus og's own marks cloned from the page) and text tiles, with og-style
Season/Episode dropdowns and Presets/Servers/Edit buttons; watch and library links join og's Watch Now dialog as
**Your services**. og is desktop-only, so the narrow-layout requirement was dropped. The picker also looks up the
episode's IMDb id so IMDb and OpenSubtitles open the picked episode. See NOTES.md (2026-11-08).

Original plan (2026-11-07): first priority for the custom-links improvements. Move the existing links out of
its large panel in the main content column and into the sidebar below the title's poster/card, near the native
external-link area. Use compact service icons and add relevant links to OG's Watch Now card/popover as well.
On narrow screens, follow OG's actual poster/Watch Now layout rather than a fixed desktop position.

**Reference:** Fenn3c401's **Custom Links (Watch-Now + External), v1.1.1**, supplied in this chat;
[upstream script](https://github.com/Fenn3c401/Trakt.tv-Userscript-Collection/blob/main/userscripts/dist/wkt34fcz.user.js).
Use its behavior and the user's screenshots as references. Implement for current OG from scratch; its jQuery,
Turbo events, old Trakt selectors, inline JavaScript and styles are not an implementation base.

- Check live OG and `trakt/trakt-og` for the summary poster, sidebar external links, mobile layout and Watch Now
  surfaces on movie/show/season/episode pages before choosing anchors. Keep native controls, provider results and
  existing external links intact. The custom-link action opens the destination; it must not trigger native playback.
- Reuse `src/features/custom-links/`, `PRESETS`, `resolvePresetUrl`, the saved link order, template variables and
  configured server URLs. One saved configuration feeds both placements; there is no second list to maintain.
- Display recognizable service icons with accessible names, tooltips and visible keyboard focus. Prefer existing
  local/native assets where usable; bundle only the small icons needed. Custom services without a known icon get
  a readable label or generic icon with an accessible label. Do not fetch third-party favicons on every page load.
- Distinguish external/reference destinations from watch/play/library services in the preset definitions. Show
  relevant enabled links in Watch Now, including when there are no native providers; do not present external
  ratings/reference sites as streaming providers or change OG's provider availability/counts.
- Keep Add presets, Edit links and Servers accessible through compact management controls using the existing
  editor/checklist/server forms. Forms need usable space rather than being squeezed into the narrow icon strip.
  Preserve existing saved links and server settings without requiring users to re-add them.
- Mount Watch Now additions when OG opens or replaces that surface; handle lazy content, SPA navigation, feature
  toggles and teardown without duplicate links/listeners. Ordinary resolved URLs stay normal anchors, including
  middle-click, Ctrl/Cmd-click, keyboard activation and the context menu.

**Scope:** `src/features/custom-links/{index,presets,data}.js`, its CSS/shared `src/ui/styles.js` where needed,
existing feature lifecycle, `test/fixtures.js`, custom-links integration tests, drift selectors and README/NOTES.
Do not add runtime dependencies, a second feature framework, an embedded player or the reference script's whole
preset catalog. Keep Fanart.tv outside scope unless requested separately.

**Acceptance:** verify desktop and narrow layouts in Firefox and Chromium; links sit below the poster/card and
in the correct Watch Now surface, with no large duplicate main-column panel. Check movies, shows, seasons,
episodes, missing native providers, edited links, unknown icons, server presets, keyboard use, repeated modal
opens and route/feature cleanup. Add trimmed current-OG fixtures and focused built-bundle regression tests.

## 27. Resolve external site IDs for direct custom links

**Status:** planned; after feature 26. Improve destinations that currently search because Trakt does not provide
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

**Status:** planned; after feature 26. Anime direct destinations additionally depend on feature 27's ID mapping.
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

## 29. Shared authenticated-write queue and rate-limit handling

**Status:** done (2026-11-07). One FIFO queue in `src/core/trakt.js` serializes authenticated POST/PUT/DELETE
across features at Trakt's documented one-per-second write limit. 429s honour the full `Retry-After` (or use bounded
jittered backoff) before retrying or dispatching another write; only rejected 429/401 requests are resent. Queued
work rechecks the originating session generation, token and optional cancellation immediately before dispatch, so
sign-out or an account change cancels it and releases the queue. OAuth polling, refresh and revocation stay outside
the queue, and the public transport no longer shortens `Retry-After` to 10 s. Mocked-time queue tests and the full
suite pass; no live account writes were made for this change.

**Current gap:** `src/core/http.js` limits requests to four concurrent operations, which is not write pacing.
Authenticated resource requests go through `privateRequest(..., retries: 0)` in `src/core/oauth.js`, so rapid bulk
batches can hit 429. The public transport also caps `Retry-After` waits at 10 seconds, which can retry too early.

- Put one shared FIFO queue at the authenticated resource-write boundary in `src/core/trakt.js` for
  `POST`/`PUT`/`DELETE`. All watchlist/library/playback writes and Undo use it; do not add separate per-feature
  queues. Pace actual sends at least one second apart under the currently documented standard-app limit.
  Recheck [Trakt's rate-limit guidance](https://developer.trakt.tv/docs/rate-limiting) before implementation.
- On 429, honor the full valid `Retry-After` delay before retrying or dispatching another affected write. If absent,
  use bounded exponential backoff with jitter and a limited retry count. Do not shorten a required wait to 10 seconds.
  Preserve any required response headers internally while keeping user errors/logs free of tokens and raw bodies.
- Recheck the originating session and operation cancellation after waiting, immediately before dispatch. Read/refresh
  the current token then; a queued action must not write under a different account or revive after sign-out.
  A rejected/cancelled task must release the queue so subsequent valid actions can proceed.
- Preserve the single in-flight token refresh, explicit approval, token rotation/revocation and GM-private storage.
  Keep OAuth/device polling and refresh/revoke requests separate from the resource-write queue so refresh cannot
  deadlock behind the write that is waiting for it. Keep normal public/authenticated GET concurrency and caching.
- Retry only responses that establish a rejected request, such as 429; do not blindly replay writes after network
  timeouts or ambiguous server failures. This matters for history and playback/scrobble operations. Preserve
  existing bulk partial-success reporting, cancellation, notice timing and Undo semantics.
- Fix the shared public transport's shortened `Retry-After` handling too. Start with pacing within one running
  userscript instance; other tabs/apps may share the user's server-side limit, so 429 handling remains necessary.
  Do not add a cross-tab coordinator unless testing demonstrates a need.

**Scope:** `src/core/{trakt,oauth,http}.js` and existing authenticated callers only where cancellation must be
forwarded/rechecked, plus focused queue/auth regression tests and README/NOTES. Keep current function interfaces
where possible, avoid endpoint catalogs/plugins and add no dependency.

**Acceptance:** use mocked transport/time to verify FIFO order, send spacing, a `Retry-After` greater than 10 seconds,
missing-header backoff, exhausted retries, queue recovery after failure, cancellation during a wait, sign-out/account
switch, token refresh without deadlock, and unchanged GET behavior. Confirm ambiguous writes are not automatically
replayed; rerun the existing OAuth and bulk add/Undo/playback checks, then verify a small authenticated batch live.

## 30. Trakt onboarding without manual API setup

**Status:** planned (2026-11-07). Remove application-registration work for ordinary users while retaining their
explicit approval and private credentials. The publisher registers one Toolkit application; users connect their
own Trakt account to it. This does not automate application creation, consent or reuse OG's session.

**Stage A — preconfigured application and existing device flow (first release).**

- Obtain the release application's public Client ID and registered redirect URI, and verify that its registration
  permits the intended audience before enabling it by default. Recheck current
  [application registration](https://developer.trakt.tv/docs/create-an-app) and
  [authentication guidance](https://developer.trakt.tv/docs/authentication-oauth); do not assume an existing
  personal/development registration accepts other users.
- Ship those public application settings as defaults. A user installs the script, chooses **Connect Trakt**, opens
  the official verification page, enters the automatically copied device code and explicitly approves access.
  They do not create an app, paste API credentials or enter a redirect URI. Public features use the default Client ID
  without requiring sign-in; protected features connect only when the user chooses them.
- Reuse existing device polling, cancellation, token refresh, sign-out/revocation and sanitized errors. Keep access
  and refresh tokens exclusively in GM-private storage, separate from OG's account and page scripts. Never bundle
  a Client Secret, collect a Trakt password or expose the authenticated client on `window`.
- Keep **Use your own application** under advanced settings, with its Client ID and matching redirect URI stored
  together. Preserve existing custom configurations; never silently switch an authenticated session to a different
  Client ID. Changing applications requires an explicit disconnect/reconnect and must invalidate queued work.
- Retain one publisher application rather than generating replacement apps to evade restrictions. Respect shared
  API limits, keep caching, and use feature 29's write pacing/recovery when available. Verify the default app with
  a second authorized test account before publishing.

**Stage B — browser OAuth with PKCE (later).**

- Replace code copying with **Connect → approve on Trakt → return connected**, using Trakt's recommended
  [PKCE flow](https://developer.trakt.tv/docs/pkce). This requires a registered HTTPS callback address controlled
  by the publisher and a verified handoff to the originating userscript. Static callback hosting may suffice;
  no token-handling backend is required by the proposed design.
- Design and test the handoff before implementing it: generate a fresh S256 verifier/challenge and unpredictable
  state per attempt; keep the verifier private to the userscript. Validate state, attempt expiry, callback origin
  and the originating session, accept a code once, then exchange it from the userscript. The callback must not
  receive/store access tokens or the verifier, load third-party scripts, or leak authorization parameters through
  analytics/referrers. Remove callback parameters after the handoff and discard pending state on completion/cancel.
- Support reloads, closed tabs, expired/denied consent and concurrent attempts without connecting the wrong
  account. Keep the tested device flow as fallback until PKCE works in supported userscript managers on Firefox
  and Chromium. No auto-clicking approval and no dependency on old Trakt account-page markup.

**Scope:** `src/config.js`, `src/settings.js`, `src/oauth-menu.js`, `src/core/{oauth,store,trakt}.js` as needed,
existing dialogs/menu labels, focused OAuth/menu tests and README/NOTES. Stage B additionally needs a minimal
reviewable callback page, hosting/registered URI, and tightly scoped userscript matching/permissions for it.
Correct README's outdated setup/application-access advice when implementation ships. No real release Client ID
or callback is configured yet; publisher registration/hosting are prerequisites, not completed work.

**Acceptance:** test a fresh install, preserved custom app settings, missing defaults, approval/denial/expiry,
cancellation, reload, refresh, sign-out, app/account switches and isolation of credentials from the page. For PKCE,
add wrong-state/origin, replay, expired-attempt and concurrent-tab checks. Verify real connect/refresh/disconnect
with the release app and a second account. No user should need developer-portal setup in the default flow.

## 23. Test suite review and cleanup

**Goal:** the suite grew feature by feature (about 240 tests in 27 files) and has leftovers: checks for removed
behaviour, overlapping integration tests, and fixtures that no longer match og.

- Remove checks that only confirm deleted code stays deleted, and merge integration tests that cover the same path.
- Replace hand-written fixtures with trimmed live captures where og's markup has moved on; keep each fixture's source
  and trakt-og commit in a comment.
- Never compare a happy-dom element in an assertion (`assert.equal(node, null)`): if it fails, Node prints the element
  and runs out of memory. Compare `Boolean(node)` or a count; there are about 30 to change.
- Run the suite with `NODE_OPTIONS=--max-old-space-size=512` while reviewing, so a runaway test fails fast.

---

## Running several agents at once

- Give each agent one numbered feature from this file and tell it to read this file and `NOTES.md` first.
- Use a separate git worktree or branch per agent. The only shared files are `src/main.js` (one line in `FEATURES`),
  `src/core/store.js`, `src/menu.js` and `test/fixtures.js`. Merge conflicts there are small; resolve them by keeping
  both sides.
- Start feature 2 phase A before or alongside 1, 3 and 4. Don't start 2 phase B, or the OAuth parts of 1 and 5, until
  phase A is merged.
- `dist/trakt-og-toolkit.user.js` is committed. On merge conflicts in it, don't resolve by hand: run `npm run build`.
