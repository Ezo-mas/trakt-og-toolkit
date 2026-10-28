# Notes

Working notes and known issues. Newest first.

## 2026-10-29

### Verified

- v0.1.1 trailer works in the real browser (Tampermonkey + user's client ID).
- Episode pickers now get real counts from `/shows/:id/seasons?extended=full`.
- 21 tests passing (`npm test`).

### Open: og UI disappears after the page finishes loading

On a movie page (observed on *The Dog Stars*, 2026), these og elements render during load and then vanish:

- the `WATCH NOW / 0 services` overlay on the poster,
- the purple `ADD TO HISTORY` button,
- the blue `LISTED ON / Watchlist` button (the library button).

`CHECK IN` stays. The console also shows Svelte's `hydration_mismatch` error.

Hypotheses, in order:

1. **Our early DOM insert confuses Svelte hydration.** The panel is inserted under `#overview .top` at
   `DOMContentLoaded`, possibly while SvelteKit is still hydrating. Svelte 5 may bail out of hydrating that subtree and
   client-render it, dropping blocks that only exist in the server HTML (e.g. session-dependent buttons). The panel
   itself may be removed at the same time.
2. **Unrelated og bug.** The hydration mismatch may happen without the userscript, and the disappearing buttons may be
   og's own behavior.

Diagnosis tomorrow:

1. Disable the toolkit (or Tampermonkey for `og.trakt.tv`) and reload the same page. If the buttons still disappear,
   it is og.
2. If the toolkit is the cause, try mounting only after hydration instead of at `DOMContentLoaded` — e.g. after
   `window.load` plus a `requestAnimationFrame`/idle delay — and confirm the panel still survives SPA navigation.
3. If early insertion is required for layout, test inserting the panel after the summary subtree has hydrated rather
   than inside it.

Do not chase the `Security Error: ... may not load or link to file:///` message: the bundle has no `file:` references,
and the error points at og's inline script (`injectedScript` line 290/369).

### Next: dev environment

Use Violentmonkey's **Track external edits** rather than the Tampermonkey update-URL loop:

1. `npm run watch` rebuilds `dist/trakt-og-toolkit.user.js`.
2. Serve the folder with `npx http-server dist -p 8787 -c-1`.
3. Open `http://localhost:8787/trakt-og-toolkit.user.js` in Violentmonkey and click **Track external edits**
   (enable **Reload tab** too).
4. Keep the installer tab open; every rebuild is picked up and the og tab reloads.

No version bump and no manual "check for updates". Disable the Tampermonkey copy while doing this so only one panel
mounts. Keep Tampermonkey for release smoke tests.

### Later

- Season, episode and chart pages do not mount yet (by design; only `route.name === 'title'` matches).
- Playback progress, average ratings and the season chart are still on the roadmap.
