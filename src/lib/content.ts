import type { Title } from '../types';
import { applyCatalog, BUNDLED_TITLES } from '../data/catalog';
import { isSupabaseConfigured, supabase } from './supabase';
import { storage } from './storage';

const CACHE_KEY = '@sproutscreen/catalog/v1';

export type ContentStatus = 'draft' | 'published';

export interface AdminContentRow {
  id: string;
  status: ContentStatus;
  payload: Title;
  draftPayload: Title | null;
  updatedAt: string;
  publishedAt: string | null;
}

function enabled() {
  return isSupabaseConfigured && Boolean(supabase);
}

function isTitle(value: unknown): value is Title {
  if (!value || typeof value !== 'object') return false;
  const title = value as Partial<Title>;
  return (
    typeof title.id === 'string' &&
    typeof title.name === 'string' &&
    typeof title.category === 'string' &&
    typeof title.subcategory === 'string' &&
    typeof title.rating === 'string' &&
    Array.isArray(title.episodes) &&
    Array.isArray(title.tags)
  );
}

const BUNDLED_BY_ID = BUNDLED_TITLES.reduce<Record<string, Title>>((acc, title) => {
  acc[title.id] = title;
  return acc;
}, {});

/**
 * Early managed-content rows were seeded without caption tracks to keep the
 * seed small. Keep using the bundled, sourced tracks for the same episode until
 * captions are edited in the admin catalogue.
 */
function withBundledMedia(title: Title): Title {
  const bundled = BUNDLED_BY_ID[title.id];
  if (!bundled) return title;
  return {
    ...title,
    episodes: title.episodes.map((episode) => {
      const original =
        bundled.episodes.find((candidate) => candidate.id === episode.id) ??
        bundled.episodes.find((candidate) => candidate.clipId && candidate.clipId === episode.clipId);
      return {
        ...episode,
        clipId: episode.clipId ?? original?.clipId,
        attribution: episode.attribution ?? original?.attribution,
        captions: episode.captions?.length ? episode.captions : original?.captions ?? [],
      };
    }),
  };
}

function parseTitle(value: unknown): Title | null {
  return isTitle(value) ? withBundledMedia(value) : null;
}

async function fetchPublishedTitles(): Promise<Title[] | null> {
  if (!enabled() || !supabase) return null;
  const { data, error } = await supabase
    .from('content_titles')
    .select('payload')
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  if (error) {
    console.warn('[sproutscreen] could not load published catalogue', error.message);
    return null;
  }
  return (data ?? []).map((row) => parseTitle(row.payload)).filter((title): title is Title => Boolean(title));
}

/**
 * Apply the published catalogue from Supabase, falling back to the last good
 * cached copy and finally to the bundled catalogue. A failed network request
 * must never leave a child with an empty app.
 */
export async function hydrateCatalog(): Promise<void> {
  const cached = await storage.get<Title[]>(CACHE_KEY);
  if (Array.isArray(cached)) {
    const titles = cached.filter(isTitle);
    if (titles.length) applyCatalog(titles);
  }

  const remote = await fetchPublishedTitles();
  if (remote === null) return;

  applyCatalog(remote);
  await storage.set(CACHE_KEY, remote);
}

export async function listAdminContent(): Promise<{ rows: AdminContentRow[]; error?: string }> {
  if (!enabled() || !supabase) return { rows: [], error: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('admin_list_content');
  if (error) return { rows: [], error: error.message };
  if (!Array.isArray(data)) return { rows: [], error: 'The catalogue RPC returned no rows.' };

  const rows = data
    .map((raw): AdminContentRow | null => {
      const row = raw as Record<string, unknown>;
      const payload = parseTitle(row.payload);
      const draftPayload = row.draft_payload ? parseTitle(row.draft_payload) : null;
      if (!payload || typeof row.id !== 'string') return null;
      return {
        id: row.id,
        status: row.status === 'published' ? 'published' : 'draft',
        payload,
        draftPayload,
        updatedAt: String(row.updated_at ?? ''),
        publishedAt: row.published_at ? String(row.published_at) : null,
      };
    })
    .filter((row): row is AdminContentRow => Boolean(row));

  return { rows };
}

export async function saveAdminContent(id: string, payload: Title): Promise<{ ok: boolean; error?: string }> {
  if (!enabled() || !supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.rpc('admin_save_content', { p_id: id, p_payload: payload });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setAdminContentStatus(id: string, status: ContentStatus): Promise<{ ok: boolean; error?: string }> {
  if (!enabled() || !supabase) return { ok: false, error: 'Supabase is not configured.' };
  const { error } = await supabase.rpc('admin_set_content_status', { p_id: id, p_status: status });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * A new title starts as a complete-enough draft for editing. The database still
 * refuses to publish it until it has a name, description and playable episode.
 */
export function newContentDraft(): Title {
  const id = `new-title-${Date.now().toString(36)}`;
  return {
    id,
    name: '',
    category: 'cartoons',
    subcategory: 'funny',
    rating: 'G',
    emoji: '🎬',
    palette: 0,
    minutes: 1,
    year: new Date().getFullYear(),
    description: '',
    popularity: 50,
    addedDaysAgo: 0,
    episodes: [
      {
        id: `${id}-e1`,
        titleId: id,
        number: 1,
        name: 'Full cartoon',
        durationMin: 1,
        hlsUrl: '',
        mp4Url: '',
        downloadUrl: '',
        captions: [],
      },
    ],
    tags: [],
  };
}
