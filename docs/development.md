# Development

Back to the [README](../README.md).

```bash
npm install
npm run build     # dist/trakt-og-toolkit.user.js
npm run dev       # watch + localhost:8787 for Violentmonkey "Track external edits"
npm test          # unit + happy-dom integration tests
npm run drift     # check live og.trakt.tv still has the selectors we rely on (needs a build)
                  # add `-- --signed-in <dir>`: progress.html and dashboard.html, rendered DOM saved while signed in
```

Each feature lives in `src/features/<name>/`. [PLAN.md](../PLAN.md) has the roadmap and the rules for new features,
and [NOTES.md](../NOTES.md) has findings about og.

The userscript checks drift on rendered og pages during normal browsing. A problem that survives both checks
appears as an `[OGT] og drift` console warning and, with debug logging enabled, a toast naming the problem. Leave
debug logging on while you browse and the toast is all you need to watch for. Open the userscript menu's
**Diagnostics** to see the latest problems by page type. Reports contain check names, time and toolkit version.

The local timer and GitHub drift workflow are retired. The CLI remains useful for direct fetches when og permits
them and for saved signed-in dashboard and progress HTML.

Screenshots for the README live in `docs/screenshots/`, named after the feature. Photo-heavy ones are WebP.
Take them signed in on og.trakt.tv in a 1920 px wide window, cropped to the toolkit's part and a little of og around
it.
