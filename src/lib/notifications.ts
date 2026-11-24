/**
 * Local reminders (no server needed):
 *  • After Asr — "Your lantern is waiting", only on days it isn't lit yet
 *  • An hour before Maghrib — the gentle streak nudge
 *  • Friday morning — Jumu'ah, send abundant salawat
 * Times come from the saved city (adhan), with fixed fallbacks. Reminders
 * for the next 7 days are scheduled ahead; lighting today's lantern cancels
 * today's. Tone: encouraging, never guilt.
 */
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

import { asrOn, maghribOn, toDayKey } from '@/lib/salliDay';
import { getToday, onGoalLit } from '@/store/counts';
import { t } from '@/lib/i18n';
import { addSettingsChangeListener, getSettings } from '@/store/settings';

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';
const CHANNEL = 'reminders';

if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Ask for permission (shows the system prompt once). Returns whether reminders can be sent. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: t('Reminders'),
        // eslint-disable-next-line import/namespace -- re-exported via `export *`; TypeScript confirms it
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;
/** Re-plan reminders soon (debounced). */
export function refreshReminders(delay = 400) {
  if (!SUPPORTED) return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    void schedule();
  }, delay);
}

async function schedule() {
  try {
    const perm = await Notifications.getPermissionsAsync();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!perm.granted) return;

    const s = getSettings();
    const today = getToday();
    const now = Date.now();
    const streak = today.streak.current;
    const channelId = Platform.OS === 'android' ? CHANNEL : undefined;

    const base = new Date();
    for (let d = 0; d < 7; d++) {
      // Asr and the hour before Maghrib both fall in the Salli day named by this civil date.
      const civil = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d, 12);
      if (toDayKey(civil) === today.date && today.lit) continue; // already lit: no nudge today

      if (s.asrReminder) {
        const at = new Date(asrOn(civil).getTime() + 20 * 60 * 1000);
        if (at.getTime() > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t('Your lantern is waiting'),
              body: streak > 0 ? t('A few salawat after Asr keeps your {n}-day streak glowing ﷺ', { n: streak }) : t('A few salawat after Asr will light today’s lantern ﷺ'),
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId },
          });
        }
      }
      if (s.preMaghribReminder) {
        const at = new Date(maghribOn(civil).getTime() - 60 * 60 * 1000);
        if (at.getTime() > now) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t('An hour until Maghrib'),
              body: streak > 0 ? t('Light your lantern to keep your {n}-day streak', { n: streak }) : t('Send salawat before Maghrib to light today’s lantern'),
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId },
          });
        }
      }
    }

    if (s.fridayReminders) {
      await Notifications.scheduleNotificationAsync({
        content: { title: t('Jumu’ah Mubarak'), body: t('Send abundant salawat on the Prophet ﷺ today.') },
        // weekday: 1 = Sunday … 6 = Friday
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour: 9, minute: 7, channelId },
      });
    }
  } catch {
    // Reminders are a nicety; never let them break the app.
  }
}

let started = false;
export function startReminders() {
  if (started || !SUPPORTED) return;
  started = true;
  refreshReminders(1500);
  onGoalLit(() => refreshReminders());
  AppState.addEventListener('change', (state) => {
    if (state === 'active') refreshReminders();
  });
  addSettingsChangeListener((fields) => {
    if (fields.some((f) => f === 'asrReminder' || f === 'fridayReminders' || f === 'preMaghribReminder' || f === 'onboarded' || f === 'language')) {
      refreshReminders();
    }
  });
}

