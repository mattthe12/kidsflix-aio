import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FamilyData, ParentSettings, Profile, Rating } from '../types';
import { maxRatingForAge } from '../data/catalog';

const KEYS = {
  session: '@kidflix/session',
  familyPrefix: '@kidflix/family/',
  localAccounts: '@kidflix/local-accounts',
  pendingOnboarding: '@kidflix/needs-onboarding',
  pinSecurityPrefix: '@kidflix/pin-security/',
};

export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set: async (key: string, value: unknown): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('[kidflix] storage write failed', err);
    }
  },
  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      /* noop */
    }
  },
};

export const keys = KEYS;

export function newId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultSettings(): ParentSettings {
  return {
    dailyLimitMinutes: 60,
    downloadsAllowed: true,
    notificationsEnabled: true,
    autoPlayNext: true,
    language: 'en',
    captionsAlways: false,
    reduceMotion: false,
    bigText: false,
    pinHash: null,
    plan: 'trial',
    trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    subscriptionStatus: 'trialing',
    bonus: null,
  };
}

export function defaultFamily(accountId: string, email: string, parentName: string): FamilyData {
  return {
    accountId,
    email,
    parentName,
    profiles: [],
    activeProfileId: null,
    progress: {},
    favorites: {},
    watchlist: {},
    history: {},
    approvals: {},
    downloads: {},
    watchMsByDay: {},
    settings: defaultSettings(),
  };
}

/** Older saved data may miss fields — fill them in defensively. */
export function hydrateFamily(data: Partial<FamilyData> | null, accountId: string, email: string): FamilyData {
  const base = defaultFamily(accountId, email, data?.parentName ?? 'Grown-up');
  if (!data) return base;
  const profiles: Profile[] = (data.profiles ?? []).map((p) => ({
    ...p,
    ageLimit: (p.ageLimit ?? maxRatingForAge(p.ageGroup)) as Rating,
  }));
  return {
    ...base,
    ...data,
    profiles,
    progress: data.progress ?? {},
    favorites: data.favorites ?? {},
    watchlist: data.watchlist ?? {},
    history: data.history ?? {},
    approvals: data.approvals ?? {},
    downloads: data.downloads ?? {},
    watchMsByDay: data.watchMsByDay ?? {},
    settings: { ...defaultSettings(), ...(data.settings ?? {}) },
  };
}

export async function loadFamily(accountId: string, email: string): Promise<FamilyData> {
  const stored = await storage.get<Partial<FamilyData>>(KEYS.familyPrefix + accountId);
  return hydrateFamily(stored, accountId, email);
}

export async function saveFamily(data: FamilyData): Promise<void> {
  await storage.set(KEYS.familyPrefix + data.accountId, data);
}

export async function clearFamily(accountId: string): Promise<void> {
  await storage.remove(KEYS.familyPrefix + accountId);
}
