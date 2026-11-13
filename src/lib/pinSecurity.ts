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
 * across devices/restarts and creates one alert event per lockout. The Edge
 * Function owns the email send and records Gmail's real response. The device
 * keeps a small mirror so a network hiccup or a reload cannot silently remove
 * an active countdown. Demo mode uses the same lockout rules locally.
 */

export type PinAlertStatus =
  | 'accepted'
  | 'deduplicated'
  | 'rate_limited'
  | 'not_configured'
  | 'failed'
  | 'in_progress'
  | 'retry_exhausted'
  | 'skipped';

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
  alertEventId?: string | null;
}

export interface TestEmailResult {
  ok: boolean;
  status: 'accepted' | 'failed' | 'rate_limited' | 'not_configured';
  error?: string;
  message?: string;
  recipientMasked?: string;
  eventId?: string;
  providerMessageId?: string;
  retryAfterSeconds?: number;
  diagnosticsRecorded?: boolean;
}

export interface SecurityAlertDiagnostic {
  id: string;
  kind: 'lockout' | 'test';
  status: 'pending' | 'sending' | 'accepted' | 'delivered' | 'failed' | 'bounced' | 'complained';
  failedAttempts: number;
  lockoutSeconds: number;
  eventAt: string;
  recipientMasked: string;
  attemptCount: number;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  acceptedAt: string | null;
  deliveredAt: string | null;
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
    alertEventId: serverLocked && typeof data.alertEventId === 'string' ? data.alertEventId : null,
  };
}

function isBackendState(data: unknown): data is BackendPinState {
  return Boolean(data) && typeof data === 'object' && !Array.isArray(data);
}

interface AlertInvocation {
  data: Record<string, unknown> | null;
  error: unknown;
  status: number;
}

async function invokeAlert(body: Record<string, unknown>): Promise<AlertInvocation> {
  if (!supabase) return { data: null, error: 'not_configured', status: 0 };

  const { data, error } = await supabase.functions.invoke('pin-security-alert', { body });
  let payload: Record<string, unknown> | null =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  let status = error ? 0 : 200;

  if (error) {
    const context = (error as { context?: { status?: number; json?: () => Promise<unknown> } }).context;
    status = Number(context?.status ?? (error as { status?: number }).status ?? 0);
    if (context && typeof context.json === 'function') {
      try {
        const parsed = await context.json();
        if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>;
      } catch {
        // Keep the generic SDK error below.
      }
    }
    if (!payload) {
      const message = (error as { message?: string }).message;
      payload = { error: message || 'The security email service could not be reached.' };
    }
  }

  return { data: payload, error, status };
}

function failureStatus(invocation: AlertInvocation): PinAlertStatus {
  if (invocation.status === 429) return 'rate_limited';
  if (invocation.status === 503 || invocation.data?.code === 'not_configured') return 'not_configured';
  if (invocation.data?.code === 'in_progress') return 'in_progress';
  if (invocation.data?.code === 'retry_exhausted') return 'retry_exhausted';
  return 'failed';
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
   * rechecks the lockout event, resolves the recipient from Supabase Auth and
   * uses the event id to prevent duplicate emails.
   */
  requestAlert(accountId: string, result: PinAttemptResult): Promise<PinAlertStatus> {
    if (!result.alertDue || !result.locked) return Promise.resolve('skipped');
    if (!backendAvailable()) return Promise.resolve('not_configured');

    const key = result.alertEventId ?? `${accountId}:${result.failedAttempts}:${result.lockedUntil ?? 0}`;
    const existing = alertRequests.get(key);
    if (existing) return existing;

    const request = (async (): Promise<PinAlertStatus> => {
      try {
        const invocation = await invokeAlert(result.alertEventId ? { eventId: result.alertEventId } : {});
        if (!invocation.error && invocation.data?.ok) {
          return invocation.data.deduplicated ? 'deduplicated' : 'accepted';
        }
        const status = failureStatus(invocation);
        console.warn('[kidflix] parent security email not accepted', {
          status,
          code: typeof invocation.data?.code === 'string' ? invocation.data.code : undefined,
        });
        return status;
      } catch {
        console.warn('[kidflix] parent security email request failed');
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

  /**
   * Retry the newest failed event after its backoff. Called once when a parent
   * session boots; the server decides whether any event is eligible, so this
   * cannot create a second alert for an event Gmail already accepted.
   */
  async retryPendingAlerts(): Promise<PinAlertStatus> {
    if (!backendAvailable()) return 'not_configured';
    try {
      const invocation = await invokeAlert({ retry: true });
      if (!invocation.error && invocation.data?.ok) {
        return invocation.data.deduplicated ? 'deduplicated' : 'accepted';
      }
      return failureStatus(invocation);
    } catch {
      return 'failed';
    }
  },

  /** Send a real test email. Success means Gmail accepted it, not inbox delivery. */
  async sendTestEmail(): Promise<TestEmailResult> {
    if (!backendAvailable()) {
      return {
        ok: false,
        status: 'not_configured',
        error: 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable security emails.',
      };
    }

    const invocation = await invokeAlert({ mode: 'test' });
    const payload = invocation.data;
    const errorMessage =
      typeof payload?.error === 'string' ? payload.error : 'The security email could not be sent.';

    if (!invocation.error && payload?.ok) {
      return {
        ok: true,
        status: 'accepted',
        message: typeof payload.message === 'string' ? payload.message : 'Gmail accepted the test email.',
        recipientMasked: typeof payload.recipientMasked === 'string' ? payload.recipientMasked : undefined,
        eventId: typeof payload.eventId === 'string' ? payload.eventId : undefined,
        providerMessageId:
          typeof payload.providerMessageId === 'string' ? payload.providerMessageId : undefined,
        diagnosticsRecorded:
          typeof payload.diagnosticsRecorded === 'boolean' ? payload.diagnosticsRecorded : undefined,
      };
    }

    const status =
      invocation.status === 429
        ? 'rate_limited'
        : invocation.status === 503 || payload?.code === 'not_configured'
          ? 'not_configured'
          : 'failed';
    return {
      ok: false,
      status,
      error: errorMessage,
      retryAfterSeconds:
        typeof payload?.retryAfterSeconds === 'number' ? payload.retryAfterSeconds : undefined,
    };
  },

  /** Recent alert diagnostics for the signed-in parent, masked recipient only. */
  async diagnostics(): Promise<SecurityAlertDiagnostic[]> {
    if (!backendAvailable() || !supabase) return [];
    try {
      const { data, error } = await supabase.rpc('pin_security_alert_status');
      if (error || !data || typeof data !== 'object') return [];
      const alerts = (data as { alerts?: unknown }).alerts;
      if (!Array.isArray(alerts)) return [];
      return alerts
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
        .map((entry) => ({
          id: String(entry.id ?? ''),
          kind: entry.kind === 'test' ? ('test' as const) : ('lockout' as const),
          status: String(entry.status ?? 'failed') as SecurityAlertDiagnostic['status'],
          failedAttempts: asCount(entry.failedAttempts),
          lockoutSeconds: asCount(entry.lockoutSeconds),
          eventAt: String(entry.eventAt ?? ''),
          recipientMasked: String(entry.recipientMasked ?? ''),
          attemptCount: asCount(entry.attemptCount),
          providerMessageId: typeof entry.providerMessageId === 'string' ? entry.providerMessageId : null,
          errorCode: typeof entry.errorCode === 'string' ? entry.errorCode : null,
          errorMessage: typeof entry.errorMessage === 'string' ? entry.errorMessage : null,
          acceptedAt: typeof entry.acceptedAt === 'string' ? entry.acceptedAt : null,
          deliveredAt: typeof entry.deliveredAt === 'string' ? entry.deliveredAt : null,
        }))
        .filter((entry) => Boolean(entry.id));
    } catch {
      return [];
    }
  },
};
