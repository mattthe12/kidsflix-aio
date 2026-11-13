import { isSupabaseConfigured, supabase } from './supabase';

export type AdminRole = 'admin';

export interface AdminSession {
  userId: string;
  username: string;
  role: AdminRole;
  mustChangePassword: boolean;
  bootstrapUsed: boolean;
}

export interface AdminOverview {
  totalParents: number;
  totalAdmins: number;
  totalKids: number;
  activeUsers30d: number;
  watchHistoryEntries: number;
  databaseOk: boolean;
  generatedAt: string;
}

export interface AdminUserRow {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  suspended: boolean;
  is_admin: boolean;
}

export interface AdminHealth {
  databaseOk: boolean;
  authReachable: boolean;
  kidProfiles: number;
  watchRows: number;
  emailDelivery: string;
  checkedAt: string;
}

function client() {
  return isSupabaseConfigured ? supabase : null;
}

export async function resolveAdminEmail(identifier: string): Promise<string | null> {
  const sb = client();
  if (!sb) return null;
  const username = identifier.trim().toLowerCase();
  if (!username || username.includes('@')) return null;
  const { data, error } = await sb.rpc('resolve_admin_login', { p_username: username });
  if (error || typeof data !== 'string' || !data.includes('@')) return null;
  return data;
}

export async function loadAdminSession(userId: string): Promise<AdminSession | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb
    .from('admin_users')
    .select('user_id,username,role,must_change_password,bootstrap_used')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data || data.role !== 'admin') return null;
  return {
    userId: data.user_id as string,
    username: data.username as string,
    role: 'admin',
    mustChangePassword: Boolean(data.must_change_password),
    bootstrapUsed: Boolean(data.bootstrap_used),
  };
}

export async function completeAdminBootstrap(): Promise<{ ok: boolean; message: string }> {
  const sb = client();
  if (!sb) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await sb.rpc('complete_admin_bootstrap');
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Administrator permission confirmed.' };
}

export async function getAdminOverview(): Promise<AdminOverview | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb.rpc('admin_overview');
  if (error || !data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    totalParents: Number(row.totalParents ?? 0),
    totalAdmins: Number(row.totalAdmins ?? 0),
    totalKids: Number(row.totalKids ?? 0),
    activeUsers30d: Number(row.activeUsers30d ?? 0),
    watchHistoryEntries: Number(row.watchHistoryEntries ?? 0),
    databaseOk: Boolean(row.databaseOk),
    generatedAt: String(row.generatedAt ?? ''),
  };
}

export async function listAdminUsers(search = ''): Promise<AdminUserRow[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb.rpc('admin_list_users', { p_search: search.trim() });
  if (error || !Array.isArray(data)) return [];
  return data.map((row: Record<string, unknown>) => ({
    user_id: String(row.user_id ?? ''),
    email: String(row.email ?? ''),
    created_at: String(row.created_at ?? ''),
    last_sign_in_at: row.last_sign_in_at ? String(row.last_sign_in_at) : null,
    suspended: Boolean(row.suspended),
    is_admin: Boolean(row.is_admin),
  }));
}

export async function setAdminUserSuspended(
  userId: string,
  suspended: boolean
): Promise<{ ok: boolean; message: string }> {
  const sb = client();
  if (!sb) return { ok: false, message: 'Supabase is not configured.' };
  const { error } = await sb.rpc('admin_set_user_suspended', {
    p_user_id: userId,
    p_suspended: suspended,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: suspended ? 'Account suspended.' : 'Account reactivated.' };
}

export async function getAdminHealth(): Promise<AdminHealth | null> {
  const sb = client();
  if (!sb) return null;
  const { data, error } = await sb.rpc('admin_health');
  if (error || !data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    databaseOk: Boolean(row.databaseOk),
    authReachable: Boolean(row.authReachable),
    kidProfiles: Number(row.kidProfiles ?? 0),
    watchRows: Number(row.watchRows ?? 0),
    emailDelivery: String(row.emailDelivery ?? 'not_checked'),
    checkedAt: String(row.checkedAt ?? ''),
  };
}
