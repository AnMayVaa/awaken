import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as E from '@/game/engine';
import * as L from '@/game/life3';
import { generateBoard } from '@/game/director';
import type { PlanProposal } from '@/game/plan';
import { RECOVERY_MAP } from '@/game/recovery';
import type { AreaId, Bot, MoneyCat, CustomQuest, CustomReward, DailyCheckin, GameEvent, GameState, Habit, ItemId, LifeProfile, MainQuest, Rank, RecoveryCategory, RecoveryTrack, Settings, StatKey, WeeklyReview } from '@/game/types';
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

export const life = {
  logMeal: (m: Parameters<typeof L.logMeal>[2]) => act((s, ev) => L.logMeal(s, ev, m)),
  deleteMeal: (id: string) => act((s) => L.deleteMeal(s, id)),
  water: (delta: number) => act((s, ev) => L.addWater(s, ev, delta)),
  waterGoal: (g: number) => act((s) => L.setWaterGoal(s, g)),
  logExpense: (x: Parameters<typeof L.logExpense>[2]) => act((s, ev) => L.logExpense(s, ev, x)),
  deleteExpense: (id: string) => act((s) => L.deleteExpense(s, id)),
  setBudget: (cat: MoneyCat, amount: number) => act((s) => L.setBudget(s, cat, amount)),
  noSpend: () => act((s, ev) => L.declareNoSpend(s, ev)),
  addWish: (name: string, price: number) => act((s, ev) => L.addWish(s, ev, name, price)),
  decideWish: (id: string, buy: boolean) => act((s, ev) => L.decideWish(s, ev, id, buy)),
  deleteWish: (id: string) => act((s) => L.deleteWish(s, id)),
  addGoal: (name: string, target: number, deadline?: string) => act((s) => L.addGoal(s, name, target, deadline)),
  deposit: (id: string, amount: number) => act((s, ev) => L.depositGoal(s, ev, id, amount)),
  deleteGoal: (id: string) => act((s) => L.deleteGoal(s, id)),
  addSkill: (name: string, icon: string, stat: StatKey) => act((s) => L.addSkill(s, name, icon, stat)),
  logSkill: (id: string, min: number) => act((s, ev) => L.logSkill(s, ev, id, min)),
  deleteSkill: (id: string) => act((s) => L.deleteSkill(s, id)),
  addPerson: (p: Parameters<typeof L.addPerson>[1]) => act((s) => L.addPerson(s, p)),
  updatePerson: (id: string, patch: Parameters<typeof L.updatePerson>[2]) => act((s) => L.updatePerson(s, id, patch)),
  contact: (id: string) => act((s, ev) => L.contactPerson(s, ev, id)),
  deletePerson: (id: string) => act((s) => L.deletePerson(s, id)),
  setPlan: (texts: string[]) => act((s) => L.setPlan(s, texts)),
  togglePlan: (i: number) => act((s, ev) => L.togglePlanItem(s, ev, i)),
  claimSeason: (i: number) => act((s, ev) => L.claimSeasonTier(s, ev, i)),
};

export const actions = {
  tick: () =>
    act((s, ev) => {
      const a = E.rollover(s, ev);
      const b = L.trackTick(s, ev);
      return a || b;
    }),
  appState: (st: 'active' | 'background' | 'inactive') => act((s, ev) => E.dungeonAppState(s, ev, st)),

  onboard: (name: string, settings: Partial<Settings>, extra: { focusAreas?: AreaId[]; recovery?: RecoveryCategory[] } = {}) =>
    act((s, ev) => {
      const fresh = E.createInitialState(name.trim() || 'Player', settings);
      Object.assign(s, fresh, { onboarded: true, syncedUserId: s.syncedUserId });
      if (extra.focusAreas?.length) s.profile.focusAreas = extra.focusAreas.slice(0, 3);
      for (const c of extra.recovery ?? []) {
        const m = RECOVERY_MAP[c];
        E.addRecovery(s, { category: c, name: m.name, why: '', plan: m.plan, replacements: m.replacements.slice(0, 4) });
      }
      s.board = { date: s.board.date, quests: generateBoard(s, s.board.date), rerolls: s.board.rerolls };
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

  // v2 — side quests
  completeSide: (id: string, note?: string) => act((s, ev) => E.completeSide(s, ev, id, note)),
  skipSide: (id: string) => act((s) => E.skipSide(s, id)),
  rerollSide: (id: string) => act((s) => E.rerollSide(s, id)),
  addToBoard: (templateId: string) => act((s) => E.addToBoard(s, templateId)),
  removeFromBoard: (id: string) => act((s) => E.removeFromBoard(s, id)),
  addAIQuests: (items: E.AIQuestInput[]) => {
    let n = 0;
    act((s) => {
      n = E.addAIQuests(s, items);
      return n > 0;
    });
    return n;
  },
  setProfile: (patch: Partial<LifeProfile>) => act((s) => E.setProfile(s, patch)),

  // main quests
  addMainQuest: (mq: Omit<MainQuest, 'id' | 'status' | 'createdAt'>) => act((s) => E.addMainQuest(s, mq)),
  startCampaign: (id: string) => act((s) => E.startCampaign(s, id)),
  toggleMilestone: (mqId: string, msId: string) => act((s, ev) => E.toggleMilestone(s, ev, mqId, msId)),
  updateMainQuest: (mqId: string, patch: Partial<MainQuest>) => act((s) => E.updateMainQuest(s, mqId, patch)),
  completeMainQuest: (mqId: string) => act((s, ev) => E.completeMainQuest(s, ev, mqId)),
  deleteMainQuest: (mqId: string) => act((s) => E.deleteMainQuest(s, mqId)),

  // recovery
  addRecovery: (t: Pick<RecoveryTrack, 'category' | 'name' | 'why' | 'plan' | 'replacements'> & { daysClean?: number }) => act((s) => E.addRecovery(s, t)),
  updateRecovery: (id: string, patch: Partial<Pick<RecoveryTrack, 'name' | 'why' | 'plan' | 'replacements'>>) => act((s) => E.updateRecovery(s, id, patch)),
  deleteRecovery: (id: string) => act((s) => E.deleteRecovery(s, id)),
  resistUrge: (id: string, trigger?: string) => act((s, ev) => E.resistUrge(s, ev, id, trigger)),
  relapse: (id: string, trigger?: string, note?: string, plan?: string) => act((s, ev) => E.relapse(s, ev, id, trigger, note, plan)),

  applyPlan: (p: PlanProposal, opts: { habit: boolean; campaign: boolean; recovery: boolean }) => act((s, ev) => E.applyPlan(s, ev, p, opts)),

  // gimmicks
  claimCrate: () => act((s, ev) => E.claimCrate(s, ev)),
  completeUrgent: () => act((s, ev) => E.completeUrgent(s, ev)),
  claimWeekly: (id: string) => act((s, ev) => E.claimWeekly(s, ev, id)),
  hatchCompanion: (species: string, name: string) => act((s, ev) => E.hatchCompanion(s, ev, species, name)),
  renameCompanion: (name: string) => act((s) => E.renameCompanion(s, name)),

  // life data
  saveCheckin: (patch: Partial<DailyCheckin>, finalize = true) => act((s, ev) => E.saveCheckin(s, ev, patch, finalize)),
  setSteps: (steps: number) =>
    act((s, ev) => {
      const t = s.board.date;
      if (s.checkins[t]?.steps === steps) return false;
      E.saveCheckin(s, ev, { steps, stepsAuto: true }, false);
    }),
  saveWellbeing: (answers: number[]) => act((s, ev) => E.saveWellbeing(s, ev, answers)),
  saveWheel: (ratings: Partial<Record<AreaId, number>>) => act((s, ev) => E.saveWheel(s, ev, ratings)),
  saveReview: (r: Omit<WeeklyReview, 'date' | 'week'>) => act((s, ev) => E.saveReview(s, ev, r)),
  removeBot: (id: string) => act((s) => E.removeBot(s, id)),

  reset: () =>
    act((s) => {
      const keepUser = s.syncedUserId;
      Object.assign(s, E.createInitialState(), { syncedUserId: keepUser });
    }),
};
