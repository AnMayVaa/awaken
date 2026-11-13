/**
 * AWAKEN game engine — pure-ish functions that mutate a cloned draft state
 * and push GameEvents for the UI (popups / toasts).
 */
import { ACHIEVEMENTS } from './achievements';
import {
  BOSSES,
  DEFAULT_DAILY,
  DIFFICULTY_META,
  DUNGEON_GRACE_SEC,
  DUNGEON_MAP,
  EXERCISE_MAP,
  HABIT_DAYS,
  ITEM_MAP,
  ITEMS,
  PENALTY_TASKS,
  QUEST_REWARDS,
  RANK_LEVELS,
  STAT_META,
  STAT_KEYS,
} from './constants';
import { addDays, diffDays, today as todayKey, weekId } from './date';
import { hash, uid } from './rng';
import type {
  Bot,
  CustomQuest,
  CustomReward,
  Difficulty,
  GameEvent,
  GameState,
  Habit,
  ItemId,
  Player,
  QuestTask,
  Rank,
  Settings,
  StatKey,
  Tone,
} from './types';

export const STATE_VERSION = 1;
const MAX_LOGS = 60;
const MAX_WORKOUTS = 400;

type Source = 'workout' | 'cardio' | 'mind' | 'dungeon' | 'quest' | 'daily' | 'habit' | 'penalty' | 'boss' | 'achievement';

/* ------------------------------------------------------------------ */
/* Formulas                                                            */
/* ------------------------------------------------------------------ */

export function xpToNext(level: number): number {
  return Math.round(60 * Math.pow(level, 1.35) + 40);
}

export function rankForLevel(level: number): { rank: Rank; title: string } {
  let r = RANK_LEVELS[0];
  for (const x of RANK_LEVELS) if (level >= x.min) r = x;
  return { rank: r.rank, title: r.title };
}

export function nextRank(level: number) {
  return RANK_LEVELS.find((r) => r.min > level) ?? null;
}

export function maxHp(p: Player): number {
  return 100 + p.stats.VIT * 5;
}

export function statThreshold(value: number): number {
  return 40 + value * 8;
}

export function playerClass(p: Player): string {
  const entries = STAT_KEYS.map((k) => [k, p.stats[k]] as const).sort((a, b) => b[1] - a[1]);
  if (entries[0][1] === entries[entries.length - 1][1]) return 'Unawakened';
  const map: Record<StatKey, string> = { STR: 'Vanguard', AGI: 'Striker', VIT: 'Guardian', INT: 'Sage', SEN: 'Seer' };
  return map[entries[0][0]];
}

export function combatPower(p: Player): number {
  const s = p.stats;
  return Math.round((s.STR * 3 + s.AGI * 3 + s.VIT * 2.5 + s.INT * 2.5 + s.SEN * 2) * (1 + p.level * 0.08) * 10);
}

const pct = (v: number) => Math.min(0.5, v * 0.005);

function niceRound(v: number, unit: string): number {
  if (unit === 'km') return Math.max(0.5, Math.round(v * 2) / 2);
  if (unit === 'sec') return Math.max(10, Math.round(v / 10) * 10);
  if (v >= 20) return Math.round(v / 5) * 5;
  return Math.max(1, Math.round(v));
}

export function dailyTarget(exerciseId: string, difficulty: Difficulty, level: number): number {
  const ex = EXERCISE_MAP[exerciseId];
  const base = ex?.daily?.[difficulty] ?? 10;
  const scale = 1 + Math.min(level - 1, 50) * 0.02;
  return niceRound(base * scale, ex?.unit ?? 'reps');
}

export function dailyRewards(level: number) {
  return { xp: 80 + level * 15, gold: 50 + level * 5 };
}

export function bossMaxHp(level: number) {
  return Math.round(((300 + level * 30) * 5) / 50) * 50;
}

export function questReward(q: CustomQuest, level: number) {
  const r = QUEST_REWARDS[q.difficulty];
  const m = 1 + (level - 1) * 0.03;
  return { xp: Math.round(r.xp * m), gold: Math.round(r.gold * m) };
}

export function habitReward(streak: number) {
  return { xp: 15 + Math.floor(Math.min(streak, HABIT_DAYS) * 0.5), gold: 5 + Math.floor(streak / 7) * 2 };
}

export function isPenaltyActive(s: GameState) {
  return !!s.penalty && s.penalty.tasks.some((t) => t.progress < t.target);
}

/* ------------------------------------------------------------------ */
/* State creation                                                      */
/* ------------------------------------------------------------------ */

export function defaultSettings(): Settings {
  return {
    difficulty: 'normal',
    dailyExercises: [...DEFAULT_DAILY],
    notifications: true,
    reminderHour: 7,
    reminderMinute: 0,
    warningHour: 21,
    strictDungeon: true,
    haptics: true,
  };
}

function makeTasks(exercises: string[], difficulty: Difficulty, level: number): QuestTask[] {
  return exercises
    .filter((id) => EXERCISE_MAP[id])
    .map((id) => {
      const ex = EXERCISE_MAP[id];
      return { id: uid('t'), exerciseId: id, label: ex.name, unit: ex.unit, target: dailyTarget(id, difficulty, level), progress: 0 };
    });
}

function pickBoss(week: string) {
  return BOSSES[hash('boss', week) % BOSSES.length];
}

export function createInitialState(name = 'Player', settings?: Partial<Settings>): GameState {
  const t = todayKey();
  const st: Settings = { ...defaultSettings(), ...settings };
  const player: Player = {
    name,
    level: 1,
    xp: 0,
    totalXp: 0,
    gold: 100,
    hp: 125,
    stats: { STR: 5, AGI: 5, VIT: 5, INT: 5, SEN: 5 },
    statXp: { STR: 0, AGI: 0, VIT: 0, INT: 0, SEN: 0 },
    freePoints: 0,
    titleId: null,
    createdAt: new Date().toISOString(),
  };
  const wk = weekId(t);
  return {
    version: STATE_VERSION,
    onboarded: false,
    player,
    daily: { date: t, tasks: makeTasks(st.dailyExercises, st.difficulty, 1), completed: false },
    penalty: null,
    customQuests: [],
    habits: [],
    workouts: [],
    dungeon: null,
    dungeonHistory: [],
    boss: { weekId: wk, bossId: pickBoss(wk).id, maxHp: bossMaxHp(1), hp: bossMaxHp(1), defeated: false },
    inventory: { hp_potion: 1, streak_shield: 1, penalty_pass: 0, xp_elixir: 0 },
    rewards: [
      { id: uid('r'), name: '1 hour of gaming', cost: 300, icon: 'gamepad-variant' },
      { id: uid('r'), name: 'Favourite snack', cost: 150, icon: 'ice-cream' },
      { id: uid('r'), name: 'Movie night', cost: 500, icon: 'movie-open' },
    ],
    purchases: [],
    bots: [],
    achievements: {},
    logs: [],
    settings: st,
    counters: {
      questsCompleted: 0,
      dailyCompleted: 0,
      dailyStreak: 0,
      bestDailyStreak: 0,
      penaltiesTaken: 0,
      penaltiesCleared: 0,
      bossesDefeated: 0,
      goldEarned: 0,
      goldSpent: 0,
      dungeonsCleared: 0,
      dungeonsFailed: 0,
      sRankClears: 0,
      focusMinutes: 0,
      habitsForged: 0,
      bestHabitStreak: 0,
      purchases: 0,
      totals: {},
    },
    xpBoostUntil: 0,
    lastDate: t,
    updatedAt: Date.now(),
    syncedUserId: null,
  };
}

/** Fill in any fields missing from older saves. */
export function migrate(raw: Partial<GameState> | null | undefined): GameState {
  const base = createInitialState(raw?.player?.name ?? 'Player');
  if (!raw || !raw.player) return base;
  return {
    ...base,
    ...raw,
    player: { ...base.player, ...raw.player, stats: { ...base.player.stats, ...raw.player.stats }, statXp: { ...base.player.statXp, ...raw.player.statXp } },
    settings: { ...base.settings, ...raw.settings },
    counters: { ...base.counters, ...raw.counters, totals: { ...(raw.counters?.totals ?? {}) } },
    inventory: { ...base.inventory, ...raw.inventory },
    version: STATE_VERSION,
  } as GameState;
}

/* ------------------------------------------------------------------ */
/* Core mutations                                                      */
/* ------------------------------------------------------------------ */

export function log(s: GameState, text: string, tone: Tone = 'info') {
  s.logs.unshift({ id: uid('l'), ts: Date.now(), text, tone });
  if (s.logs.length > MAX_LOGS) s.logs.length = MAX_LOGS;
}

function emit(ev: GameEvent[], tone: Tone, title: string, lines: string[], minor = false) {
  ev.push({ tone, title, lines, minor } as GameEvent);
}

export function addStatXp(s: GameState, ev: GameEvent[], stat: StatKey, amount: number) {
  const p = s.player;
  p.statXp[stat] += amount;
  let gained = 0;
  while (p.statXp[stat] >= statThreshold(p.stats[stat])) {
    p.statXp[stat] -= statThreshold(p.stats[stat]);
    p.stats[stat] += 1;
    gained++;
    if (stat === 'VIT') p.hp = Math.min(maxHp(p), p.hp + 5);
  }
  if (gained > 0) {
    emit(ev, 'reward', 'STAT INCREASED', [`${STAT_META[stat].name} +${gained}  →  ${p.stats[stat]}`], true);
    log(s, `${stat} increased to ${p.stats[stat]}.`, 'reward');
  }
}

export function grantGold(s: GameState, amount: number): number {
  const g = Math.round(amount * (1 + pct(s.player.stats.SEN)));
  s.player.gold += g;
  s.counters.goldEarned += g;
  return g;
}

export function grantXp(s: GameState, ev: GameEvent[], amount: number, source: Source, stat?: StatKey): number {
  const p = s.player;
  let mult = 1;
  if (source === 'workout') mult += pct(p.stats.STR);
  if (source === 'cardio') mult += pct(p.stats.AGI);
  if (source === 'dungeon') mult += pct(p.stats.INT);
  if (s.xpBoostUntil > Date.now() && source !== 'achievement') mult *= 2;
  if (isPenaltyActive(s) && source !== 'penalty' && source !== 'achievement') mult *= 0.5;
  const xp = Math.max(0, Math.round(amount * mult));
  if (xp <= 0) return 0;

  p.xp += xp;
  p.totalXp += xp;
  if (stat) addStatXp(s, ev, stat, xp);

  const startLevel = p.level;
  const startRank = rankForLevel(startLevel).rank;
  while (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level += 1;
    p.freePoints += 3;
  }
  if (p.level > startLevel) {
    p.hp = maxHp(p);
    const gainedLv = p.level - startLevel;
    emit(ev, 'levelup', 'LEVEL UP!', ['You have grown stronger.', `Lv. ${startLevel}  →  Lv. ${p.level}`, `+${gainedLv * 3} ability points · HP restored`]);
    log(s, `Level up! You are now level ${p.level}.`, 'levelup');
    const nr = rankForLevel(p.level);
    if (nr.rank !== startRank) {
      emit(ev, 'rankup', 'RANK UP', [`You have been reassessed as`, `${nr.rank}-RANK`, nr.title]);
      log(s, `Rank reassessed: ${nr.rank}-Rank.`, 'rankup');
    }
  }

  if (source !== 'boss' && source !== 'achievement') damageBoss(s, ev, xp);
  return xp;
}

function damageBoss(s: GameState, ev: GameEvent[], dmg: number) {
  const b = s.boss;
  if (b.defeated || b.weekId !== weekId(todayKey())) return;
  b.hp = Math.max(0, b.hp - dmg);
  if (b.hp <= 0) {
    b.defeated = true;
    const lvl = s.player.level;
    s.counters.bossesDefeated += 1;
    const items: ItemId[] = ['hp_potion', 'streak_shield', 'xp_elixir', 'penalty_pass'];
    const drop = items[Math.floor(Math.random() * items.length)];
    s.inventory[drop] = (s.inventory[drop] ?? 0) + 1;
    const gold = grantGold(s, 300 + lvl * 30);
    const def = BOSSES.find((x) => x.id === b.bossId);
    const xp = grantXp(s, ev, 500 + lvl * 50, 'boss');
    emit(ev, 'boss', 'BOSS DEFEATED', [`${def?.name ?? 'Boss'}, ${def?.epithet ?? ''}`, `+${xp} XP   +${gold} Gold`, `Loot: ${ITEM_MAP[drop].name}`]);
    log(s, `Weekly boss ${def?.name} defeated!`, 'boss');
  }
}

export function checkAchievements(s: GameState, ev: GameEvent[]) {
  for (let guard = 0; guard < 5; guard++) {
    let found = false;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      if (!a.check(s)) continue;
      s.achievements[a.id] = Date.now();
      found = true;
      const lines = [a.name, a.desc];
      const rewards: string[] = [];
      if (a.xp) rewards.push(`+${grantXp(s, ev, a.xp, 'achievement')} XP`);
      if (a.gold) rewards.push(`+${grantGold(s, a.gold)} Gold`);
      if (rewards.length) lines.push(rewards.join('   '));
      if (a.title) lines.push(`Title unlocked: “${a.title}”`);
      emit(ev, 'achievement', 'ACHIEVEMENT', lines);
      log(s, `Achievement unlocked: ${a.name}.`, 'achievement');
    }
    if (!found) break;
  }
}

/* ------------------------------------------------------------------ */
/* Day rollover                                                        */
/* ------------------------------------------------------------------ */

function applyPenalty(s: GameState, ev: GameEvent[], day: string) {
  const p = s.player;
  const d = s.settings.difficulty;
  const prev = isPenaltyActive(s);
  const dmg = Math.round(maxHp(p) * DIFFICULTY_META[d].hpLoss * (prev ? 1.4 : 1));
  p.hp -= dmg;
  s.counters.penaltiesTaken += 1;
  s.counters.dailyStreak = 0;
  const tasks = PENALTY_TASKS[d].map((t) => {
    const ex = EXERCISE_MAP[t.exerciseId];
    return { id: uid('p'), exerciseId: t.exerciseId, label: ex.name, unit: ex.unit, target: t.target, progress: 0 };
  });
  s.penalty = { date: todayKey(), reason: `Daily Quest failed (${day})`, tasks };
  emit(ev, 'penalty', 'PENALTY', [
    'You failed to complete the Daily Quest.',
    `HP −${dmg}`,
    prev ? 'The previous penalty was never cleared. Damage increased.' : 'A Penalty Quest has been issued.',
    'XP gain is halved until it is cleared.',
  ]);
  log(s, `Penalty: Daily Quest failed (${day}). HP −${dmg}.`, 'penalty');
  if (p.hp <= 0) {
    const lost = Math.floor(p.xp / 2);
    p.xp -= lost;
    p.hp = Math.round(maxHp(p) * 0.3);
    emit(ev, 'penalty', 'YOU HAVE FALLEN', ['HP reached zero.', `Lost ${lost} XP from your current level.`, 'Rise again, Player.']);
    log(s, `HP depleted. Lost ${lost} XP.`, 'penalty');
  }
}

export function rollover(s: GameState, ev: GameEvent[], now = new Date()): boolean {
  const t = todayKey();
  let changed = false;

  // finish timed dungeon even if day did not change
  if (s.dungeon && Date.now() >= s.dungeon.endsAt) {
    completeDungeon(s, ev);
    changed = true;
  }
  if (s.xpBoostUntil && s.xpBoostUntil < Date.now()) {
    s.xpBoostUntil = 0;
    changed = true;
  }

  if (s.lastDate !== t && diffDays(s.lastDate, t) > 0) {
    changed = true;
    const missedDays = diffDays(s.lastDate, t);
    // 1) Daily quest of the last active day + any fully-missed days in between
    let penalties = 0;
    for (let i = 0; i < missedDays; i++) {
      const day = addDays(s.lastDate, i);
      const completed = s.daily.date === day && s.daily.completed;
      if (!completed && s.onboarded && penalties < 3) {
        applyPenalty(s, ev, day);
        penalties++;
      }
    }

    // 2) Habits: every day from max(start, lastDate) .. yesterday must be checked
    for (const h of s.habits) {
      if (h.status !== 'active') continue;
      let from = h.startDate > s.lastDate ? h.startDate : s.lastDate;
      const yesterday = addDays(t, -1);
      while (from <= yesterday) {
        if (!h.checks.includes(from)) {
          if ((s.inventory.streak_shield ?? 0) > 0 && h.checks.length > 0) {
            s.inventory.streak_shield -= 1;
            h.checks.push(from);
            h.shielded.push(from);
            emit(ev, 'info', 'STREAK SHIELD', [`“${h.name}” was protected.`, `Day ${from} saved. Shields left: ${s.inventory.streak_shield}`]);
            log(s, `Streak Shield protected “${h.name}”.`, 'info');
          } else {
            const reached = h.checks.length;
            h.attempts += 1;
            h.startDate = t;
            h.checks = [];
            h.shielded = [];
            if (reached > 0) {
              emit(ev, 'warning', 'STREAK BROKEN', [`“${h.name}” reset to Day 1.`, `You reached ${reached} / ${HABIT_DAYS} days.`, 'The challenge begins again today.']);
              log(s, `Habit “${h.name}” streak broken at ${reached} days.`, 'warning');
            } else {
              h.attempts -= 1; // never started; just move the start date
            }
            break;
          }
        }
        from = addDays(from, 1);
      }
    }

    // 3) Drop finished one-time quests
    s.customQuests = s.customQuests.filter((q) => !(q.repeat === 'once' && q.doneDate && q.doneDate < t));

    // 4) New daily quest
    s.daily = { date: t, tasks: makeTasks(s.settings.dailyExercises, s.settings.difficulty, s.player.level), completed: false };
    if (s.onboarded) {
      emit(ev, 'info', 'DAILY QUEST', ['The Daily Quest has arrived.', ...s.daily.tasks.map((x) => `· ${x.label}  ${x.target} ${x.unit}`), 'Failure will result in a penalty.'], false);
    }
    s.lastDate = t;
  }

  // 5) Weekly boss
  const wk = weekId(t);
  if (s.boss.weekId !== wk) {
    changed = true;
    const old = BOSSES.find((b) => b.id === s.boss.bossId);
    if (!s.boss.defeated && s.onboarded) {
      emit(ev, 'warning', 'BOSS ESCAPED', [`${old?.name ?? 'The boss'} retreated into the gate.`, 'A new boss has appeared.'], true);
      log(s, `${old?.name} escaped.`, 'warning');
    }
    const nb = pickBoss(wk);
    const hp = bossMaxHp(s.player.level);
    s.boss = { weekId: wk, bossId: nb.id, maxHp: hp, hp, defeated: false };
    log(s, `New weekly boss: ${nb.name}, ${nb.epithet}.`, 'boss');
  }
  void now;
  return changed;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function sourceFor(exerciseId: string): Source {
  const c = EXERCISE_MAP[exerciseId]?.category;
  if (c === 'cardio') return 'cardio';
  if (c === 'mind') return 'mind';
  return 'workout';
}

export function logWorkout(s: GameState, ev: GameEvent[], exerciseId: string, amount: number) {
  const ex = EXERCISE_MAP[exerciseId];
  if (!ex || !(amount > 0)) return;
  const t = todayKey();
  const xp = grantXp(s, ev, amount * ex.xpPer, sourceFor(exerciseId), ex.stat);
  s.workouts.unshift({ id: uid('w'), ts: Date.now(), date: t, exerciseId, amount, xp });
  if (s.workouts.length > MAX_WORKOUTS) s.workouts.length = MAX_WORKOUTS;
  s.counters.totals[exerciseId] = Math.round(((s.counters.totals[exerciseId] ?? 0) + amount) * 100) / 100;
  emit(ev, 'reward', `${ex.name.toUpperCase()} +${amount}${ex.unitShort ? ' ' + ex.unit : ''}`, [`+${xp} XP · ${ex.stat}`], true);

  // daily quest progress
  if (s.daily.date === t && !s.daily.completed) {
    for (const task of s.daily.tasks) if (task.exerciseId === exerciseId) task.progress = round2(task.progress + amount);
    if (s.daily.tasks.every((x) => x.progress >= x.target)) completeDaily(s, ev);
  }
  // penalty progress
  if (s.penalty && isPenaltyActive(s)) {
    for (const task of s.penalty.tasks) if (task.exerciseId === exerciseId) task.progress = round2(task.progress + amount);
    if (!isPenaltyActive(s)) clearPenalty(s, ev, false);
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function deleteWorkout(s: GameState, id: string) {
  const i = s.workouts.findIndex((w) => w.id === id);
  if (i < 0) return;
  const w = s.workouts[i];
  s.workouts.splice(i, 1);
  s.player.xp = Math.max(0, s.player.xp - w.xp);
  s.player.totalXp = Math.max(0, s.player.totalXp - w.xp);
  s.counters.totals[w.exerciseId] = Math.max(0, round2((s.counters.totals[w.exerciseId] ?? 0) - w.amount));
  if (w.date === s.daily.date && !s.daily.completed) {
    for (const task of s.daily.tasks) if (task.exerciseId === w.exerciseId) task.progress = Math.max(0, round2(task.progress - w.amount));
  }
  if (s.penalty && w.date === s.penalty.date) {
    for (const task of s.penalty.tasks) if (task.exerciseId === w.exerciseId) task.progress = Math.max(0, round2(task.progress - w.amount));
  }
}

function completeDaily(s: GameState, ev: GameEvent[]) {
  s.daily.completed = true;
  const r = dailyRewards(s.player.level);
  s.counters.dailyCompleted += 1;
  s.counters.dailyStreak += 1;
  s.counters.bestDailyStreak = Math.max(s.counters.bestDailyStreak, s.counters.dailyStreak);
  const xp = grantXp(s, ev, r.xp, 'daily');
  const gold = grantGold(s, r.gold);
  s.player.freePoints += 1;
  s.player.hp = maxHp(s.player);
  emit(ev, 'reward', 'DAILY QUEST COMPLETE', [
    `+${xp} XP   +${gold} Gold`,
    '+1 ability point',
    'Status recovered: HP full',
    `Daily streak: ${s.counters.dailyStreak} day${s.counters.dailyStreak === 1 ? '' : 's'}`,
  ]);
  log(s, `Daily Quest cleared. Streak ${s.counters.dailyStreak}.`, 'reward');
}

function clearPenalty(s: GameState, ev: GameEvent[], usedPass: boolean) {
  s.penalty = null;
  s.counters.penaltiesCleared += usedPass ? 0 : 1;
  emit(ev, 'reward', 'PENALTY CLEARED', [usedPass ? 'Penalty Pass consumed.' : 'You survived the Penalty Zone.', 'XP gain restored to normal.']);
  log(s, usedPass ? 'Penalty skipped with a Penalty Pass.' : 'Penalty Quest cleared.', 'reward');
  if (!usedPass) {
    grantXp(s, ev, 40, 'penalty');
  }
}

/* ---- custom quests ---- */

export function addQuest(s: GameState, q: Omit<CustomQuest, 'id' | 'completedCount' | 'createdAt'>) {
  s.customQuests.push({ ...q, id: uid('q'), completedCount: 0, createdAt: new Date().toISOString() });
}

export function updateQuest(s: GameState, id: string, patch: Partial<CustomQuest>) {
  const q = s.customQuests.find((x) => x.id === id);
  if (q) Object.assign(q, patch);
}

export function deleteQuest(s: GameState, id: string) {
  s.customQuests = s.customQuests.filter((q) => q.id !== id);
}

export function completeQuest(s: GameState, ev: GameEvent[], id: string) {
  const q = s.customQuests.find((x) => x.id === id);
  const t = todayKey();
  if (!q || q.doneDate === t) return;
  const r = questReward(q, s.player.level);
  q.doneDate = t;
  q.completedCount += 1;
  s.counters.questsCompleted += 1;
  const xp = grantXp(s, ev, r.xp, 'quest', q.stat);
  const gold = grantGold(s, r.gold);
  emit(ev, 'reward', 'QUEST COMPLETE', [q.title, `+${xp} XP  +${gold} G`], true);
  log(s, `Quest complete: ${q.title}.`, 'reward');
}

export function undoQuest(s: GameState, id: string) {
  const q = s.customQuests.find((x) => x.id === id);
  const t = todayKey();
  if (!q || q.doneDate !== t) return;
  const r = questReward(q, s.player.level);
  q.doneDate = undefined;
  q.completedCount = Math.max(0, q.completedCount - 1);
  s.counters.questsCompleted = Math.max(0, s.counters.questsCompleted - 1);
  s.player.xp = Math.max(0, s.player.xp - r.xp);
  s.player.totalXp = Math.max(0, s.player.totalXp - r.xp);
  s.player.gold = Math.max(0, s.player.gold - r.gold);
}

/* ---- habits ---- */

export function addHabit(s: GameState, h: Pick<Habit, 'name' | 'icon' | 'stat' | 'kind'>) {
  const t = todayKey();
  s.habits.push({ ...h, id: uid('h'), startDate: t, checks: [], shielded: [], bestStreak: 0, attempts: 1, forgedCount: 0, status: 'active', createdAt: new Date().toISOString() });
}

export function deleteHabit(s: GameState, id: string) {
  s.habits = s.habits.filter((h) => h.id !== id);
}

export function habitStreak(h: Habit) {
  return h.checks.length;
}

export function habitDay(h: Habit, t = todayKey()) {
  return Math.min(HABIT_DAYS, diffDays(h.startDate, t) + 1);
}

export function checkHabit(s: GameState, ev: GameEvent[], id: string) {
  const h = s.habits.find((x) => x.id === id);
  const t = todayKey();
  if (!h || h.status !== 'active' || h.checks.includes(t)) return;
  h.checks.push(t);
  const streak = h.checks.length;
  h.bestStreak = Math.max(h.bestStreak, streak);
  s.counters.bestHabitStreak = Math.max(s.counters.bestHabitStreak, streak);
  const r = habitReward(streak);
  const xp = grantXp(s, ev, r.xp, 'habit', h.stat);
  const gold = grantGold(s, r.gold);
  if (streak >= HABIT_DAYS) {
    h.status = 'forged';
    h.forgedCount += 1;
    s.counters.habitsForged += 1;
    const bx = grantXp(s, ev, 660, 'habit', h.stat);
    const bg = grantGold(s, 500);
    emit(ev, 'achievement', 'HABIT FORGED', [`“${h.name}”`, `${HABIT_DAYS} days without breaking.`, `+${bx + xp} XP   +${bg + gold} Gold`, 'This habit is now part of who you are.']);
    log(s, `Habit forged: ${h.name}!`, 'achievement');
  } else {
    const milestone = [7, 14, 21, 30, 45, 60].includes(streak);
    emit(ev, 'reward', milestone ? `DAY ${streak} MILESTONE` : `DAY ${streak} / ${HABIT_DAYS}`, [h.name, `+${xp} XP  +${gold} G`], !milestone);
  }
}

export function uncheckHabit(s: GameState, id: string) {
  const h = s.habits.find((x) => x.id === id);
  const t = todayKey();
  if (!h || h.status !== 'active' || !h.checks.includes(t)) return;
  const r = habitReward(h.checks.length);
  h.checks = h.checks.filter((d) => d !== t);
  s.player.xp = Math.max(0, s.player.xp - r.xp);
  s.player.totalXp = Math.max(0, s.player.totalXp - r.xp);
  s.player.gold = Math.max(0, s.player.gold - r.gold);
}

export function restartHabit(s: GameState, id: string) {
  const h = s.habits.find((x) => x.id === id);
  if (!h) return;
  h.status = 'active';
  h.startDate = todayKey();
  h.checks = [];
  h.shielded = [];
  h.attempts += 1;
}

/* ---- dungeon ---- */

export function startDungeon(s: GameState, rank: Rank, label: string) {
  if (s.dungeon) return;
  const tier = DUNGEON_MAP[rank];
  const now = Date.now();
  s.dungeon = { rank, label: label || tier.name, startedAt: now, endsAt: now + tier.minutes * 60000, backgroundedAt: null };
}

export function completeDungeon(s: GameState, ev: GameEvent[]) {
  const d = s.dungeon;
  if (!d) return;
  const tier = DUNGEON_MAP[d.rank];
  s.dungeon = null;
  s.counters.dungeonsCleared += 1;
  s.counters.focusMinutes += tier.minutes;
  if (d.rank === 'S') s.counters.sRankClears += 1;
  const xp = grantXp(s, ev, tier.xp * (1 + (s.player.level - 1) * 0.02), 'dungeon', 'INT');
  const gold = grantGold(s, tier.gold);
  s.dungeonHistory.unshift({ ts: Date.now(), rank: d.rank, label: d.label, minutes: tier.minutes, result: 'clear' });
  if (s.dungeonHistory.length > 50) s.dungeonHistory.length = 50;
  emit(ev, 'reward', 'DUNGEON CLEARED', [`${d.rank}-Rank · ${d.label}`, `${tier.minutes} minutes of focus`, `+${xp} XP   +${gold} Gold`]);
  log(s, `${d.rank}-Rank dungeon cleared (${tier.minutes} min).`, 'reward');
}

export function failDungeon(s: GameState, ev: GameEvent[], reason: string) {
  const d = s.dungeon;
  if (!d) return;
  const tier = DUNGEON_MAP[d.rank];
  s.dungeon = null;
  s.counters.dungeonsFailed += 1;
  const dmg = Math.round(maxHp(s.player) * 0.1);
  s.player.hp = Math.max(1, s.player.hp - dmg);
  const mins = Math.floor((Date.now() - d.startedAt) / 60000);
  s.dungeonHistory.unshift({ ts: Date.now(), rank: d.rank, label: d.label, minutes: mins, result: 'fail' });
  if (s.dungeonHistory.length > 50) s.dungeonHistory.length = 50;
  emit(ev, 'penalty', 'DUNGEON COLLAPSED', [reason, `${d.rank}-Rank · ${tier.name}`, `HP −${dmg}`]);
  log(s, `Dungeon failed: ${reason}`, 'penalty');
}

/** Returns true if state changed */
export function dungeonAppState(s: GameState, ev: GameEvent[], appState: 'active' | 'background' | 'inactive'): boolean {
  const d = s.dungeon;
  if (!d || !s.settings.strictDungeon) return false;
  if (appState === 'background') {
    if (!d.backgroundedAt) {
      d.backgroundedAt = Date.now();
      return true;
    }
    return false;
  }
  if (appState === 'active' && d.backgroundedAt) {
    const away = (Date.now() - d.backgroundedAt) / 1000;
    const endedWhileAway = d.endsAt <= d.backgroundedAt + DUNGEON_GRACE_SEC * 1000;
    d.backgroundedAt = null;
    if (away > DUNGEON_GRACE_SEC && !endedWhileAway) {
      failDungeon(s, ev, `You left the dungeon for ${Math.round(away)}s.`);
    }
    return true;
  }
  return false;
}

/* ---- shop & items ---- */

export function buyItem(s: GameState, ev: GameEvent[], id: ItemId): boolean {
  const item = ITEMS.find((i) => i.id === id);
  if (!item || s.player.gold < item.cost) return false;
  s.player.gold -= item.cost;
  s.counters.goldSpent += item.cost;
  s.counters.purchases += 1;
  s.inventory[id] = (s.inventory[id] ?? 0) + 1;
  emit(ev, 'reward', 'ITEM ACQUIRED', [item.name, `−${item.cost} Gold`], true);
  return true;
}

export function consumeItem(s: GameState, ev: GameEvent[], id: ItemId): boolean {
  if ((s.inventory[id] ?? 0) <= 0) return false;
  const p = s.player;
  if (id === 'hp_potion') {
    if (p.hp >= maxHp(p)) return false;
    p.hp = Math.min(maxHp(p), p.hp + Math.round(maxHp(p) * 0.5));
    emit(ev, 'reward', 'HP RESTORED', [`HP ${p.hp} / ${maxHp(p)}`], true);
  } else if (id === 'xp_elixir') {
    s.xpBoostUntil = Math.max(Date.now(), s.xpBoostUntil) + 60 * 60000;
    emit(ev, 'reward', 'XP ×2 ACTIVE', ['All XP doubled for 60 minutes.']);
  } else if (id === 'penalty_pass') {
    if (!isPenaltyActive(s)) return false;
    clearPenalty(s, ev, true);
  } else {
    return false; // streak shield is passive
  }
  s.inventory[id] -= 1;
  return true;
}

export function addReward(s: GameState, r: Omit<CustomReward, 'id'>) {
  s.rewards.push({ ...r, id: uid('r') });
}

export function deleteReward(s: GameState, id: string) {
  s.rewards = s.rewards.filter((r) => r.id !== id);
}

export function redeemReward(s: GameState, ev: GameEvent[], id: string): boolean {
  const r = s.rewards.find((x) => x.id === id);
  if (!r || s.player.gold < r.cost) return false;
  s.player.gold -= r.cost;
  s.counters.goldSpent += r.cost;
  s.counters.purchases += 1;
  s.purchases.unshift({ id: uid('pu'), ts: Date.now(), name: r.name, cost: r.cost });
  if (s.purchases.length > 50) s.purchases.length = 50;
  emit(ev, 'reward', 'REWARD REDEEMED', [r.name, `−${r.cost} Gold`, 'Enjoy it. You earned it.']);
  log(s, `Redeemed reward: ${r.name}.`, 'reward');
  return true;
}

/* ---- stats / profile ---- */

export function allocatePoint(s: GameState, stat: StatKey) {
  const p = s.player;
  if (p.freePoints <= 0) return;
  p.freePoints -= 1;
  p.stats[stat] += 1;
  if (stat === 'VIT') p.hp = Math.min(maxHp(p), p.hp + 5);
}

export function applySettings(s: GameState, patch: Partial<Settings>) {
  const before = s.settings;
  s.settings = { ...before, ...patch };
  const changedDaily =
    patch.difficulty !== undefined && patch.difficulty !== before.difficulty ||
    (patch.dailyExercises !== undefined && patch.dailyExercises.join() !== before.dailyExercises.join());
  if (changedDaily && !s.daily.completed) {
    const old = s.daily.tasks;
    s.daily.tasks = makeTasks(s.settings.dailyExercises, s.settings.difficulty, s.player.level).map((t) => {
      const prev = old.find((o) => o.exerciseId === t.exerciseId);
      return prev ? { ...t, progress: prev.progress } : t;
    });
  }
}

export function addBot(s: GameState, bot: Bot) {
  if (s.bots.find((b) => b.id === bot.id)) return;
  s.bots.push(bot);
  log(s, `${bot.name} joined your guild.`, 'info');
}

export function removeBot(s: GameState, id: string) {
  s.bots = s.bots.filter((b) => b.id !== id);
}
