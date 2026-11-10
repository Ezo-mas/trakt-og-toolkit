/**
 * Timing helpers for the built-bundle tests.
 *
 * Use `waitFor` for anything the test expects to happen: it polls until the condition holds, so it survives a loaded
 * machine where a fixed sleep does not. Keep `wait` for checks that something does *not* happen (a write that must
 * never be sent, a node that must stay gone): there is nothing to poll for, so a short fixed pause is the only option.
 */
export const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Resolves with the condition's first truthy value. A condition that throws (say, reading a node that is not
 * mounted yet) counts as not ready. Fails with `message` after `timeout` ms.
 */
export async function waitFor(condition, { timeout = 4000, interval = 10, message = 'the UI to settle' } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    let value;
    try { value = condition(); } catch { value = false; }
    if (value) return value;
    if (Date.now() >= deadline) throw new Error(`Timed out waiting for ${message}`);
    await wait(interval);
  }
}
