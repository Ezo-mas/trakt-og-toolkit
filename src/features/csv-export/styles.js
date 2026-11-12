import { titleBarButtonCss } from '../../ui/title-bar.js';

export const CSS = String.raw`
.ogt-csv-export { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-stat, 6px) 10px; min-inline-size: 0; }
${titleBarButtonCss('ogt-csv-export__button')}
.ogt-csv-export__status { margin: 0; color: var(--color-stat-noun, light-dark(#767676, #9a9a9a)); font-size: 12px; line-height: 1.4; }
.ogt-csv-export__status:empty { display: none; }
`;
