export const CSS = String.raw`
/* Match og's Container so the panel lines up with the list rows above it. */
.ogt-lists {
  box-sizing: border-box;
  inline-size: 100%;
  margin-inline: auto;
  padding-inline: calc(var(--gutter, 20px) / 2);
}

@media (min-width: 768px) {
  .ogt-lists {
    inline-size: var(--container-sm, 740px);
  }
}

@media (min-width: 992px) {
  .ogt-lists {
    inline-size: var(--container-md, 960px);
  }
}

@media (min-width: 1200px) {
  .ogt-lists {
    inline-size: var(--container-lg, 1160px);
  }
}

.ogt-lists .ogt-panel {
  margin-block-start: 0;
}

.ogt-lists__groups[hidden] {
  display: none !important;
}

.ogt-lists__group + .ogt-lists__group {
  margin-block-start: 16px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--ogt-border);
}

.ogt-lists__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  color: var(--ogt-fg);
  font-size: 13px;
  font-weight: 700;
}

.ogt-lists__count {
  min-inline-size: 20px;
  padding: 1px 6px;
  border: 1px solid var(--ogt-border);
  border-radius: 999px;
  color: var(--ogt-muted);
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.ogt-lists__items {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ogt-lists__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 5px;
}

.ogt-lists__item:hover {
  background: var(--ogt-raised);
}

.ogt-lists__poster {
  flex-shrink: 0;
  inline-size: 34px;
  block-size: 51px;
  border-radius: 3px;
  background: var(--ogt-raised);
  object-fit: cover;
}

.ogt-lists__body {
  min-inline-size: 0;
}

.ogt-lists__name {
  color: var(--ogt-fg);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.ogt-lists__name:hover,
.ogt-lists__name:focus-visible {
  color: var(--ogt-accent);
  text-decoration: underline;
}

.ogt-lists__name:focus-visible {
  outline: 2px solid var(--ogt-accent);
  outline-offset: 2px;
}

.ogt-lists__meta {
  margin: 2px 0 0;
  color: var(--ogt-muted);
  font-size: 11px;
}

.ogt-lists__description {
  display: -webkit-box;
  overflow: hidden;
  margin: 4px 0 0;
  color: var(--ogt-fg);
  font-size: 12px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
`;
