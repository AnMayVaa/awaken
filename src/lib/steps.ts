/**
 * Step counting from the phone's motion sensor (expo-sensors Pedometer).
 * - iOS (including Expo Go): reads today's total from Core Motion (last 7 days available).
 * - Android: no history API; Expo Go lacks the permission. Users enter steps manually.
 */
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export type StepsSupport = 'auto' | 'manual';

export function stepsSupport(): StepsSupport {
  return Platform.OS === 'ios' ? 'auto' : 'manual';
}

export async function readTodaySteps(): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    const perm = await Pedometer.getPermissionsAsync();
    if (!perm.granted) {
      const req = await Pedometer.requestPermissionsAsync();
      if (!req.granted) return null;
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const res = await Pedometer.getStepCountAsync(start, new Date());
    return typeof res?.steps === 'number' ? res.steps : null;
  } catch {
    return null;
  }
}
