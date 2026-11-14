/**
 * AI Quest Director — asks the `ai-quests` Supabase Edge Function (Gemini) for
 * personalised quests. Only coarse, non-identifying context is sent. Mood, wellbeing
 * scores and recovery goals stay on the device unless the player opts in.
 */
import { AREA_IDS } from '@/game/areas';
import { addDays } from '@/game/date';
import { latestWheel, successRate } from '@/game/director';
import type { AIQuestInput } from '@/game/engine';
import { RECOVERY_MAP } from '@/game/recovery';
import { budgetRows, foodCounts, moneyScore, noSpendStreak, nutritionScore, peopleDue } from '@/game/tracking';
import type { GameState } from '@/game/types';

import { cloudEnabled, supabase } from './supabase';

export function aiAvailable() {
  return cloudEnabled && !!supabase;
}

export function buildAIContext(g: GameState, wish?: string) {
  const t = g.board.date;
  const y = g.checkins[addDays(t, -1)];
  const wheel = latestWheel(g);
  return {
    date: t,
    weekday: new Date(`${t}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }),
    level: g.player.level,
    difficulty: g.settings.difficulty,
    count: Math.max(2, Math.min(5, g.profile.questLoad)),
    minutes: g.profile.dailyMinutes,
    focusAreas: g.profile.focusAreas,
    areas: Object.fromEntries(
      AREA_IDS.map((a) => {
        const p = g.areas[a];
        const sr = successRate(p);
        return [a, { tier: Math.round(p.tier * 10) / 10, success: sr === null ? null : Math.round(sr * 100) }];
      }),
    ),
    wheel: wheel?.ratings ?? null,
    yesterday: y ? { steps: y.steps ?? null, sleepHours: y.sleepHours ?? null, screenMinutes: y.screenMinutes ?? null } : null,
    recentDone: g.questHistory.filter((h) => h.status === 'done').slice(0, 10).map((h) => h.title),
    recentSkipped: g.questHistory.filter((h) => h.status !== 'done').slice(0, 6).map((h) => h.title),
    onBoard: g.board.quests.map((q) => q.title),
    mainQuests: g.mainQuests.filter((m) => m.status === 'active').map((m) => m.title).slice(0, 5),
    recovery: g.profile.aiShareRecovery ? g.recovery.map((r) => RECOVERY_MAP[r.category].name) : [],
    fuel: (() => {
      const f = foodCounts(g, addDays(t, -1));
      return { score7d: nutritionScore(g, t), yesterdayMeals: f.meals, yesterdayVegFruit: f.plants, yesterdayFastFood: f.junk, yesterdayWater: g.track.water[addDays(t, -1)] ?? null };
    })(),
    money: { score: moneyScore(g, t), overBudget: budgetRows(g, t).filter((r) => r.pct > 1).map((r) => r.cat), noSpendStreak: noSpendStreak(g, t) },
    skills: g.track.skills.map((k) => k.name).slice(0, 5),
    peopleDue: peopleDue(g, t).length,
    wish: wish?.trim().slice(0, 300) || null,
  };
}

export async function requestAIQuests(g: GameState, wish?: string): Promise<{ quests: AIQuestInput[] } | { error: string }> {
  if (!supabase) return { error: 'Cloud is not configured.' };
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return { error: 'Sign in (Settings → Account) to use AI quests.' };
  try {
    const { data, error } = await supabase.functions.invoke('ai-quests', { body: buildAIContext(g, wish) });
    if (error) {
      let msg = error.message;
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const j = await ctx.json();
          if (j?.error) msg = j.error;
        } catch {}
      }
      if (/not found|404/i.test(msg)) msg = 'The ai-quests function is not deployed yet (see README → AI quests).';
      return { error: msg };
    }
    const quests = (data as { quests?: AIQuestInput[] })?.quests;
    if (!Array.isArray(quests) || !quests.length) return { error: 'The AI returned no quests. Try again.' };
    return { quests };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
