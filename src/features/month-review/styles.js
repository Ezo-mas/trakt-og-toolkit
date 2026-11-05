export const CSS = `
.ogt-review { position:relative; isolation:isolate; color:white; background:#181012; font-family:var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif); overflow:hidden; }
.ogt-review[hidden] { display:none; }
.ogt-review__art { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:-2; }
.ogt-review::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(10,8,10,.92),rgba(10,8,10,.45)); z-index:-1; }
/* Match og's Container so review content lines up with the month ribbon and Up Next. */
.ogt-review__inner { margin-inline:auto; padding-block:32px; padding-inline:calc(var(--gutter,20px) / 2); box-sizing:border-box; }
@media(min-width:768px) { .ogt-review__inner { inline-size:var(--container-sm,740px); } }
@media(min-width:992px) { .ogt-review__inner { inline-size:var(--container-md,960px); } }
@media(min-width:1200px) { .ogt-review__inner { inline-size:var(--container-lg,1160px); } }
.ogt-review h2 { font-size:clamp(32px,4vw,48px); font-family:var(--font-headings, inherit); font-weight:700; letter-spacing:-.025em; line-height:1.1; margin:0 0 28px; color:white; }
.ogt-review em { color:var(--brand-primary,#ed1c24); font-style:normal; }
.ogt-review__top { display:flex; flex-direction:column; align-items:stretch; gap:14px; margin-bottom:28px; }
.ogt-review__top h2 { margin:0; }
/* The month nav is a flat transparent chip like the dashboard tiles - no circle, no color of its own. */
.ogt-review__nav { display:flex; align-items:center; gap:8px; flex:none; }
.ogt-review__arrow { display:grid; place-items:center; inline-size:36px; block-size:36px; border:0; padding:0;
  border-radius:var(--radius-dashboard-panel,var(--radius-container,12px));
  background:rgba(0,0,0,.25); color:white; cursor:pointer; }
.ogt-review__arrow svg { display:block; }
.ogt-review__arrow:hover:not(:disabled) { background:rgba(255,255,255,.15); }
.ogt-review__arrow:disabled { opacity:.35; cursor:default; }
.ogt-review__arrow:focus-visible { outline:2px solid white; outline-offset:3px; }
.ogt-review__bottom { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-top:26px; }
.ogt-review__empty { font-size:18px; color:#ddd; margin:0 0 26px; }
.ogt-review__grid { display:grid; /* The first-play box hugs its title, like classic's, up to 480px. */ grid-template-columns:144px 144px fit-content(480px); gap:10px; }
.ogt-review__tile,.ogt-review__first { background:rgba(120,24,30,.38); border-radius:var(--radius-dashboard-panel,var(--radius-container,12px)); padding:10px 12px; }
.ogt-review__tile { display:grid; grid-template-columns:36px minmax(0,1fr); align-items:center; column-gap:10px; min-width:0; min-height:64px; box-sizing:border-box; }
.ogt-review__icon { width:36px; height:36px; display:block; align-self:center; }
.ogt-review__value { min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.ogt-review__tile strong { font-family:var(--font-headings, inherit); font-weight:700; font-size:28px; line-height:1; letter-spacing:-.025em; display:block; }
.ogt-review__tile span { display:block; text-transform:uppercase; font-size:11px; line-height:1; color:#ddd; }
.ogt-review__first small { display:block; text-transform:uppercase; font-size:14px; font-weight:400; line-height:1.15; color:#ddd; }
.ogt-review__first small span { display:block; color:white; font-weight:400; }
.ogt-review__episode { display:block; margin-top:4px; font-size:16px; font-weight:400; line-height:1.25; }
.ogt-review__first { grid-column:3; grid-row:1 / 3; min-width:180px; box-sizing:border-box; display:flex; flex-direction:column; justify-content:space-between; gap:24px; padding:12px; }
.ogt-review__title { font-family:var(--font-headings, inherit); font-size:30px; font-weight:700; letter-spacing:-.025em; line-height:1.1; display:block; }
.ogt-review__first b { font-family:inherit; font-size:inherit; font-weight:700; }
.ogt-review__link { font-size:15px; display:inline-block; padding:10px 14px; background:var(--brand-primary,#ed1c24); text-decoration:none; color:white!important; border-radius:var(--radius-action-button,var(--radius-object,8px)); font-weight:bold; }
.ogt-review__link:hover { background:var(--brand-primary-darken,#c61017); }
.ogt-review__link:focus-visible,.ogt-review__hide:focus-visible { outline:2px solid white; outline-offset:3px; }
.ogt-review__hide { display:block; border:0; background:rgba(0,0,0,.25); color:white; font:inherit; font-size:14px; cursor:pointer;
  padding:8px 14px; width:100%; box-sizing:border-box; text-align:right; border-radius:var(--radius-dashboard-panel,var(--radius-container,12px)); }
.ogt-review__hide:hover:not(:disabled) { background:rgba(255,255,255,.15); }
.ogt-review__hide:disabled { opacity:.35; cursor:default; }
.ogt-review-hint { padding:12px 24px; color:light-dark(#555,#bbb); }
@media(max-width:600px) { .ogt-review__grid { grid-template-columns:1fr 1fr; } .ogt-review__first { grid-column:1 / 3; grid-row:3; } }
`;
