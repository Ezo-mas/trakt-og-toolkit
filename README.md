# Trakt OG Toolkit

An **unofficial** userscript for [og.trakt.tv](https://og.trakt.tv) that brings back useful bits of classic Trakt that
og doesn't have yet. It uses og's session to call the documented Trakt API.
Not affiliated with or endorsed by Trakt.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`dist/trakt-og-toolkit.user.js`](dist/trakt-og-toolkit.user.js), choose **Raw**, and confirm the install.
3. Sign in on og.trakt.tv to use API-backed features. The userscript menu's **Test API connection** checks the session.

Installed copies update themselves from `main` when a new version is released. A copy installed from the link above
before these update URLs existed keeps tracking that same link, so the next bumped release reaches it and its header
teaches the copy the new URLs. A copy installed from a saved file needs one reinstall from the link above, and so
does any existing copy that doesn't find the update.

Every feature has its own **toggle** in the userscript menu, marked ✅ when it is on and ⬜ when it is off. All are on
by default, and switching one off removes it immediately.

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
  ten seconds, or longer when requested by `Retry-After`.
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

- An episode ratings chart on each season page. It uses the API when signed in and falls back to og's displayed ratings.
  Episodes with under 10 votes are hollow and left out of the average.
- Signed in: your episode ratings as a second line, **Your average** in the summary, and your average on each season
  card.

### Trakt ratings chart

Signed in to og, movie, show, season and episode pages get a compact Trakt ratings chart in the empty space under the
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

### Paused playback

Signed in:

- Movie and episode pages show saved playback progress with **Clear**.
- Your og **Progress** page gets a **Paused playback** section for clearing items one by one, in bulk, or by age.
- **Save progress…** sets a percentage by hand. It uses Trakt's scrobble start and pause, never stop, so it doesn't
  mark the title watched.

### Profiles and lists

- **All lists:** og's Lists dropdown on a profile gains **All lists**: personal, collaboration and liked lists in one
  scroll. Collaborations and liked lists require og sign-in.
- **List previews:** each poster in a list card's preview opens its title. Signed in, posters show your rating.
- **Pick something:** signed in, on a watchlist, picks a random title from the page's current All/Movies/Shows/Seasons/Episodes
  filter and links to it, with **Pick again**. It reads up to 5,000 entries through the API and shows a note when it
  reaches the read limit.
- **Export CSV:** signed in, on a personal, collaboration or liked list page (including official liked lists), or the watchlist,
  downloads the whole list with rank, type, title, year, season/episode, Trakt/IMDb/TMDb ids, listed date and notes.
  Episode titles include their show. The browser builds a UTF-8 CSV with a byte-order mark for Excel and guards
  formula-like values.

### Month in review and pronunciation

- **Last month in review:** signed in, the dashboard gets a card with last month's plays, hours, ratings and comments.
  Arrows step back through earlier months.
- **Pronounce:** on person pages, plays the name from Forvo, or links to Forvo's search when there's no recording.

## Setup

Sign in and out on og.trakt.tv. The toolkit uses that account for API reads and writes, including public list exports
and watchlist picks. Signed out, features that use page data still work, including the season chart's ratings fallback.

If the session expires, reload og.trakt.tv so og can renew it. Upgrading clears credentials saved for the retired
toolkit sign-in from userscript storage. If you previously authorised a personal Trakt app for the toolkit,
revoke its access in [Trakt's Connected Apps settings](https://trakt.tv/oauth/authorized_applications).

## Custom link templates

Use **Edit** in the strip, or the menu's **Add custom link** (`Label | URL`):

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

- The toolkit calls documented endpoints at `api.trakt.tv` with og's client ID and access token. It reads the token in
  place from og's session. og handles renewal, and the toolkit retries a 401 once if og has already rotated the token.
- The toolkit reads the access token, expiry and a stable account key. It keeps the access token out of userscript
  storage and logs.
- Signing out or switching accounts drops queued writes, discards old responses and rebuilds personal features.
  Open tabs detect account changes through browser storage notifications. Token renewal for the same account keeps
  the current features mounted.
- The toolkit calls og's notifier and read-only collection refresh to update native controls after a successful write.
- Metadata reads are cached for the active session, for eight hours by default and one hour for the ratings chart.
  They honour `Retry-After` on 429. Personal and paginated reads bypass the cache.
- **Writes:** they share one queue, sent at most once per second, Trakt's standard-app limit. A 429 pauses the
  queue for the full `Retry-After`. Only explicit 429 rejections and 401s with a renewed token are eligible for retry.
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
