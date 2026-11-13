import {
  applyPinAttempt,
  emptyPinAttemptResult,
  makePinSecurityState,
  type PinAttemptResult,
  type PinSecurityRecord,
  type PinSecurityState,
} from './pinLockout';
import { isSupabaseConfigured, supabase } from './supabase';
import { keys, storage } from './storage';

/**
 * Parent PIN lockout + alert client.
 *
 * With Supabase configured, the database RPC is the source of truth: it
 * compares the candidate hash, enforces the lockout server-side, persists it
 * across devices/restarts and decides when a rate-limited alert is due. The
 * device keeps a small mirror so a network hiccup or a reload cannot silently
 * remove an active countdown. Demo mode uses the same rules locally.
 */

export type PinAlertStatus = 'sent' | 'rate_limited' | 'not_configured' | 'failed' | 'skipped';

interface BackendPinState {
  ok?: boolean;
  locked?: boolean;
  noPin?: boolean;
  failedAttempts?: number;
  lockoutSeconds?: number;
  remainingSeconds?: number;
  lockedUntil?: string | number | null;
  lastFailureAt?: string | number | null;
  alertDue?: boolean;
}

const backendAvailable = () => isSupabaseConfigured && Boolean(supabase);
const alertRequests = new Map<string, Promise<PinAlertStatus>>();

function localKey(accountId: string): string {
  return keys.pinSecurityPrefix + accountId;
}

function asTime(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function asCount(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

async function readLocal(accountId: string): Promise<PinSecurityRecord> {
  const saved = await storage.get<Partial<PinSecurityRecord>>(localKey(accountId));
  return {
    failedAttempts: asCount(saved?.failedAttempts),
    lockedUntil: asTime(saved?.lockedUntil ?? null),
    lastFailureAt: asTime(saved?.lastFailureAt ?? null),
  };
}

async function writeLocal(accountId: string, state: PinSecurityState): Promise<void> {
  await storage.set(localKey(accountId), {
    failedAttempts: state.failedAttempts,
    lockedUntil: state.lockedUntil,
    lastFailureAt: state.lastFailureAt,
  } satisfies PinSecurityRecord);
}

/**
 * Rebuild the client countdown from a server response. The server's remaining
 * seconds are anchored to the device clock so a skewed phone clock cannot make
 * the countdown vanish early; the next server attempt still enforces the real
 * lockout.
 */
function fromBackend(data: BackendPinState): PinAttemptResult {
  if (data.noPin) return emptyPinAttemptResult();

  const failedAttempts = asCount(data.failedAttempts);
  const serverLocked = Boolean(data.locked);
  const remainingSeconds = serverLocked ? Math.max(1, asCount(data.remainingSeconds)) : 0;
  const lockoutSeconds = Math.max(asCount(data.lockoutSeconds), remainingSeconds);
  const now = Date.now();
  return {
    failedAttempts,
    lockedUntil: remainingSeconds > 0 ? now + remainingSeconds * 1000 : null,
    lastFailureAt: asTime(data.lastFailureAt),
    lockoutSeconds: serverLocked ? lockoutSeconds : 0,
    remainingSeconds,
    ok: Boolean(data.ok) && !serverLocked,
    locked: serverLocked,
    alertDue: serverLocked && Boolean(data.alertDue),
  };
}

function isBackendState(data: unknown): data is BackendPinState {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data);
}

export const pinSecurity = {
  /** Load persisted state. The backend wins when it answers. */
  async status(accountId: string): Promise<PinSecurityState> {
    if (backendAvailable() && supabase) {
      try {
        const { data, error } = await supabase.rpc('pin_security_status');
        if (!error && isBackendState(data)) {
          const result = fromBackend({ ...data, ok: false });
          const state = makePinSecurityState(
            {
              failedAttempts: result.failedAttempts,
              lockedUntil: result.lockedUntil,
              lastFailureAt: result.lastFailureAt,
            },
            Date.now()
          );
          await writeLocal(accountId, state);
          return state;
        }
      } catch {
        // Offline or schema not applied yet — fall through to the device mirror.
      }
    }
    return makePinSecurityState(await readLocal(accountId));
  },

  /** Verify a PIN and atomically update the shared lockout state. */
  async verify(accountId: string, candidateHash: string, storedPinHash: string): Promise<PinAttemptResult> {
    if (backendAvailable() && supabase) {
      try {
        const { data, error } = await supabase.rpc('record_pin_attempt', { p_pin_hash: candidateHash });
        if (!error && isBackendState(data)) {
          const result = fromBackend(data);
          await writeLocal(accountId, result);
          return result;
        }
      } catch {
        // Fall back to the always-available local policy.
      }
    }

    const local = applyPinAttempt(await readLocal(accountId), candidateHash === storedPinHash);
    await writeLocal(accountId, local);
    return local;
  },

  /**
   * Ask the server-side function to email the registered parent. The function
   * rechecks lockout state and rate limits, so the body contains no PIN, hash,
   * or client-supplied email address.
   */
  requestAlert(accountId: string, result: PinAttemptResult): Promise<PinAlertStatus> {
    if (!result.alertDue || !result.locked || result.failedAttempts % 3 !== 0) {
      return Promise.resolve('skipped');
    }
    if (!backendAvailable()) return Promise.resolve('not_configured');

    const key = `${accountId}:${result.failedAttempts}:${result.lockedUntil ?? 0}`;
    const existing = alertRequests.get(key);
    if (existing) return existing;

    const request = (async (): Promise<PinAlertStatus> => {
      if (!supabase) return 'not_configured';
      try {
        const { data, error } = await supabase.functions.invoke('pin-security-alert', { body: {} });
        if (error) {
          const status = Number(
            (error as { context?: { status?: number }; status?: number }).context?.status ??
              (error as { status?: number }).status ??
              0
          );
          if (status === 429) return 'rate_limited';
          if (status === 503) return 'not_configured';
          return 'failed';
        }
        if (data && typeof data === 'object' && (data as { ok?: boolean }).ok) return 'sent';
        if (data && typeof data === 'object' && (data as { reason?: string }).reason === 'rate_limited') {
          return 'rate_limited';
        }
        return 'failed';
      } catch {
        return 'failed';
      }
    })();

    alertRequests.set(key, request);
    void request.then(
      () => alertRequests.delete(key),
      () => alertRequests.delete(key)
    );
    return request;
  },
};
