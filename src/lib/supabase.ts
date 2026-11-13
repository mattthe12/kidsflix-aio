import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase is optional at runtime: the app runs in a fully functional local
 * demo mode until EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY are
 * present. See README.md and supabase/schema.sql for setup.
 */
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('http'));

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } catch (err) {
    console.warn('[kidflix] could not create Supabase client', err);
  }
}

export const supabase = client;

/** Mux playback IDs can be overridden for a real catalogue. */
export const MUX_PLAYBACK_ID = (process.env.EXPO_PUBLIC_MUX_PLAYBACK_ID ?? '').trim();
export const STRIPE_CHECKOUT_URL = (process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_URL ?? '').trim();

export function muxStream(playbackId: string) {
  return {
    hls: `https://stream.mux.com/${playbackId}.m3u8`,
    mp4: `https://stream.mux.com/${playbackId}/high.mp4`,
  };
}
