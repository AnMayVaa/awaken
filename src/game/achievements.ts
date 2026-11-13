import type { GameState } from './types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  /** title granted on unlock (equippable) */
  title?: string;
  xp: number;
  gold: number;
  check: (s: GameState) => boolean;
  /** 0..1 progress for UI */
  progress?: (s: GameState) => number;
}

const ratio = (v: number, max: number) => Math.min(1, v / max);
const total = (s: GameState, id: string) => s.counters.totals[id] ?? 0;
function areasLastWeek(s: GameState) {
  const cutoff = Date.now() - 7 * 86400000;
  return new Set(s.questHistory.filter((h) => h.status === 'done' && h.ts >= cutoff).map((h) => h.area)).size;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_quest', name: 'First Step', desc: 'Complete your first quest.', icon: 'flag-checkered', xp: 20, gold: 20, check: (s) => s.counters.questsCompleted + s.counters.dailyCompleted + (s.counters.sideQuests ?? 0) >= 1 },
  { id: 'first_daily', name: 'The Daily Grind', desc: 'Clear the Daily Quest once.', icon: 'calendar-check', xp: 30, gold: 30, title: 'Initiate', check: (s) => s.counters.dailyCompleted >= 1 },
  { id: 'daily_7', name: 'Iron Will', desc: 'Clear the Daily Quest 7 days in a row.', icon: 'fire', title: 'Iron Willed', xp: 150, gold: 150, check: (s) => s.counters.bestDailyStreak >= 7, progress: (s) => ratio(s.counters.bestDailyStreak, 7) },
  { id: 'daily_30', name: 'Unbreakable', desc: 'Clear the Daily Quest 30 days in a row.', icon: 'fire-circle', title: 'The Unbreakable', xp: 600, gold: 500, check: (s) => s.counters.bestDailyStreak >= 30, progress: (s) => ratio(s.counters.bestDailyStreak, 30) },
  { id: 'level_5', name: 'Growing Power', desc: 'Reach level 5.', icon: 'chevron-triple-up', xp: 0, gold: 100, check: (s) => s.player.level >= 5, progress: (s) => ratio(s.player.level, 5) },
  { id: 'rank_d', name: 'D-Rank', desc: 'Reach level 10 and rank up to D.', icon: 'alpha-d-box', title: 'Rising Hunter', xp: 0, gold: 200, check: (s) => s.player.level >= 10, progress: (s) => ratio(s.player.level, 10) },
  { id: 'rank_c', name: 'C-Rank', desc: 'Reach level 20.', icon: 'alpha-c-box', xp: 0, gold: 400, check: (s) => s.player.level >= 20, progress: (s) => ratio(s.player.level, 20) },
  { id: 'rank_b', name: 'B-Rank', desc: 'Reach level 35.', icon: 'alpha-b-box', title: 'Veteran', xp: 0, gold: 700, check: (s) => s.player.level >= 35, progress: (s) => ratio(s.player.level, 35) },
  { id: 'rank_a', name: 'A-Rank', desc: 'Reach level 50.', icon: 'alpha-a-box', title: 'Elite Hunter', xp: 0, gold: 1000, check: (s) => s.player.level >= 50, progress: (s) => ratio(s.player.level, 50) },
  { id: 'rank_s', name: 'S-Rank', desc: 'Reach level 70.', icon: 'crown', title: 'Sovereign', xp: 0, gold: 2000, check: (s) => s.player.level >= 70, progress: (s) => ratio(s.player.level, 70) },
  { id: 'habit_7', name: 'Seedling', desc: 'Reach a 7-day habit streak.', icon: 'sprout', xp: 70, gold: 70, check: (s) => s.counters.bestHabitStreak >= 7, progress: (s) => ratio(s.counters.bestHabitStreak, 7) },
  { id: 'habit_21', name: 'Rooted', desc: 'Reach a 21-day habit streak.', icon: 'tree', title: 'Deep Rooted', xp: 200, gold: 200, check: (s) => s.counters.bestHabitStreak >= 21, progress: (s) => ratio(s.counters.bestHabitStreak, 21) },
  { id: 'habit_66', name: 'Habit Forged', desc: 'Complete a full 66-day habit challenge.', icon: 'anvil', title: 'Habit Smith', xp: 660, gold: 660, check: (s) => s.counters.habitsForged >= 1, progress: (s) => ratio(s.counters.bestHabitStreak, 66) },
  { id: 'boss_1', name: 'Boss Slayer', desc: 'Defeat a weekly boss.', icon: 'sword-cross', title: 'Slayer', xp: 100, gold: 100, check: (s) => s.counters.bossesDefeated >= 1 },
  { id: 'boss_5', name: 'Raid Veteran', desc: 'Defeat 5 weekly bosses.', icon: 'skull-crossbones', title: 'Raid Leader', xp: 400, gold: 400, check: (s) => s.counters.bossesDefeated >= 5, progress: (s) => ratio(s.counters.bossesDefeated, 5) },
  { id: 'dungeon_1', name: 'Dungeon Diver', desc: 'Clear your first dungeon.', icon: 'gate', xp: 30, gold: 30, check: (s) => s.counters.dungeonsCleared >= 1 },
  { id: 'dungeon_10', name: 'Gatekeeper', desc: 'Clear 10 dungeons.', icon: 'castle', title: 'Gatekeeper', xp: 200, gold: 200, check: (s) => s.counters.dungeonsCleared >= 10, progress: (s) => ratio(s.counters.dungeonsCleared, 10) },
  { id: 'dungeon_s', name: 'Abyss Walker', desc: 'Clear an S-Rank dungeon (120 min).', icon: 'star-four-points', title: 'Abyss Walker', xp: 300, gold: 300, check: (s) => s.counters.sRankClears >= 1 },
  { id: 'focus_600', name: 'Deep Focus', desc: 'Spend 10 hours in dungeons.', icon: 'brain', title: 'Sage', xp: 300, gold: 300, check: (s) => s.counters.focusMinutes >= 600, progress: (s) => ratio(s.counters.focusMinutes, 600) },
  { id: 'pushups_1000', name: 'Thousand Fists', desc: 'Log 1,000 push-ups in total.', icon: 'arm-flex', title: 'Iron Arms', xp: 250, gold: 200, check: (s) => total(s, 'pushups') >= 1000, progress: (s) => ratio(total(s, 'pushups'), 1000) },
  { id: 'run_42', name: 'Marathoner', desc: 'Run 42 km in total.', icon: 'run-fast', title: 'Windrunner', xp: 250, gold: 200, check: (s) => total(s, 'run') >= 42, progress: (s) => ratio(total(s, 'run'), 42) },
  { id: 'penalty_clear', name: 'Survivor', desc: 'Clear a penalty quest.', icon: 'skull', xp: 50, gold: 50, check: (s) => s.counters.penaltiesCleared >= 1 },
  { id: 'gold_2000', name: 'Treasure Hunter', desc: 'Earn 2,000 gold in total.', icon: 'treasure-chest', xp: 100, gold: 0, check: (s) => s.counters.goldEarned >= 2000, progress: (s) => ratio(s.counters.goldEarned, 2000) },
  { id: 'shop_1', name: 'Customer', desc: 'Buy something from the shop.', icon: 'cart', xp: 20, gold: 0, check: (s) => s.counters.purchases >= 1 },
  { id: 'guild_3', name: 'Guild Founder', desc: 'Have 3 hunters in your guild.', icon: 'account-group', title: 'Guild Master', xp: 50, gold: 50, check: (s) => s.bots.length >= 3, progress: (s) => ratio(s.bots.length, 3) },
  { id: 'stat_20', name: 'Specialist', desc: 'Raise any stat to 20.', icon: 'star-shooting', xp: 150, gold: 150, check: (s) => Object.values(s.player.stats).some((v) => v >= 20), progress: (s) => ratio(Math.max(...Object.values(s.player.stats)), 20) },
  { id: 'side_1', name: 'Side Quester', desc: 'Clear your first Side Quest.', icon: 'map-marker-star', xp: 20, gold: 20, check: (s) => s.counters.sideQuests >= 1 },
  { id: 'side_50', name: 'Adventurer', desc: 'Clear 50 Side Quests.', icon: 'map-legend', title: 'Adventurer', xp: 300, gold: 300, check: (s) => s.counters.sideQuests >= 50, progress: (s) => ratio(s.counters.sideQuests, 50) },
  { id: 'side_200', name: 'Living Legend', desc: 'Clear 200 Side Quests.', icon: 'star-circle', title: 'Living Legend', xp: 800, gold: 800, check: (s) => s.counters.sideQuests >= 200, progress: (s) => ratio(s.counters.sideQuests, 200) },
  {
    id: 'renaissance',
    name: 'Renaissance',
    desc: 'Clear quests in 6 different life areas within 7 days.',
    icon: 'palette',
    title: 'Renaissance Soul',
    xp: 200,
    gold: 200,
    check: (s) => areasLastWeek(s) >= 6,
    progress: (s) => ratio(areasLastWeek(s), 6),
  },
  { id: 'checkin_7', name: 'Self-Aware', desc: 'Complete 7 daily check-ins.', icon: 'clipboard-pulse', xp: 70, gold: 50, check: (s) => s.counters.checkins >= 7, progress: (s) => ratio(s.counters.checkins, 7) },
  { id: 'checkin_30', name: 'Data-Driven', desc: 'Complete 30 daily check-ins.', icon: 'chart-areaspline', title: 'Analyst', xp: 250, gold: 150, check: (s) => s.counters.checkins >= 30, progress: (s) => ratio(s.counters.checkins, 30) },
  { id: 'who5', name: 'Know Thyself', desc: 'Measure your wellbeing (WHO-5).', icon: 'heart-flash', xp: 30, gold: 30, check: (s) => s.wellbeing.length >= 1 },
  { id: 'wheel', name: 'Wheel of Life', desc: 'Rate all your life areas.', icon: 'chart-donut', xp: 30, gold: 30, check: (s) => s.wheel.length >= 1 },
  { id: 'review_4', name: 'Strategist', desc: 'Complete 4 weekly reviews.', icon: 'strategy', title: 'Strategist', xp: 200, gold: 150, check: (s) => s.counters.reviews >= 4, progress: (s) => ratio(s.counters.reviews, 4) },
  { id: 'main_1', name: 'Questbound', desc: 'Complete a Main Quest.', icon: 'flag-variant', title: 'Questbound', xp: 300, gold: 200, check: (s) => s.counters.mainQuestsDone >= 1 },
  { id: 'main_3', name: 'Saga Hero', desc: 'Complete 3 Main Quests.', icon: 'book-open-variant', title: 'Saga Hero', xp: 600, gold: 400, check: (s) => s.counters.mainQuestsDone >= 3, progress: (s) => ratio(s.counters.mainQuestsDone, 3) },
  { id: 'free_7', name: 'First Week Free', desc: 'Stay free from a habit for 7 days.', icon: 'lock-open-variant', xp: 100, gold: 70, check: (s) => s.counters.bestRecoveryDays >= 7, progress: (s) => ratio(s.counters.bestRecoveryDays, 7) },
  { id: 'free_30', name: 'Unchained', desc: 'Stay free from a habit for 30 days.', icon: 'link-variant-off', title: 'Unchained', xp: 300, gold: 200, check: (s) => s.counters.bestRecoveryDays >= 30, progress: (s) => ratio(s.counters.bestRecoveryDays, 30) },
  { id: 'free_90', name: 'Free Spirit', desc: 'Stay free from a habit for 90 days.', icon: 'bird', title: 'Free Spirit', xp: 900, gold: 600, check: (s) => s.counters.bestRecoveryDays >= 90, progress: (s) => ratio(s.counters.bestRecoveryDays, 90) },
  { id: 'crit_10', name: 'Lucky Strike', desc: 'Land 10 critical clears.', icon: 'star-shooting', title: 'Lucky Star', xp: 100, gold: 100, check: (s) => (s.counters.crits ?? 0) >= 10, progress: (s) => ratio(s.counters.crits ?? 0, 10) },
  { id: 'combo_6', name: 'Combo Master', desc: 'Reach a ×6 combo in one day.', icon: 'lightning-bolt-circle', title: 'Combo Master', xp: 120, gold: 80, check: (s) => (s.counters.bestCombo ?? 0) >= 6, progress: (s) => ratio(s.counters.bestCombo ?? 0, 6) },
  { id: 'weekly_3', name: 'Challenger', desc: 'Complete 3 weekly challenges.', icon: 'calendar-star', title: 'Challenger', xp: 150, gold: 120, check: (s) => (s.counters.weeklyDone ?? 0) >= 3, progress: (s) => ratio(s.counters.weeklyDone ?? 0, 3) },
  { id: 'urgent_5', name: 'First Responder', desc: 'Clear 5 Urgent Quests in time.', icon: 'alarm-light', title: 'First Responder', xp: 120, gold: 100, check: (s) => (s.counters.urgentDone ?? 0) >= 5, progress: (s) => ratio(s.counters.urgentDone ?? 0, 5) },
  { id: 'tamer', name: 'Tamer', desc: 'Hatch your companion.', icon: 'egg-easter', xp: 40, gold: 40, check: (s) => !!s.fun?.companion?.species },
  { id: 'urge_10', name: 'Wave Rider', desc: 'Resist 10 urges with the SOS tool.', icon: 'waves', title: 'Wave Rider', xp: 150, gold: 100, check: (s) => s.counters.urgesResisted >= 10, progress: (s) => ratio(s.counters.urgesResisted, 10) },
];

export const ACHIEVEMENT_MAP: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

export const TITLES = ACHIEVEMENTS.filter((a) => a.title).map((a) => ({ id: a.id, title: a.title as string }));
