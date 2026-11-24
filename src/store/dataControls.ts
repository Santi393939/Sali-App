/** Export everything Salli keeps on this phone, or delete all of it. */
import { Platform, Share } from 'react-native';

import { supabase } from '@/lib/supabase';

import { notifyChange } from './counts';
import { resetActions } from './reminderActions';
import { resetSettings } from './settings';
import { storage } from './storage';
import { invalidateStreakCache } from './streaks';
import { resetQueue } from './syncQueue';
import { t } from '@/lib/i18n';

/** All of Salli's saved data as readable JSON (sign-in tokens left out). */
export function exportData(): string {
  const out: Record<string, unknown> = {};
  for (const key of storage.getAllKeys().sort()) {
    if (key.startsWith('auth.')) continue;
    const raw = storage.getString(key) ?? String(storage.getNumber(key) ?? storage.getBoolean(key) ?? '');
    try {
      out[key] = JSON.parse(raw);
    } catch {
      out[key] = raw;
    }
  }
  return JSON.stringify({ app: 'Salli', exportedAt: new Date().toISOString(), data: out }, null, 2);
}

/** Share the export (phones) or copy it (web). Returns what happened. */
export async function shareExport(): Promise<'shared' | 'copied' | 'failed'> {
  const json = exportData();
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(json);
      return 'copied';
    }
    await Share.share({ title: t('My Salli data'), message: json });
    return 'shared';
  } catch {
    return 'failed';
  }
}

/** Wipe everything on this phone and sign out. The app returns to the welcome screen. */
export async function deleteAllData() {
  try {
    await supabase?.auth.signOut();
  } catch {}
  storage.clearAll();
  resetSettings();
  resetActions();
  resetQueue();
  invalidateStreakCache();
  notifyChange();
}
