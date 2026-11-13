import { checkSelectors, driftPageType } from './drift-checks.js';
import { getPrivateValue, setPrivateValue, STORAGE } from './store.js';
import { warn } from './log.js';
import { VERSION } from '../meta.js';

export function driftReports() {
  return Object.values(getPrivateValue(STORAGE.drift) ?? {});
}

export function saveDriftReport(page, problems, time = Date.now()) {
  if (typeof GM_getValue !== 'function' || typeof GM_setValue !== 'function') return;
  const reports = getPrivateValue(STORAGE.drift) ?? {};
  if (!problems.length && !reports[page]) return;
  if (problems.length) reports[page] = { page, version: VERSION, time, problems };
  else delete reports[page];
  setPrivateValue(STORAGE.drift, reports);
}

export const DRIFT_QUIET_MS = 3000;
export const DRIFT_CONFIRM_MS = 10000;
/** A page that keeps changing (a carousel, a live count) never goes quiet; check it this long after arriving. */
export const DRIFT_MAX_WAIT_MS = 20000;

/** The first pass follows DOM quiet. The second confirms misses without restarting on lazy content. */
export function createDriftMonitor({ collect, report, currentKey }) {
  const warned = new Set();
  let key;
  let timer;
  let cap;
  let phase;

  const firstPass = (page, route) => {
    clearTimeout(timer);
    clearTimeout(cap);
    if (phase !== 'quiet' || currentKey() !== route.key) return;
    phase = 'confirm';
    const first = new Set(collect(page, route));
    timer = setTimeout(() => {
      if (currentKey() !== route.key) return;
      phase = 'done';
      const problems = [...new Set(collect(page, route))].filter((problem) => first.has(problem));
      const fresh = problems.filter((problem) => !warned.has(`${page}: ${problem}`));
      for (const problem of fresh) warned.add(`${page}: ${problem}`);
      report(page, problems, fresh);
    }, DRIFT_CONFIRM_MS);
  };

  return (route) => {
    const page = driftPageType(route);
    if (route.key !== key) {
      clearTimeout(timer);
      clearTimeout(cap);
      key = route.key;
      phase = 'quiet';
      if (page) cap = setTimeout(() => firstPass(page, route), DRIFT_MAX_WAIT_MS);
    }
    if (phase !== 'quiet' || !page) return;
    clearTimeout(timer);
    timer = setTimeout(() => firstPass(page, route), DRIFT_QUIET_MS);
  };
}

export function collectDrift(document, page, host, route, { headerSignedIn, hasSession, isEnabled }) {
  const problems = checkSelectors(document, page, { signedIn: headerSignedIn || hasSession, isEnabled })
    .filter((check) => !check.ok).map(({ feature, selector }) => `${feature}: ${selector}`);
  problems.push(...host.problems(route));
  if (headerSignedIn && !hasSession) problems.push('og session: signed-in header without a session entry');
  return problems;
}

export function reportDrift(page, problems, fresh) {
  saveDriftReport(page, problems);
  for (const problem of fresh) warn(`og drift on ${page} pages: ${problem}`);
}
