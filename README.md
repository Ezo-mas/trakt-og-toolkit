# Trakt OG Toolkit

An **unofficial** userscript for [og.trakt.tv](https://og.trakt.tv) that adds the useful old-Trakt bits og doesn't have
— without reusing og's session or its internal endpoints. Not affiliated with or endorsed by Trakt.

**Status:** v0.1.3 — the Watch & Links panel, with a fixed trailer player, reliable episode pickers and a hydration-safe
mount. Ratings, playback progress and the season chart are next.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or Violentmonkey).
2. Open `dist/trakt-og-toolkit.user.js` and confirm the install.
   On GitHub, use the "Raw" link so the manager sees the file as a userscript.

It matches `https://og.trakt.tv/*` and `http://localhost:5173|5174/*` for development against a local og checkout.

## What it does

### Watch & Links panel (title pages)

A panel under the summary stats, above the full-width sections. It reads the TMDb and IMDb ids that og already
renders, so it needs no API key and no login:

- **TMDb**, **IMDb** and **JustWatch** links, plus a link back to the classic Trakt page.
- **Season/episode pickers** for shows, with real episode counts (Trakt API when a client ID is set, og's season
  cards otherwise). The choice is remembered per show.
- **Custom links** with `{placeholders}` that follow the picker (see below).
- **Watch trailer** — pulls the official trailer from the Trakt API and plays it in a modal, with an “Open on
  YouTube” fallback if the embed is blocked.

### Trailers need a Trakt client ID

Trailers use a public Trakt API endpoint, which needs a `trakt-api-key`. Any user can create one for free at
<https://developer.trakt.tv/apps/new>:

| Field | Value |
| --- | --- |
| App name | `OG Toolkit` (or `Trakt OG Toolkit`) |
| Description | `Userscript for og.trakt.tv: watch links, trailers and rating helpers. Public API endpoints only.` |
| App type | **Development** — currently the only option |
| Redirect URIs | `http://localhost:5173/callback` — the form wants one; this script never uses it |
| Allowed origins | leave empty (GM_xmlhttpRequest bypasses CORS); `http://localhost:5173` only if you use the fetch fallback |

Then copy the **Client ID**. Never copy the Client Secret into the script — nothing here needs it.

A Development app only lets you (and people you add) sign in with OAuth. That is fine for this script: it calls
public endpoints with the client ID and does not sign anyone in yet. For a published script, leave
`DEFAULT_CLIENT_ID` empty and let each user bring their own client ID, as the prompt already does.

The first time you press **Watch trailer**, the panel asks for the client ID. You can change it later from the
userscript menu: **Trakt OG Toolkit: set API client ID**.

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
  config.js            API base, cache TTL, default links
  settings.js          GM storage (client id, custom links, selections)
  actions.js           prompts shared by the menu and the panel
  menu.js              userscript menu commands
  core/
    dom.js             el(), waitFor(), debounce()
    router.js          og path parsing + SPA navigation
    http.js            GM_xmlhttpRequest wrapper, queue, GET cache
    trakt.js           public Trakt API calls
    store.js           GM_getValue with a localStorage fallback
    text.js            template + URL helpers
  features/
    host.js            mounts/unmounts features per route
    watch-now/         the panel
  ui/                  injected CSS, toasts, modal
```

### Design notes

- **No og session reuse.** og keeps its token in an `httpOnly` cookie set by `/api/store-token`; page scripts can't
  read it and there is no generic API proxy. Everything here uses the public Trakt API with the user's own client ID.
- **No `turbo:load`.** og is SvelteKit, so we patch `history.pushState`/`replaceState`, listen for `popstate`, and
  re-check after debounced mutations. Features re-mount if the app renders over them.
- **No page scraping for data.** og is server-rendered, but the API is the stable surface. The only DOM reads are for
  ids og already prints (TMDb/IMDb) and the season cards' episode counts.
- **Selectors.** Only semantic classes (`.summary-frame`, `#overview`, `.top`, `.subtitle`) — never `svelte-*` hashes.

## Roadmap

1. ~~Watch & Links panel~~ (done)
2. Average season/episode ratings in season headers
3. Inline ratings distribution from `/shows/:id/ratings`
4. Playback progress manager (`/sync/playback`)
5. Season ratings chart

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
