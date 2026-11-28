/**
 * Supabase client. Reads the project URL and publishable key from
 * environment variables (both are public by design; row-level security keeps
 * the data private). Until they are set, `supabase` is null and the app runs
 * fully offline, exactly as before.
 *
 * The sign-in session is stored in the app's own key-value store
 * so it also works in the web preview.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { storage } from '@/store/storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const authStorage = {
  getItem: (k: string) => storage.getString(`auth.${k}`) ?? null,
  setItem: (k: string, v: string) => storage.set(`auth.${k}`, v),
  removeItem: (k: string) => {
    storage.remove(`auth.${k}`);
  },
};

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: authStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
          flowType: 'pkce',
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;

if (supabase && Platform.OS !== 'web') {
  // Only refresh the session while the app is in the foreground.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
