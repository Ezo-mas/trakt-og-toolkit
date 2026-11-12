/** Shared queue for authenticated writes. */
import { authError, headerValue, MAX_RETRY_WAIT_MS } from './http.js';

/**
 * Trakt's current standard-app limit for authenticated writes is one POST/PUT/DELETE per second
 * (https://developer.trakt.tv/docs/rate-limiting, checked 2026-11-07). One shared FIFO queue sends
 * those requests serially and spaces actual dispatches by at least this interval.
 */
const WRITE_INTERVAL_MS = 1000;
/** Only a 429 establishes that a write was rejected before being processed; retry those a few times. */
const WRITE_RETRIES = 2;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30000;
/** Long Retry-After waits are sliced so cancellation and sign-out are noticed without shortening them. */
const WAIT_SLICE_MS = 250;

let writeTail = Promise.resolve();
let nextWriteAt = 0;
let blockedUntil = 0;
let blockedGeneration = null;

export function cancelledError() {
  const error = authError('Trakt request cancelled.', 0);
  error.control = true;
  return error;
}

/** A Retry-After too long to wait through with a button busy; callers show their 429 message. */
function rateLimitedError() {
  return authError('Trakt rate limited this request; try again later.', 429);
}

/** Abortable sleep. Timers are read from the global scope so tests can mock them. */
function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(cancelledError()); return; }
    const done = () => { cleanup(); resolve(); };
    const abort = () => { cleanup(); reject(cancelledError()); };
    const timer = setTimeout(done, Math.max(0, ms));
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

/** FIFO: one queued write runs at a time; a rejection never blocks later writes. */
export function enqueueWrite(entry, task) {
  const queued = writeTail.then(() => {
    entry.check();
    return task();
  });
  writeTail = queued.then(() => {}, () => {});
  return queued;
}

/** Wait for the one-second write pacing slot and any account-wide Retry-After block. */
export async function waitForTurn(entry) {
  for (;;) {
    entry.check();
    const blocked = blockedGeneration === entry.generation ? blockedUntil : 0;
    // Fail fast rather than leave a queued action spinning for minutes; the block itself stays.
    if (blocked - Date.now() > MAX_RETRY_WAIT_MS) throw rateLimitedError();
    const remaining = Math.max(nextWriteAt, blocked) - Date.now();
    if (remaining <= 0) return;
    await sleep(Math.min(remaining, WAIT_SLICE_MS), entry.signal);
  }
}

function blockWrites(ms, generation) {
  const until = Date.now() + ms;
  if (blockedGeneration === generation) blockedUntil = Math.max(blockedUntil, until);
  else { blockedGeneration = generation; blockedUntil = until; }
}

/** Full seconds when Trakt sends Retry-After, otherwise bounded exponential backoff with jitter. */
function retryDelay(headers, attempt) {
  const raw = headerValue(headers, 'retry-after');
  if (raw != null && raw !== '') {
    const retryAfter = Number(raw);
    if (Number.isFinite(retryAfter) && retryAfter >= 0) return retryAfter * 1000;
  }
  const base = Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS);
  return Math.round(base * (0.5 + Math.random()));
}

export function retryRateLimitedWrite(headers, generation, attempt) {
  const delay = retryDelay(headers, attempt);
  // Even the final 429 blocks subsequent writes in this session for the full delay.
  blockWrites(delay, generation);
  return attempt < WRITE_RETRIES && delay <= MAX_RETRY_WAIT_MS;
}

export function markWriteDispatched() {
  // Pacing starts at the actual transport dispatch, not while waiting for a slot.
  nextWriteAt = Date.now() + WRITE_INTERVAL_MS;
}
