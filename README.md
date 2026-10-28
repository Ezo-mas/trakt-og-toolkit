# Trakt OG Toolkit

A userscript for [og.trakt.tv](https://og.trakt.tv) that adds the useful old-Trakt bits og doesn't have — without
reusing og's session or its internal endpoints.

**Status:** v0.1 — the Watch & Links panel. Ratings, playback progress and the season chart are next.

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
- **Season/episode pickers** for shows, built from og's season cards. The choice is remembered per show.
- **Custom links** with `{placeholders}` that follow the picker (see below).
- **Watch trailer** — pulls the official trailer from the Trakt API and plays it in a modal.

### Trailers need a Trakt client ID

Trailers use a public Trakt API endpoint, which needs a `trakt-api-key`. Any user can create one for free:

1. Open <https://app.trakt.tv/settings/apps> → **New Application**.
2. Name it anything. The redirect URI can be anything (this script never redirects; it only calls public endpoints).
3. Copy the **Client ID**.

The first time you press **Watch trailer**, the panel asks for it. You can change it later from the userscript menu:
**Trakt OG Toolkit: set API client ID**.

A client ID is public — it is not a secret. If you fork this and want the script to work without the prompt, put it in
`DEFAULT_CLIENT_ID` in `src/config.js`.

## Custom links

Menu → **add custom link**, then enter `Label | URL`. Placeholders are filled from the page and the picker:

| Placeholder | Value |
| --- | --- |
| `{title}` | Title without the year |
| `{year}` | Release year |
| `{tmdb}` | TMDb id |
| `{imdb}` | IMDb id (`tt…`) |
| `{type}` | `tv` or `movie` |
| `{season}`, `{episode}` | Current picker values |
| `{id}` | Trakt id or slug from the URL |
| `{plural}` | `shows` or `movies` |

Example: `My service | https://example.com/watch/{tmdb}?s={season}&e={episode}`

Links whose placeholders can't be filled are hidden. Only `http(s)` URLs are accepted.

## Development

```bash
npm install
npm run build     # dist/trakt-og-toolkit.user.js
npm run watch     # rebuild on change
npm test          # unit + happy-dom integration tests
```

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

## Licence and credits

MIT — see [LICENSE](LICENSE).

Written from scratch. Ideas and UX inspiration came from
[saad1430/tampermonkey](https://github.com/saad1430/tampermonkey) (MIT) and
[Fenn3c401/Trakt.tv-Userscript-Collection](https://github.com/Fenn3c401/Trakt.tv-Userscript-Collection) (GPL-3.0).
No GPL code was copied, so this project can stay MIT.

Trakt OG Toolkit is not affiliated with Trakt.
