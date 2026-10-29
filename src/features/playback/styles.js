export const CSS = String.raw`
.ogt-playback { color: var(--ogt-fg); }
.ogt-playback__tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-block: 8px; }
.ogt-playback__list { list-style: none; padding: 0; margin: 0; }
.ogt-playback__item { display: flex; align-items: center; gap: 12px; padding-block: 8px; border-block-end: 1px solid light-dark(#ddd, #444); }
.ogt-playback__poster { inline-size: 42px; block-size: 63px; object-fit: cover; background: light-dark(#eee, #333); flex-shrink: 0; }
.ogt-playback__details { flex: 1; min-inline-size: 0; }
.ogt-playback__date { display: block; font-size: .85em; color: light-dark(#555, #bbb); }
.ogt-playback__meter { inline-size: 90px; accent-color: var(--brand-primary, #ed1c24); }
.ogt-playback__days { inline-size: 5em; }
.ogt-playback [hidden] { display: none; }
`;
