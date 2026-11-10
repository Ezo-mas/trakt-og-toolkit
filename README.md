# Trakt OG Toolkit

An **unofficial** userscript for [og.trakt.tv](https://og.trakt.tv) that brings back useful bits of classic Trakt that
og doesn't have yet. It talks only to the documented Trakt API, reusing og's own session or your client ID and optional
sign-in. Not affiliated with or endorsed by Trakt.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`dist/trakt-og-toolkit.user.js`](dist/trakt-og-toolkit.user.js), choose **Raw**, and confirm the install.
3. No API setup is needed when you are signed into og.trakt.tv. Otherwise set a client ID and sign in (see
   [Setup](#setup)).

Installed copies update themselves from `main` when a new version is released. A copy installed from a saved file, or
from before these update URLs existed, needs one reinstall from the link above.

Every feature has its own **toggle** in the userscript menu. All are on by default, and switching one off removes it
immediately.

## Features

### Custom links

A strip in the title sidebar, above og's external links, on movie, show, season, episode and person pages.

- Your own `Label | URL` templates, plus presets for IMDb, TMDb, TVDB, Letterboxd, Rotten Tomatoes, Wikipedia,
  JustWatch, MyAnimeList, Metacritic, Stremio, Debrid Media Manager, MDBList, OpenSubtitles, Plex, AniList, Jellyfin,
  Emby, Radarr, Sonarr and Seerr.
- Presets open the exact title, season or episode when the page has the id they need, and search otherwise.
- Rotten Tomatoes and Metacritic reuse OG’s native direct links first. Otherwise, hovering or focusing a link
  starts a Wikidata lookup and upgrades its destination when ready. Redraws reuse cached destinations; a fast click
  before resolution still opens search. Episodes fall back to the season.
  Missing or ambiguous mappings retain search. Both destinations share Wikidata’s `Retry-After` cooldown;
  cached mappings and native direct links remain usable. Network, timeout and server failures pause lookups for
  ten seconds, or longer when requested by `Retry-After`. No Trakt client ID is needed for these lookups.
- Self-hosted services (Jellyfin, Emby, Radarr, Sonarr, Seerr) use the base URLs you set under **Servers**.
- Watch and library services also appear under **Your services** in og's Watch Now dialog.
- On show pages, Season and Episode pickers appear when a link uses `{season}` or `{episode}`.
- Logos are bundled [Simple Icons](https://simpleicons.org) (CC0) or the marks og already draws; no favicons are
  fetched.

MyAnimeList and AniList appear for known anime titles and remain available when genres are unknown. Hidden
presets stay saved; edited/custom templates remain unrestricted. Genres come only from the title’s metadata field.
Person pages offer **YouTube interviews** and person template variables, using only native profile IDs.

See [Custom link templates](#custom-link-templates) for placeholders.

### Season chart and your ratings

- An episode ratings chart on each season page, from the API with a client ID or og's displayed ratings without one.
  Episodes with under 10 votes are hollow and left out of the average.
- Signed in: your episode ratings as a second line, **Your average** in the summary, and your average on each season
  card.

### Trakt ratings chart

With a client ID, movie, show, season and episode pages get a compact Trakt ratings chart in the empty space under the
overview, beside og's action buttons.

- Ten bars, one per score, with vote counts and a line at the average. The header links to og's full stats page.
- When there is more room, it adds og's stats tiles: Rating, Votes (with the share of watchers), Most given and
  Liked it.
- It only appears when it fits, so og's own layout never moves. It hides while a long overview or other content
  fills the space, and for titles with fewer than 10 votes.

### Add to library and Add to watchlist

Signed in, movie, show, season and episode pages get **Add to library** and **Add to watchlist** actions.

- Each hides once og shows the title is already in your library or watchlist. og's own controls refresh without a
  reload where og allows it.
- Movie and show cards, and every credit on a person's page, get a watchlist shortcut. **Watchlist all** adds every
  shown credit at once.
- Success notices offer **Undo** for newly added titles.

The toolkit's sign-in is separate from og's, so it can be a different Trakt account.

### Paused playback

Signed in:

- Movie and episode pages show saved playback progress with **Clear**.
- Your og **Progress** page gets a **Paused playback** section for clearing items one by one, in bulk, or by age.
- **Save progress…** sets a percentage by hand. It uses Trakt's scrobble start and pause, never stop, so it doesn't
  mark the title watched.

### Profiles and lists

- **All lists:** og's Lists dropdown on a profile gains **All lists**: personal, collaboration and liked lists in one
  scroll. Works with og's session or a configured client ID.
- **List previews:** each poster in a list card's preview opens its title. Signed in, posters show your rating.

### Month in review and pronunciation

- **Last month in review:** signed in, the dashboard gets a card with last month's plays, hours, ratings and comments.
  Arrows step back through earlier months.
- **Pronounce:** on person pages, plays the name from Forvo, or links to Forvo's search when there's no recording.

## Setup

### Using og's sign-in

The toolkit reuses the session og.trakt.tv already has, so a fresh install needs no API setup.

- The access token is read in place from og's page and sent only to `api.trakt.tv` with og's client ID. It is never
  refreshed, copied into userscript storage, or logged. Only the access token, its expiry and a stable account ID are
  read; og's refresh token and the rest of its profile stay unread.
- The toolkit reads only og's current client entry, not an older one left in the same browser. When og signs out or
  changes account, queued writes, open playback controls, personal caches and All lists reset; signing back into the
  same account does not revive old queued work. A token renewal for the same account is not a change.
- Changes in another tab are handled through the browser's storage notifications, including a quick logout/login
  and clearing local storage.
- When it expires, reload og.trakt.tv. The toolkit must never refresh og's token: og rotates the refresh token when
  it renews, so a second refresher would strand og's session.
- **Sign out** in the toolkit menu leaves og's session alone; sign out on og.trakt.tv for that.

If og has no session, or you want a different Trakt account, use the toolkit's own app below. Its tokens take priority
while it is signed in.

### Trakt client ID

Custom links, the season chart, All lists and authenticated actions work through og's session, so no client ID is
needed for them. A client ID is still needed for the toolkit's own sign-in and the summary ratings chart. Create a
free app at <https://developer.trakt.tv/apps/new>:

| Field | Value |
| --- | --- |
| App name | `Trakt OG Toolkit` (any name works) |
| App type | **Development** |
| Redirect URIs | `http://localhost:5173/callback` |
| Allowed origins | leave empty |

Copy the **Client ID** (never the secret) and set it from the menu: **Trakt OG Toolkit: set API client ID**.

### Sign in

Run **Trakt OG Toolkit: sign in** from the menu.

1. Confirm the redirect URI you registered above.
2. A device code is copied to your clipboard, and Trakt's activation page opens in a new tab.
3. Paste the code there and approve.

Tokens stay in your userscript manager's private storage, never in the page. **Sign out** revokes them and always
clears them locally. No client secret is used.

Signing in or out, or changing the client ID, applies to every open og tab: the others rebuild their personal
features instead of showing the previous account until a reload. A token refresh is not an account change. Changing
or clearing the client ID turns off this sign-in and falls back to og's session, which may be a different account.
While the toolkit's own sign-in is active, og logging in, out or switching account does not affect it.

## Custom link templates

Use **Edit** in the strip, or the menu's **add custom link** (`Label | URL`):

```text
My service | https://example.com/watch/{tmdb}?s={season}&e={episode}
```

| Placeholder | Value | Example |
| --- | --- | --- |
| `{title}` | Title without the year | `Breaking Bad` |
| `{year}` | Release year | `2008` |
| `{tmdb}` / `{imdb}` / `{tvdb}` | Ids | `1396` / `tt0903747` / `81189` |
| `{imdbnum}` | IMDb id without `tt` or leading zeroes | `903747` |
| `{episodeimdb}` / `{episodeimdbnum}` | The episode's own IMDb id | `tt0959621` / `959621` |
| `{season}` / `{episode}` | From the page or the pickers (shows only) | `1` |
| `{type}` / `{plural}` | `tv` or `movie` / `shows` or `movies` | `tv` |
| `{id}` | Trakt slug from the URL | `breaking-bad` |
| `{person}` | Person name; person pages only | `Bryan Cranston` |
| `{personid}` | Person Trakt slug/id; person pages only | `bryan-cranston` |
| `{personimdb}` | Native IMDb person ID; person pages only | `nm0186505` |
| `{persontmdb}` | Native TMDb person ID; person pages only | `17419` |
| `{jellyfin}` `{emby}` `{radarr}` `{sonarr}` `{seerr}` | Base URLs from **Servers** | `http://192.168.1.20:8096` |

- Values are URL-encoded for you. Server base URLs are inserted as-is.
- A link is hidden on pages where one of its placeholders has no value, so one template works for shows and movies.
- URLs must start with `http://`, `https://` or a server placeholder.
- Links are stored per browser and are not synced.

Person and title variables are separate: links needing unavailable variables stay hidden. Person IDs come only
from the native external-link strip, and missing genre metadata keeps anime presets available without extra requests.

## Trakt API use

- **Endpoints:** only documented Trakt API endpoints, with your client ID or og's. Signed-in calls use the toolkit's
  own OAuth connection, or og's session when it has no tokens: playback, collection, watchlist, history, ratings,
  `users/me` and your comments.
- **og's session:** the access token in og's current `localStorage` entry is read in place and sent only to `api.trakt.tv`
  with og's client ID. It is never refreshed, stored, or logged. A 401 retries once if og has already rotated the token
  for the same account, and otherwise asks for a reload. Public metadata lookups use the same connection when no client
  ID is set, with their query and cache behavior intact.
- **Account changes:** the toolkit derives a non-secret account key from og's stored profile so it can tell a different
  account from a renewed token. A change drops queued writes and personal caches; it does not retry old work as the new
  account.
- **What it never touches:** it never fetches Trakt HTML or calls og's internal endpoints; from og's session entry it
  reads the access token, expiry and account key only.
- **og integration:** it calls og's own notifier and its read-only collection refresh, so og updates its controls
  itself.
- **Reads:** public GETs are cached (8 hours by default; an hour for the ratings chart), de-duplicated while in flight, and honour `Retry-After` on 429.
- **Writes:** they share one queue, sent at most once per second, Trakt's standard-app limit. A 429 pauses the
  queue for the full `Retry-After`. Failed writes are never replayed automatically, and queued writes are dropped on
  sign-out or when you leave the page.
- **Other sites:** pronunciation fetches Forvo’s public search page. Hovering/focusing Metacritic or Rotten Tomatoes
  can query Wikidata with title IDs when OG has no direct URL. There is no backend.

## Development

```bash
npm install
npm run build     # dist/trakt-og-toolkit.user.js
npm run dev       # watch + localhost:8787 for Violentmonkey "Track external edits"
npm test          # unit + happy-dom integration tests
npm run drift     # check live og.trakt.tv still has the selectors we rely on (needs a build)
                  # add `-- --signed-in <dir>`: progress.html and dashboard.html, rendered DOM saved while signed in
```

Each feature lives in `src/features/<name>/`. [PLAN.md](PLAN.md) has the roadmap and the rules for new features, and
[NOTES.md](NOTES.md) has findings about og.

## Licence and credits

MIT, see [LICENSE](LICENSE).

Written from scratch. Ideas came from [saad1430/tampermonkey](https://github.com/saad1430/tampermonkey) (MIT) and
[Fenn3c401/Trakt.tv-Userscript-Collection](https://github.com/Fenn3c401/Trakt.tv-Userscript-Collection) (GPL-3.0); no
GPL code was copied.
