/** Exponential backoff with jitter, capped at 5 minutes (mirrors WorkManager-style retry). */
const BASE_MS = 1_000;
const MAX_MS = 5 * 60 * 1_000;

export function nextAttemptDelayMs(attempts: number): number {
  const exp = Math.min(MAX_MS, BASE_MS * 2 ** Math.max(0, attempts - 1));
  const jitter = Math.floor(Math.random() * Math.min(1_000, exp * 0.2));
  return Math.min(MAX_MS, exp + jitter);
}

export function nextAttemptAt(attempts: number, now: number = Date.now()): number {
  return now + nextAttemptDelayMs(attempts);
}
