# Custom links

A strip of links in the title sidebar, above og's external links, on movie, show, season, episode and person pages.
Back to the [README](../README.md).

## Presets

- Presets for IMDb, TMDb, TVDB, Letterboxd, Rotten Tomatoes, Wikipedia, JustWatch, MyAnimeList, Metacritic, Stremio,
  Debrid Media Manager, MDBList, OpenSubtitles, Plex, AniList, Jellyfin, Emby, Radarr, Sonarr and Seerr.
- Presets open the exact title, season or episode when the page has the id they need, and search otherwise.
- Rotten Tomatoes and Metacritic reuse og's native direct links first. Otherwise, hovering or focusing a link starts a
  Wikidata lookup and upgrades its destination when ready. Redraws reuse cached destinations; a fast click before
  resolution still opens search. Episodes fall back to the season. Missing or ambiguous mappings keep the search link.
  Both share Wikidata's `Retry-After` cooldown, and cached mappings and native direct links stay usable. Network,
  timeout and server failures pause lookups for ten seconds, or longer when `Retry-After` asks for it.
- MyAnimeList and AniList appear for known anime titles and stay available when genres are unknown. Genres come only
  from the title's metadata field, so no extra requests are made for them.
- Person pages offer **YouTube interviews** and the person variables below, using only the profile ids og shows.
- Self-hosted services (Jellyfin, Emby, Radarr, Sonarr, Seerr) use the base URLs you set under **Servers**.
- Watch and library services also appear under **Your services** in og's Watch Now dialog.
- Hidden presets stay saved. Edited and custom templates are never restricted.
- Logos are bundled [Simple Icons](https://simpleicons.org) (CC0) or the marks og already draws; no favicons are
  fetched.

## Templates

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
  Person and title variables are separate for the same reason.
- On show pages, Season and Episode pickers appear when a link uses `{season}` or `{episode}`.
- URLs must start with `http://`, `https://` or a server placeholder.
- Links are stored per browser and are not synced.
