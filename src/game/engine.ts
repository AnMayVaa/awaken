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
import { AREA_IDS, AREA_MAP } from './areas';
import { CAMPAIGN_MAP } from './campaigns';
import { adapt, boardQuestFrom, DAILY_REROLLS, defaultAreas, defaultProfile, generateBoard, MAX_BOARD, metricMet, pickForArea, sideReward } from './director';
import { QUEST_MAP } from './questLibrary';
import { comboMult, crateDay, CRATE_DAYS, critChance, dailyBuff, dropChance, rollDrop, URGENT_MINUTES, URGENT_POOL, weeklyChallenges, weeklyReward } from './fun';
import { bestDays, cleanDays, cleanMs, DAY_MS, milestoneReward, RECOVERY_MAP, RECOVERY_MILESTONES } from './recovery';
import type {
  AreaId,
  BoardQuest,
  DailyCheckin,
  DayActivity,
  LifeProfile,
  MainQuest,
  RecoveryTrack,
  WeeklyReview,
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

export const STATE_VERSION = 2;
const MAX_LOGS = 60;
const MAX_WORKOUTS = 400;

type Source = 'workout' | 'cardio' | 'mind' | 'dungeon' | 'quest' | 'daily' | 'habit' | 'penalty' | 'boss' | 'achievement' | 'life';

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
  const map: Record<StatKey, string> = { STR: 'Vanguard', AGI: 'Striker', VIT: 'Guardian', INT: 'Sage', SEN: 'Seer', CHA: 'Diplomat', WIL: 'Ascetic' };
  return map[entries[0][0]];
}

export function combatPower(p: Player): number {
  const s = p.stats;
  return Math.round((s.STR * 3 + s.AGI * 3 + s.VIT * 2.5 + s.INT * 2.5 + s.SEN * 2 + (s.CHA ?? 5) * 2 + (s.WIL ?? 5) * 2.5) * (1 + p.level * 0.08) * 10);
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
    stats: { STR: 5, AGI: 5, VIT: 5, INT: 5, SEN: 5, CHA: 5, WIL: 5 },
    statXp: { STR: 0, AGI: 0, VIT: 0, INT: 0, SEN: 0, CHA: 0, WIL: 0 },
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
    inventory: { hp_potion: 1, streak_shield: 1, penalty_pass: 0, xp_elixir: 0, reroll_token: 1, lucky_charm: 0 },
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
      sideQuests: 0,
      urgesResisted: 0,
      mainQuestsDone: 0,
      milestonesDone: 0,
      checkins: 0,
      reviews: 0,
      bestRecoveryDays: 0,
      crits: 0,
      drops: 0,
      urgentDone: 0,
      weeklyDone: 0,
      bestCombo: 0,
    },
    xpBoostUntil: 0,
    lastDate: t,
    updatedAt: Date.now(),
    syncedUserId: null,
    profile: defaultProfile(),
    areas: defaultAreas(START_TIER[st.difficulty]),
    board: { date: t, quests: [], rerolls: DAILY_REROLLS },
    questHistory: [],
    mainQuests: [],
    recovery: [],
    checkins: {},
    wellbeing: [],
    wheel: [],
    reviews: [],
    activity: {},
    fun: defaultFun(),
  };
}

export function defaultFun(): GameState['fun'] {
  return {
    crate: { lastClaim: null, streak: 0 },
    combo: { date: '', count: 0 },
    urgent: { date: null, quest: null },
    weeklyClaims: { week: '', claimed: [] },
    companion: { name: '', species: null },
    luckyUntil: 0,
  };
}

const START_TIER: Record<Difficulty, number> = { easy: 1.2, normal: 1.6, hard: 2.3 };

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
    profile: { ...base.profile, ...raw.profile },
    areas: Object.fromEntries(AREA_IDS.map((a) => [a, { ...base.areas[a], ...(raw.areas?.[a] ?? {}) }])) as GameState['areas'],
    board: raw.board ?? base.board,
    questHistory: raw.questHistory ?? [],
    mainQuests: raw.mainQuests ?? [],
    recovery: raw.recovery ?? [],
    checkins: raw.checkins ?? {},
    wellbeing: raw.wellbeing ?? [],
    wheel: raw.wheel ?? [],
    reviews: raw.reviews ?? [],
    activity: raw.activity ?? {},
    fun: { ...defaultFun(), ...raw.fun, companion: { ...defaultFun().companion, ...raw.fun?.companion } },
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
  if (source === 'quest' && (stat === 'CHA' || stat === 'WIL')) mult += pct(p.stats[stat] ?? 0);
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
    // 5) Side quests: expire yesterday's open ones, then build today's board
    expireBoard(s);
    s.lastDate = t;
  }

  if (s.onboarded && s.board.date !== t) {
    expireBoard(s);
    s.board = { date: t, quests: generateBoard(s, t), rerolls: DAILY_REROLLS };
    changed = true;
  } else if (s.onboarded && s.board.quests.length === 0) {
    s.board.quests = generateBoard(s, t);
    changed = true;
  }

  // Recovery milestones + auto-verified quests
  if (checkRecovery(s, ev)) changed = true;
  if (rollUrgent(s, ev)) changed = true;
  if (evaluateMetrics(s, ev)) changed = true;
  pruneDayMaps(s);

  // 6) Weekly boss
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
  evaluateMetrics(s, ev);
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
  day(s).daily = true;
  bumpCombo(s);
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
  const fx = questFx(s, null, true);
  const xp = grantXp(s, ev, r.xp * fx.mult, 'quest', q.stat);
  const gold = grantGold(s, r.gold);
  emit(ev, fx.crit ? 'achievement' : 'reward', fx.crit ? 'CRITICAL CLEAR!' : 'QUEST COMPLETE', [q.title, `+${xp} XP  +${gold} G${fx.tags.length ? ' · ' + fx.tags.join(' · ') : ''}`], true);
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
  day(s).habits = (day(s).habits ?? 0) + 1;
  bumpCombo(s);
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
  day(s).focusMin = (day(s).focusMin ?? 0) + tier.minutes;
  s.counters.focusMinutes += tier.minutes;
  if (d.rank === 'S') s.counters.sRankClears += 1;
  const xp = grantXp(s, ev, tier.xp * (1 + (s.player.level - 1) * 0.02), 'dungeon', 'INT');
  const gold = grantGold(s, tier.gold);
  s.dungeonHistory.unshift({ ts: Date.now(), rank: d.rank, label: d.label, minutes: tier.minutes, result: 'clear' });
  if (s.dungeonHistory.length > 50) s.dungeonHistory.length = 50;
  emit(ev, 'reward', 'DUNGEON CLEARED', [`${d.rank}-Rank · ${d.label}`, `${tier.minutes} minutes of focus`, `+${xp} XP   +${gold} Gold`]);
  log(s, `${d.rank}-Rank dungeon cleared (${tier.minutes} min).`, 'reward');
  evaluateMetrics(s, ev);
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
  } else if (id === 'reroll_token') {
    s.board.rerolls += 1;
    emit(ev, 'reward', 'REROLL +1', [`Rerolls left today: ${s.board.rerolls}`], true);
  } else if (id === 'lucky_charm') {
    s.fun.luckyUntil = Math.max(Date.now(), s.fun.luckyUntil) + 24 * 3600000;
    emit(ev, 'reward', 'LUCK UP', ['Critical hits and loot drops boosted for 24 hours.']);
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

/* ================================================================== */
/* v2 — life areas, side quests, main quests, recovery, fulfilment     */
/* ================================================================== */

const MAX_HISTORY = 400;

export function day(s: GameState, date = todayKey()): DayActivity {
  if (!s.activity[date]) s.activity[date] = {};
  return s.activity[date];
}

function pruneDayMaps(s: GameState) {
  const keep = addDays(todayKey(), -180);
  for (const k of Object.keys(s.activity)) if (k < keep) delete s.activity[k];
  for (const k of Object.keys(s.checkins)) if (k < keep) delete s.checkins[k];
}

function pushHistory(s: GameState, q: BoardQuest, status: 'done' | 'skipped' | 'expired', date: string) {
  s.questHistory.unshift({ ts: Date.now(), date, templateId: q.templateId, title: q.title, area: q.area, tier: q.tier, status, source: q.source, note: q.note });
  if (s.questHistory.length > MAX_HISTORY) s.questHistory.length = MAX_HISTORY;
}

function expireBoard(s: GameState) {
  const t = todayKey();
  if (s.board.date >= t) return;
  for (const q of s.board.quests) {
    if (q.status !== 'open') continue;
    pushHistory(s, q, 'expired', s.board.date);
    adapt(s.areas[q.area], 'expired', q.tier);
  }
  s.board = { date: t, quests: [], rerolls: DAILY_REROLLS };
}

/* ---- side quests ---- */

export function completeSide(s: GameState, ev: GameEvent[], id: string, note?: string, auto = false) {
  const q = s.board.quests.find((x) => x.id === id);
  if (!q || q.status !== 'open') return;
  q.status = 'done';
  q.doneAt = Date.now();
  q.auto = auto;
  if (note?.trim()) q.note = note.trim().slice(0, 280);
  const r = sideReward(q.tier, s.player.level);
  const bonus = q.note ? 1.1 : 1;
  const fx = questFx(s, q.area, true);
  const xp = grantXp(s, ev, r.xp * bonus * fx.mult, 'quest', q.stat);
  const gold = grantGold(s, r.gold);
  s.counters.sideQuests += 1;
  adapt(s.areas[q.area], 'done', q.tier);
  pushHistory(s, q, 'done', s.board.date);
  const d = day(s);
  d.side = (d.side ?? 0) + 1;
  emit(ev, fx.crit ? 'achievement' : 'reward', fx.crit ? 'CRITICAL CLEAR!' : auto ? 'QUEST AUTO-VERIFIED' : 'SIDE QUEST CLEAR', [q.title, `+${xp} XP  +${gold} G${fx.tags.length ? ' · ' + fx.tags.join(' · ') : ''}`], true);
  rollLoot(s, ev);
}

/* ---- gimmicks: buff, combo, crit, loot ---- */

function questFx(s: GameState, area: AreaId | null, canCrit: boolean) {
  const t = todayKey();
  const tags: string[] = [];
  let mult = 1;
  if (area) {
    const buff = dailyBuff(t, s.player.createdAt);
    if (buff.area === area) {
      mult *= buff.mult;
      tags.push('BUFF ×1.25');
    }
  }
  const c = bumpCombo(s);
  if (c > 1) {
    mult *= comboMult(c);
    tags.push(`COMBO ×${c}`);
  }
  const crit = canCrit && Math.random() < critChance(s);
  if (crit) {
    mult *= 2;
    s.counters.crits += 1;
    tags.unshift('CRIT ×2');
  }
  return { mult, tags, crit };
}

function bumpCombo(s: GameState) {
  const t = todayKey();
  if (s.fun.combo.date !== t) s.fun.combo = { date: t, count: 0 };
  s.fun.combo.count += 1;
  s.counters.bestCombo = Math.max(s.counters.bestCombo, s.fun.combo.count);
  return s.fun.combo.count;
}

function rollLoot(s: GameState, ev: GameEvent[]) {
  if (Math.random() >= dropChance(s)) return;
  const d = rollDrop(Math.random());
  s.counters.drops += 1;
  if (d.item) {
    s.inventory[d.item] = (s.inventory[d.item] ?? 0) + 1;
    emit(ev, 'achievement', 'LOOT DROP!', [ITEM_MAP[d.item].name, ITEM_MAP[d.item].desc], true);
  } else if (d.gold) {
    const g = grantGold(s, d.gold);
    emit(ev, 'achievement', 'LOOT DROP!', [`Pouch of gold · +${g} G`], true);
  }
}

/* ---- daily supply crate ---- */

export function claimCrate(s: GameState, ev: GameEvent[]): boolean {
  const t = todayKey();
  const c = crateDay(s, t);
  if (c.claimed) return false;
  s.fun.crate = { lastClaim: t, streak: c.streak };
  const r = CRATE_DAYS[c.day - 1];
  const lines: string[] = [`Day ${c.day} of 7 · login streak ${c.streak}`];
  if (r.xp) lines.push(`+${grantXp(s, ev, r.xp, 'life')} XP`);
  if (r.gold) lines.push(`+${grantGold(s, r.gold)} Gold`);
  if (r.item) {
    s.inventory[r.item] = (s.inventory[r.item] ?? 0) + 1;
    lines.push(ITEM_MAP[r.item].name);
  }
  if (r.rare) {
    const rare: ItemId[] = ['streak_shield', 'xp_elixir', 'lucky_charm', 'penalty_pass'];
    const it = rare[Math.floor(Math.random() * rare.length)];
    s.inventory[it] = (s.inventory[it] ?? 0) + 1;
    lines.push(`Rare: ${ITEM_MAP[it].name}`);
  }
  emit(ev, 'reward', r.rare ? 'RARE SUPPLY CRATE' : 'SUPPLY CRATE', lines);
  return true;
}

/* ---- urgent quests ---- */

function rollUrgent(s: GameState, ev: GameEvent[]): boolean {
  const t = todayKey();
  let changed = false;
  const u = s.fun.urgent.quest;
  if (u && u.status === 'open' && Date.now() > u.expiresAt) {
    u.status = 'expired';
    emit(ev, 'info', 'URGENT QUEST EXPIRED', ['No penalty. Another may appear tomorrow.'], true);
    changed = true;
  }
  const h = new Date().getHours();
  if (!s.onboarded || s.fun.urgent.date === t || h < 9 || h >= 21) return changed;
  s.fun.urgent.date = t;
  if (Math.random() < 0.5) {
    const pick = URGENT_POOL[Math.floor(Math.random() * URGENT_POOL.length)];
    s.fun.urgent.quest = { id: uid('uq'), ...pick, expiresAt: Date.now() + URGENT_MINUTES * 60000, status: 'open' };
    emit(ev, 'warning', 'URGENT QUEST', [pick.title, pick.criteria, `Time limit: ${URGENT_MINUTES} minutes`, 'Reward: bonus XP + gold. No penalty if you skip it.']);
  }
  return true;
}

export function completeUrgent(s: GameState, ev: GameEvent[]) {
  const u = s.fun.urgent.quest;
  if (!u || u.status !== 'open') return;
  if (Date.now() > u.expiresAt) {
    u.status = 'expired';
    return;
  }
  u.status = 'done';
  s.counters.urgentDone += 1;
  const fx = questFx(s, u.area, true);
  const xp = grantXp(s, ev, (60 + s.player.level * 5) * fx.mult, 'quest', AREA_MAP[u.area].stat);
  const gold = grantGold(s, 35);
  const d = day(s);
  d.side = (d.side ?? 0) + 1;
  emit(ev, 'reward', 'URGENT QUEST CLEAR', [u.title, `+${xp} XP  +${gold} G${fx.tags.length ? ' · ' + fx.tags.join(' · ') : ''}`], true);
  rollLoot(s, ev);
}

/* ---- weekly challenges ---- */

export function claimWeekly(s: GameState, ev: GameEvent[], id: string): boolean {
  const t = todayKey();
  const wk = weekId(t);
  const def = weeklyChallenges(wk, s.player.createdAt).find((d) => d.id === id);
  if (!def) return false;
  if (s.fun.weeklyClaims.week !== wk) s.fun.weeklyClaims = { week: wk, claimed: [] };
  if (s.fun.weeklyClaims.claimed.includes(id)) return false;
  if (def.progress(s, wk, addDays(wk, 6)) < def.target) return false;
  s.fun.weeklyClaims.claimed.push(id);
  s.counters.weeklyDone += 1;
  const r = weeklyReward(s.player.level);
  const xp = grantXp(s, ev, r.xp, 'life');
  const gold = grantGold(s, r.gold);
  const drop = rollDrop(Math.random());
  const lines = [def.title, `+${xp} XP   +${gold} Gold`];
  if (drop.item) {
    s.inventory[drop.item] = (s.inventory[drop.item] ?? 0) + 1;
    lines.push(`Bonus: ${ITEM_MAP[drop.item].name}`);
  }
  emit(ev, 'achievement', 'WEEKLY CHALLENGE', lines);
  return true;
}

/* ---- companion ---- */

export function hatchCompanion(s: GameState, ev: GameEvent[], species: string, name: string) {
  if (s.fun.companion.species) return;
  s.fun.companion = { species, name: name.trim().slice(0, 16) || 'Buddy', hatchedAt: Date.now() };
  emit(ev, 'achievement', 'IT HATCHED!', [`Meet ${s.fun.companion.name}.`, 'Your companion grows as you level up.', 'Show up every day and it stays happy.']);
}

export function renameCompanion(s: GameState, name: string) {
  if (name.trim()) s.fun.companion.name = name.trim().slice(0, 16);
}

export function skipSide(s: GameState, id: string) {
  const q = s.board.quests.find((x) => x.id === id);
  if (!q || q.status !== 'open') return;
  q.status = 'skipped';
  adapt(s.areas[q.area], 'skipped', q.tier);
  pushHistory(s, q, 'skipped', s.board.date);
}

export function rerollSide(s: GameState, id: string): boolean {
  const i = s.board.quests.findIndex((x) => x.id === id);
  if (i < 0 || s.board.rerolls <= 0 || s.board.quests[i].status !== 'open') return false;
  const old = s.board.quests[i];
  const exclude = new Set(s.board.quests.map((q) => q.templateId).filter((x): x is string => !!x));
  for (const h of s.questHistory.slice(0, 30)) if (h.templateId) exclude.add(h.templateId);
  const t = pickForArea(s, old.area, s.board.date, `reroll${Date.now()}`, exclude);
  if (!t) return false;
  s.board.quests[i] = boardQuestFrom(t, 'director');
  s.board.rerolls -= 1;
  return true;
}

export function addToBoard(s: GameState, templateId: string): boolean {
  const t = QUEST_MAP[templateId];
  if (!t || s.board.quests.filter((q) => q.status === 'open').length >= MAX_BOARD) return false;
  if (s.board.quests.some((q) => q.templateId === templateId && q.status === 'open')) return false;
  s.board.quests.push(boardQuestFrom(t, 'library'));
  return true;
}

export function removeFromBoard(s: GameState, id: string) {
  s.board.quests = s.board.quests.filter((q) => !(q.id === id && q.status === 'open'));
}

export interface AIQuestInput {
  title: string;
  criteria: string;
  area: string;
  tier: number;
  minutes?: number;
  why?: string;
}

export function addAIQuests(s: GameState, items: AIQuestInput[]): number {
  const clean = items
    .filter((x) => x && typeof x.title === 'string' && typeof x.criteria === 'string' && (AREA_IDS as string[]).includes(x.area))
    .slice(0, 6)
    .map<BoardQuest>((x) => {
      const area = x.area as AreaId;
      return {
        id: uid('ai'),
        source: 'ai',
        area,
        title: x.title.trim().slice(0, 70),
        criteria: x.criteria.trim().slice(0, 220),
        why: x.why?.trim().slice(0, 200) || undefined,
        tier: Math.max(1, Math.min(5, Math.round(Number(x.tier) || 2))),
        minutes: Math.max(0, Math.min(240, Math.round(Number(x.minutes) || 15))),
        stat: AREA_MAP[area].stat,
        status: 'open',
      };
    });
  if (!clean.length) return 0;
  // make room: drop untouched director quests first
  let open = s.board.quests.filter((q) => q.status === 'open').length;
  for (let i = s.board.quests.length - 1; i >= 0 && open + clean.length > MAX_BOARD; i--) {
    if (s.board.quests[i].status === 'open' && s.board.quests[i].source === 'director') {
      s.board.quests.splice(i, 1);
      open--;
    }
  }
  const room = Math.max(0, MAX_BOARD - open);
  s.board.quests.push(...clean.slice(0, room));
  s.board.aiAt = Date.now();
  return Math.min(room, clean.length);
}

/** Auto-complete open quests whose metric target is met. Returns true if anything changed. */
export function evaluateMetrics(s: GameState, ev: GameEvent[]): boolean {
  const t = todayKey();
  if (s.board.date !== t) return false;
  const lateEnough = new Date().getHours() >= 20;
  let changed = false;
  for (const q of s.board.quests) {
    if (q.status !== 'open' || !q.metric) continue;
    if (q.metric.op === 'lte' && !lateEnough) continue; // "at most X" can only be verified late in the day
    if (metricMet(s, q.metric, t)) {
      completeSide(s, ev, q.id, undefined, true);
      changed = true;
    }
  }
  return changed;
}

export function setProfile(s: GameState, patch: Partial<LifeProfile>) {
  const before = s.profile.questLoad;
  s.profile = { ...s.profile, ...patch, focusAreas: (patch.focusAreas ?? s.profile.focusAreas).slice(0, 3) };
  s.profile.questLoad = Math.max(2, Math.min(6, s.profile.questLoad));
  if (s.onboarded && s.profile.questLoad > before) {
    const open = s.board.quests.filter((q) => q.status === 'open').length;
    const add = s.profile.questLoad - open;
    if (add > 0) {
      const extra = generateBoard(s, s.board.date, add).filter((n) => !s.board.quests.some((q) => q.templateId === n.templateId));
      s.board.quests.push(...extra);
    }
  }
}

/* ---- main quests ---- */

export function addMainQuest(s: GameState, mq: Omit<MainQuest, 'id' | 'status' | 'createdAt'>) {
  s.mainQuests.unshift({ ...mq, id: uid('mq'), status: 'active', createdAt: Date.now() });
}

export function startCampaign(s: GameState, campaignId: string): boolean {
  const c = CAMPAIGN_MAP[campaignId];
  if (!c || s.mainQuests.some((m) => m.campaignId === campaignId && m.status === 'active')) return false;
  const deadline = addDays(todayKey(), c.weeks * 7);
  addMainQuest(s, {
    area: c.area,
    title: c.title,
    why: c.why,
    campaignId,
    deadline,
    metric: c.metric ? { ...c.metric, current: c.metric.start } : undefined,
    milestones: c.milestones.map(([title, criteria]) => ({ id: uid('ms'), title, criteria, done: false })),
  });
  log(s, `Main Quest started: ${c.title}.`, 'info');
  return true;
}

export function toggleMilestone(s: GameState, ev: GameEvent[], mqId: string, msId: string) {
  const mq = s.mainQuests.find((m) => m.id === mqId);
  const ms = mq?.milestones.find((m) => m.id === msId);
  if (!mq || !ms || mq.status !== 'active') return;
  if (ms.done) {
    ms.done = false;
    ms.doneAt = undefined;
    s.counters.milestonesDone = Math.max(0, s.counters.milestonesDone - 1);
    return;
  }
  ms.done = true;
  ms.doneAt = Date.now();
  s.counters.milestonesDone += 1;
  const d = day(s);
  d.milestones = (d.milestones ?? 0) + 1;
  const xp = grantXp(s, ev, 60 + s.player.level * 4, 'quest', AREA_MAP[mq.area].stat);
  const gold = grantGold(s, 40);
  const doneCount = mq.milestones.filter((m) => m.done).length;
  emit(ev, 'reward', 'MILESTONE REACHED', [mq.title, ms.title, `+${xp} XP  +${gold} G · ${doneCount}/${mq.milestones.length}`], doneCount < mq.milestones.length);
  if (doneCount === mq.milestones.length) completeMainQuest(s, ev, mq.id);
  evaluateMetrics(s, ev);
}

export function completeMainQuest(s: GameState, ev: GameEvent[], mqId: string) {
  const mq = s.mainQuests.find((m) => m.id === mqId);
  if (!mq || mq.status !== 'active') return;
  mq.status = 'done';
  mq.completedAt = Date.now();
  s.counters.mainQuestsDone += 1;
  const xp = grantXp(s, ev, 400 + s.player.level * 25, 'quest', AREA_MAP[mq.area].stat);
  const gold = grantGold(s, 250);
  s.player.freePoints += 2;
  emit(ev, 'achievement', 'MAIN QUEST COMPLETE', [mq.title, `+${xp} XP   +${gold} Gold`, '+2 ability points', 'This is real progress. Well done.']);
  log(s, `Main Quest complete: ${mq.title}!`, 'achievement');
}

export function updateMainQuest(s: GameState, mqId: string, patch: Partial<MainQuest>) {
  const mq = s.mainQuests.find((m) => m.id === mqId);
  if (mq) Object.assign(mq, patch);
}

export function deleteMainQuest(s: GameState, mqId: string) {
  s.mainQuests = s.mainQuests.filter((m) => m.id !== mqId);
}

/* ---- recovery (Break Free) ---- */

export function addRecovery(s: GameState, t: Pick<RecoveryTrack, 'category' | 'name' | 'why' | 'plan' | 'replacements'> & { daysClean?: number }) {
  const now = Date.now();
  const startedAt = now - Math.max(0, Math.min(3650, t.daysClean ?? 0)) * DAY_MS;
  const hit = RECOVERY_MILESTONES.filter((m) => m <= Math.floor((now - startedAt) / DAY_MS));
  s.recovery.push({
    id: uid('rc'),
    category: t.category,
    name: t.name.trim() || RECOVERY_MAP[t.category].name,
    why: t.why.trim(),
    plan: t.plan.trim(),
    replacements: t.replacements,
    startedAt,
    bankedMs: 0,
    bestMs: now - startedAt,
    relapses: [],
    urges: [],
    milestonesHit: hit,
    createdAt: now,
  });
  log(s, `Break Free started: ${t.name}.`, 'info');
}

export function updateRecovery(s: GameState, id: string, patch: Partial<Pick<RecoveryTrack, 'name' | 'why' | 'plan' | 'replacements'>>) {
  const t = s.recovery.find((x) => x.id === id);
  if (t) Object.assign(t, patch);
}

export function deleteRecovery(s: GameState, id: string) {
  s.recovery = s.recovery.filter((x) => x.id !== id);
}

export function resistUrge(s: GameState, ev: GameEvent[], id: string, trigger?: string) {
  const t = s.recovery.find((x) => x.id === id);
  if (!t) return;
  t.urges.unshift({ ts: Date.now(), trigger, outcome: 'resisted' });
  if (t.urges.length > 200) t.urges.length = 200;
  s.counters.urgesResisted += 1;
  const xp = grantXp(s, ev, 30, 'quest', 'WIL');
  emit(ev, 'reward', 'URGE DEFEATED', ['You rode the wave.', `+${xp} XP · Willpower`, `Urges defeated: ${s.counters.urgesResisted}`]);
}

export function relapse(s: GameState, ev: GameEvent[], id: string, trigger: string | undefined, note: string | undefined, newPlan?: string) {
  const t = s.recovery.find((x) => x.id === id);
  if (!t) return;
  const now = Date.now();
  const run = cleanMs(t, now);
  t.bankedMs += run;
  t.bestMs = Math.max(t.bestMs, run);
  t.relapses.unshift({ ts: now, trigger, note: note?.trim() || undefined });
  if (t.relapses.length > 200) t.relapses.length = 200;
  t.urges.unshift({ ts: now, trigger, outcome: 'lapsed' });
  t.startedAt = now;
  t.milestonesHit = [];
  if (newPlan?.trim()) t.plan = newPlan.trim();
  const xp = grantXp(s, ev, 10, 'quest', 'WIL');
  emit(ev, 'info', 'A SLIP, NOT A FALL', [
    `Streak was ${Math.floor(run / DAY_MS)} days. Total clean days kept: ${Math.floor(t.bankedMs / DAY_MS)}.`,
    'A lapse is information, not identity.',
    trigger ? `Trigger noted: ${trigger}. Your plan has been updated.` : 'Notice what led here and adjust your plan.',
    `+${xp} XP for honesty. The next run starts now.`,
  ]);
  log(s, `${t.name}: new run started.`, 'info');
}

function checkRecovery(s: GameState, ev: GameEvent[]): boolean {
  let changed = false;
  for (const t of s.recovery) {
    const d = cleanDays(t);
    s.counters.bestRecoveryDays = Math.max(s.counters.bestRecoveryDays, bestDays(t));
    for (const m of RECOVERY_MILESTONES) {
      if (d >= m && !t.milestonesHit.includes(m)) {
        t.milestonesHit.push(m);
        changed = true;
        const r = milestoneReward(m);
        const xp = grantXp(s, ev, r.xp, 'quest', 'WIL');
        const gold = grantGold(s, r.gold);
        emit(ev, m >= 7 ? 'achievement' : 'reward', `${m} DAY${m === 1 ? '' : 'S'} FREE`, [t.name, `+${xp} XP   +${gold} Gold`, m >= 30 ? 'Your brain is rewiring. Keep going.' : 'One day at a time.'], m < 7);
        log(s, `${t.name}: ${m} days free.`, 'achievement');
      }
    }
  }
  return changed;
}

/* ---- check-ins, wellbeing, wheel, reviews ---- */

export function saveCheckin(s: GameState, ev: GameEvent[], patch: Partial<DailyCheckin>, finalize = true) {
  const t = todayKey();
  const prev = s.checkins[t] ?? { date: t };
  const next: DailyCheckin = { ...prev, ...patch, date: t };
  const first = !prev.savedAt && finalize;
  if (finalize) next.savedAt = Date.now();
  s.checkins[t] = next;
  if (first) {
    s.counters.checkins += 1;
    day(s).checkin = true;
    const xp = grantXp(s, ev, 15, 'life', 'SEN');
    emit(ev, 'reward', 'CHECK-IN SAVED', [`+${xp} XP · data feeds your quests`], true);
  }
  evaluateMetrics(s, ev);
}

export const WHO5_ITEMS = [
  'I have felt cheerful and in good spirits',
  'I have felt calm and relaxed',
  'I have felt active and vigorous',
  'I woke up feeling fresh and rested',
  'My daily life has been filled with things that interest me',
];

export function saveWellbeing(s: GameState, ev: GameEvent[], answers: number[]) {
  const a = answers.slice(0, 5).map((x) => Math.max(0, Math.min(5, Math.round(x))));
  const score = a.reduce((x, y) => x + y, 0) * 4;
  const prev = s.wellbeing[s.wellbeing.length - 1];
  s.wellbeing.push({ date: todayKey(), answers: a, score });
  if (s.wellbeing.length > 60) s.wellbeing.shift();
  const xp = grantXp(s, ev, 30, 'life', 'SEN');
  const lines = [`Score: ${score} / 100`, prev ? `Last time: ${prev.score} (${score - prev.score >= 0 ? '+' : ''}${score - prev.score})` : 'Your first measurement — retake every 2 weeks.', `+${xp} XP`];
  if (score <= 50) {
    lines.push('This score suggests your wellbeing is low right now. Consider talking with someone you trust or a health professional. In Thailand you can call 1323.');
  }
  emit(ev, score <= 50 ? 'warning' : 'reward', 'WELLBEING MEASURED', lines);
}

export function saveWheel(s: GameState, ev: GameEvent[], ratings: Partial<Record<AreaId, number>>) {
  s.wheel.push({ date: todayKey(), ratings });
  if (s.wheel.length > 60) s.wheel.shift();
  const xp = grantXp(s, ev, 30, 'life', 'SEN');
  const low = Object.entries(ratings)
    .sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))
    .slice(0, 2)
    .map(([a]) => AREA_MAP[a as AreaId].name);
  emit(ev, 'reward', 'LIFE WHEEL UPDATED', [`+${xp} XP`, `The Director will send more quests for: ${low.join(', ')}.`]);
}

export function saveReview(s: GameState, ev: GameEvent[], r: Omit<WeeklyReview, 'date' | 'week'>) {
  const t = todayKey();
  const week = weekId(t);
  const existing = s.reviews.findIndex((x) => x.week === week);
  const entry: WeeklyReview = { ...r, focus: r.focus.slice(0, 3), week, date: t };
  if (existing >= 0) s.reviews[existing] = entry;
  else {
    s.reviews.push(entry);
    s.counters.reviews += 1;
    const xp = grantXp(s, ev, 60, 'life', 'SEN');
    emit(ev, 'reward', 'WEEKLY REVIEW', ['Reflection turns experience into growth.', `+${xp} XP`, entry.focus.length ? `Next week’s focus: ${entry.focus.map((a) => AREA_MAP[a].name).join(', ')}` : '']);
  }
  if (s.reviews.length > 104) s.reviews.shift();
  evaluateMetrics(s, ev);
}
