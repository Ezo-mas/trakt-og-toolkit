export const CSS = `
.ogt-review { position:relative; isolation:isolate; color:white; background:#17121f; overflow:hidden; }
.ogt-review[hidden] { display:none; }
.ogt-review__art { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:-2; }
.ogt-review::before { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(8,8,18,.92),rgba(8,8,18,.45)); z-index:-1; }
.ogt-review__inner { max-width:1160px; margin:auto; padding:32px 24px; }
.ogt-review h2 { font-size:clamp(26px,4vw,42px); font-weight:800; margin:0 0 28px; color:white; }
.ogt-review em { color:#b965d4; font-style:normal; }
.ogt-review__grid { display:grid; grid-template-columns:120px 120px minmax(180px,330px); gap:10px; }
.ogt-review__tile,.ogt-review__first { background:rgba(104,49,133,.35); border-radius:6px; padding:14px; }
.ogt-review__tile strong { font-size:28px; line-height:1; display:block; }
.ogt-review__tile span,.ogt-review__first small { text-transform:uppercase; font-size:12px; color:#ddd; }
.ogt-review__first { grid-column:3; grid-row:1 / 3; display:flex; flex-direction:column; justify-content:space-between; gap:24px; }
.ogt-review__first strong { font-size:24px; display:block; }
.ogt-review__link { display:inline-block; margin-top:26px; padding:10px 14px; background:#9747b5; color:white!important; border-radius:4px; font-weight:bold; }
.ogt-review__hide { position:absolute; right:12px; top:8px; border:0; background:transparent; color:white; cursor:pointer; }
.ogt-review-hint { padding:12px 24px; color:light-dark(#555,#bbb); }
@media(max-width:600px) { .ogt-review__grid { grid-template-columns:1fr 1fr; } .ogt-review__first { grid-column:1 / 3; grid-row:3; } }
`;
