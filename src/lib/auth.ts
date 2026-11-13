import * as Crypto from 'expo-crypto';
import { isSupabaseConfigured, supabase } from './supabase';
import { keys, newId, storage } from './storage';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type AuthError =
  | 'invalid-email'
  | 'short-password'
  | 'no-account'
  | 'wrong-password'
  | 'duplicate'
  | 'unknown';

export interface AuthResult {
  user?: AuthUser;
  error?: AuthError;
  message?: string;
  needsEmailConfirm?: boolean;
}

interface LocalAccount extends AuthUser {
  passwordHash: string;
  createdAt: number;
}

const APP_SALT = 'kidflix-local-v1';

async function hashPassword(email: string, password: string): Promise<string> {
  const value = `${APP_SALT}:${email.toLowerCase()}:${password}`;
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  } catch {
    // Extremely defensive fallback for hosts without WebCrypto (demo mode only).
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
    return `fb_${Math.abs(h).toString(16)}`;
  }
}

export async function hashPin(pin: string, accountId: string): Promise<string> {
  const value = `kidflix-pin:${accountId}:${pin}`;
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  } catch {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
    return `fb_${Math.abs(h).toString(16)}`;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readLocalAccounts(): Promise<LocalAccount[]> {
  return (await storage.get<LocalAccount[]>(keys.localAccounts)) ?? [];
}

async function writeLocalAccounts(accounts: LocalAccount[]): Promise<void> {
  await storage.set(keys.localAccounts, accounts);
}

export const authApi = {
  mode: isSupabaseConfigured ? ('supabase' as const) : ('local' as const),

  async signUp(email: string, password: string, name: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) return { error: 'invalid-email' };
    if (password.length < 6) return { error: 'short-password' };

    if (!isSupabaseConfigured || !supabase) {
      const accounts = await readLocalAccounts();
      if (accounts.some((a) => a.email === cleanEmail)) return { error: 'duplicate' };
      const account: LocalAccount = {
        id: newId('acct'),
        email: cleanEmail,
        name: name.trim() || 'Grown-up',
        passwordHash: await hashPassword(cleanEmail, password),
        createdAt: Date.now(),
      };
      await writeLocalAccounts([...accounts, account]);
      return { user: { id: account.id, email: account.email, name: account.name } };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { parent_name: name.trim() || 'Grown-up' } },
    });
    if (error) {
      return { error: error.message.toLowerCase().includes('already') ? 'duplicate' : 'unknown', message: error.message };
    }
    if (!data.session || !data.user) {
      return { needsEmailConfirm: true, message: 'Check your inbox to confirm your email, then sign in.' };
    }
    return { user: { id: data.user.id, email: data.user.email ?? cleanEmail, name: name.trim() || 'Grown-up' } };
  },

  async signIn(email: string, password: string): Promise<AuthResult> {
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) return { error: 'invalid-email' };
    if (!password) return { error: 'short-password' };

    if (!isSupabaseConfigured || !supabase) {
      const accounts = await readLocalAccounts();
      const account = accounts.find((a) => a.email === cleanEmail);
      if (!account) return { error: 'no-account' };
      const hash = await hashPassword(cleanEmail, password);
      if (hash !== account.passwordHash) return { error: 'wrong-password' };
      return { user: { id: account.id, email: account.email, name: account.name } };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      return { error: error.message.toLowerCase().includes('invalid') ? 'wrong-password' : 'unknown', message: error.message };
    }
    const user = data.user;
    if (!user) return { error: 'unknown' };
    const name = (user.user_metadata?.parent_name as string | undefined) ?? 'Grown-up';
    return { user: { id: user.id, email: user.email ?? cleanEmail, name } };
  },

  async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => undefined);
    }
    await storage.remove(keys.session);
  },

  async resetPassword(email: string): Promise<{ ok: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) return { ok: false, message: 'Please enter a valid email address.' };
    if (!isSupabaseConfigured || !supabase) {
      return { ok: false, message: 'Demo mode: password reset needs Supabase email delivery configured.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `We sent a reset link to ${cleanEmail}.` };
  },

  async restore(): Promise<AuthUser | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      return {
        id: user.id,
        email: user.email ?? '',
        name: (user.user_metadata?.parent_name as string | undefined) ?? 'Grown-up',
      };
    }
    const saved = await storage.get<{ accountId: string; email: string; parentName: string }>(keys.session);
    if (!saved) return null;
    return { id: saved.accountId, email: saved.email, name: saved.parentName };
  },

  async persistSession(user: AuthUser): Promise<void> {
    await storage.set(keys.session, { accountId: user.id, email: user.email, parentName: user.name });
  },
};
