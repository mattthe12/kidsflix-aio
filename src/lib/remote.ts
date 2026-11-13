import type { ApprovalStatus, FamilyData, HistoryEntry, ParentSettings, Profile, ProgressEntry } from '../types';
import { isSupabaseConfigured, supabase } from './supabase';

/**
 * Best-effort Supabase mirror. The app is local-first: every mutation is saved
 * to the device immediately, then mirrored here when a project is configured.
 * Failures never block a child from watching.
 */
const enabled = isSupabaseConfigured && Boolean(supabase);

function log(table: string, error: unknown) {
  console.warn(`[kidflix] Supabase sync skipped (${table})`, error);
}

export const remote = {
  enabled,

  async upsertProfile(accountId: string, profile: Profile): Promise<void> {
    if (!enabled || !supabase) return;
    const { error } = await supabase.from('kid_profiles').upsert({
      id: profile.id,
      account_id: accountId,
      name: profile.name,
      avatar: profile.avatar,
      age_group: profile.ageGroup,
      age_limit: profile.ageLimit,
    });
    if (error) log('kid_profiles', error);
  },

  async deleteProfile(profileId: string): Promise<void> {
    if (!enabled || !supabase) return;
    const { error } = await supabase.from('kid_profiles').delete().eq('id', profileId);
    if (error) log('kid_profiles', error);
  },

  async saveSettings(accountId: string, settings: ParentSettings): Promise<void> {
    if (!enabled || !supabase) return;
    const { error } = await supabase.from('parent_settings').upsert({
      account_id: accountId,
      daily_limit_minutes: settings.dailyLimitMinutes,
      downloads_allowed: settings.downloadsAllowed,
      notifications_enabled: settings.notificationsEnabled,
      auto_play_next: settings.autoPlayNext,
      language: settings.language,
      captions_always: settings.captionsAlways,
      reduce_motion: settings.reduceMotion,
      big_text: settings.bigText,
      plan: settings.plan,
      subscription_status: settings.subscriptionStatus,
      trial_ends_at: new Date(settings.trialEndsAt).toISOString(),
      pin_hash: settings.pinHash,
    });
    if (error) log('parent_settings', error);
  },

  async saveProgress(accountId: string, profileId: string, entry: ProgressEntry): Promise<void> {
    if (!enabled || !supabase) return;
    const { error } = await supabase.from('watch_progress').upsert(
      {
        account_id: accountId,
        profile_id: profileId,
        title_id: entry.titleId,
        episode_id: entry.episodeId,
        position_seconds: entry.positionSec,
        duration_seconds: entry.durationSec,
        completed: entry.completed,
        updated_at: new Date(entry.updatedAt).toISOString(),
      },
      { onConflict: 'profile_id,episode_id' }
    );
    if (error) log('watch_progress', error);
  },

  async addHistory(accountId: string, profileId: string, entry: HistoryEntry): Promise<void> {
    if (!enabled || !supabase) return;
    const { error } = await supabase.from('watch_history').insert({
      id: entry.id,
      account_id: accountId,
      profile_id: profileId,
      title_id: entry.titleId,
      episode_id: entry.episodeId,
      watched_seconds: entry.watchedSec,
      watched_at: new Date(entry.at).toISOString(),
    });
    if (error) log('watch_history', error);
  },

  async clearHistory(accountId: string, profileId: string): Promise<void> {
    if (!enabled || !supabase) return;
    const { error } = await supabase
      .from('watch_history')
      .delete()
      .eq('account_id', accountId)
      .eq('profile_id', profileId);
    if (error) log('watch_history', error);
  },

  async setFavorite(accountId: string, profileId: string, titleId: string, on: boolean): Promise<void> {
    if (!enabled || !supabase) return;
    if (on) {
      const { error } = await supabase
        .from('favorites')
        .upsert({ account_id: accountId, profile_id: profileId, title_id: titleId });
      if (error) log('favorites', error);
    } else {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('profile_id', profileId)
        .eq('title_id', titleId);
      if (error) log('favorites', error);
    }
  },

  async setWatchlist(accountId: string, profileId: string, titleId: string, on: boolean): Promise<void> {
    if (!enabled || !supabase) return;
    if (on) {
      const { error } = await supabase
        .from('watchlist')
        .upsert({ account_id: accountId, profile_id: profileId, title_id: titleId });
      if (error) log('watchlist', error);
    } else {
      const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('profile_id', profileId)
        .eq('title_id', titleId);
      if (error) log('watchlist', error);
    }
  },

  async setApproval(accountId: string, profileId: string, titleId: string, status: ApprovalStatus): Promise<void> {
    if (!enabled || !supabase) return;
    const { error } = await supabase
      .from('content_approvals')
      .upsert({ account_id: accountId, profile_id: profileId, title_id: titleId, status });
    if (error) log('content_approvals', error);
  },

  async pull(accountId: string): Promise<Partial<FamilyData> | null> {
    if (!enabled || !supabase) return null;
    try {
      const [profiles, settings, favorites, watchlist, progress, history, approvals] = await Promise.all([
        supabase.from('kid_profiles').select('*').eq('account_id', accountId),
        supabase.from('parent_settings').select('*').eq('account_id', accountId).maybeSingle(),
        supabase.from('favorites').select('*').eq('account_id', accountId),
        supabase.from('watchlist').select('*').eq('account_id', accountId),
        supabase.from('watch_progress').select('*').eq('account_id', accountId),
        supabase.from('watch_history').select('*').eq('account_id', accountId).order('watched_at', { ascending: false }).limit(300),
        supabase.from('content_approvals').select('*').eq('account_id', accountId),
      ]);

      const result: Partial<FamilyData> = {};

      if (profiles.data) {
        result.profiles = profiles.data.map((row) => ({
          id: row.id as string,
          name: row.name as string,
          avatar: row.avatar as string,
          ageGroup: row.age_group,
          ageLimit: row.age_limit,
          createdAt: new Date(row.created_at).getTime(),
        }));
      }

      if (settings.data) {
        const s = settings.data;
        result.settings = {
          dailyLimitMinutes: s.daily_limit_minutes,
          downloadsAllowed: s.downloads_allowed,
          notificationsEnabled: s.notifications_enabled,
          autoPlayNext: s.auto_play_next,
          language: s.language,
          captionsAlways: s.captions_always,
          reduceMotion: s.reduce_motion,
          bigText: s.big_text,
          pinHash: s.pin_hash,
          plan: s.plan,
          trialEndsAt: new Date(s.trial_ends_at).getTime(),
          subscriptionStatus: s.subscription_status,
          bonus: null,
        } as ParentSettings;
      }

      if (favorites.data) {
        const map: Record<string, string[]> = {};
        favorites.data.forEach((row) => {
          map[row.profile_id] = [...(map[row.profile_id] ?? []), row.title_id as string];
        });
        result.favorites = map;
      }

      if (watchlist.data) {
        const map: Record<string, string[]> = {};
        watchlist.data.forEach((row) => {
          map[row.profile_id] = [...(map[row.profile_id] ?? []), row.title_id as string];
        });
        result.watchlist = map;
      }

      if (progress.data) {
        const map: Record<string, Record<string, ProgressEntry>> = {};
        progress.data.forEach((row) => {
          map[row.profile_id] = {
            ...(map[row.profile_id] ?? {}),
            [row.episode_id]: {
              titleId: row.title_id,
              episodeId: row.episode_id,
              positionSec: Number(row.position_seconds),
              durationSec: Number(row.duration_seconds),
              completed: Boolean(row.completed),
              updatedAt: new Date(row.updated_at).getTime(),
            },
          };
        });
        result.progress = map;
      }

      if (history.data) {
        const map: Record<string, HistoryEntry[]> = {};
        history.data.forEach((row) => {
          map[row.profile_id] = [
            ...(map[row.profile_id] ?? []),
            {
              id: row.id,
              titleId: row.title_id,
              episodeId: row.episode_id,
              watchedSec: Number(row.watched_seconds),
              at: new Date(row.watched_at).getTime(),
            },
          ];
        });
        result.history = map;
      }

      if (approvals.data) {
        const map: Record<string, Record<string, ApprovalStatus>> = {};
        approvals.data.forEach((row) => {
          map[row.profile_id] = { ...(map[row.profile_id] ?? {}), [row.title_id]: row.status };
        });
        result.approvals = map;
      }

      return result;
    } catch (err) {
      console.warn('[kidflix] could not pull Supabase data', err);
      return null;
    }
  },
};
