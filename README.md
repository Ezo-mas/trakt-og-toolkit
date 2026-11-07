# Trakt OG Toolkit

An **unofficial** userscript for [og.trakt.tv](https://og.trakt.tv) that adds the useful old-Trakt bits og doesn't have
— without reusing og's session or its internal endpoints. Not affiliated with or endorsed by Trakt.

**Status:** v0.3.0: custom links with presets and an inline editor, a season ratings chart with your own ratings,
optional Trakt sign-in with a paused-playback manager, a month-in-review dashboard card that browses earlier months, manual library additions
and one-click watchlist additions, an all-lists view on profile pages, and in-page name pronunciation on person pages.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey).
2. Open `dist/trakt-og-toolkit.user.js` and confirm the install.
   On GitHub, use the "Raw" link so the manager sees the file as a userscript.

It matches `https://og.trakt.tv/*` and `http://localhost:5173|5174/*` for development against a local og checkout.

## What it does

### Turning features off

Every feature has its own toggle in the userscript menu (`Trakt OG Toolkit: toggle …`). All features are on by default.
Switching one off removes its UI immediately and keeps it off across reloads; switching it back on restores it without a
reload. Toggles are stored in GM storage, separately from og's settings.

### Custom links panel (title, season and episode pages)

A compact panel under the summary stats with user-configured links to your own services.

- **Custom links** — manage your `Label | URL` templates in the inline editor, with placeholders like `{title}`, `{year}`, `{tmdb}`, `{imdb}`, `{season}`, `{episode}`.
- **Presets** — optionally add Metacritic, Stremio, Plex and AniList links (og already links Rotten Tomatoes, Wikipedia, Letterboxd and, on anime, MyAnimeList itself). Stremio opens the exact movie, show, season or episode when the page has its IMDb id.
- **Season/episode pickers** — appear automatically when a link uses `{season}` or `{episode}` on a show page. Episode counts come from the Trakt API when a client ID is set, otherwise from og's season cards.
- **Season and episode pages** — the panel uses the show's title, year and TMDb/IMDb ids, not the season or episode heading, and takes `{season}`/`{episode}` from the URL. The title and TMDb id come from og's show link and external links (and the IMDb id on season pages); the year, and an episode page's IMDb id, come from `GET /shows/:id`. Without a client ID, those links stay hidden rather than point at the season or episode.
- **Examples**: Plex, Jellyfin, Sonarr, Radarr, or any streaming/library service og doesn't link to.

### Season chart

On a show's season page, an episode ratings chart shows the shape of the season. It uses the Trakt API when a client
ID is set and og's displayed ratings otherwise; episodes with fewer than 10 votes appear as hollow points and do not
affect the average.

### Your ratings and averages

Sign in through the toolkit menu to overlay your episode ratings as a blue line on the season chart. Unrated
episodes leave gaps, and the summary adds **Your average** with the rated episode count once you have rated at least
two episodes. Season cards on show pages and the Seasons page get a small blue heart with your average after the episode
count; hover it for the number of rated episodes. Averages are plain means of episode ratings from the toolkit's account,
which may differ from your og account. og already shows a season rating you set directly. Ratings stay in memory for
ten minutes and are cleared when the account changes; nothing private enters the public API cache.

### All lists in one view

og's **Lists** dropdown on a profile gains **All lists**, after Collaborations. On the personal lists page it keeps
the personal lists under a **Personal** heading and adds the profile's **Collaborations** and **Liked** lists below,
so everything is one scroll instead of three pages; from the other list pages it links there. Picking any of og's
own choices goes back to its normal view. Rows look like og's own: when the page shows og's rows, the new ones
reuse their classes, icons and count and share buttons, with owners' VIP labels and, signed in, a filled likes pill
on lists you liked. Liked lists load every page (up to 2,500, like og), and
each row's posters load as it nears the screen. Needs a client ID; with the toolkit sign-in, private lists you can
see are included and rows get og's watched-progress link. The toolkit doesn't like, edit or leave lists.

### List preview titles

Each poster in a list card's preview stack opens that title instead of the list; the fan itself still opens the
list. Middle-click or Ctrl/Cmd-click opens the title in a new tab. Titles come from the media URL, so the links need
no client ID or extra API calls. Screen readers get a hidden list of the same title links. With the toolkit sign-in,
your movie and show ratings appear in og's coloured corner triangle on each poster (og shows none on the fan); they
load once per page and are cached for 10 minutes.

### Last month in review

Sign in through the toolkit to see last month’s plays, hours, ratings and comments under the dashboard’s month
strip. Previous and next arrows step through earlier months; next stops at last month and previous stops at the
month of your first history entry. The fanart card highlights your first play and links to the full Month in Review.
Hide dismisses the card for your toolkit account until next month, whichever month is on screen. Nothing appears for last month with no plays;
an earlier month without plays shows an empty card so gaps stay navigable. Month boundaries use your browser’s time
zone; results are stored in userscript storage per account and month. Earlier months stay cached, while last month
refreshes at most daily during the first seven days.
Hours use the API’s reported runtimes, rounded to whole hours; missing runtimes contribute no time.

### Add to library

Movie, show, season and episode pages have an **Add to library** button in the action stack. Sign in through the
toolkit menu first: it uses that Trakt account, independently of OG’s login. Additions use the current date.
Shows and seasons confirm the aired episode count before saving; whole shows exclude specials (add season 0
separately). The add button disappears after saving, or whenever OG already shows a library control.
Success shows **You added Fight Club to your library.** (using the title) in the matching toolkit notice, with an
**Undo** button when the save added new items. OG’s native notifier cannot hold a button, so undoable library additions
use the toolkit notice. Undo removes the same items from the toolkit account and asks OG to refresh its collection
state; items that were already in the library are not offered an Undo. Movie/show saves ask OG to refresh its own collection state without a page
reload or opening a popup. Module discovery runs during the save; a disabled **Updating library…** row keeps
the stack steady until OG’s native control appears or the refresh finishes. Native reads still take network time.
This reads OG’s signed-in account; different toolkit/OG accounts remain separate.
If OG is signed out, the native module is unavailable or the browser blocks it, reload remains the fallback.
Season/episode pages retain the reload fallback. Removing an item through OG restores the add action once OG
shows the change. No toolkit library button is added to cards.
The button uses OG’s design values for action styling and spacing, with separate toolkit classes.

### Add to watchlist

Movie, show, season and episode pages have a separate **Add to watchlist** action. Sign in through the toolkit menu
first; one click adds that exact item to the toolkit’s Trakt account, which may differ from your OG account.
The action hides after success or when OG’s **Listed On** detail includes **Watchlist**. Other list memberships
leave it available. Movie/show additions ask OG’s list picker to reread membership and update its native controls
without opening the popup. This uses OG’s signed-in account; it cannot mark a different OG account’s watchlist.
Reload remains the fallback when OG is signed out or its picker cannot refresh, and for season/episode additions.
Removing the item through OG restores the action once OG shows the change. This action only adds; use OG’s list
picker to remove items.

Movie and whole-show poster and fanart cards also have a bookmark shortcut beside the blue lists button,
including cards loaded as you browse. Season and episode cards (including Up Next) have no shortcut. It uses
the card’s own title and the same toolkit account. The shortcut hides when that card’s native list tooltip
includes Watchlist, or after a successful add; custom lists alone keep it available.
On a desktop display at 100% system scaling, poster shortcuts hide at 150–170% browser zoom and return at
180%. Wider fanart cards are unaffected. This uses CSS resolution, which includes system/display scaling;
it cannot distinguish browser zoom from display scaling. Card width alone does not hide the shortcut.

On a person’s page, every credit row also has the same bookmark shortcut next to its blue lists icon. Movie
rows add the movie; show rows, including a guest credit for a single episode, add the whole show. It uses the
row’s own link and toolkit account, hides when the row’s native list tooltip includes Watchlist, and appears
for rows rendered as you browse. A **Watchlist all (N)** button beside the credits toolbar’s sort controls adds every
currently shown row that is not already on the watchlist. It confirms once with the count, sends the rows’ slugs in
batches, and reports how many were added, already there or not found. Added rows lose their shortcut. OG’s own list controls reload their membership automatically after bulk adds and
Undo, using the same native refresh as the individual shortcut. Confirmed batches stay marked if a later batch fails. Bulk **Undo** is offered when every successful title was newly added; mixed new/existing results have no
Undo because Trakt does not identify which titles were already there.

Success shows **You added Spider-Man: Brand New Day to your watchlist.** (using the added title) in the matching
toolkit notice, with an **Undo** button for newly added titles. It appears below the header on the right, with a green
check, close button and five-second countdown. OG’s native notifier cannot hold a button, so undoable additions use
this notice; other toolkit notices still prefer OG’s native one. Undo removes the title with the same request body
and refreshes OG’s native controls. Titles that were already on the watchlist are not offered an Undo.
Hovering or focusing the notice pauses dismissal. Existing native notifications stay above the fallback.

### Name pronunciation

On person pages, **Pronounce** looks the name up on Forvo in the background and plays the first recording whose word
matches the person’s name in place; the button becomes **Pause** while it plays. If a recording fails to load, the next
one is tried before giving up. If Forvo has no matching recording or the lookup fails, a **Forvo** link opens the
search page instead. Lookups are cached in memory for 10 minutes.

### Trakt client ID (optional for now)

The panel works without one. With a client ID, the episode pickers get exact counts from the Trakt API instead of og's
season cards, and the upcoming features need one. Any user can create one for free at
<https://developer.trakt.tv/apps/new>:

| Field | Value |
| --- | --- |
| App name | `OG Toolkit` (or `Trakt OG Toolkit`) |
| Description | `Userscript for og.trakt.tv: custom links and rating helpers. Public API endpoints only.` |
| App type | **Development** — currently the only option |
| Redirect URIs | `http://localhost:5173/callback` — must match the value entered at sign-in; used when refreshing tokens |
| Allowed origins | leave empty (GM_xmlhttpRequest bypasses CORS); `http://localhost:5173` only if you use the fetch fallback |

Then copy the **Client ID**. Never copy the Client Secret into the script — current Trakt device authentication does not need it.

A Development app only lets you (and people you add) sign in with OAuth. That is fine for this script: it calls
public endpoints with the client ID and does not sign anyone in yet. For a published script, leave
`DEFAULT_CLIENT_ID` empty and let each user bring their own client ID, as the prompt already does.

Set it from the userscript menu: **Trakt OG Toolkit: set API client ID**.

## Optional Trakt sign-in

The userscript menu now supports **sign in**, **cancel sign-in**, **sign out**, and **show signed-in user**.
Set your own API client ID first. Sign-in asks for your app's registered redirect URI (needed for token refresh),
pre-filled with `http://localhost:5173/callback`. A notice then shows a device code (already copied to your clipboard)
and Trakt's verification URL: it opens in a new tab, so paste the code there. The notice stays up until sign-in finishes; use **cancel sign-in**
to stop waiting.
No client secret is needed with Trakt's current device API.

Access and refresh tokens stay in the userscript manager's GM storage, separate from og's login. Tokens refresh
on authenticated use before expiry, and sign-out attempts revocation and always clears local tokens. If revocation
fails, remove the app connection in Trakt settings. This requires a userscript manager; OAuth never falls back to
page localStorage. The playback manager below uses this connection.

## Paused playback

After signing in through the toolkit menu, movie and episode pages with saved playback show a percentage bar and
**Clear** action. On your og **Progress** page, the **Paused playback** section loads movies and episodes only when
its **Load paused playback** button is pressed. It uses your toolkit Trakt account, which can differ from og’s login.

The list shows posters (when available), titles, progress and paused dates, newest first. Clear one item, select
several and **Clear selected**, or enter an age and **Clear older items** (strictly older than that many elapsed days).
Every deletion asks for confirmation with the item count. Bulk actions report partial failures and refresh the list.
**Refresh paused playback** checks for changes made elsewhere; cached data lasts about a minute. Clearing removes
saved playback, not watched history. **Save progress…** on a movie or episode page (with or without saved playback)
and on each overview row asks for a percentage from 1 to 100, with the warning in the same dialog. It sends Trakt's
scrobble start and pause, so your profile may briefly show the title as watching, and it never sends stop (which can mark the title
watched). Start replaces any earlier progress for the title; if the pause then fails, the panel says so.

## Custom links

Use **Edit links** in the panel to add, rename, reorder or remove links. Choose **Add presets…** to select optional
service links; nothing is enabled until you check it and confirm. Presets can be edited like any other link.

Stremio's preset opens the exact movie, show, season or episode when the page has the title's IMDb id (a season page
links to the series page with `?season=`, which Stremio selects), and falls back to its search otherwise. The other
presets stay searches because those sites need their own ids or have no episode pages.

The menu commands **add custom link** and **remove custom link** remain available when the panel is not on screen.
The add command asks for `Label | URL`; the label is what the chip shows and everything after the first `|` is the URL
template.

```text
My service | https://example.com/watch/{tmdb}?s={season}&e={episode}
```

Placeholders are filled from the page and the season/episode picker:

| Placeholder | Value | Example |
| --- | --- | --- |
| `{title}` | Title without the year | `Breaking Bad` |
| `{year}` | Release year | `2008` |
| `{tmdb}` | TMDb id | `1396` |
| `{imdb}` | IMDb id | `tt0903747` |
| `{type}` | `tv` for shows, `movie` for films | `tv` |
| `{season}` | Selected season (shows only) | `1` |
| `{episode}` | Selected episode (shows only) | `1` |
| `{id}` | Trakt slug or id from the URL | `breaking-bad` |
| `{plural}` | `shows` or `movies` | `shows` |

Notes:

- Names are lowercase and case-sensitive: `{tmdb}`, not `{TMDb}`.
- Values are URL-encoded for you, so `{title}` becomes `Breaking%20Bad`. Don't encode them yourself.
- A link is hidden on pages where one of its placeholders has no value — a `{season}` link won't appear on a movie, and
  `{episode}` has no value on a season page. This is intentional, so one template works across shows and films.
- URL templates must start with `http://` or `https://`.
- Links are stored per browser, not synced. The inline editor checks that each saved link has a label and an HTTP(S) URL.

## Development

```bash
npm install
npm run build     # dist/trakt-og-toolkit.user.js
npm run dev       # watch + localhost:8787 for Violentmonkey tracking
npm test          # unit + happy-dom integration tests
```

`npm run dev` starts the esbuild watcher and a no-cache server for `dist/` in one terminal. Install the script from
`http://localhost:8787/trakt-og-toolkit.user.js` once in Violentmonkey, click **Track external edits**, and keep the
installer tab open. Every rebuild is picked up automatically. See `NOTES.md` for details.

## Keeping up with og

`npm run drift` fetches live **og.trakt.tv** pages and checks the selectors and panel mounts the toolkit relies on,
including the title action stack, the summary list control and its picker trigger, and card quick-icon list controls on
`/movies/trending`. It also follows og's app entry to its root layout and its static imports, then validates the public
toast and library-refresh module shapes used by the native bridges without a page realm or sign-in. Panel pages are
booted a second time with their feature turned off, and the check fails if the panel still appears. The daily GitHub
Actions workflow runs the same check at 06:00 UTC and can also be started manually. Run
`npm run drift -- --save <dir>` to save the fetched HTML for inspecting markup or refreshing fixtures. The check
needs a built bundle (`npm run build`); `npm test` stays offline.

### Layout

```
src/
  main.js              entry point, router wiring
  meta.js              name, version, hosts
  config.js            API base, cache TTL, default client ID
  settings.js          GM storage (client id, custom links, selections, feature toggles)
  actions.js           prompts shared by the menu and the panel
  menu.js              userscript menu commands
  core/
    dom.js             el(), debounce(), text()
    router.js          og path parsing + SPA navigation
    hydration.js       waits for SvelteKit to hydrate before the first mount
    http.js            GM_xmlhttpRequest wrapper, queue, GET cache
    trakt.js           public Trakt API calls
    store.js           GM_getValue with a localStorage fallback
    text.js            template + URL helpers
  features/
    host.js            mounts/unmounts features per route
    custom-links/      the panel (index.js) and its DOM readers (data.js)
    season-chart/      episode ratings chart and API/data helpers
  ui/                  injected CSS, toasts and og-styled confirm/prompt dialogs (dialog.js)
```

### Design notes

- **No og session reuse.** og keeps its token in an `httpOnly` cookie set by `/api/store-token`; page scripts can't
  read it and there is no generic API proxy. Everything here uses the public Trakt API with the user's own client ID.
- **No `turbo:load`.** og is SvelteKit, so we patch `history.pushState`/`replaceState`, listen for `popstate`, and
  re-check after debounced mutations. Features re-mount if the app renders over them.
- **No Trakt page scraping for data.** og is server-rendered, but the API is the stable surface. The only DOM reads
  from og include name/title headings, native action status, ids og already prints (TMDb/IMDb) and the season
  cards' episode counts.
  Pronunciation reads a Forvo search page fetched separately, never a Trakt page.
- **Selectors.** Only semantic classes (`.summary-frame`, `#overview`, `.top`, `.subtitle`) — never `svelte-*` hashes.

## Known issues

- uBlock’s cosmetic filter `trakt.tv##a[target="_blank"][style]:has(img[src])` can hide OG’s external ratings after
  loading. Add `og.trakt.tv#@#a[target="_blank"][style]:has(img[src])` to uBlock’s My filters as a workaround.

## Roadmap

See [PLAN.md](PLAN.md). Shipped or dropped because og now does it itself: ratings distribution, trailers, metadata
links, poster rating corners. Backlog:

- set playback progress by hand;
- list preview posters that link to their titles;
- more link presets that open the exact title (candidates: Debrid Media Manager, MDBList, Overseerr/Jellyseerr);
- a review and cleanup of the test suite.

## Trakt API compliance

- Only documented Trakt endpoints: public ones with your client ID, plus `/sync/playback`, `/sync/collection`, `/sync/watchlist`,
  `/sync/history`, `/sync/ratings`, `/users/me` and `/users/me/comments` through your own optional OAuth sign-in.
  All lists reads the public `/users/:id/lists/collaborations` and `/users/:id/likes/lists`, through that sign-in
  when there is one.
  No Trakt HTML fetching or toolkit calls to internal og endpoints. Toolkit API writes use only its own OAuth
  connection.
  Native notification/collection-refresh discovery reads only already-loaded public JavaScript assets,
  without credentials. Page-realm bridges call OG’s native notifier or its read-only collection refresh;
  OG performs its own signed-in reads. The toolkit does not read OG tokens, copy its session, patch its
  collection data or perform a second collection write.
  Pronunciation fetches Forvo's public search page (with `@connect forvo.com`) to find recordings.
- Public GETs are cached for 8 hours, de-duplicated while in flight, and retried with `Retry-After` on 429.
- Nothing is uploaded, resold or redistributed; the script has no backend.
- Season data prefers the API when a client ID is present; rendered cards are the fallback.

Trakt OG Toolkit uses Trakt but is not endorsed or certified by Trakt.

## Licence and credits

MIT — see [LICENSE](LICENSE).

Written from scratch. Ideas and UX inspiration came from
[saad1430/tampermonkey](https://github.com/saad1430/tampermonkey) (MIT) and
[Fenn3c401/Trakt.tv-Userscript-Collection](https://github.com/Fenn3c401/Trakt.tv-Userscript-Collection) (GPL-3.0).
No GPL code was copied, so this project can stay MIT.

Trakt OG Toolkit is not affiliated with Trakt.
