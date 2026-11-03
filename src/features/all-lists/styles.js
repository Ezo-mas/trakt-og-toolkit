export const CSS = String.raw`
/* The view takes section.lists' own classes; rows take og's ListRow classes when the page has a native row.
   The --fallback rules copy ListRow.svelte for a profile with no personal lists to borrow from. */
/* og paints every section with --color-surface; the view is a div, so it needs the same, or the darker page shows
   between the groups and under the last row. flow-root keeps the groups' margins inside it. */
.ogt-all-lists { display: flow-root; margin: 0; padding-bottom: var(--gutter, 32px); background-color: var(--color-surface, #1d1d1d); }

.ogt-all-lists__group { margin: 0; padding-top: var(--list-card-spacing, 24px); border: 0; }
.ogt-all-lists__group + .ogt-all-lists__group { margin-top: 0; }
.ogt-all-lists__group h2, .ogt-all-lists__personal-heading { margin: 0 0 var(--list-card-spacing, 24px); }
.ogt-all-lists__personal-heading { padding-block-start: var(--list-card-spacing, 24px); }
.ogt-all-lists__empty, .ogt-all-lists__loading, .ogt-all-lists__error { color: var(--color-text-secondary, #aaa); }

.ogt-all-lists--fallback .list-row { container-type: inline-size; padding-block-start: var(--list-card-spacing, 24px); }
.ogt-all-lists--fallback .card {
  --poster-width: var(--list-card-poster-width, 160px);
  --poster-height: var(--list-card-poster-height, 180px);
  --sliver: var(--list-card-sliver, 24px);
  display: grid;
  grid-template-columns: calc(var(--poster-width) + (var(--sliver) * 4)) minmax(0, 1fr);
  position: relative;
  isolation: isolate;
  column-gap: var(--list-card-gap, 24px);
  row-gap: var(--list-card-row-gap, 12px);
  color: var(--color-text, #fff);
  --list-card-body-gap: var(--list-card-body-gap, 8px);
}

.ogt-all-lists--fallback .fan-frame { --rank-anchor-width: var(--poster-width); position: relative; align-self: start; }
.ogt-all-lists--fallback .fan {
  display: flex;
  block-size: var(--poster-height);
  overflow: hidden;
  border-radius: var(--radius-list-card-fan, 6px);
  background-color: var(--color-list-card-placeholder, #303030);
}
.ogt-all-lists--fallback .slot {
  position: relative;
  flex: none;
  inline-size: var(--sliver);
  block-size: var(--poster-height);
  overflow: hidden;
  transition: inline-size var(--transition-list-card-fan, .2s);
}
.ogt-all-lists--fallback .slot:not(:first-child) { box-shadow: var(--shadow-list-card-sliver); }
.ogt-all-lists--fallback .slot:first-child { flex-basis: var(--poster-width); }
.ogt-all-lists--fallback .poster { position: absolute; inset-block: 0; inset-inline-start: 0; display: block; inline-size: var(--poster-width); block-size: var(--poster-height); background: var(--color-card-bg, #252525); object-fit: cover; }
.ogt-all-lists--fallback .placeholder { background-image: var(--image-placeholder-poster, repeating-linear-gradient(135deg, #303030 0 6px, transparent 6px 12px)); background-size: cover; }
.ogt-all-lists--fallback .placeholder.empty, .ogt-all-lists--fallback .fan.empty { background: repeating-linear-gradient(135deg, var(--color-list-card-placeholder-line, #383838) 0 6px, transparent 6px 12px), var(--color-list-card-placeholder, #303030); }
.ogt-all-lists--fallback .no-items { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; color: var(--color-stat-noun, #aaa); font-family: var(--font-headings); font-size: var(--font-size-list-card-empty, 14px); pointer-events: none; }
.ogt-all-lists--fallback .no-items::before { content: '▤'; margin-bottom: 6px; font-size: var(--font-size-list-card-empty-icon, 20px); }
.ogt-all-lists .poster.loading { background: linear-gradient(90deg, #303030, #414141, #303030); }
@container (min-width: 520px) {
  .ogt-all-lists--fallback .fan:hover .slot { inline-size: var(--sliver); }
  .ogt-all-lists--fallback .fan:hover .slot:hover { inline-size: var(--poster-width); }
}

.ogt-all-lists--fallback .body { display: flex; min-inline-size: 0; flex-direction: column; gap: var(--list-card-body-gap, 8px); }
.ogt-all-lists--fallback .head { display: flex; flex-wrap: wrap; inline-size: 100%; min-inline-size: 0; align-items: center; justify-content: space-between; gap: var(--list-card-body-gap, 8px) var(--list-card-foot-gap, 12px); }
.ogt-all-lists--fallback .name-link { min-inline-size: 0; color: var(--color-text, #fff); }
.ogt-all-lists--fallback .name-link:hover, .ogt-all-lists--fallback .card:hover .name-link { color: var(--color-link, #f31f35); }
.ogt-all-lists--fallback .name-link h3 { margin: 0; font-weight: var(--font-weight-headings, 600); font-size: var(--font-size-h4, 18px); }
.ogt-all-lists--fallback .chips { display: inline-flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--comment-tags-gap, 4px); margin-inline-start: auto; }
.ogt-all-lists__tag { display: inline-flex; block-size: var(--comment-chip-height, 24px); align-items: center; gap: var(--list-card-chip-gap, 5px); padding-inline: var(--comment-chip-padding, 8px); overflow: hidden; border: 1px solid color-mix(in srgb, var(--ogt-list-tag-color) var(--list-card-chip-line, 40%), transparent); border-radius: var(--radius-list-card-chip, 5px); background: color-mix(in srgb, var(--ogt-list-tag-color) var(--list-card-chip-tint, 10%), transparent); color: color-mix(in srgb, var(--ogt-list-tag-color), var(--color-list-card-chip-lift, white) var(--list-card-chip-lift, 10%)); font-family: var(--font-headings); font-size: var(--font-size-comment-tag, 12px); white-space: nowrap; }
/* og's VipLabel (compact pill), for owners on pages without a native label to copy. */
.ogt-vip { display: inline-flex; align-items: stretch; overflow: hidden; block-size: var(--label-vip-height-small, 18px);
  margin-inline-start: 5px; border-radius: calc(var(--label-vip-height-small, 18px) / 2); background-color: var(--brand-primary, #ed1c24);
  color: var(--color-text-inverse, #fff); font-family: var(--font-headings); font-size: var(--font-size-label-vip-small, 11px);
  font-weight: var(--font-weight-headings-heavy, 700); letter-spacing: var(--label-vip-tracking, .04em); line-height: 1;
  text-transform: uppercase; text-shadow: none; vertical-align: middle; white-space: nowrap; }
.ogt-vip__name, .ogt-vip__tag { display: inline-flex; align-items: center; }
.ogt-vip__name { gap: var(--label-vip-gap-small, 3px); padding: var(--label-vip-name-padding-small, 0 7px 0 4px); }
.ogt-vip__mark { display: flex; font-size: var(--label-vip-mark-small, 12px); }
.ogt-vip__mark svg { block-size: 1em; inline-size: auto; translate: 0 var(--label-vip-mark-shift, 0); }
.ogt-vip__tag { padding: var(--label-vip-segment-padding-small, 0 6px); background-color: var(--color-label-ep, #8e44ad); text-decoration: none; }

.ogt-all-lists__icon { display: block; flex: none; width: 16px; height: 16px; }
.ogt-all-lists__tag .ogt-all-lists__icon { width: 12px; height: 12px; }
.ogt-all-lists--fallback .by { display: flex; flex-wrap: wrap; align-items: center; row-gap: var(--list-card-body-gap, 8px); margin: 0; color: var(--color-stat-noun, #aaa); font-family: var(--font-headings); font-size: var(--font-size-list-row-meta, 14px); }
.ogt-all-lists--fallback .owner { display: inline-flex; align-items: center; gap: var(--space-stat, 6px); color: var(--color-text, #fff); text-decoration: none; }
.ogt-all-lists--fallback .avatar { display: inline-flex; inline-size: var(--list-card-avatar-size, 24px); block-size: var(--list-card-avatar-size, 24px); flex: 0 0 var(--list-card-avatar-size, 24px); overflow: hidden; border-radius: 50%; background: var(--color-avatar-border, #353535); }
.ogt-all-lists--fallback .avatar img { inline-size: 100%; block-size: 100%; object-fit: cover; }
.ogt-all-lists--fallback .overview { max-inline-size: 80ch; margin-block-start: var(--list-card-bubble-gap, 8px); color: var(--color-list-card-description, var(--color-text-secondary, #aaa)); overflow-wrap: break-word; }
.ogt-all-lists--fallback .clamp { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.ogt-all-lists--fallback .foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--list-card-foot-gap, 8px) var(--space-stats, 12px); margin-block-start: auto; padding-block-start: var(--list-card-foot-gap, 8px); font-family: var(--font-headings); font-size: var(--font-size-list-row-meta, 14px); white-space: nowrap; }
.ogt-all-lists--fallback .counts, .ogt-all-lists--fallback .tools { display: flex; flex-wrap: wrap; align-items: center; gap: var(--list-counts-gap, 8px); }
.ogt-all-lists__count { display: inline-flex; block-size: var(--control-height, 36px); align-items: center; gap: var(--glass-action-gap-card, 8px); padding-inline: var(--glass-action-padding-card, 12px); border: 1px solid var(--color-control-border, #444); border-radius: var(--radius-control, 6px); background: var(--color-control-bg, transparent); color: var(--color-control-text, #ddd); font-family: var(--font-body); font-size: var(--font-size-glass-action, 14px); text-decoration: none; white-space: nowrap; }
.ogt-all-lists__count strong { font-weight: 700; }
.ogt-all-lists__count-icon { inline-size: 14px; block-size: 14px; color: var(--color-action-share, #00baff); }
.ogt-all-lists__count-icon { display: block; flex: none; }
.ogt-all-lists__count.comments .ogt-all-lists__count-icon { color: var(--color-stat-noun, #aaa); }
.ogt-all-lists--fallback .action { display: inline-grid; inline-size: var(--comment-tool-size, 28px); block-size: var(--comment-tool-size, 28px); place-items: center; border-radius: var(--radius-comment-tool, 4px); color: var(--color-stat-noun, #aaa); text-decoration: none; }
.ogt-all-lists--fallback button.action { padding: 0; border: 0; background: transparent; font: inherit; cursor: pointer; }
.ogt-all-lists--fallback .action:hover { background: var(--color-comment-chip, #333); }
.ogt-all-lists--fallback .progress { color: var(--color-text, #fff); }
.ogt-all-lists--fallback .share { color: var(--color-action-share, #00baff); }

@container (max-width: 600px) {
  .ogt-all-lists--fallback .card { grid-template-columns: minmax(0, 1fr); }
  .ogt-all-lists--fallback .fan { gap: var(--list-card-poster-gap-narrow, 8px); block-size: auto; overflow: visible; background: none; }
  .ogt-all-lists--fallback .fan.empty { block-size: var(--poster-height); }
  .ogt-all-lists--fallback .slot, .ogt-all-lists--fallback .slot:first-child { flex: 1; inline-size: auto; border-radius: var(--radius-list-card-poster-narrow, 4px); box-shadow: none; }
  .ogt-all-lists--fallback .slot { block-size: auto; }
  .ogt-all-lists--fallback .poster { position: relative; inline-size: 100%; block-size: auto; aspect-ratio: var(--ratio-poster, 2 / 3); }
}
`;
