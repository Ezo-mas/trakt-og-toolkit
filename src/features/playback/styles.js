export const CSS = String.raw`
.ogt-playback { color: var(--ogt-fg); }
/* og's Container: full width with half gutters on phones, then fixed 740/960/1160px columns. */
.ogt-playback__column { margin-inline: auto; padding-inline: calc(var(--gutter, 30px) / 2); box-sizing: border-box; }
@media (min-width: 768px) { .ogt-playback__column { inline-size: var(--container-sm, 740px); } }
@media (min-width: 992px) { .ogt-playback__column { inline-size: var(--container-md, 960px); } }
@media (min-width: 1200px) { .ogt-playback__column { inline-size: var(--container-lg, 1160px); } }
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
