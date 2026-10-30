export const CSS = String.raw`
.ogt-pronounce__wrap {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  margin-inline-start: 8px;
  vertical-align: middle;
}

.ogt-pronounce {
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: light-dark(#767676, #a7a7a7);
  font: inherit;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
}

.ogt-pronounce:hover {
  text-decoration: underline;
}

.ogt-pronounce:focus-visible {
  outline: 2px solid light-dark(#333, #fff);
  outline-offset: 2px;
}

.ogt-pronounce[aria-busy="true"] {
  cursor: progress;
}

.ogt-pronounce__status {
  color: light-dark(#767676, #a7a7a7);
  font-size: 0.75rem;
}

.ogt-pronounce__status a {
  color: inherit;
  text-decoration: underline;
}

.ogt-pronounce__status a:focus-visible {
  outline: 2px solid light-dark(#333, #fff);
  outline-offset: 2px;
}
`;
