export const CSS = `
.ogt-review { position:relative; isolation:isolate; color:white; background:#181012; font-family:var(--font-body, "Helvetica Neue", Helvetica, Arial, sans-serif); overflow:hidden; }
.ogt-review[hidden] { display:none; }
.ogt-review__art { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:-2; }
.ogt-review::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(10,8,10,.92),rgba(10,8,10,.45)); z-index:-1; }
.ogt-review__inner { max-width:1160px; margin:auto; padding:32px 24px; }
.ogt-review h2 { font-size:clamp(26px,4vw,42px); font-family:var(--font-headings, inherit); font-weight:700; letter-spacing:-.025em; line-height:1.1; margin:0 0 28px; color:white; }
.ogt-review em { color:var(--brand-primary,#ed1c24); font-style:normal; }
.ogt-review__grid { display:grid; grid-template-columns:132px 132px minmax(180px,330px); gap:10px; }
.ogt-review__tile,.ogt-review__first { background:rgba(120,24,30,.38); border-radius:6px; padding:10px 12px; }
.ogt-review__tile { display:grid; grid-template-columns:30px minmax(0,1fr); align-items:center; column-gap:10px; min-width:0; min-height:64px; box-sizing:border-box; }
.ogt-review__icon { width:30px; height:30px; display:block; align-self:center; }
.ogt-review__value { min-width:0; display:flex; flex-direction:column; align-items:flex-start; gap:2px; }
.ogt-review__tile strong { font-family:var(--font-headings, inherit); font-weight:700; font-size:28px; line-height:1; letter-spacing:-.025em; display:block; }
.ogt-review__tile span { display:block; text-transform:uppercase; font-size:11px; line-height:1; color:#ddd; }
.ogt-review__first small { display:block; text-transform:uppercase; font-size:13px; font-weight:600; line-height:1.15; color:#ddd; }
.ogt-review__first small span { display:block; color:white; font-weight:700; }
.ogt-review__episode { display:block; margin-top:4px; font-size:14px; font-weight:600; line-height:1.25; }
.ogt-review__first { grid-column:3; grid-row:1 / 3; display:flex; flex-direction:column; justify-content:space-between; gap:24px; padding:12px; }
.ogt-review__first strong { font-family:var(--font-headings, inherit); font-size:24px; font-weight:700; letter-spacing:-.025em; line-height:1.1; display:block; }
.ogt-review__link { display:inline-block; margin-top:26px; padding:10px 14px; background:var(--brand-primary,#ed1c24); text-decoration:none; color:white!important; border-radius:4px; font-weight:bold; }
.ogt-review__link:hover { background:var(--brand-primary-darken,#c61017); }
.ogt-review__link:focus-visible,.ogt-review__hide:focus-visible { outline:2px solid white; outline-offset:3px; }
.ogt-review__hide { position:absolute; right:12px; top:8px; border:0; background:transparent; color:white; cursor:pointer; }
.ogt-review-hint { padding:12px 24px; color:light-dark(#555,#bbb); }
@media(max-width:600px) { .ogt-review__grid { grid-template-columns:1fr 1fr; } .ogt-review__first { grid-column:1 / 3; grid-row:3; } }
`;
