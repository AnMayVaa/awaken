import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as E from '@/game/engine';
import type { Bot, CustomQuest, CustomReward, GameEvent, GameState, Habit, ItemId, Rank, Settings, StatKey } from '@/game/types';
import { setHapticsEnabled } from '@/lib/haptics';

import { useAlerts } from './alerts';

interface GameStore {
  game: GameState;
  hydrated: boolean;
}

export const useGame = create<GameStore>()(
  persist(
    (): GameStore => ({
      game: E.createInitialState(),
      hydrated: false,
    }),
    {
      name: 'awaken-save-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ game: s.game }) as GameStore,
      merge: (persisted, current) => {
        const p = persisted as Partial<GameStore> | undefined;
        return { ...current, game: E.migrate(p?.game ?? current.game) };
      },
      onRehydrateStorage: () => (state) => {
        setHapticsEnabled(state?.game.settings.haptics ?? true);
        useGame.setState({ hydrated: true });
      },
    },
  ),
);

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * Run a mutation on a draft copy of the game. Return `false` from fn to discard.
 */
export function act(fn: (s: GameState, ev: GameEvent[]) => boolean | void, opts: { silent?: boolean } = {}): boolean {
  const draft = clone(useGame.getState().game);
  const ev: GameEvent[] = [];
  const res = fn(draft, ev);
  if (res === false) return false;
  E.checkAchievements(draft, ev);
  draft.updatedAt = Date.now();
  useGame.setState({ game: draft });
  if (ev.length && !opts.silent) useAlerts.getState().push(ev);
  return true;
}

export function replaceGame(g: GameState) {
  useGame.setState({ game: E.migrate(g) });
  setHapticsEnabled(g.settings?.haptics ?? true);
}

export const game = () => useGame.getState().game;

export const actions = {
  tick: () => act((s, ev) => E.rollover(s, ev)),
  appState: (st: 'active' | 'background' | 'inactive') => act((s, ev) => E.dungeonAppState(s, ev, st)),

  onboard: (name: string, settings: Partial<Settings>) =>
    act((s, ev) => {
      const fresh = E.createInitialState(name.trim() || 'Player', settings);
      Object.assign(s, fresh, { onboarded: true, syncedUserId: s.syncedUserId });
      E.log(s, 'The System has chosen you. Welcome, Player.', 'info');
      ev.push({
        tone: 'info',
        title: 'WELCOME, PLAYER',
        lines: [
          `${s.player.name}, you have awakened.`,
          'Complete the Daily Quest every day.',
          'Failure will result in a penalty.',
          'Grow stronger.',
        ],
      });
    }),

  logWorkout: (exerciseId: string, amount: number) => act((s, ev) => E.logWorkout(s, ev, exerciseId, amount)),
  deleteWorkout: (id: string) => act((s) => E.deleteWorkout(s, id)),

  addQuest: (q: Omit<CustomQuest, 'id' | 'completedCount' | 'createdAt'>) => act((s) => E.addQuest(s, q)),
  updateQuest: (id: string, patch: Partial<CustomQuest>) => act((s) => E.updateQuest(s, id, patch)),
  deleteQuest: (id: string) => act((s) => E.deleteQuest(s, id)),
  completeQuest: (id: string) => act((s, ev) => E.completeQuest(s, ev, id)),
  undoQuest: (id: string) => act((s) => E.undoQuest(s, id)),

  addHabit: (h: Pick<Habit, 'name' | 'icon' | 'stat' | 'kind'>) => act((s) => E.addHabit(s, h)),
  deleteHabit: (id: string) => act((s) => E.deleteHabit(s, id)),
  checkHabit: (id: string) => act((s, ev) => E.checkHabit(s, ev, id)),
  uncheckHabit: (id: string) => act((s) => E.uncheckHabit(s, id)),
  restartHabit: (id: string) => act((s) => E.restartHabit(s, id)),

  startDungeon: (rank: Rank, label: string) => act((s) => E.startDungeon(s, rank, label)),
  abandonDungeon: () => act((s, ev) => E.failDungeon(s, ev, 'You abandoned the dungeon.')),

  buyItem: (id: ItemId) => act((s, ev) => E.buyItem(s, ev, id)),
  useItem: (id: ItemId) => act((s, ev) => E.consumeItem(s, ev, id)),
  addReward: (r: Omit<CustomReward, 'id'>) => act((s) => E.addReward(s, r)),
  deleteReward: (id: string) => act((s) => E.deleteReward(s, id)),
  redeemReward: (id: string) => act((s, ev) => E.redeemReward(s, ev, id)),

  allocate: (stat: StatKey) => act((s) => E.allocatePoint(s, stat)),
  setTitle: (id: string | null) => act((s) => void (s.player.titleId = id)),
  rename: (name: string) => act((s) => void (s.player.name = name.trim() || s.player.name)),
  settings: (patch: Partial<Settings>) =>
    act((s) => {
      E.applySettings(s, patch);
      if (patch.haptics !== undefined) setHapticsEnabled(patch.haptics);
    }),

  addBot: (b: Bot) => act((s) => E.addBot(s, b)),
  removeBot: (id: string) => act((s) => E.removeBot(s, id)),

  reset: () =>
    act((s) => {
      const keepUser = s.syncedUserId;
      Object.assign(s, E.createInitialState(), { syncedUserId: keepUser });
    }),
};
