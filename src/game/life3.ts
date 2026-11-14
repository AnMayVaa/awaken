/**
 * v3 life trackers — mutations. Each one is small, rewards awareness (not perfection),
 * and feeds the systems that already exist: stats, boss damage, side-quest metrics, recovery counters.
 */
import { addDays, diffDays, today as todayKey } from './date';
import { addStatXp, damageBoss, emit, evaluateMetrics, grantGold, grantXp, log, maxHp } from './engine';
import { uid } from './rng';
import {
  daysSinceContact,
  foodCounts,
  MONEY_CAT_MAP,
  PLAN_SIZE,
  SEASON_DAYS,
  SEASON_TIERS,
  seasonInfo,
  skillTier,
  spentOn,
  WISH_WAIT_MS,
  fmtMoney,
  slotForHour,
} from './tracking';
import type { FoodTag, GameEvent, GameState, MealSlot, MoneyCat, Person, StatKey } from './types';

const MAX_MEALS = 600;
const MAX_EXPENSES = 2000;
const KEEP_DAYS = 120;
/** small tracking rewards are capped per day so logging never becomes a grind */
const MEAL_REWARDS_PER_DAY = 4;
const SPEND_REWARDS_PER_DAY = 5;

function rewardDay(s: GameState) {
  const t = todayKey();
  if (s.track.rewardDay.date !== t) s.track.rewardDay = { date: t, meals: 0, spends: 0 };
  return s.track.rewardDay;
}

/* ------------------------------------------------------------------ */
/* Fuel (nutrition)                                                    */
/* ------------------------------------------------------------------ */

export function logMeal(s: GameState, ev: GameEvent[], input: { tags: FoodTag[]; slot?: MealSlot; note?: string; ai?: boolean }) {
  const t = todayKey();
  const before = foodCounts(s, t);
  const slot = input.slot ?? slotForHour(new Date().getHours());
  s.track.meals.push({ id: uid('m'), ts: Date.now(), date: t, slot, tags: [...new Set(input.tags)], note: input.note?.trim() || undefined, ai: input.ai });
  if (s.track.meals.length > MAX_MEALS) s.track.meals.splice(0, s.track.meals.length - MAX_MEALS);

  const rd = rewardDay(s);
  const lines: string[] = [];
  if (rd.meals < MEAL_REWARDS_PER_DAY) {
    rd.meals += 1;
    const plants = (input.tags.includes('veg') ? 1 : 0) + (input.tags.includes('fruit') ? 1 : 0);
    const xp = grantXp(s, ev, 5 + plants * 3 + (input.tags.includes('homemade') ? 3 : 0), 'life', 'VIT');
    lines.push(`+${xp} XP for logging`);
    // Synergy: veggies hit the weekly boss
    if (plants) {
      damageBoss(s, ev, plants * 15);
      lines.push(`Veggie strike: ${plants * 15} bonus boss damage`);
    }
    // Synergy: protein on a training day feeds Strength
    if (input.tags.includes('protein') && s.workouts.some((w) => w.date === t)) {
      addStatXp(s, ev, 'STR', 12);
      lines.push('Recovery fuel: +12 STR progress (you trained today)');
    }
  }
  const after = foodCounts(s, t);
  if (before.plants < 4 && after.plants >= 4) {
    const g = grantGold(s, 20);
    lines.push(`Rainbow day! +${g} gold`);
  }
  emit(ev, 'reward', 'MEAL LOGGED', lines.length ? lines : ['Logged. Awareness is the first step.'], true);
  evaluateMetrics(s, ev);
}

export function deleteMeal(s: GameState, id: string) {
  s.track.meals = s.track.meals.filter((m) => m.id !== id);
}

export function addWater(s: GameState, ev: GameEvent[], delta: number) {
  const t = todayKey();
  const prev = s.track.water[t] ?? 0;
  const next = Math.max(0, Math.min(30, prev + delta));
  s.track.water[t] = next;
  if (delta > 0) {
    s.player.hp = Math.min(s.player.hp + 2 * delta, maxHp(s.player));
    if (prev < s.track.waterGoal && next >= s.track.waterGoal) {
      const xp = grantXp(s, ev, 15, 'life', 'VIT');
      emit(ev, 'reward', 'HYDRATED', [`Water goal reached · +${xp} XP`, 'HP regenerates with every glass.'], true);
    }
  }
  evaluateMetrics(s, ev);
}

export function setWaterGoal(s: GameState, goal: number) {
  s.track.waterGoal = Math.max(4, Math.min(16, Math.round(goal)));
}

/* ------------------------------------------------------------------ */
/* Treasury (money)                                                    */
/* ------------------------------------------------------------------ */

export function logExpense(s: GameState, ev: GameEvent[], input: { amount: number; cat: MoneyCat; note?: string; essential?: boolean }) {
  const amount = Math.round(Math.abs(input.amount) * 100) / 100;
  if (!amount) return false;
  const t = todayKey();
  const essential = input.essential ?? MONEY_CAT_MAP[input.cat].essential;
  s.track.expenses.push({ id: uid('x'), ts: Date.now(), date: t, amount, cat: input.cat, note: input.note?.trim() || undefined, essential });
  if (s.track.expenses.length > MAX_EXPENSES) s.track.expenses.splice(0, s.track.expenses.length - MAX_EXPENSES);
  if (!essential && s.track.noSpend[t]) delete s.track.noSpend[t];

  const rd = rewardDay(s);
  const lines = [`${fmtMoney(amount)} · ${MONEY_CAT_MAP[input.cat].label}${essential ? '' : ' (want)'}`];
  if (rd.spends < SPEND_REWARDS_PER_DAY) {
    rd.spends += 1;
    const xp = grantXp(s, ev, 4, 'life', 'SEN');
    lines.push(`+${xp} XP for tracking`);
  }
  // budget warning
  const limit = s.track.budgets[input.cat];
  if (limit) {
    const month = t.slice(0, 7);
    const spent = s.track.expenses.filter((e) => e.cat === input.cat && e.date.slice(0, 7) === month).reduce((a, e) => a + e.amount, 0);
    if (spent > limit && spent - amount <= limit) {
      emit(ev, 'warning', 'BUDGET EXCEEDED', [`${MONEY_CAT_MAP[input.cat].label}: ${fmtMoney(spent)} of ${fmtMoney(limit)}`, 'No penalty — adjust the budget or slow down this month.'], true);
      return true;
    }
  }
  emit(ev, 'reward', 'EXPENSE LOGGED', lines, true);
  evaluateMetrics(s, ev);
  return true;
}

export function deleteExpense(s: GameState, id: string) {
  s.track.expenses = s.track.expenses.filter((e) => e.id !== id);
}

export function setBudget(s: GameState, cat: MoneyCat, amount: number) {
  if (amount > 0) s.track.budgets[cat] = Math.round(amount);
  else delete s.track.budgets[cat];
}

/** Mark today as a no-spend day (no non-essential spending). */
export function declareNoSpend(s: GameState, ev: GameEvent[]) {
  const t = todayKey();
  if (s.track.noSpend[t]) return false;
  if (spentOn(s, t, true) > 0) {
    emit(ev, 'warning', 'NOT A NO-SPEND DAY', ['You logged spending on wants today. Try again tomorrow!'], true);
    return true;
  }
  s.track.noSpend[t] = true;
  const xp = grantXp(s, ev, 20, 'life', 'WIL');
  emit(ev, 'reward', 'NO-SPEND DAY', [`+${xp} XP · your wallet thanks you`], true);
  evaluateMetrics(s, ev);
  return true;
}

export function addWish(s: GameState, ev: GameEvent[], name: string, price: number) {
  if (!name.trim() || !(price > 0)) return false;
  s.track.wishlist.unshift({ id: uid('w'), name: name.trim(), price: Math.round(price), addedAt: Date.now(), status: 'waiting' });
  emit(ev, 'info', 'IMPULSE SHIELD', [`“${name.trim()}” is on hold for 24 h.`, 'If you still want it tomorrow, buy it guilt-free.'], true);
  return true;
}

export function decideWish(s: GameState, ev: GameEvent[], id: string, buy: boolean) {
  const w = s.track.wishlist.find((x) => x.id === id);
  if (!w || w.status !== 'waiting') return false;
  w.status = buy ? 'bought' : 'skipped';
  w.decidedAt = Date.now();
  if (buy) {
    logExpense(s, ev, { amount: w.price, cat: 'shopping', note: w.name, essential: false });
  } else {
    s.track.savedByWaiting += w.price;
    s.counters.urgesResisted += 1;
    const early = Date.now() - w.addedAt < WISH_WAIT_MS;
    const xp = grantXp(s, ev, early ? 15 : 25, 'life', 'WIL');
    emit(ev, 'reward', 'URGE RESISTED', [`Skipped “${w.name}” · ${fmtMoney(w.price)} kept`, `+${xp} XP · total kept: ${fmtMoney(s.track.savedByWaiting)}`]);
  }
  return true;
}

export function deleteWish(s: GameState, id: string) {
  s.track.wishlist = s.track.wishlist.filter((w) => w.id !== id);
}

export function addGoal(s: GameState, name: string, target: number, deadline?: string) {
  if (!name.trim() || !(target > 0)) return false;
  s.track.goals.push({ id: uid('sg'), name: name.trim(), target: Math.round(target), saved: 0, deadline, createdAt: Date.now(), marks: 0 });
  return true;
}

export function depositGoal(s: GameState, ev: GameEvent[], id: string, amount: number) {
  const g = s.track.goals.find((x) => x.id === id);
  if (!g || g.doneAt || !amount) return false;
  g.saved = Math.max(0, Math.round(g.saved + amount));
  const marks = Math.min(4, Math.floor((g.saved / g.target) * 4));
  if (amount > 0) grantXp(s, ev, 10, 'life', 'WIL');
  while (g.marks < marks) {
    g.marks += 1;
    if (g.marks === 4) {
      g.doneAt = Date.now();
      const gold = grantGold(s, 150);
      const xp = grantXp(s, ev, 200, 'life', 'WIL');
      emit(ev, 'achievement', 'SAVINGS GOAL COMPLETE', [g.name, `${fmtMoney(g.target)} saved`, `+${xp} XP  +${gold} Gold`]);
      log(s, `Savings goal reached: ${g.name}.`, 'achievement');
    } else {
      const gold = grantGold(s, 30 * g.marks);
      emit(ev, 'reward', `SAVINGS ${g.marks * 25}%`, [g.name, `+${gold} Gold`], true);
    }
  }
  return true;
}

export function deleteGoal(s: GameState, id: string) {
  s.track.goals = s.track.goals.filter((g) => g.id !== id);
}

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

export function addSkill(s: GameState, name: string, icon: string, stat: StatKey) {
  if (!name.trim()) return false;
  s.track.skills.push({ id: uid('sk'), name: name.trim(), icon, stat, minutes: 0, log: [], createdAt: Date.now() });
  return true;
}

export function logSkill(s: GameState, ev: GameEvent[], id: string, minutes: number) {
  const sk = s.track.skills.find((x) => x.id === id);
  const min = Math.round(minutes);
  if (!sk || min <= 0 || min > 600) return false;
  const t = todayKey();
  const before = skillTier(sk.minutes);
  sk.minutes += min;
  const last = sk.log[sk.log.length - 1];
  if (last && last.date === t) last.min += min;
  else sk.log.push({ date: t, min });
  if (sk.log.length > 400) sk.log.splice(0, sk.log.length - 400);
  const xp = grantXp(s, ev, Math.round(min / 2), 'life', sk.stat);
  const after = skillTier(sk.minutes);
  if (after.index > before.index) {
    const gold = grantGold(s, 50 * after.index);
    emit(ev, 'rankup', 'SKILL TIER UP', [sk.name, `${before.name}  →  ${after.name}`, `${Math.floor(after.hours)} hours practised · +${gold} Gold`]);
    log(s, `${sk.name} reached ${after.name}.`, 'rankup');
  } else {
    emit(ev, 'reward', 'PRACTICE LOGGED', [`${sk.name} +${min} min · +${xp} XP`, after.next ? `${Math.round((after.nextHours! - after.hours) * 10) / 10} h to ${after.next}` : 'Max tier'], true);
  }
  evaluateMetrics(s, ev);
  return true;
}

export function deleteSkill(s: GameState, id: string) {
  s.track.skills = s.track.skills.filter((x) => x.id !== id);
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export function addPerson(s: GameState, p: Pick<Person, 'name' | 'relation' | 'everyDays'>) {
  if (!p.name.trim()) return false;
  s.track.people.push({ id: uid('p'), name: p.name.trim(), relation: p.relation, everyDays: Math.max(1, Math.min(90, Math.round(p.everyDays))), createdAt: Date.now() });
  return true;
}

export function updatePerson(s: GameState, id: string, patch: Partial<Pick<Person, 'name' | 'relation' | 'everyDays'>>) {
  const p = s.track.people.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
}

export function contactPerson(s: GameState, ev: GameEvent[], id: string) {
  const p = s.track.people.find((x) => x.id === id);
  const t = todayKey();
  if (!p || p.lastContact === t) return false;
  const overdue = daysSinceContact(p, t) >= p.everyDays;
  p.lastContact = t;
  const xp = grantXp(s, ev, overdue ? 20 : 10, 'quest', 'CHA');
  emit(ev, 'reward', 'BOND STRENGTHENED', [`You reached out to ${p.name}`, `+${xp} XP${overdue ? ' · reconnected' : ''}`], true);
  evaluateMetrics(s, ev);
  return true;
}

export function deletePerson(s: GameState, id: string) {
  s.track.people = s.track.people.filter((x) => x.id !== id);
}

/* ------------------------------------------------------------------ */
/* Morning plan: Top 3                                                 */
/* ------------------------------------------------------------------ */

export function setPlan(s: GameState, texts: string[]) {
  const t = todayKey();
  const prev = s.track.plans[t];
  const items = texts
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, PLAN_SIZE)
    .map((text) => ({ text, done: prev?.items.find((i) => i.text === text)?.done ?? false }));
  if (!items.length) {
    delete s.track.plans[t];
    return;
  }
  s.track.plans[t] = { date: t, items, bonus: prev?.bonus };
}

export function togglePlanItem(s: GameState, ev: GameEvent[], index: number) {
  const t = todayKey();
  const p = s.track.plans[t];
  const it = p?.items[index];
  if (!p || !it) return false;
  it.done = !it.done;
  if (it.done) {
    const xp = grantXp(s, ev, 12, 'quest', 'WIL');
    if (p.items.every((i) => i.done) && !p.bonus && p.items.length >= PLAN_SIZE) {
      p.bonus = true;
      s.counters.totals.top3 = (s.counters.totals.top3 ?? 0) + 1;
      const gold = grantGold(s, 30);
      const bonus = grantXp(s, ev, 30, 'quest', 'WIL');
      emit(ev, 'reward', 'TOP 3 CLEARED', [`Everything that mattered today: done.`, `+${xp + bonus} XP  +${gold} Gold`]);
    } else {
      emit(ev, 'reward', 'TASK DONE', [it.text, `+${xp} XP`], true);
    }
  }
  evaluateMetrics(s, ev);
  return true;
}

/* ------------------------------------------------------------------ */
/* Seasons                                                             */
/* ------------------------------------------------------------------ */

export function claimSeasonTier(s: GameState, ev: GameEvent[], index: number) {
  const info = seasonInfo(s, todayKey());
  if (!info.unclaimed.includes(index)) return false;
  const tier = SEASON_TIERS[index];
  s.track.season.claimed.push(index);
  const gold = grantGold(s, tier.gold);
  const lines = [`Tier ${index + 1} reward`, `+${gold} Gold`];
  if (tier.item) {
    s.inventory[tier.item] = (s.inventory[tier.item] ?? 0) + 1;
    lines.push(`+1 ${tier.item.replace(/_/g, ' ')}`);
  }
  emit(ev, 'reward', `SEASON ${info.n} · TIER ${index + 1}`, lines, true);
  return true;
}

/** Daily housekeeping: season roll, pruning. Returns true if state changed. */
export function trackTick(s: GameState, ev: GameEvent[]): boolean {
  const t = todayKey();
  let changed = false;
  const se = s.track.season;
  if (diffDays(se.startDate, t) >= SEASON_DAYS) {
    // auto-claim anything left so nothing earned is lost
    const info = seasonInfo(s, addDays(se.startDate, SEASON_DAYS - 1));
    for (const i of info.unclaimed) claimSeasonTier(s, ev, i);
    const ended = se.n;
    s.track.season = { n: ended + 1, startDate: t, xpStart: s.player.totalXp, claimed: [] };
    if (s.onboarded) {
      emit(ev, 'rankup', `SEASON ${ended} COMPLETE`, [`You reached tier ${info.reached} of ${SEASON_TIERS.length}.`, `Season ${ended + 1} begins now — 66 days, new rewards.`]);
      log(s, `Season ${ended} ended at tier ${info.reached}.`, 'rankup');
    }
    changed = true;
  }
  const prune = (map: Record<string, unknown>, days: number) => {
    for (const k of Object.keys(map)) {
      if (diffDays(k, t) > days) {
        delete map[k];
        changed = true;
      }
    }
  };
  prune(s.track.water, KEEP_DAYS);
  prune(s.track.noSpend, KEEP_DAYS);
  prune(s.track.plans, 30);
  return changed;
}
