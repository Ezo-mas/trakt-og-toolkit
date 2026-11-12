# Sign-in and Trakt API use

Back to the [README](../README.md).

## Sign-in

Sign in and out on og.trakt.tv. The toolkit uses that account for API reads and writes, including public list exports
and watchlist picks. Signed out, features that use page data still work, including the season chart's ratings
fallback.

If the session expires, reload og.trakt.tv so og can renew it. The userscript menu's **Test API connection** checks
the session.

Upgrading clears credentials saved for the retired toolkit sign-in from userscript storage. If you previously
authorised a personal Trakt app for the toolkit, revoke its access in
[Trakt's Connected Apps settings](https://trakt.tv/oauth/authorized_applications).

## How the API is used

- The toolkit calls documented endpoints at `api.trakt.tv` with og's client ID and access token. It reads the token in
  place from og's session. og handles renewal, and the toolkit retries a 401 once if og has already rotated the token.
- It reads the access token, expiry and a stable account key, and keeps the access token out of userscript storage
  and logs.
- Signing out or switching accounts drops queued writes, discards old responses and rebuilds personal features.
  Open tabs detect account changes through browser storage notifications. Token renewal for the same account keeps
  the current features mounted.
- It calls og's notifier and read-only collection refresh to update og's own controls after a successful write.
- Metadata reads are cached for the active session, for eight hours by default and one hour for the ratings chart.
  They honour `Retry-After` on 429. Personal and paginated reads bypass the cache.
- **Writes** share one queue, sent at most once per second, Trakt's standard-app limit. A 429 pauses the queue for the
  full `Retry-After`. Only explicit 429 rejections and 401s with a renewed token are retried.
- **Other sites:** pronunciation fetches Forvo's public search page. Hovering or focusing Metacritic or Rotten Tomatoes
  can query Wikidata with title ids when og has no direct URL. There is no backend.
