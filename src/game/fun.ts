/**
 * Gimmicks that make AWAKEN feel like a game — all optional, none punishing:
 * daily supply crate, today's buff, combos, critical hits, loot drops,
 * urgent quests, weekly challenges, a companion that grows with you, tips.
 */
import { AREA_MAP, type AreaId, AREA_IDS } from './areas';
import { addDays, diffDays, fromDateKey, weekId } from './date';
import { hash, rand01 } from './rng';
import type { GameState, ItemId } from './types';

/* ---------------- Today's buff ---------------- */

const BUFF_NAMES: Record<AreaId, string> = {
  fitness: 'Blessing of Iron',
  health: 'Blessing of Vitality',
  mind: 'Blessing of Calm',
  learning: 'Blessing of the Scholar',
  career: 'Blessing of Ambition',
  money: 'Blessing of Fortune',
  relationships: 'Blessing of Bonds',
  purpose: 'Blessing of the Compass',
  home: 'Blessing of the Hearth',
  digital: 'Blessing of Clarity',
};

export function dailyBuff(date: string, seed = '') {
  const area = AREA_IDS[hash('buff', date, seed) % AREA_IDS.length];
  return { area, name: BUFF_NAMES[area], mult: 1.25, color: AREA_MAP[area].color, icon: AREA_MAP[area].icon };
}

/* ---------------- Combo & crits ---------------- */

export function comboMult(count: number) {
  // 1st quest x1.00 … 6th+ quest x1.25
  return 1 + Math.min(Math.max(0, count - 1), 5) * 0.05;
}

export function critChance(s: GameState) {
  return s.fun.luckyUntil > Date.now() ? 0.2 : 0.08;
}

export function dropChance(s: GameState) {
  return s.fun.luckyUntil > Date.now() ? 0.22 : 0.1;
}

export const DROP_TABLE: { item?: ItemId; gold?: number; weight: number }[] = [
  { gold: 40, weight: 30 },
  { gold: 90, weight: 12 },
  { item: 'hp_potion', weight: 18 },
  { item: 'reroll_token', weight: 18 },
  { item: 'xp_elixir', weight: 8 },
  { item: 'streak_shield', weight: 7 },
  { item: 'lucky_charm', weight: 7 },
];

export function rollDrop(r: number) {
  const total = DROP_TABLE.reduce((a, d) => a + d.weight, 0);
  let x = r * total;
  for (const d of DROP_TABLE) {
    x -= d.weight;
    if (x <= 0) return d;
  }
  return DROP_TABLE[0];
}

/* ---------------- Daily supply crate (login streak) ---------------- */

export const CRATE_DAYS: { label: string; gold?: number; xp?: number; item?: ItemId; rare?: boolean }[] = [
  { label: '30 G', gold: 30 },
  { label: '40 XP + 30 G', xp: 40, gold: 30 },
  { label: 'HP Potion', item: 'hp_potion' },
  { label: '60 G', gold: 60 },
  { label: 'Reroll Token', item: 'reroll_token' },
  { label: '80 XP + 60 G', xp: 80, gold: 60 },
  { label: 'Rare crate', gold: 120, rare: true },
];

export function crateDay(s: GameState, today: string) {
  const last = s.fun.crate.lastClaim;
  const continuing = last && diffDays(last, today) === 1;
  const streak = last === today ? s.fun.crate.streak : continuing ? s.fun.crate.streak + 1 : 1;
  return { claimed: last === today, streak, day: ((streak - 1) % 7) + 1 };
}

/* ---------------- Urgent quests ---------------- */

export const URGENT_POOL: { title: string; criteria: string; area: AreaId }[] = [
  { title: 'Hydrate now', criteria: 'Drink a full glass of water', area: 'health' },
  { title: '10 push-ups', criteria: 'Do 10 push-ups (knees are fine)', area: 'fitness' },
  { title: 'Five-minute tidy', criteria: 'Tidy the space around you for 5 minutes', area: 'home' },
  { title: 'Send some love', criteria: 'Text someone one thing you appreciate about them', area: 'relationships' },
  { title: 'Breathe', criteria: 'Take 10 slow breaths, eyes closed', area: 'mind' },
  { title: 'Step outside', criteria: 'Go outside for at least 3 minutes', area: 'health' },
  { title: 'Next step', criteria: 'Write down the single next step of your most important task', area: 'career' },
  { title: 'Stand & stretch', criteria: 'Stand up and stretch for 2 minutes', area: 'fitness' },
  { title: 'Phone down', criteria: 'Put your phone face-down out of reach for 20 minutes', area: 'digital' },
  { title: 'Learn one thing', criteria: 'Look up one thing you were curious about and note it', area: 'learning' },
  { title: 'Check a balance', criteria: 'Open your banking app and check one balance', area: 'money' },
  { title: 'Gratitude flash', criteria: 'Write one thing you are grateful for right now', area: 'purpose' },
  { title: 'Wall sit', criteria: 'Hold a wall sit for 45 seconds', area: 'fitness' },
  { title: 'Clear one tab', criteria: 'Close every browser tab or app you don’t need', area: 'digital' },
  { title: 'Posture check', criteria: 'Fix your posture and roll your shoulders 10 times', area: 'health' },
];

export const URGENT_MINUTES = 60;

/* ---------------- Weekly challenges ---------------- */

export interface WeeklyDef {
  id: string;
  title: string;
  target: number;
  unit: string;
  icon: string;
  progress: (s: GameState, from: string, to: string) => number;
}

const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
const tsRange = (ts: number, from: string, to: string) => {
  const d = new Date(ts);
  const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return inRange(k, from, to);
};

export const WEEKLY_POOL: WeeklyDef[] = [
  { id: 'side10', title: 'Clear 10 Side Quests', target: 10, unit: 'quests', icon: 'map-marker-star', progress: (s, f, t) => s.questHistory.filter((h) => h.status === 'done' && inRange(h.date, f, t)).length },
  { id: 'daily5', title: 'Clear the Daily Quest 5 times', target: 5, unit: 'days', icon: 'sword', progress: (s, f, t) => Object.entries(s.activity).filter(([d, a]) => a.daily && inRange(d, f, t)).length },
  { id: 'checkin5', title: 'Check in on 5 days', target: 5, unit: 'days', icon: 'clipboard-pulse', progress: (s, f, t) => Object.entries(s.activity).filter(([d, a]) => a.checkin && inRange(d, f, t)).length },
  { id: 'dungeon3', title: 'Clear 3 Dungeons', target: 3, unit: 'clears', icon: 'gate', progress: (s, f, t) => s.dungeonHistory.filter((h) => h.result === 'clear' && tsRange(h.ts, f, t)).length },
  { id: 'areas5', title: 'Clear quests in 5 life areas', target: 5, unit: 'areas', icon: 'palette', progress: (s, f, t) => new Set(s.questHistory.filter((h) => h.status === 'done' && inRange(h.date, f, t)).map((h) => h.area)).size },
  { id: 'focus150', title: 'Focus 150 minutes in Dungeons', target: 150, unit: 'min', icon: 'brain', progress: (s, f, t) => Object.entries(s.activity).filter(([d]) => inRange(d, f, t)).reduce((a, [, x]) => a + (x.focusMin ?? 0), 0) },
  { id: 'pushups300', title: 'Log 300 push-ups', target: 300, unit: 'reps', icon: 'arm-flex', progress: (s, f, t) => s.workouts.filter((w) => w.exerciseId === 'pushups' && inRange(w.date, f, t)).reduce((a, w) => a + w.amount, 0) },
  { id: 'steps50k', title: 'Walk 50,000 steps', target: 50000, unit: 'steps', icon: 'walk', progress: (s, f, t) => Object.values(s.checkins).filter((c) => inRange(c.date, f, t)).reduce((a, c) => a + (c.steps ?? 0), 0) },
  { id: 'habits10', title: 'Make 10 habit check-ins', target: 10, unit: 'check-ins', icon: 'calendar-check', progress: (s, f, t) => Object.entries(s.activity).filter(([d]) => inRange(d, f, t)).reduce((a, [, x]) => a + (x.habits ?? 0), 0) },
  { id: 'sleep7', title: 'Log 4 nights of 7+ hours sleep', target: 4, unit: 'nights', icon: 'sleep', progress: (s, f, t) => Object.values(s.checkins).filter((c) => inRange(c.date, f, t) && (c.sleepHours ?? 0) >= 7).length },
  { id: 'milestone1', title: 'Reach a Main Quest milestone', target: 1, unit: 'milestone', icon: 'flag-variant', progress: (s, f, t) => Object.entries(s.activity).filter(([d]) => inRange(d, f, t)).reduce((a, [, x]) => a + (x.milestones ?? 0), 0) },
];

export function weeklyChallenges(week: string, seed = '') {
  const picks: WeeklyDef[] = [];
  let i = 0;
  while (picks.length < 3 && i < 50) {
    const d = WEEKLY_POOL[hash('weekly', week, seed, i++) % WEEKLY_POOL.length];
    if (!picks.includes(d)) picks.push(d);
  }
  return picks;
}

export function weekRange(date: string) {
  const from = weekId(date);
  return { from, to: addDays(from, 6) };
}

export function weeklyReward(level: number) {
  return { xp: 150 + level * 10, gold: 120 + level * 5 };
}

/* ---------------- Companion ---------------- */

export const SPECIES = [
  { id: 'owl', name: 'Owl', icon: 'owl', color: '#B58CFF', trait: 'Loves when you learn' },
  { id: 'cat', name: 'Cat', icon: 'cat', color: '#FFD166', trait: 'Calm and curious' },
  { id: 'dog', name: 'Hound', icon: 'dog', color: '#FF8A3D', trait: 'Loyal to the end' },
  { id: 'turtle', name: 'Turtle', icon: 'turtle', color: '#45F0A0', trait: 'Slow and steady wins' },
  { id: 'penguin', name: 'Penguin', icon: 'penguin', color: '#4FA8FF', trait: 'Never misses a day' },
  { id: 'unicorn', name: 'Unicorn', icon: 'unicorn-variant', color: '#FF7EB6', trait: 'Believes in you' },
];

export const STAGES = [
  { min: 0, name: 'Egg', size: 34 },
  { min: 2, name: 'Hatchling', size: 34 },
  { min: 6, name: 'Juvenile', size: 40 },
  { min: 12, name: 'Adept', size: 46 },
  { min: 20, name: 'Guardian', size: 52 },
  { min: 35, name: 'Mythic', size: 58 },
  { min: 50, name: 'Celestial', size: 64 },
];

export function companionStage(level: number) {
  let st = STAGES[0];
  for (const x of STAGES) if (level >= x.min) st = x;
  const idx = STAGES.indexOf(st);
  return { ...st, index: idx, next: STAGES[idx + 1] ?? null };
}

export function companionMood(s: GameState, today: string): { mood: 'happy' | 'proud' | 'sleepy' | 'miss'; line: string } {
  const a = s.activity[today];
  const did = a && (a.daily || (a.side ?? 0) > 0 || (a.habits ?? 0) > 0 || a.checkin);
  const y = s.activity[addDays(today, -1)];
  const yDid = y && (y.daily || (y.side ?? 0) > 0 || (y.habits ?? 0) > 0 || y.checkin);
  const h = new Date().getHours();
  const name = s.fun.companion.name || 'Your companion';
  if (s.daily.completed && (a?.side ?? 0) >= 2) return { mood: 'proud', line: `${name} is glowing. What a day!` };
  if (did) return { mood: 'happy', line: `${name} is happy you showed up today.` };
  if (h >= 23 || h < 6) return { mood: 'sleepy', line: `${name} is sleepy. Rest well — tomorrow is a new quest.` };
  if (!yDid && !did) return { mood: 'miss', line: `${name} missed you. One small quest is enough to start.` };
  return { mood: 'happy', line: `${name} is ready for adventure.` };
}

/* ---------------- Tips & flames ---------------- */

export const TIPS = [
  'Missing one day doesn’t ruin a habit — in the 66-day study, a single miss didn’t change the outcome. Just don’t miss twice.',
  'If-then plans (“If it’s 7 pm, then I study 25 min”) roughly double follow-through.',
  'Make the first step tiny. Two minutes of anything beats zero minutes of perfect.',
  'Batch notifications to ~3 times a day: better focus and mood than constant alerts.',
  'Grayscale mode makes your phone less tempting — try it for a day.',
  'Sleep is a performance enhancer. 7+ hours makes every other quest easier.',
  'Write down three good things tonight — it lifts mood for weeks.',
  'Say “thank you” in detail. Specific gratitude strengthens relationships.',
  'Weak ties open doors: message an old classmate this week.',
  'Urges are waves. Breathe and watch one rise and fall without acting.',
  'Self-compassion after a slip predicts more effort next time, not less.',
  'Walk after meals — even 10 minutes helps energy and blood sugar.',
  'Testing yourself beats re-reading. Close the book and recall.',
  'Put the phone in another room while you work. Out of sight, out of mind.',
  'Celebrate tiny wins. Your brain learns what you reward.',
];

export function tipOfDay(date: string) {
  return TIPS[hash('tip', date) % TIPS.length];
}

export function streakFlame(streak: number) {
  if (streak >= 100) return { color: '#B58CFF', label: 'Legendary flame' };
  if (streak >= 30) return { color: '#4FA8FF', label: 'Blue flame' };
  if (streak >= 7) return { color: '#FF3D5A', label: 'Red flame' };
  if (streak >= 3) return { color: '#FF8A3D', label: 'Flame' };
  return { color: '#9AA7B8', label: 'Spark' };
}

export function daySeedRand(s: GameState, ...parts: (string | number)[]) {
  return rand01(...parts, s.player.createdAt);
}

export { fromDateKey };
