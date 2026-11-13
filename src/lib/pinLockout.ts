/**
 * Pure parent-PIN lockout rules. Kept separate from React Native/Supabase so
 * the same policy can be unit-tested and reused by every PIN entry point.
 *
 * Policy:
 *   failures 1–2  → no lockout
 *   failure 3     → 5 s
 *   failure 6     → 10 s
 *   failure 9     → 20 s
 *   failure 12    → 40 s, and so on (doubles every additional 3 failures)
 *
 * A successful PIN resets the failure count. The count is intentionally not
 * reset just because a lockout expires, so repeated guessing keeps escalating.
 */

export const PIN_FAILURES_PER_LOCKOUT = 3;
export const PIN_BASE_LOCKOUT_SECONDS = 5;
export const PIN_ALERT_RATE_LIMIT_SECONDS = 15 * 60;

export interface PinSecurityRecord {
  failedAttempts: number;
  /** Epoch milliseconds, or null when not locked. */
  lockedUntil: number | null;
  /** Epoch milliseconds of the most recent incorrect attempt. */
  lastFailureAt: number | null;
}

export interface PinSecurityState extends PinSecurityRecord {
  /** Full duration of the current lockout in seconds (0 when unlocked). */
  lockoutSeconds: number;
  /** Whole seconds left, rounded up for a readable countdown. */
  remainingSeconds: number;
}

export interface PinAttemptResult extends PinSecurityState {
  ok: boolean;
  locked: boolean;
  /** True when a new lockout began and the backend should send one alert. */
  alertDue: boolean;
}

export function lockoutSecondsForAttempts(attempts: number): number {
  const clean = Math.max(0, Math.floor(Number.isFinite(attempts) ? attempts : 0));
  if (clean < PIN_FAILURES_PER_LOCKOUT || clean % PIN_FAILURES_PER_LOCKOUT !== 0) return 0;
  const tier = Math.floor(clean / PIN_FAILURES_PER_LOCKOUT);
  return PIN_BASE_LOCKOUT_SECONDS * 2 ** (tier - 1);
}

export function attemptsUntilLockout(failedAttempts: number): number {
  const clean = Math.max(0, Math.floor(Number.isFinite(failedAttempts) ? failedAttempts : 0));
  const remainder = clean % PIN_FAILURES_PER_LOCKOUT;
  return remainder === 0 ? PIN_FAILURES_PER_LOCKOUT : PIN_FAILURES_PER_LOCKOUT - remainder;
}

export function remainingLockoutSeconds(lockedUntil: number | null, now = Date.now()): number {
  if (!lockedUntil || !Number.isFinite(lockedUntil)) return 0;
  return Math.max(0, Math.ceil((lockedUntil - now) / 1000));
}

export function makePinSecurityState(
  record: Partial<PinSecurityRecord> | null | undefined,
  now = Date.now()
): PinSecurityState {
  const failedAttempts = Math.max(0, Math.floor(Number(record?.failedAttempts ?? 0)));
  const rawUntil = Number(record?.lockedUntil ?? 0);
  const lastFailureAt = Number(record?.lastFailureAt ?? 0);
  const remainingSeconds = remainingLockoutSeconds(rawUntil || null, now);
  const locked = remainingSeconds > 0;
  return {
    failedAttempts,
    lockedUntil: locked ? rawUntil : null,
    lastFailureAt: Number.isFinite(lastFailureAt) && lastFailureAt > 0 ? lastFailureAt : null,
    lockoutSeconds: locked ? lockoutSecondsForAttempts(failedAttempts) : 0,
    remainingSeconds,
  };
}

export function applyPinAttempt(
  record: Partial<PinSecurityRecord> | null | undefined,
  matched: boolean,
  now = Date.now()
): PinAttemptResult {
  const state = makePinSecurityState(record, now);

  // While a lockout is active, even the correct PIN is refused. This is what
  // stops a caller from skipping the wait by replaying the correct value.
  if (state.remainingSeconds > 0) {
    return { ...state, ok: false, locked: true, alertDue: false };
  }

  if (matched) {
    return {
      failedAttempts: 0,
      lockedUntil: null,
      lastFailureAt: null,
      lockoutSeconds: 0,
      remainingSeconds: 0,
      ok: true,
      locked: false,
      alertDue: false,
    };
  }

  const failedAttempts = state.failedAttempts + 1;
  const lockoutSeconds = lockoutSecondsForAttempts(failedAttempts);
  const lockedUntil = lockoutSeconds > 0 ? now + lockoutSeconds * 1000 : null;
  return {
    failedAttempts,
    lockedUntil,
    lastFailureAt: now,
    lockoutSeconds,
    remainingSeconds: lockoutSeconds,
    ok: false,
    locked: lockoutSeconds > 0,
    alertDue: lockoutSeconds > 0,
  };
}

export function emptyPinAttemptResult(now = Date.now()): PinAttemptResult {
  const state = makePinSecurityState(null, now);
  return { ...state, ok: false, locked: false, alertDue: false };
}
