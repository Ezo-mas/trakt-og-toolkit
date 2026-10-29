# Trakt OG Toolkit

An **unofficial** userscript for [og.trakt.tv](https://og.trakt.tv) that adds the useful old-Trakt bits og doesn't have
— without reusing og's session or its internal endpoints. Not affiliated with or endorsed by Trakt.

**Status:** v0.1.4: a custom links panel with season and episode pickers, a season ratings chart, and a hydration-safe
mount. Playback progress is next; see [PLAN.md](PLAN.md).

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey).
2. Open `dist/trakt-og-toolkit.user.js` and confirm the install.
   On GitHub, use the "Raw" link so the manager sees the file as a userscript.

It matches `https://og.trakt.tv/*` and `http://localhost:5173|5174/*` for development against a local og checkout.

## What it does

### Custom links panel (title pages)

A compact panel under the summary stats with user-configured links to your own services.

- **Custom links** — add your own `Label | URL` templates with placeholders like `{title}`, `{year}`, `{tmdb}`, `{imdb}`, `{season}`, `{episode}`.
- **Season/episode pickers** — appear automatically when a link uses `{season}` or `{episode}`. Episode counts come from the Trakt API when a client ID is set, otherwise from og's season cards.
- **Examples**: Plex, Jellyfin, Sonarr, Radarr, or any streaming/library service og doesn't link to.

### Season chart

On a show's season page, an episode ratings chart shows the shape of the season. It uses the Trakt API when a client
ID is set and og's displayed ratings otherwise; episodes with fewer than 10 votes appear as hollow points and do not
affect the average.

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
pre-filled with `http://localhost:5173/callback`, then displays a device code and Trakt verification URL. Open that URL in another tab and authorize the
code; press OK to continue waiting, or Cancel to stop. You can also stop polling from the cancel sign-in menu.
No client secret is needed with Trakt's current device API.

Access and refresh tokens stay in the userscript manager's GM storage, separate from og's login. Tokens refresh
on authenticated use before expiry, and sign-out attempts revocation and always clears local tokens. If revocation
fails, remove the app connection in Trakt settings. This requires a userscript manager; OAuth never falls back to
page localStorage. This phase supplies authentication only; playback UI will follow separately.

## Custom links

Menu → **add custom link**, then type `Label | URL`. The label is what the chip shows; everything after the first
`|` is the URL template. You can also press **+ Add link** in the panel.

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
- Only `http://` and `https://` templates are accepted.
- Manage links from the menu: **add custom link** and **remove custom link**. They're stored per browser, not synced.

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

`npm test` runs the built bundle against trimmed copies of og's markup. To check it against a real page:

```bash
curl -sSL https://og.trakt.tv/shows/breaking-bad -o /tmp/show.html
node scripts/live-check.mjs /tmp/show.html https://og.trakt.tv/shows/breaking-bad
```

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
- **No page scraping for data.** og is server-rendered, but the API is the stable surface. The only DOM reads are for
  ids og already prints (TMDb/IMDb) and the season cards' episode counts.
- **Selectors.** Only semantic classes (`.summary-frame`, `#overview`, `.top`, `.subtitle`) — never `svelte-*` hashes.

## Known issues

- og's native ratings strip (the row of IMDb, Rotten Tomatoes, TMDb, Trakt, popcorn and JustWatch scores) can disappear
  on Gecko browsers. It reproduces with this toolkit disabled, so it is an og bug, not something the toolkit mounts or
  removes. The custom links panel is unaffected.

## Roadmap

See [PLAN.md](PLAN.md). In short: playback progress, average season/episode ratings, a season chart, metadata links, then
smaller extras. og already ships the ratings distribution (on `/stats`) and trailers, so those are not planned.

## Trakt API compliance

- Only documented, public Trakt endpoints — no HTML fetching, no internal og endpoints, no session reuse.
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
