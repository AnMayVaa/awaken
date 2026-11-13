import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import type { Tone } from '@/game/types';

let enabled = true;
export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

const ok = () => enabled && Platform.OS !== 'web';

export function tap() {
  if (ok()) Haptics.selectionAsync().catch(() => {});
}

export function hapticFor(tone: Tone) {
  if (!ok()) return;
  if (tone === 'penalty' || tone === 'warning') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } else if (tone === 'levelup' || tone === 'rankup' || tone === 'boss' || tone === 'achievement') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}
