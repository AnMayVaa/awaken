/**
 * v3 life trackers — pure data, constants and selectors (no mutations).
 * Kept free of engine imports so the Quest Director can read these metrics without a cycle.
 */
import { addDays, diffDays, fromDateKey } from './date';
import type { FoodTag, GameState, MealSlot, MoneyCat, Person, SkillTrack, StatKey, TrackState, WishItem } from './types';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

export const FOOD_TAGS: { id: FoodTag; label: string; icon: string; color: string; good: boolean }[] = [
  { id: 'protein', label: 'Protein', icon: 'food-drumstick', color: '#FF8A65', good: true },
  { id: 'veg', label: 'Veggies', icon: 'carrot', color: '#45F0A0', good: true },
  { id: 'fruit', label: 'Fruit', icon: 'food-apple', color: '#7CFF6B', good: true },
  { id: 'grain', label: 'Rice / grains', icon: 'rice', color: '#FFD166', good: true },
  { id: 'homemade', label: 'Home-cooked', icon: 'pot-steam', color: '#4FE3C1', good: true },
  { id: 'junk', label: 'Fast food', icon: 'hamburger', color: '#FF6B6B', good: false },
  { id: 'sugary', label: 'Sweet / sugary drink', icon: 'cup', color: '#FF7EB6', good: false },
  { id: 'fried', label: 'Fried', icon: 'french-fries', color: '#FFB86B', good: false },
];
export const FOOD_TAG_MAP = Object.fromEntries(FOOD_TAGS.map((t) => [t.id, t])) as Record<FoodTag, (typeof FOOD_TAGS)[number]>;

export const MEAL_SLOTS: { id: MealSlot; label: string; short: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', short: 'Morning', icon: 'weather-sunset-up' },
  { id: 'lunch', label: 'Lunch', short: 'Lunch', icon: 'white-balance-sunny' },
  { id: 'dinner', label: 'Dinner', short: 'Dinner', icon: 'weather-night' },
  { id: 'snack', label: 'Snack', short: 'Snack', icon: 'cookie' },
];

export function slotForHour(h: number): MealSlot {
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snack';
}

export const MONEY_CATS: { id: MoneyCat; label: string; icon: string; color: string; essential: boolean }[] = [
  { id: 'food', label: 'Food', icon: 'silverware-fork-knife', color: '#FFB86B', essential: true },
  { id: 'transport', label: 'Transport', icon: 'bus', color: '#4FA8FF', essential: true },
  { id: 'bills', label: 'Bills', icon: 'file-document', color: '#86A9C6', essential: true },
  { id: 'health', label: 'Health', icon: 'medical-bag', color: '#7CFF6B', essential: true },
  { id: 'study', label: 'Study', icon: 'school', color: '#B58CFF', essential: true },
  { id: 'shopping', label: 'Shopping', icon: 'shopping', color: '#FF7EB6', essential: false },
  { id: 'fun', label: 'Fun', icon: 'gamepad-variant', color: '#FFD166', essential: false },
  { id: 'other', label: 'Other', icon: 'dots-horizontal-circle', color: '#6E8FAE', essential: false },
];
export const MONEY_CAT_MAP = Object.fromEntries(MONEY_CATS.map((c) => [c.id, c])) as Record<MoneyCat, (typeof MONEY_CATS)[number]>;

export const CURRENCY = '฿';
export const fmtMoney = (v: number) => `${CURRENCY}${Math.round(v).toLocaleString()}`;

export const WISH_WAIT_MS = 24 * 3600 * 1000;

export const SKILL_TIERS = [
  { hours: 0, name: 'Novice' },
  { hours: 5, name: 'Apprentice' },
  { hours: 20, name: 'Adept' },
  { hours: 50, name: 'Expert' },
  { hours: 100, name: 'Master' },
  { hours: 250, name: 'Grandmaster' },
];

export const SKILL_PRESETS: { name: string; icon: string; stat: StatKey }[] = [
  { name: 'Coding', icon: 'code-braces', stat: 'INT' },
  { name: 'Guitar', icon: 'guitar-acoustic', stat: 'SEN' },
  { name: 'English', icon: 'translate', stat: 'INT' },
  { name: 'Drawing', icon: 'draw', stat: 'SEN' },
  { name: 'Cooking', icon: 'chef-hat', stat: 'VIT' },
  { name: 'Public speaking', icon: 'microphone', stat: 'CHA' },
  { name: 'Writing', icon: 'feather', stat: 'INT' },
  { name: 'Piano', icon: 'piano', stat: 'SEN' },
];

export const RELATIONS: { id: Person['relation']; label: string; icon: string; days: number }[] = [
  { id: 'family', label: 'Family', icon: 'home-heart', days: 7 },
  { id: 'friend', label: 'Friend', icon: 'account-multiple', days: 14 },
  { id: 'partner', label: 'Partner', icon: 'heart', days: 1 },
  { id: 'mentor', label: 'Mentor', icon: 'school', days: 30 },
  { id: 'other', label: 'Other', icon: 'account', days: 14 },
];

export const SEASON_DAYS = 66;
export const SEASON_TIERS: { xp: number; gold: number; item?: 'hp_potion' | 'streak_shield' | 'xp_elixir' | 'reroll_token' | 'lucky_charm' }[] = [
  { xp: 300, gold: 60 },
  { xp: 700, gold: 80, item: 'hp_potion' },
  { xp: 1200, gold: 100 },
  { xp: 1800, gold: 120, item: 'reroll_token' },
  { xp: 2500, gold: 150 },
  { xp: 3300, gold: 180, item: 'streak_shield' },
  { xp: 4200, gold: 220 },
  { xp: 5200, gold: 260, item: 'xp_elixir' },
  { xp: 6300, gold: 320 },
  { xp: 7500, gold: 500, item: 'lucky_charm' },
];

export const PLAN_SIZE = 3;

export function defaultTrack(startDate: string, xpStart = 0): TrackState {
  return {
    meals: [],
    water: {},
    waterGoal: 8,
    expenses: [],
    budgets: {},
    wishlist: [],
    goals: [],
    noSpend: {},
    savedByWaiting: 0,
    skills: [],
    people: [],
    plans: {},
    season: { n: 1, startDate, xpStart, claimed: [] },
    rewardDay: { date: '', meals: 0, spends: 0 },
  };
}

/* ------------------------------------------------------------------ */
/* Nutrition                                                           */
/* ------------------------------------------------------------------ */

export function mealsOn(s: GameState, date: string) {
  return s.track.meals.filter((m) => m.date === date);
}

export function foodCounts(s: GameState, date: string) {
  const ms = mealsOn(s, date);
  let plants = 0;
  let protein = 0;
  let junk = 0;
  let homemade = 0;
  for (const m of ms) {
    if (m.tags.includes('veg')) plants += 1;
    if (m.tags.includes('fruit')) plants += 1;
    if (m.tags.includes('protein')) protein += 1;
    if (m.tags.includes('homemade')) homemade += 1;
    if (m.tags.some((t) => t === 'junk' || t === 'sugary' || t === 'fried')) junk += 1;
  }
  return { meals: ms.length, plants, protein, junk, homemade };
}

export const waterOn = (s: GameState, date: string) => s.track.water[date] ?? 0;

/** 0..100 for one day, or null if nothing was logged. Balanced, no calories, never punishing. */
export function nutritionDayScore(s: GameState, date: string): number | null {
  const f = foodCounts(s, date);
  const w = waterOn(s, date);
  if (!f.meals && !w) return null;
  const plants = Math.min(1, f.plants / 4) * 40;
  const protein = Math.min(1, f.protein / 2) * 20;
  const water = Math.min(1, w / s.track.waterGoal) * 25;
  const junkFree = f.meals ? (1 - f.junk / f.meals) * 15 : 7.5;
  return Math.round(plants + protein + water + junkFree);
}

export function nutritionScore(s: GameState, date: string, days = 7): number | null {
  const vals: number[] = [];
  for (let i = 0; i < days; i++) {
    const v = nutritionDayScore(s, addDays(date, -i));
    if (v !== null) vals.push(v);
  }
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export const monthOf = (date: string) => date.slice(0, 7);

export function spentOn(s: GameState, date: string, wantsOnly = false) {
  return s.track.expenses.filter((e) => e.date === date && (!wantsOnly || !e.essential)).reduce((a, e) => a + e.amount, 0);
}

export function spentInMonth(s: GameState, month: string, cat?: MoneyCat) {
  return s.track.expenses.filter((e) => monthOf(e.date) === month && (!cat || e.cat === cat)).reduce((a, e) => a + e.amount, 0);
}

export function budgetRows(s: GameState, date: string) {
  const month = monthOf(date);
  const d = fromDateKey(date);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const monthPct = d.getDate() / daysInMonth;
  return (Object.entries(s.track.budgets) as [MoneyCat, number][])
    .filter(([, limit]) => limit > 0)
    .map(([cat, limit]) => {
      const spent = spentInMonth(s, month, cat);
      return { cat, limit, spent, left: limit - spent, pct: spent / limit, pace: spent / limit > monthPct + 0.1 ? ('fast' as const) : ('ok' as const) };
    });
}

/** Consecutive no-spend days (wants only) ending yesterday or today. */
export function noSpendStreak(s: GameState, date: string) {
  let n = 0;
  let d = s.track.noSpend[date] ? date : addDays(date, -1);
  while (s.track.noSpend[d]) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function trackedMoneyDays(s: GameState, date: string, days = 14) {
  const set = new Set<string>();
  for (const e of s.track.expenses) if (diffDays(e.date, date) < days && diffDays(e.date, date) >= 0) set.add(e.date);
  for (const k of Object.keys(s.track.noSpend)) if (s.track.noSpend[k] && diffDays(k, date) < days && diffDays(k, date) >= 0) set.add(k);
  return set.size;
}

/** 0..100: tracking consistency + staying within budgets + savings progress. */
export function moneyScore(s: GameState, date: string): number | null {
  const tracked = trackedMoneyDays(s, date);
  const rows = budgetRows(s, date);
  if (!tracked && !rows.length && !s.track.goals.length) return null;
  const tracking = Math.min(1, tracked / 10) * 40;
  const budget = rows.length ? (rows.filter((r) => r.pct <= 1).length / rows.length) * 35 : 17.5;
  const goals = s.track.goals.filter((g) => !g.doneAt);
  const saving = goals.length ? (goals.reduce((a, g) => a + Math.min(1, g.saved / g.target), 0) / goals.length) * 25 : s.track.goals.length ? 25 : 10;
  return Math.round(tracking + budget + saving);
}

export const wishReady = (w: WishItem, now: number) => w.status === 'waiting' && now - w.addedAt >= WISH_WAIT_MS;

/* ------------------------------------------------------------------ */
/* Skills, people, day plan, season                                    */
/* ------------------------------------------------------------------ */

export function skillTier(minutes: number) {
  const h = minutes / 60;
  let i = 0;
  while (i + 1 < SKILL_TIERS.length && h >= SKILL_TIERS[i + 1].hours) i++;
  const cur = SKILL_TIERS[i];
  const next = SKILL_TIERS[i + 1];
  return {
    index: i,
    name: cur.name,
    hours: h,
    next: next ? next.name : null,
    nextHours: next ? next.hours : null,
    pct: next ? (h - cur.hours) / (next.hours - cur.hours) : 1,
  };
}

export function skillMinutesOn(s: GameState, date: string, sk?: SkillTrack) {
  const list = sk ? [sk] : s.track.skills;
  return list.reduce((a, k) => a + k.log.filter((l) => l.date === date).reduce((b, l) => b + l.min, 0), 0);
}

export function daysSinceContact(p: Person, date: string) {
  return p.lastContact ? diffDays(p.lastContact, date) : diffDays(new Date(p.createdAt).toISOString().slice(0, 10), date) + p.everyDays;
}

export function peopleDue(s: GameState, date: string) {
  return s.track.people
    .map((p) => ({ p, since: daysSinceContact(p, date), overdue: daysSinceContact(p, date) - p.everyDays }))
    .filter((x) => x.overdue >= 0)
    .sort((a, b) => b.overdue - a.overdue);
}

export function contactsOn(s: GameState, date: string) {
  return s.track.people.filter((p) => p.lastContact === date).length;
}

export function planDoneOn(s: GameState, date: string) {
  return s.track.plans[date]?.items.filter((i) => i.done).length ?? 0;
}

export function seasonInfo(s: GameState, date: string) {
  const se = s.track.season;
  const dayN = Math.min(SEASON_DAYS, diffDays(se.startDate, date) + 1);
  const xp = Math.max(0, s.player.totalXp - se.xpStart);
  const reached = SEASON_TIERS.filter((t) => xp >= t.xp).length;
  const next = SEASON_TIERS[reached];
  const prevXp = reached ? SEASON_TIERS[reached - 1].xp : 0;
  return {
    n: se.n,
    day: dayN,
    daysLeft: SEASON_DAYS - dayN,
    xp,
    reached,
    unclaimed: SEASON_TIERS.map((_, i) => i).filter((i) => i < reached && !se.claimed.includes(i)),
    next,
    pct: next ? (xp - prevXp) / (next.xp - prevXp) : 1,
  };
}

/* ------------------------------------------------------------------ */
/* Insights: simple, honest correlations from the player's own logs     */
/* ------------------------------------------------------------------ */

export interface InsightCard {
  id: string;
  icon: string;
  color: string;
  title: string;
  text: string;
  /** number of days behind the comparison */
  n: number;
}

interface DayRow {
  date: string;
  sleep?: number;
  mood?: number;
  energy?: number;
  screen?: number;
  steps?: number;
  trained: boolean;
  plants?: number;
  junk?: number;
  water?: number;
  wants?: number;
  focus: number;
  quests: number;
}

export function dayRows(s: GameState, date: string, days = 42): DayRow[] {
  const rows: DayRow[] = [];
  const doneByDay: Record<string, number> = {};
  for (const h of s.questHistory) if (h.status === 'done') doneByDay[h.date] = (doneByDay[h.date] ?? 0) + 1;
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(date, -i);
    const c = s.checkins[d];
    const f = foodCounts(s, d);
    const tracked = s.track.expenses.some((e) => e.date === d) || s.track.noSpend[d];
    rows.push({
      date: d,
      sleep: c?.sleepHours,
      mood: c?.mood,
      energy: c?.energy,
      screen: c?.screenMinutes,
      steps: c?.steps,
      trained: s.workouts.some((w) => w.date === d),
      plants: f.meals ? f.plants : undefined,
      junk: f.meals ? f.junk : undefined,
      water: s.track.water[d],
      wants: tracked ? spentOn(s, d, true) : undefined,
      focus: s.activity[d]?.focusMin ?? 0,
      quests: (doneByDay[d] ?? 0) + (s.activity[d]?.daily ? 1 : 0),
    });
  }
  return rows;
}

/** How many of the last 14 days have enough data for insights. */
export function insightDataDays(s: GameState, date: string) {
  return dayRows(s, date, 14).filter((r) => r.mood !== undefined || r.sleep !== undefined || r.plants !== undefined || r.wants !== undefined).length;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

interface Rule {
  id: string;
  icon: string;
  color: string;
  cond: (r: DayRow) => boolean | undefined;
  condLabel: string;
  /** outcome is read from the same day, or the next day (lag 1) */
  out: (r: DayRow) => number | undefined;
  lag?: 1;
  outLabel: string;
  unit: string;
  /** min absolute difference worth mentioning */
  min: number;
  higherIsGood: boolean;
  fmt?: (v: number) => string;
}

const RULES: Rule[] = [
  { id: 'train-mood', icon: 'arm-flex', color: '#FF6B6B', cond: (r) => r.trained, condLabel: 'you train', out: (r) => r.mood, outLabel: 'mood', unit: '/5', min: 0.3, higherIsGood: true },
  { id: 'steps-sleep', icon: 'walk', color: '#4FE3C1', cond: (r) => (r.steps === undefined ? undefined : r.steps >= 6000), condLabel: 'you walk 6,000+ steps', out: (r) => r.sleep, lag: 1, outLabel: 'sleep that night', unit: ' h', min: 0.3, higherIsGood: true, fmt: (v) => `${Math.round(v * 60)} min` },
  { id: 'screen-mood', icon: 'cellphone', color: '#7C8CFF', cond: (r) => (r.screen === undefined ? undefined : r.screen >= 180), condLabel: 'screen time passes 3 h', out: (r) => r.mood, outLabel: 'mood', unit: '/5', min: 0.3, higherIsGood: true },
  { id: 'screen-spend', icon: 'cart', color: '#FF7EB6', cond: (r) => (r.screen === undefined ? undefined : r.screen >= 180), condLabel: 'screen time passes 3 h', out: (r) => r.wants, outLabel: 'spending on wants', unit: ' ฿', min: 50, higherIsGood: false, fmt: (v) => fmtMoney(v) },
  { id: 'plants-energy', icon: 'carrot', color: '#45F0A0', cond: (r) => (r.plants === undefined ? undefined : r.plants >= 3), condLabel: 'you eat 3+ veg/fruit', out: (r) => r.energy, outLabel: 'energy', unit: '/5', min: 0.3, higherIsGood: true },
  { id: 'junk-mood', icon: 'hamburger', color: '#FFB86B', cond: (r) => (r.junk === undefined ? undefined : r.junk >= 2), condLabel: 'you have 2+ fast-food meals', out: (r) => r.energy, outLabel: 'energy', unit: '/5', min: 0.3, higherIsGood: true },
  { id: 'sleep-focus', icon: 'sleep', color: '#B58CFF', cond: (r) => (r.sleep === undefined ? undefined : r.sleep >= 7), condLabel: 'you sleep 7+ hours', out: (r) => r.quests, outLabel: 'quests cleared', unit: '', min: 0.5, higherIsGood: true, fmt: (v) => v.toFixed(1) },
  { id: 'water-energy', icon: 'cup-water', color: '#3CC8FF', cond: (r) => (r.water === undefined ? undefined : r.water >= 6), condLabel: 'you drink 6+ glasses', out: (r) => r.energy, outLabel: 'energy', unit: '/5', min: 0.3, higherIsGood: true },
  { id: 'sleep-mood', icon: 'weather-night', color: '#FFD166', cond: (r) => (r.sleep === undefined ? undefined : r.sleep >= 7), condLabel: 'you sleep 7+ hours', out: (r) => r.mood, outLabel: 'mood', unit: '/5', min: 0.3, higherIsGood: true },
];

export const INSIGHT_MIN_EACH = 3;

export function insights(s: GameState, date: string): InsightCard[] {
  const rows = dayRows(s, date);
  const cards: InsightCard[] = [];
  for (const rule of RULES) {
    const yes: number[] = [];
    const no: number[] = [];
    rows.forEach((r, i) => {
      const c = rule.cond(r);
      if (c === undefined) return;
      const target = rule.lag ? rows[i + 1] : r;
      if (!target) return;
      const v = rule.out(target);
      if (v === undefined) return;
      (c ? yes : no).push(v);
    });
    if (yes.length < INSIGHT_MIN_EACH || no.length < INSIGHT_MIN_EACH) continue;
    const diff = mean(yes) - mean(no);
    if (Math.abs(diff) < rule.min) continue;
    const better = rule.higherIsGood ? diff > 0 : diff < 0;
    const amount = rule.fmt ? rule.fmt(Math.abs(diff)) : `${Math.abs(diff).toFixed(1)}${rule.unit}`;
    cards.push({
      id: rule.id,
      icon: rule.icon,
      color: better ? rule.color : '#FF8A3D',
      title: `${rule.outLabel[0].toUpperCase()}${rule.outLabel.slice(1)} ${diff > 0 ? '↑' : '↓'} ${amount}`,
      text: `On days ${rule.condLabel}, your ${rule.outLabel} is ${amount} ${diff > 0 ? 'higher' : 'lower'} than on other days.`,
      n: yes.length + no.length,
    });
  }
  // trend: sleep this week vs last week
  const last7 = rows.slice(-7).map((r) => r.sleep).filter((v): v is number => v !== undefined);
  const prev7 = rows.slice(-14, -7).map((r) => r.sleep).filter((v): v is number => v !== undefined);
  if (last7.length >= 3 && prev7.length >= 3) {
    const d = mean(last7) - mean(prev7);
    if (Math.abs(d) >= 0.25)
      cards.push({ id: 'sleep-trend', icon: 'chart-line', color: d > 0 ? '#45F0A0' : '#FF8A3D', title: `Sleep ${d > 0 ? 'up' : 'down'} ${Math.round(Math.abs(d) * 60)} min`, text: `You averaged ${mean(last7).toFixed(1)} h this week vs ${mean(prev7).toFixed(1)} h the week before.`, n: last7.length + prev7.length });
  }
  // best weekday for quests
  const byDow = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) byDow[fromDateKey(r.date).getDay()] += r.quests;
  const total = byDow.reduce((a, b) => a + b, 0);
  if (total >= 10) {
    const best = byDow.indexOf(Math.max(...byDow));
    const name = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][best];
    cards.push({ id: 'best-day', icon: 'calendar-star', color: '#FFD166', title: `${name} is your power day`, text: `You clear the most quests on ${name}s. Schedule hard things then.`, n: rows.length });
  }
  return cards.sort((a, b) => b.n - a.n);
}
