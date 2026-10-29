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
| 1 | Season and episode ratings + season chart | client ID | 3, 4, 2 (phase A) |
| 2 | Playback progress manager | OAuth | 1, 3, 4 |
| 3 | Metadata links | nothing (maybe client ID) | 1, 2, 4 |
| 4 | Custom link presets | nothing | 1, 2, 3 |
| 5 | Small extras (pronunciation, poster rating corners) | varies | after 1–4 |

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

## 1. Season and episode ratings + season chart

**Goal:** on a show's seasons pages, show how each season and episode rated, and a chart of episode ratings across a
season. og shows a single rating per page; classic Trakt users want the spread.

**Where:** `/shows/:id` (season cards), `/shows/:id/seasons`, `/shows/:id/seasons/:season`. og also has
`/shows/:id/seasons/all`; check what it shows before adding to it.

**Data (public, client ID only):**

- `GET /shows/:id/seasons?extended=full` → each season's `rating` and `votes`.
- `GET /shows/:id/seasons/:season?extended=full` → each episode's `rating`, `votes`, `title`, `first_aired`.
- Optional for the chart: `GET /shows/:id/seasons/:season/episodes/:episode/stats` → `watchers`, `comments`. One call
  per episode: only for the season being viewed, after the ratings render, and skip it for seasons over ~30 episodes.

**Build:**

1. **Season averages:** a small badge on each season card (rating % and vote count). Also a show-wide weighted average
   (sum of rating×votes / sum of votes), labelled clearly so it isn't confused with Trakt's own show rating.
2. **Episode ratings:** on a season page, a rating next to each episode row if og doesn't already show one. Check first.
3. **Season chart:** an SVG line chart on the season page. X is episode number, Y is rating (fixed scale, not
   auto-zoomed, so seasons compare honestly). Hover/focus shows episode title, rating and votes. Clicking a point opens
   that episode. Optional second series for watchers on its own axis, off by default. It must work with keyboard and
   in light and dark mode.
4. Episodes with few votes (under ~10) get a hollow point and are left out of averages, so one 10/10 vote doesn't skew
   the line.

**Later (needs OAuth from feature 2):** personal ratings next to the community ones, via `GET /sync/ratings/episodes`.

**Agent split:** one agent does 1–2 first, then 3, since 3 reuses the same data. 3 can also be a second agent once
`api.js` and `data.js` from 1 are merged.

## 2. Playback progress manager

**Goal:** see and manage partially watched movies and episodes (what a media player left paused). og has no UI for
this: its Progress page only has Watching, Rewatching and Dropped tabs.

**This needs signing in to Trakt**, which the toolkit doesn't do yet, so it has two phases.

### Phase A: OAuth (blocks phase B)

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

## 3. Metadata links

**Goal:** make the facts on a title page clickable, as in classic Trakt VIP: genres, networks, studios, languages,
country, certification and year each link to a filtered search.

**Check first:** og's details list (`AdditionalStats` / `NameList` in trakt-og) supports links, and some fields may
already be links. Look at a live movie and a live show and list which fields are plain text. Only add links to those.

**Build:**

- Find og's own search or discover URL format for each filter (`projects/client/src/routes/search/` and
  `lib/components/filters/` in trakt-og). Link to og's pages, never to the classic site.
- Wrap plain-text values in links; don't replace og's nodes. If og re-renders, the host remounts.
- Optional: a country flag next to the country, if og doesn't already show one (og has a `CountryFlag` component; check
  where it's used).
- Optional: classic Trakt's "combined" search (click the label to search for all values at once), only if og's search
  supports multiple values for that filter.

**Risk:** if og's search can't filter by a field, skip that field rather than inventing a URL.

## 4. Custom link presets

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

- **Name pronunciation:** a button on `/people/:id` that looks up the name on Forvo. Forvo's API needs a key; start
  with a plain link to Forvo's search page instead.
- **Poster rating corners:** a corner badge with your own rating on posters in lists. Needs OAuth
  (`/sync/ratings`) and a cached ratings map; check og doesn't already show ratings on posters (it has a `RatingLine`
  component).
- **All lists in one view:** probably unnecessary, since og has separate pages for personal, collaborations, liked and
  official lists. Revisit only if people ask.

---

## Running several agents at once

- Give each agent one numbered feature from this file and tell it to read this file and `NOTES.md` first.
- Use a separate git worktree or branch per agent. The only shared files are `src/main.js` (one line in `FEATURES`),
  `src/core/store.js`, `src/menu.js` and `test/fixtures.js`. Merge conflicts there are small; resolve them by keeping
  both sides.
- Start feature 2 phase A before or alongside 1, 3 and 4. Don't start 2 phase B, or the OAuth parts of 1 and 5, until
  phase A is merged.
- `dist/trakt-og-toolkit.user.js` is committed. On merge conflicts in it, don't resolve by hand: run `npm run build`.
