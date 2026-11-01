# Trakt OG Toolkit

An **unofficial** userscript for [og.trakt.tv](https://og.trakt.tv) that adds the useful old-Trakt bits og doesn't have
— without reusing og's session or its internal endpoints. Not affiliated with or endorsed by Trakt.

**Status:** v0.2.0: custom links with presets and an inline editor, a season ratings chart, optional Trakt sign-in
with a paused-playback manager, manual library additions and one-click watchlist additions, and in-page name
pronunciation on person pages.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey).
2. Open `dist/trakt-og-toolkit.user.js` and confirm the install.
   On GitHub, use the "Raw" link so the manager sees the file as a userscript.

It matches `https://og.trakt.tv/*` and `http://localhost:5173|5174/*` for development against a local og checkout.

## What it does

### Custom links panel (title pages)

A compact panel under the summary stats with user-configured links to your own services.

- **Custom links** — manage your `Label | URL` templates in the inline editor, with placeholders like `{title}`, `{year}`, `{tmdb}`, `{imdb}`, `{season}`, `{episode}`.
- **Search presets** — optionally add Metacritic, Stremio, Plex and AniList links (og already links Rotten Tomatoes, Wikipedia, Letterboxd and, on anime, MyAnimeList itself).
- **Season/episode pickers** — appear automatically when a link uses `{season}` or `{episode}`. Episode counts come from the Trakt API when a client ID is set, otherwise from og's season cards.
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

**More** on a season chart loads watchers and comments, off by default, on a separate right-hand count axis.
This needs a client ID and uses the shared request queue. Seasons with more than 30 episodes skip these requests.

### Last month in review

Sign in through the toolkit to see last month’s plays, hours, ratings and comments under the dashboard’s month
strip. The fanart card highlights your first play and links to the full Month in Review. Hide dismisses that month
for your toolkit account. Nothing appears for months with no plays. Month boundaries use your browser’s time zone;
results are stored in userscript storage per account and month, refreshing at most daily during the first seven days.
Hours use the API’s reported runtimes, rounded to whole hours; missing runtimes contribute no time.

### Add to library

Movie, show, season and episode pages have an **Add to library** button in the action stack. Sign in through the
toolkit menu first: it uses that Trakt account, independently of OG’s login. Additions use the current date.
Shows and seasons confirm the aired episode count before saving; whole shows exclude specials (add season 0
separately). The add button disappears after saving, or whenever OG already shows a library control. Reload after
adding to update OG’s own library status. Removing an item through OG restores the add action without a reload.
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
On narrow poster cards, the shortcut hides when it would crowd the rating and returns when there is room,
including after zooming or resizing. Poster action bars at 180 CSS pixels or narrower always hide it as a
fallback, so a clipped native rating cannot prevent the shortcut from hiding.

Success shows **You added Spider-Man: Brand New Day to your watchlist.** (using the added title) in OG’s native
notifier when available. Otherwise, a matching notification appears below the header on the right, with a green
check, close button and five-second countdown.
Hovering or focusing it pauses dismissal. Existing native notifications stay above the fallback.

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
saved playback, not watched history. There is no control to set progress manually.

## Custom links

Use **Edit links** in the panel to add, rename, reorder or remove links. Choose **Add presets…** to select optional
service searches; nothing is enabled until you check it and confirm. Presets can be edited like any other link.

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
- A link is hidden on pages where one of its placeholders has no value — a `{season}` link won't appear on a movie.
  This is intentional, so one template works across shows and films.
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

`npm run drift` fetches live og pages and checks the selectors and panel mounts the toolkit relies on. The daily
GitHub Actions workflow runs the same check at 06:00 UTC and can also be started manually. Run
`npm run drift -- --save <dir>` to save the fetched HTML for inspecting markup or refreshing fixtures. The check
needs a built bundle (`npm run build`); `npm test` stays offline.

### Layout

```
src/
  main.js              entry point, router wiring
  meta.js              name, version, hosts
  config.js            API base, cache TTL, default client ID
  settings.js          GM storage (client id, custom links, selections)
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
  ui/                  injected CSS and toasts
```

### Design notes

- **No og session reuse.** og keeps its token in an `httpOnly` cookie set by `/api/store-token`; page scripts can't
  read it and there is no generic API proxy. Everything here uses the public Trakt API with the user's own client ID.
- **No `turbo:load`.** og is SvelteKit, so we patch `history.pushState`/`replaceState`, listen for `popstate`, and
  re-check after debounced mutations. Features re-mount if the app renders over them.
- **No Trakt page scraping for data.** og is server-rendered, but the API is the stable surface. The only DOM reads
  from og are the person's name heading, ids og already prints (TMDb/IMDb) and the season cards' episode counts.
  Pronunciation reads a Forvo search page fetched separately, never a Trakt page.
- **Selectors.** Only semantic classes (`.summary-frame`, `#overview`, `.top`, `.subtitle`) — never `svelte-*` hashes.

## Known issues

- uBlock’s cosmetic filter `trakt.tv##a[target="_blank"][style]:has(img[src])` can hide OG’s external ratings after
  loading. Add `og.trakt.tv#@#a[target="_blank"][style]:has(img[src])` to uBlock’s My filters as a workaround.

## Roadmap

See [PLAN.md](PLAN.md). Shipped or dropped because og now does it itself: ratings distribution, trailers, metadata
links, poster rating corners. Backlog:

- a last-month-in-review card;
- a one-click **Add to watchlist** button, without picking a list;
- **Add to library** on poster cards, not just title pages.

## Trakt API compliance

- Only documented Trakt endpoints: public ones with your client ID, plus `/sync/playback`, `/sync/collection`, `/sync/watchlist`,
  `/sync/history`, `/sync/ratings`, `/users/me` and `/users/me/comments` through your own optional OAuth sign-in.
  No Trakt HTML fetching, no internal og endpoints, no reuse of og's session.
  Native notification discovery reads only already-loaded public JavaScript assets, without credentials;
  it does not make authenticated API requests.
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
