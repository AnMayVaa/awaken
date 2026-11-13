/**
 * The Quest Director — an offline, adaptive quest generator.
 *
 * - Difficulty per life area adapts toward an ~80–85% success rate
 *   (challenging but achievable; cf. the "85% rule" for optimal learning and flow theory).
 * - Area weights favour your focus areas, low Life Wheel ratings and yesterday's data
 *   (short sleep → health quests, high screen time → digital quests, low mood → gentle mind quests).
 * - Avoids repeating quests you saw in the last few days and balances areas.
 */
import { AREA_IDS, type AreaId } from './areas';
import { addDays, diffDays, weekId } from './date';
import { QUEST_LIBRARY, QUEST_MAP, SIDE_REWARDS, type QuestMetric, type QuestTemplate } from './questLibrary';
import { rand01, uid } from './rng';
import type { AreaProgress, BoardQuest, DayActivity, GameState, LifeProfile } from './types';

export const TARGET_SUCCESS = 0.82;
export const MAX_BOARD = 8;
export const DAILY_REROLLS = 3;

export function defaultProfile(): LifeProfile {
  return { focusAreas: ['fitness', 'mind', 'learning'], questLoad: 4, dailyMinutes: 60, aiEnabled: false, aiShareRecovery: false };
}

export function defaultAreas(startTier = 1.6): Record<AreaId, AreaProgress> {
  return Object.fromEntries(AREA_IDS.map((a) => [a, { tier: startTier, done: 0, skipped: 0, expired: 0, recent: [] as number[] }])) as unknown as Record<AreaId, AreaProgress>;
}

export function successRate(p: AreaProgress): number | null {
  if (p.recent.length < 3) return null;
  return p.recent.reduce((a, b) => a + b, 0) / p.recent.length;
}

/** Adapt an area's difficulty after an outcome. */
export function adapt(p: AreaProgress, outcome: 'done' | 'skipped' | 'expired', questTier: number) {
  p.recent.push(outcome === 'done' ? 1 : 0);
  if (p.recent.length > 20) p.recent.shift();
  if (outcome === 'done') {
    p.done += 1;
    // finishing a harder-than-current quest pushes harder
    p.tier += 0.1 + Math.max(0, questTier - p.tier) * 0.12;
  } else if (outcome === 'skipped') {
    p.skipped += 1;
    p.tier -= 0.06;
  } else {
    p.expired += 1;
    p.tier -= 0.14;
  }
  // nudge toward target success rate once there is enough data
  const sr = successRate(p);
  if (sr !== null) p.tier += (sr - TARGET_SUCCESS) * 0.15;
  p.tier = Math.max(1, Math.min(5, p.tier));
}

export function latestWheel(s: GameState) {
  return s.wheel.length ? s.wheel[s.wheel.length - 1] : null;
}

export function areaWeights(s: GameState, date: string): Record<AreaId, number> {
  const w = Object.fromEntries(AREA_IDS.map((a) => [a, 1])) as Record<AreaId, number>;
  for (const a of s.profile.focusAreas) w[a] *= 3;
  const wheel = latestWheel(s);
  if (wheel) {
    for (const a of AREA_IDS) {
      const r = wheel.ratings[a];
      if (r !== undefined) w[a] *= r <= 4 ? 2.2 : r <= 6 ? 1.5 : r >= 9 ? 0.7 : 1;
    }
  }
  const lastReview = s.reviews[s.reviews.length - 1];
  if (lastReview && diffDays(lastReview.date, date) <= 7) for (const a of lastReview.focus) w[a] *= 1.8;
  if (s.recovery.length) w.digital *= 1.4;
  const y = s.checkins[addDays(date, -1)];
  if (y) {
    if (y.sleepHours !== undefined && y.sleepHours < 7) w.health *= 2;
    if (y.screenMinutes !== undefined && y.screenMinutes > 240) w.digital *= 2;
    if (y.steps !== undefined && y.steps < 5000) w.fitness *= 1.5;
    if (y.mood !== undefined && y.mood <= 2) w.mind *= 2;
  }
  return w;
}

function weightedPick<T>(items: T[], weight: (t: T) => number, r: number): T | null {
  const total = items.reduce((a, t) => a + Math.max(0, weight(t)), 0);
  if (total <= 0) return null;
  let x = r * total;
  for (const t of items) {
    x -= Math.max(0, weight(t));
    if (x <= 0) return t;
  }
  return items[items.length - 1] ?? null;
}

export function boardQuestFrom(t: QuestTemplate, source: BoardQuest['source'] = 'library'): BoardQuest {
  return {
    id: uid('bq'),
    templateId: t.id,
    source,
    area: t.area,
    title: t.title,
    criteria: t.criteria,
    why: t.why,
    tier: t.tier,
    minutes: t.minutes,
    stat: t.stat,
    metric: t.metric,
    status: 'open',
  };
}

function recentTemplateIds(s: GameState, date: string, days = 5) {
  const ids = new Set<string>();
  for (const h of s.questHistory) {
    if (h.templateId && diffDays(h.date, date) <= days) ids.add(h.templateId);
  }
  return ids;
}

/** Pick one quest for an area at an adaptive tier. */
export function pickForArea(s: GameState, area: AreaId, date: string, salt: string, exclude: Set<string>): QuestTemplate | null {
  const target = s.areas[area]?.tier ?? 1.6;
  const lowMood = (s.checkins[addDays(date, -1)]?.mood ?? 3) <= 2;
  const pool = QUEST_LIBRARY.filter((q) => q.area === area && !exclude.has(q.id));
  return weightedPick(
    pool,
    (q) => {
      const d = q.tier - target;
      // mostly at level, sometimes a stretch, rarely easier
      let w = Math.exp(-(d * d) / 0.9);
      if (d > 0.5 && d < 1.6) w *= 1.15;
      if (lowMood && q.tier > 2) w *= 0.4;
      if (q.minutes > s.profile.dailyMinutes) w *= 0.2;
      return w;
    },
    rand01('pick', area, date, salt, s.player.createdAt),
  );
}

export function generateBoard(s: GameState, date: string, count = s.profile.questLoad): BoardQuest[] {
  const weights = areaWeights(s, date);
  const exclude = recentTemplateIds(s, date);
  const quests: BoardQuest[] = [];
  const perArea: Partial<Record<AreaId, number>> = {};
  let minutes = 0;
  for (let i = 0; i < count * 4 && quests.length < count; i++) {
    const area = weightedPick(
      AREA_IDS,
      (a) => weights[a] / (1 + (perArea[a] ?? 0) * 2.5), // spread across areas
      rand01('area', date, i, s.player.createdAt),
    );
    if (!area) break;
    const t = pickForArea(s, area, date, String(i), exclude);
    if (!t) continue;
    if (minutes + t.minutes > s.profile.dailyMinutes * 1.25 && quests.length >= 2) continue;
    exclude.add(t.id);
    perArea[area] = (perArea[area] ?? 0) + 1;
    minutes += t.minutes;
    quests.push(boardQuestFrom(t, 'director'));
  }
  return quests;
}

export function sideReward(tier: number, level: number) {
  const r = SIDE_REWARDS[Math.max(1, Math.min(5, Math.round(tier)))];
  const m = 1 + (level - 1) * 0.03;
  return { xp: Math.round(r.xp * m), gold: Math.round(r.gold * m) };
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export function metricValue(s: GameState, key: QuestMetric['key'], date: string): number | undefined {
  const c = s.checkins[date];
  if (key === 'steps') return c?.steps;
  if (key === 'sleep') return c?.sleepHours;
  if (key === 'screen') return c?.screenMinutes;
  if (key === 'checkin') return c?.savedAt ? 1 : 0;
  if (key === 'review') return s.reviews.some((r) => r.week === weekId(date)) ? 1 : 0;
  if (key === 'milestone') return s.activity[date]?.milestones ?? 0;
  if (key === 'focus') return s.activity[date]?.focusMin ?? 0;
  if (key.startsWith('w:')) {
    const id = key.slice(2);
    return s.workouts.filter((w) => w.date === date && w.exerciseId === id).reduce((a, w) => a + w.amount, 0);
  }
  return undefined;
}

export function metricMet(s: GameState, m: QuestMetric, date: string): boolean {
  const v = metricValue(s, m.key, date);
  if (v === undefined) return false;
  return m.op === 'gte' ? v >= m.value : v <= m.value;
}

export function metricProgress(s: GameState, m: QuestMetric, date: string): { value?: number; pct: number } {
  const v = metricValue(s, m.key, date);
  if (v === undefined) return { pct: 0 };
  if (m.op === 'lte') return { value: v, pct: v <= m.value ? 1 : Math.max(0, 1 - (v - m.value) / m.value) };
  return { value: v, pct: Math.min(1, v / m.value) };
}

export const METRIC_LABEL: Record<string, string> = {
  steps: 'steps',
  sleep: 'h sleep',
  screen: 'min screen time',
  focus: 'focus min',
  checkin: 'check-in',
  review: 'review',
  milestone: 'milestone',
};

/* ------------------------------------------------------------------ */
/* Fulfilment                                                          */
/* ------------------------------------------------------------------ */

export function activeDays(s: GameState, date: string, days = 14) {
  let n = 0;
  for (let i = 0; i < days; i++) {
    const a: DayActivity | undefined = s.activity[addDays(date, -i)];
    if (a && (a.daily || (a.side ?? 0) > 0 || (a.habits ?? 0) > 0 || a.checkin)) n++;
  }
  return n;
}

export interface LifeScore {
  score: number | null;
  wellbeing: number | null;
  wheel: number | null;
  consistency: number;
  parts: { label: string; value: number | null; weight: number }[];
}

/**
 * Life Score (0–100), transparent blend of:
 *   35%  WHO-5 wellbeing (validated 5-item questionnaire)
 *   35%  Life Wheel self-ratings (average × 10)
 *   30%  Consistency (active days in the last 14)
 * Missing parts are skipped and the weights renormalised.
 */
export function lifeScore(s: GameState, date: string): LifeScore {
  const wb = s.wellbeing.length ? s.wellbeing[s.wellbeing.length - 1].score : null;
  const wh = latestWheel(s);
  const vals = wh ? Object.values(wh.ratings).filter((v): v is number => typeof v === 'number') : [];
  const wheel = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) * 10 : null;
  const consistency = Math.round((activeDays(s, date) / 14) * 100);
  const parts = [
    { label: 'Wellbeing (WHO-5)', value: wb, weight: 0.35 },
    { label: 'Life Wheel', value: wheel === null ? null : Math.round(wheel), weight: 0.35 },
    { label: 'Consistency (14 days)', value: consistency, weight: 0.3 },
  ];
  const used = parts.filter((p) => p.value !== null);
  const wsum = used.reduce((a, p) => a + p.weight, 0);
  const score = wb === null && wheel === null ? null : Math.round(used.reduce((a, p) => a + (p.value as number) * p.weight, 0) / wsum);
  return { score, wellbeing: wb, wheel: wheel === null ? null : Math.round(wheel), consistency, parts };
}

export function areaActivity(s: GameState, date: string, days = 14): Record<AreaId, number> {
  const out = Object.fromEntries(AREA_IDS.map((a) => [a, 0])) as Record<AreaId, number>;
  for (const h of s.questHistory) if (h.status === 'done' && diffDays(h.date, date) < days) out[h.area] += 1;
  return out;
}

export function wellbeingDue(s: GameState, date: string) {
  const last = s.wellbeing[s.wellbeing.length - 1];
  return !last || diffDays(last.date, date) >= 14;
}

export function wheelDue(s: GameState, date: string) {
  const last = latestWheel(s);
  return !last || diffDays(last.date, date) >= 14;
}

export function avg(nums: (number | undefined)[]) {
  const v = nums.filter((n): n is number => typeof n === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function weekAverages(s: GameState, date: string) {
  const days = Array.from({ length: 7 }, (_, i) => s.checkins[addDays(date, -i)]);
  return {
    mood: avg(days.map((d) => d?.mood)),
    sleep: avg(days.map((d) => d?.sleepHours)),
    screen: avg(days.map((d) => d?.screenMinutes)),
    steps: avg(days.map((d) => d?.steps)),
  };
}

export { QUEST_MAP };
