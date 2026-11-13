/**
 * "[SYSTEM]" local notifications (iOS / Android). Web uses notifications.web.ts (no-op).
 * We schedule one-shot notifications for the next 7 days so that today's
 * warning can be skipped once the Daily Quest is done.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { BOSS_MAP } from '@/game/constants';
import { addDays, fromDateKey, today, weekEnd } from '@/game/date';
import type { GameState } from '@/game/types';

let initialised = false;

export async function initNotifications() {
  if (initialised) return;
  initialised = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('system', {
      name: 'System alerts',
      // eslint-disable-next-line import/namespace -- re-exported enum
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 120, 80, 120],
      lightColor: '#3CC8FF',
    });
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  await initNotifications();
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return res.granted;
}

function at(dateKey: string, hour: number, minute = 0) {
  const d = fromDateKey(dateKey);
  d.setHours(hour, minute, 0, 0);
  return d;
}

let pending: Promise<void> | null = null;

export function rescheduleNotifications(g: GameState) {
  // serialise calls
  pending = (pending ?? Promise.resolve()).then(() => doSchedule(g)).catch(() => {});
  return pending;
}

async function doSchedule(g: GameState) {
  await initNotifications();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!g.onboarded || !g.settings.notifications) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const now = Date.now();
  const t = today();
  const s = g.settings;
  const jobs: { date: Date; title: string; body: string }[] = [];

  for (let i = 0; i < 7; i++) {
    const day = addDays(t, i);
    const morning = at(day, s.reminderHour, s.reminderMinute);
    jobs.push({
      date: morning,
      title: '[SYSTEM] Daily Quest has arrived',
      body: 'Daily Quest: Body Forging. Failure to complete it will result in a penalty.',
    });
    const doneToday = i === 0 && g.daily.completed;
    if (!doneToday) {
      const warn = at(day, s.warningHour, 0);
      const hoursLeft = 24 - s.warningHour;
      jobs.push({
        date: warn,
        title: '[SYSTEM] WARNING',
        body: `The Daily Quest is incomplete. ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} remain before the penalty is applied.`,
      });
    }
  }

  if (g.dungeon) {
    jobs.push({
      date: new Date(g.dungeon.endsAt),
      title: '[SYSTEM] Dungeon cleared',
      body: `${g.dungeon.rank}-Rank dungeon complete. Return to claim your reward.`,
    });
  }

  if (!g.boss.defeated) {
    const end = weekEnd(g.boss.weekId);
    const sundayEvening = new Date(end.getTime() - 6 * 3600 * 1000); // Sunday 18:00
    const boss = BOSS_MAP[g.boss.bossId];
    jobs.push({
      date: sundayEvening,
      title: '[SYSTEM] The boss still stands',
      body: `${boss?.name ?? 'The weekly boss'} has ${g.boss.hp} HP left. It escapes at midnight.`,
    });
  }

  for (const j of jobs) {
    if (j.date.getTime() <= now + 5000) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: j.title, body: j.body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: j.date, channelId: 'system' },
    });
  }
}

export const notificationsSupported = true;
