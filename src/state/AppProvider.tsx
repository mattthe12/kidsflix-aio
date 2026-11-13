import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AgeGroup,
  ApprovalStatus,
  DownloadRecord,
  FamilyData,
  HistoryEntry,
  ParentSettings,
  Profile,
  ProgressEntry,
  Rating,
  Title,
} from '../types';
import { allTitles, maxRatingForAge, recommendedFor, titleById, getEpisode } from '../data/catalog';
import { authApi, hashPin, type AuthUser } from '../lib/auth';
import {
  completeAdminBootstrap,
  loadAdminSession,
  type AdminSession,
} from '../lib/admin';
import { pinSecurity } from '../lib/pinSecurity';
import { emptyPinAttemptResult, type PinAttemptResult } from '../lib/pinLockout';
import { remote } from '../lib/remote';
import { isSupabaseConfigured } from '../lib/supabase';
import { defaultFamily, hydrateFamily, loadFamily, saveFamily, newId, storage, keys } from '../lib/storage';
import { downloadKey, downloadVideo, offlineUri, removeOffline } from '../lib/downloads';
import { todayKey, ratingRank } from '../lib/format';
import { translator } from '../lib/i18n';

export interface ContinueItem {
  title: Title;
  episodeId: string;
  positionSec: number;
  durationSec: number;
  updatedAt: number;
}

interface AppContextValue {
  ready: boolean;
  account: AuthUser | null;
  family: FamilyData | null;
  settings: ParentSettings;
  profiles: Profile[];
  profile: Profile | null;
  isDemo: boolean;
  recovery: boolean;
  admin: AdminSession | null;
  t: (key: string) => string;
  parentUnlocked: boolean;

  signUp: (email: string, password: string, name: string) => Promise<{ error?: string; needsEmailConfirm?: boolean; message?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string; needsEmailConfirm?: boolean; message?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ ok: boolean; message: string }>;
  finishPasswordReset: (password: string) => Promise<{ ok: boolean; message: string }>;
  finishAdminBootstrap: (password: string) => Promise<{ ok: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; message: string }>;

  selectProfile: (id: string) => void;
  addProfile: (input: { name: string; avatar: string; ageGroup: AgeGroup }) => Profile | null;
  updateProfile: (id: string, patch: Partial<Profile>) => void;
  deleteProfile: (id: string) => void;

  setPin: (pin: string) => Promise<void>;
  unlockParent: (pin: string) => Promise<PinAttemptResult>;
  lockParent: () => void;
  updateSettings: (patch: Partial<ParentSettings>) => void;
  setParentName: (name: string) => void;
  clearHistory: (profileId?: string) => void;

  favorites: string[];
  isFavorite: (titleId: string) => boolean;
  toggleFavorite: (titleId: string) => void;
  watchlist: string[];
  isInWatchlist: (titleId: string) => boolean;
  toggleWatchlist: (titleId: string) => void;

  progressFor: (titleId: string) => ProgressEntry | undefined;
  episodeProgress: (episodeId: string) => ProgressEntry | undefined;
  continueWatching: ContinueItem[];
  recommended: Title[];
  history: HistoryEntry[];
  favoriteTitles: Title[];
  watchedMinutesToday: number;
  limitReached: boolean;
  grantExtraTime: (minutes: number) => void;

  saveProgress: (titleId: string, episodeId: string, positionSec: number, durationSec: number) => void;
  recordWatch: (titleId: string, episodeId: string, seconds: number) => void;

  canWatch: (title: Title) => boolean;
  approvalFor: (titleId: string) => ApprovalStatus | undefined;
  setApproval: (titleId: string, status: ApprovalStatus | 'clear') => void;
  setApprovalFor: (profileId: string, titleId: string, status: ApprovalStatus | 'clear') => void;
  removeFavoriteFor: (profileId: string, titleId: string) => void;

  downloads: DownloadRecord[];
  downloadTitle: (titleId: string) => Promise<void>;
  removeDownload: (titleId: string) => Promise<void>;
  getOfflineSource: (titleId: string, episodeId: string) => Promise<string | null>;
  downloading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_SETTINGS: ParentSettings = {
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
  trialEndsAt: Date.now() + 7 * 864e5,
  subscriptionStatus: 'trialing',
  bonus: null,
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<AuthUser | null>(null);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [recovery, setRecovery] = useState(false);
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [unlockedAt, setUnlockedAt] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const progressThrottle = useRef<Record<string, number>>({});

  /* ── boot ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // A recovery link signs the browser in just long enough to choose a
        // new password. Do not auto-seed the app until that password is set.
        const recoveryUser = await authApi.consumeRecoveryLink();
        const user = recoveryUser ?? (await authApi.restore());
        if (!user) return;
        const adminSession = await loadAdminSession(user.id);
        let fam = await loadFamily(user.id, user.email);
        const pulled = await remote.pull(user.id);
        if (pulled) {
          fam = {
            ...fam,
            ...pulled,
            profiles: pulled.profiles?.length ? pulled.profiles : fam.profiles,
            settings: { ...fam.settings, ...(pulled.settings ?? {}), pinHash: fam.settings.pinHash ?? pulled.settings?.pinHash ?? null },
            progress: Object.keys(pulled.progress ?? {}).length ? { ...fam.progress, ...pulled.progress } : fam.progress,
            favorites: Object.keys(pulled.favorites ?? {}).length ? { ...fam.favorites, ...pulled.favorites } : fam.favorites,
            watchlist: Object.keys(pulled.watchlist ?? {}).length ? { ...fam.watchlist, ...pulled.watchlist } : fam.watchlist,
            history: Object.keys(pulled.history ?? {}).length ? { ...fam.history, ...pulled.history } : fam.history,
            approvals: Object.keys(pulled.approvals ?? {}).length ? { ...fam.approvals, ...pulled.approvals } : fam.approvals,
          };
        }
        if (!alive) return;
        setAccount(user);
        setFamily(fam);
        setAdmin(adminSession);
        setRecovery(Boolean(recoveryUser));
        // If a previous lockout alert failed (or the app closed before the
        // request finished), the server retries only an eligible event after
        // its backoff. The event id prevents duplicate emails.
        void pinSecurity.retryPendingAlerts();
      } catch (err) {
        console.warn('[kidflix] boot failed', err);
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ── persistence (debounced) ──────────────────────────────────────────── */
  useEffect(() => {
    if (!family) return;
    const timer = setTimeout(() => {
      saveFamily(family);
    }, 400);
    return () => clearTimeout(timer);
  }, [family]);

  const patchFamily = useCallback((updater: (prev: FamilyData) => FamilyData) => {
    setFamily((prev) => (prev ? updater(prev) : prev));
  }, []);

  const settings = family?.settings ?? EMPTY_SETTINGS;
  const profiles = family?.profiles ?? [];
  const profile = useMemo(
    () => profiles.find((p) => p.id === family?.activeProfileId) ?? null,
    [profiles, family?.activeProfileId]
  );
  const t = useMemo(() => translator(settings.language), [settings.language]);
  const parentUnlocked = unlockedAt > 0 && Date.now() - unlockedAt < 10 * 60 * 1000;

  /* ── auth ─────────────────────────────────────────────────────────────── */
  const completeAuth = useCallback(async (user: AuthUser) => {
    await authApi.persistSession(user);
    const [fam, adminSession] = await Promise.all([
      loadFamily(user.id, user.email),
      loadAdminSession(user.id),
    ]);
    setAccount(user);
    setFamily(fam);
    setAdmin(adminSession);
    setRecovery(false);
    setUnlockedAt(0);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await authApi.signUp(email, password, name);
      if (res.needsEmailConfirm) return { needsEmailConfirm: true, message: res.message };
      if (!res.user) return { error: res.error ?? 'unknown', message: res.message };
      await completeAuth(res.user);
      return {};
    },
    [completeAuth]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.signIn(email, password);
      if (!res.user) return { error: res.error ?? 'unknown', message: res.message };
      await completeAuth(res.user);
      return {};
    },
    [completeAuth]
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
    setAccount(null);
    setFamily(null);
    setAdmin(null);
    setRecovery(false);
    setUnlockedAt(0);
  }, []);

  const resetPassword = useCallback(async (email: string) => authApi.resetPassword(email), []);

  const finishPasswordReset = useCallback(
    async (password: string) => {
      const result = await authApi.updatePassword(password);
      if (result.ok) {
        setRecovery(false);
        if (account) setAdmin(await loadAdminSession(account.id));
      }
      return result;
    },
    [account]
  );

  const finishAdminBootstrap = useCallback(
    async (password: string) => {
      const result = await authApi.updatePassword(password);
      if (!result.ok) return result;
      const completed = await completeAdminBootstrap();
      if (!completed.ok) return completed;
      if (account) setAdmin(await loadAdminSession(account.id));
      return { ok: true, message: 'Your administrator password is set.' };
    },
    [account]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!account) return { ok: false, message: 'Sign in again before changing your password.' };
      return authApi.changePassword(account.email, currentPassword, newPassword);
    },
    [account]
  );

  /* ── profiles ─────────────────────────────────────────────────────────── */
  const selectProfile = useCallback(
    (id: string) => {
      patchFamily((prev) => ({ ...prev, activeProfileId: id }));
    },
    [patchFamily]
  );

  const addProfile = useCallback(
    (input: { name: string; avatar: string; ageGroup: AgeGroup }) => {
      const newProfile: Profile = {
        id: newId('kid'),
        name: input.name.trim() || 'Little Star',
        avatar: input.avatar,
        ageGroup: input.ageGroup,
        ageLimit: maxRatingForAge(input.ageGroup),
        favoriteCharacters: [],
        createdAt: Date.now(),
      };
      setFamily((prev) => {
        if (!prev) return prev;
        const next: FamilyData = {
          ...prev,
          profiles: [...prev.profiles, newProfile],
          activeProfileId: newProfile.id,
        };
        remote.upsertProfile(prev.accountId, newProfile);
        return next;
      });
      return newProfile;
    },
    []
  );

  const updateProfile = useCallback(
    (id: string, patch: Partial<Profile>) => {
      setFamily((prev) => {
        if (!prev) return prev;
        const nextProfiles = prev.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p));
        const updated = nextProfiles.find((p) => p.id === id);
        if (updated) remote.upsertProfile(prev.accountId, updated);
        return { ...prev, profiles: nextProfiles };
      });
    },
    []
  );

  const deleteProfile = useCallback(
    (id: string) => {
      setFamily((prev) => {
        if (!prev) return prev;
        const strip = <T,>(map: Record<string, T>) => {
          const copy = { ...map };
          delete copy[id];
          return copy;
        };
        remote.deleteProfile(id);
        return {
          ...prev,
          profiles: prev.profiles.filter((p) => p.id !== id),
          activeProfileId: prev.activeProfileId === id ? null : prev.activeProfileId,
          progress: strip(prev.progress),
          favorites: strip(prev.favorites),
          watchlist: strip(prev.watchlist),
          history: strip(prev.history),
          approvals: strip(prev.approvals),
          downloads: strip(prev.downloads),
          watchMsByDay: strip(prev.watchMsByDay),
        };
      });
    },
    []
  );

  /* ── parent controls ──────────────────────────────────────────────────── */
  const setPin = useCallback(
    async (pin: string) => {
      if (!family) return;
      const pinHash = await hashPin(pin, family.accountId);
      setFamily((prev) => {
        if (!prev) return prev;
        const next = { ...prev, settings: { ...prev.settings, pinHash } };
        remote.saveSettings(prev.accountId, next.settings);
        return next;
      });
      setUnlockedAt(Date.now());
    },
    [family]
  );

  const unlockParent = useCallback(
    async (pin: string) => {
      if (!family?.settings.pinHash) return emptyPinAttemptResult();
      const candidate = await hashPin(pin, family.accountId);
      const result = await pinSecurity.verify(family.accountId, candidate, family.settings.pinHash);
      if (result.ok) {
        setUnlockedAt(Date.now());
        return result;
      }

      // A failed attempt revokes any existing grown-up session as well as
      // showing the countdown, so a lockout cannot be skipped by navigating
      // back to an already-open parent screen. The backend creates one alert
      // event per lockout; the function sends it and records the real result.
      setUnlockedAt(0);
      if (result.alertDue) {
        void pinSecurity.requestAlert(family.accountId, result);
      }
      return result;
    },
    [family]
  );

  const lockParent = useCallback(() => setUnlockedAt(0), []);

  const updateSettings = useCallback((patch: Partial<ParentSettings>) => {
    setFamily((prev) => {
      if (!prev) return prev;
      const next = { ...prev, settings: { ...prev.settings, ...patch } };
      remote.saveSettings(prev.accountId, next.settings);
      return next;
    });
  }, []);

  const setParentName = useCallback((name: string) => {
    patchFamily((prev) => ({ ...prev, parentName: name.trim() || prev.parentName }));
  }, [patchFamily]);

  const clearHistory = useCallback(
    (profileId?: string) => {
      const target = profileId ?? profile?.id;
      if (!target) return;
      setFamily((prev) => {
        if (!prev) return prev;
        remote.clearHistory(prev.accountId, target);
        return { ...prev, history: { ...prev.history, [target]: [] } };
      });
    },
    [profile]
  );

  /* ── favorites ────────────────────────────────────────────────────────── */
  const favorites = useMemo(() => (profile ? family?.favorites[profile.id] ?? [] : []), [family, profile]);

  const isFavorite = useCallback((titleId: string) => favorites.includes(titleId), [favorites]);

  const toggleFavorite = useCallback(
    (titleId: string) => {
      if (!profile || !family) return;
      const on = !(family.favorites[profile.id] ?? []).includes(titleId);
      patchFamily((prev) => {
        const current = prev.favorites[profile.id] ?? [];
        const nextList = on ? [...current, titleId] : current.filter((id) => id !== titleId);
        remote.setFavorite(prev.accountId, profile.id, titleId, on);
        return { ...prev, favorites: { ...prev.favorites, [profile.id]: nextList } };
      });
    },
    [profile, family, patchFamily]
  );

  const watchlist = useMemo(() => (profile ? family?.watchlist?.[profile.id] ?? [] : []), [family, profile]);

  const isInWatchlist = useCallback((titleId: string) => watchlist.includes(titleId), [watchlist]);

  const toggleWatchlist = useCallback(
    (titleId: string) => {
      if (!profile || !family) return;
      const on = !(family.watchlist[profile.id] ?? []).includes(titleId);
      patchFamily((prev) => {
        const current = prev.watchlist[profile.id] ?? [];
        const nextList = on ? [...current, titleId] : current.filter((id) => id !== titleId);
        remote.setWatchlist(prev.accountId, profile.id, titleId, on);
        return { ...prev, watchlist: { ...prev.watchlist, [profile.id]: nextList } };
      });
    },
    [profile, family, patchFamily]
  );

  /* ── progress, history, screen time ───────────────────────────────────── */
  const progressFor = useCallback(    (titleId: string): ProgressEntry | undefined => {
      if (!profile) return undefined;
      const map = family?.progress[profile.id] ?? {};
      const entries = Object.values(map).filter((e) => e.titleId === titleId);
      return entries.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    },
    [family, profile]
  );

  const episodeProgress = useCallback(
    (episodeId: string): ProgressEntry | undefined => {
      if (!profile) return undefined;
      return family?.progress[profile.id]?.[episodeId];
    },
    [family, profile]
  );

  const saveProgress = useCallback(
    (titleId: string, episodeId: string, positionSec: number, durationSec: number) => {
      if (!profile || !family) return;
      const completed = durationSec > 0 && positionSec / durationSec >= 0.94;
      const entry: ProgressEntry = {
        titleId,
        episodeId,
        positionSec: Math.max(0, positionSec),
        durationSec,
        completed,
        updatedAt: Date.now(),
      };
      const now = Date.now();
      const last = progressThrottle.current[episodeId] ?? 0;
      const shouldSync = now - last > 12000;
      if (shouldSync) {
        progressThrottle.current[episodeId] = now;
        remote.saveProgress(family.accountId, profile.id, entry);
      }
      patchFamily((prev) => ({
        ...prev,
        progress: {
          ...prev.progress,
          [profile.id]: { ...(prev.progress[profile.id] ?? {}), [episodeId]: entry },
        },
      }));
    },
    [profile, family, patchFamily]
  );

  const recordWatch = useCallback(
    (titleId: string, episodeId: string, seconds: number) => {
      if (!profile || !family || seconds <= 0) return;
      const day = todayKey();
      const entry: HistoryEntry = {
        id: newId('h'),
        titleId,
        episodeId,
        watchedSec: Math.round(seconds),
        at: Date.now(),
      };
      remote.addHistory(family.accountId, profile.id, entry);
      patchFamily((prev) => {
        const profHistory = prev.history[profile.id] ?? [];
        const profMs = prev.watchMsByDay[profile.id] ?? {};
        const lastEntry = profHistory[0];
        const coalesce =
          lastEntry && lastEntry.titleId === titleId && lastEntry.episodeId === episodeId && Date.now() - lastEntry.at < 10 * 60 * 1000;
        const nextHistory = coalesce
          ? [{ ...lastEntry, watchedSec: lastEntry.watchedSec + entry.watchedSec, at: entry.at }, ...profHistory.slice(1)]
          : [entry, ...profHistory].slice(0, 200);
        return {
          ...prev,
          history: { ...prev.history, [profile.id]: nextHistory },
          watchMsByDay: {
            ...prev.watchMsByDay,
            [profile.id]: { ...profMs, [day]: (profMs[day] ?? 0) + seconds * 1000 },
          },
        };
      });
    },
    [profile, family, patchFamily]
  );

  const watchedMinutesToday = useMemo(() => {
    if (!profile) return 0;
    const ms = family?.watchMsByDay[profile.id]?.[todayKey()] ?? 0;
    return Math.floor(ms / 60000);
  }, [family, profile]);

  const limitReached = useMemo(() => {
    if (!settings.dailyLimitMinutes || settings.dailyLimitMinutes <= 0) return false;
    const bonus = settings.bonus?.date === todayKey() ? settings.bonus.minutes : 0;
    return watchedMinutesToday >= settings.dailyLimitMinutes + bonus;
  }, [settings.dailyLimitMinutes, settings.bonus, watchedMinutesToday]);

  const grantExtraTime = useCallback(
    (minutes: number) => {
      updateSettings({ bonus: { date: todayKey(), minutes: (settings.bonus?.date === todayKey() ? settings.bonus.minutes : 0) + minutes } });
    },
    [settings.bonus, updateSettings]
  );

  /* ── derived lists ────────────────────────────────────────────────────── */
  const canWatch = useCallback(
    (title: Title) => {
      if (!profile) return false;
      const status = family?.approvals[profile.id]?.[title.id];
      if (status === 'blocked') return false;
      if (status === 'approved') return true;
      return ratingRank[title.rating] <= ratingRank[profile.ageLimit as Rating];
    },
    [family, profile]
  );

  const continueWatching = useMemo<ContinueItem[]>(() => {
    if (!profile) return [];
    const map = family?.progress[profile.id] ?? {};
    const byTitle = new Map<string, ContinueItem>();
    Object.values(map)
      .filter((e) => !e.completed && e.positionSec > 5 && Boolean(titleById[e.titleId] && canWatch(titleById[e.titleId])))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((e) => {
        if (byTitle.has(e.titleId)) return;
        byTitle.set(e.titleId, {
          title: titleById[e.titleId],
          episodeId: e.episodeId,
          positionSec: e.positionSec,
          durationSec: e.durationSec,
          updatedAt: e.updatedAt,
        });
      });
    return Array.from(byTitle.values()).slice(0, 10);
  }, [family, profile, canWatch]);

  const recommended = useMemo(() => {
    if (!profile) return [];
    const historyIds = (family?.history[profile.id] ?? []).slice(0, 20).map((h) => h.titleId);
    return recommendedFor(profile, favorites, historyIds).filter(canWatch);
  }, [profile, family, favorites, canWatch]);

  const history = useMemo(() => (profile ? family?.history[profile.id] ?? [] : []), [family, profile]);

  const favoriteTitles = useMemo(
    () => favorites.map((id) => titleById[id]).filter(Boolean) as Title[],
    [favorites]
  );

  const approvalFor = useCallback(
    (titleId: string) => (profile ? family?.approvals[profile.id]?.[titleId] : undefined),
    [family, profile]
  );

  const setApprovalFor = useCallback(
    (profileId: string, titleId: string, status: ApprovalStatus | 'clear') => {
      patchFamily((prev) => {
        const map = { ...(prev.approvals[profileId] ?? {}) };
        if (status === 'clear') delete map[titleId];
        else {
          map[titleId] = status;
          remote.setApproval(prev.accountId, profileId, titleId, status);
        }
        return { ...prev, approvals: { ...prev.approvals, [profileId]: map } };
      });
    },
    [patchFamily]
  );

  const setApproval = useCallback(
    (titleId: string, status: ApprovalStatus | 'clear') => {
      if (!profile) return;
      setApprovalFor(profile.id, titleId, status);
    },
    [profile, setApprovalFor]
  );

  const removeFavoriteFor = useCallback(
    (profileId: string, titleId: string) => {
      patchFamily((prev) => {
        remote.setFavorite(prev.accountId, profileId, titleId, false);
        return {
          ...prev,
          favorites: { ...prev.favorites, [profileId]: (prev.favorites[profileId] ?? []).filter((id) => id !== titleId) },
        };
      });
    },
    [patchFamily]
  );

  /* ── downloads ────────────────────────────────────────────────────────── */
  const downloads = useMemo(() => (profile ? family?.downloads[profile.id] ?? [] : []), [family, profile]);

  const downloadTitle = useCallback(
    async (titleId: string) => {
      if (!profile) return;
      const title = titleById[titleId];
      if (!title) return;
      if (!settings.downloadsAllowed) return;
      const prog = progressFor(titleId);
      const episode = getEpisode(titleId, prog?.episodeId ?? title.episodes[0]?.id);
      if (!episode) return;

      const key = downloadKey(titleId, episode.id);
      const record: DownloadRecord = {
        titleId,
        episodeId: episode.id,
        status: 'downloading',
        progress: 0,
        updatedAt: Date.now(),
      };
      setDownloading(true);
      setFamily((prev) => {
        if (!prev) return prev;
        const list = (prev.downloads[profile.id] ?? []).filter((d) => d.titleId !== titleId);
        return { ...prev, downloads: { ...prev.downloads, [profile.id]: [record, ...list] } };
      });

      let last = 0;
      try {
        const result = await downloadVideo(key, episode.downloadUrl ?? episode.mp4Url, titleId, (p, bytes) => {
          const now = Date.now();
          if (now - last < 300 && p < 1) return;
          last = now;
          setFamily((prev) => {
            if (!prev) return prev;
            const list = (prev.downloads[profile.id] ?? []).map((d) =>
              d.titleId === titleId ? { ...d, progress: p, sizeBytes: bytes, updatedAt: Date.now() } : d
            );
            return { ...prev, downloads: { ...prev.downloads, [profile.id]: list } };
          });
        });
        setFamily((prev) => {
          if (!prev) return prev;
          const list = (prev.downloads[profile.id] ?? []).map((d) =>
            d.titleId === titleId
              ? { ...d, status: 'ready' as const, progress: 1, localUri: result.localUri, sizeBytes: result.sizeBytes, updatedAt: Date.now() }
              : d
          );
          return { ...prev, downloads: { ...prev.downloads, [profile.id]: list } };
        });
      } catch (err) {
        console.warn('[kidflix] download failed', err);
        setFamily((prev) => {
          if (!prev) return prev;
          const list = (prev.downloads[profile.id] ?? []).map((d) =>
            d.titleId === titleId ? { ...d, status: 'error' as const, updatedAt: Date.now() } : d
          );
          return { ...prev, downloads: { ...prev.downloads, [profile.id]: list } };
        });
      } finally {
        setDownloading(false);
      }
    },
    [profile, settings.downloadsAllowed, progressFor]
  );

  const removeDownload = useCallback(
    async (titleId: string) => {
      if (!profile) return;
      const record = downloads.find((d) => d.titleId === titleId);
      if (record) await removeOffline(downloadKey(record.titleId, record.episodeId));
      patchFamily((prev) => ({
        ...prev,
        downloads: {
          ...prev.downloads,
          [profile.id]: (prev.downloads[profile.id] ?? []).filter((d) => d.titleId !== titleId),
        },
      }));
    },
    [profile, downloads, patchFamily]
  );

  const getOfflineSource = useCallback(
    async (titleId: string, episodeId: string) => {
      if (!profile) return null;
      const record = (family?.downloads[profile.id] ?? []).find((d) => d.titleId === titleId);
      if (!record || record.status !== 'ready') return null;
      return offlineUri(downloadKey(titleId, episodeId));
    },
    [family, profile]
  );

  const value: AppContextValue = {
    ready,
    account,
    family,
    settings,
    profiles,
    profile,
    isDemo: !isSupabaseConfigured,
    recovery,
    admin,
    t,
    parentUnlocked,
    signUp,
    signIn,
    signOut,
    resetPassword,
    finishPasswordReset,
    finishAdminBootstrap,
    changePassword,
    selectProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    setPin,
    unlockParent,
    lockParent,
    updateSettings,
    setParentName,
    clearHistory,
    favorites,
    isFavorite,
    toggleFavorite,
    watchlist,
    isInWatchlist,
    toggleWatchlist,
    progressFor,
    episodeProgress,
    continueWatching,
    recommended,
    history,
    favoriteTitles,
    watchedMinutesToday,
    limitReached,
    grantExtraTime,
    saveProgress,
    recordWatch,
    canWatch,
    approvalFor,
    setApproval,
    setApprovalFor,
    removeFavoriteFor,
    downloads,
    downloadTitle,
    removeDownload,
    getOfflineSource,
    downloading,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function ensureFamily(account: AuthUser): FamilyData {
  return defaultFamily(account.id, account.email, account.name);
}

export { hydrateFamily, storage, keys };
