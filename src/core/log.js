/** Tiny namespaced logger so the console stays readable. */
const PREFIX = '[OGT]';
let verbose = false;

export function setVerbose(value) {
  verbose = Boolean(value);
}

export function isVerbose() {
  return verbose;
}

export function log(...args) {
  if (verbose) console.log(PREFIX, ...args);
}

export function info(...args) {
  console.info(PREFIX, ...args);
}

export function warn(...args) {
  console.warn(PREFIX, ...args);
}

/** Expected, recoverable failures stay quiet unless debugging. */
export function debugError(label, error) {
  if (verbose) console.warn(PREFIX, label, error);
}
