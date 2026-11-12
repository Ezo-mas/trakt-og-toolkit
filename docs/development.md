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

Cloudflare blocks og.trakt.tv from GitHub's runners, so the drift workflow only runs when started by hand. The daily
check runs from a local systemd timer instead.

Screenshots for the README live in `docs/screenshots/`, named after the feature. Photo-heavy ones are WebP.
Take them signed in on og.trakt.tv in a 1920 px wide window, cropped to the toolkit's part and a little of og around
it.
