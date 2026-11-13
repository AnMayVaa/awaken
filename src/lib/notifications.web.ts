import type { GameState } from '@/game/types';

// Notifications are phone-only. On web the in-app System alerts are used instead.
export async function initNotifications() {}
export async function requestNotificationPermission(): Promise<boolean> {
  return false;
}
export function rescheduleNotifications(_g: GameState) {
  return Promise.resolve();
}
export const notificationsSupported = false;
