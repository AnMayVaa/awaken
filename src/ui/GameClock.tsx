import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { initNotifications, rescheduleNotifications } from '@/lib/notifications';
import { startSync } from '@/lib/sync';
import { actions, game, useGame } from '@/store/game';

/** Invisible component: runs the daily rollover, dungeon checks, sync and notifications. */
export function GameClock() {
  useEffect(() => {
    actions.tick();
    startSync();
    initNotifications().then(() => rescheduleNotifications(game()));

    const iv = setInterval(() => actions.tick(), 10000);

    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' || st === 'background' || st === 'inactive') {
        if (st !== 'inactive') actions.appState(st);
        if (st === 'active') actions.tick();
        if (st === 'background') rescheduleNotifications(game());
      }
    });

    // Reschedule when things that affect reminders change
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGame.subscribe((s, p) => {
      const a = s.game;
      const b = p.game;
      if (
        a.daily.completed !== b.daily.completed ||
        a.daily.date !== b.daily.date ||
        !!a.dungeon !== !!b.dungeon ||
        a.boss.defeated !== b.boss.defeated ||
        a.onboarded !== b.onboarded ||
        JSON.stringify(a.settings) !== JSON.stringify(b.settings)
      ) {
        if (t) clearTimeout(t);
        t = setTimeout(() => rescheduleNotifications(game()), 1500);
      }
    });

    // Web: visibility changes map to AppState already; also update tab title
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.title = 'AWAKEN — The System';

    return () => {
      clearInterval(iv);
      sub.remove();
      unsub();
      if (t) clearTimeout(t);
    };
  }, []);
  return null;
}
