/// <reference types="node" />
import assert from 'node:assert/strict';
import * as E from '../src/game/engine';
import { botSnapshot, generateCandidates, botFeed } from '../src/game/bots';
import type { GameEvent } from '../src/game/types';
import { QUEST_LIBRARY } from '../src/game/questLibrary';
import { generateBoard, lifeScore, metricMet } from '../src/game/director';
import { AREA_IDS } from '../src/game/areas';
import { CAMPAIGNS } from '../src/game/campaigns';
import { buildPlan, defaultAnswers } from '../src/game/plan';
import { crateDay, dailyBuff, weeklyChallenges, companionStage } from '../src/game/fun';
import { addDays, today, weekId } from '../src/game/date';

const t = today();
let ev: GameEvent[] = [];
const fresh = () => { const s = E.createInitialState('Tester'); s.onboarded = true; return s; };

// 1. daily quest completion through workouts
{
  const s = fresh(); ev = [];
  for (const task of s.daily.tasks) E.logWorkout(s, ev, task.exerciseId, task.target);
  assert.equal(s.daily.completed, true, 'daily completed');
  assert.equal(s.counters.dailyStreak, 1);
  assert.ok(s.player.freePoints >= 1);
  assert.ok(ev.some(e => e.title === 'DAILY QUEST COMPLETE'));
  console.log('✓ daily completes; level', s.player.level, 'xp', s.player.totalXp, 'gold', s.player.gold);
}

// 2. missed day → penalty, then clear it
{
  const s = fresh(); ev = [];
  s.lastDate = addDays(t, -1); s.daily.date = addDays(t, -1);
  const hp0 = s.player.hp;
  E.rollover(s, ev);
  assert.ok(s.player.hp < hp0, 'hp dropped');
  assert.ok(E.isPenaltyActive(s), 'penalty active');
  assert.equal(s.daily.date, t);
  assert.equal(s.counters.dailyStreak, 0);
  const xpBefore = s.player.totalXp;
  E.grantXp(s, ev, 100, 'quest');
  assert.equal(s.player.totalXp - xpBefore, 50, 'xp halved under penalty');
  for (const task of s.penalty!.tasks) E.logWorkout(s, ev, task.exerciseId, task.target);
  assert.equal(s.penalty, null, 'penalty cleared');
  assert.equal(s.counters.penaltiesCleared, 1);
  console.log('✓ penalty applied and cleared; hp', s.player.hp);
}

// 3. multiple missed days capped at 3 penalties; HP zero handling
{
  const s = fresh(); ev = [];
  s.lastDate = addDays(t, -10); s.daily.date = s.lastDate;
  E.rollover(s, ev);
  assert.equal(s.counters.penaltiesTaken, 3);
  assert.ok(s.player.hp > 0, 'hp never ends at zero');
  console.log('✓ long absence → 3 penalties, hp', s.player.hp);
}

// 4. habit streak: shield saves, otherwise reset
{
  const s = fresh(); ev = [];
  E.addHabit(s, { name: 'Water', icon: 'water', stat: 'VIT', kind: 'build' });
  const h = s.habits[0];
  h.startDate = addDays(t, -3); h.checks = [addDays(t, -3), addDays(t, -2)];
  s.lastDate = addDays(t, -1); s.daily.date = s.lastDate; s.daily.completed = true;
  s.inventory.streak_shield = 1;
  E.rollover(s, ev);
  assert.equal(h.checks.length, 3, 'shield filled yesterday');
  assert.equal(s.inventory.streak_shield, 0);
  E.checkHabit(s, ev, h.id);
  assert.equal(h.checks.length, 4);
  // now miss with no shield
  s.lastDate = addDays(t, 0);
  const s2 = fresh(); ev = [];
  E.addHabit(s2, { name: 'Read', icon: 'notebook', stat: 'INT', kind: 'build' });
  const h2 = s2.habits[0];
  h2.startDate = addDays(t, -4); h2.checks = [addDays(t, -4), addDays(t, -3)];
  s2.lastDate = addDays(t, -2); s2.daily.date = s2.lastDate; s2.inventory.streak_shield = 0;
  E.rollover(s2, ev);
  assert.equal(h2.checks.length, 0, 'streak reset');
  assert.equal(h2.startDate, t);
  assert.equal(h2.attempts, 2);
  console.log('✓ habit shield + reset work');
}

// 5. 66 days forged
{
  const s = fresh(); ev = [];
  E.addHabit(s, { name: 'Code', icon: 'code-tags', stat: 'INT', kind: 'build' });
  const h = s.habits[0];
  h.startDate = addDays(t, -65);
  h.checks = Array.from({ length: 65 }, (_, i) => addDays(t, -65 + i));
  E.checkHabit(s, ev, h.id);
  assert.equal(h.status, 'forged');
  E.checkAchievements(s, ev);
  assert.ok(s.achievements['habit_66'], 'habit_66 unlocked');
  console.log('✓ habit forged at 66; level', s.player.level);
}

// 6. levels, ranks and boss
{
  const s = fresh(); ev = [];
  E.grantXp(s, ev, 20000, 'quest');
  assert.ok(s.player.level >= 10, 'reached D rank level');
  assert.equal(E.rankForLevel(s.player.level).rank, s.player.level >= 20 ? 'C' : 'D');
  assert.ok(ev.some(e => e.tone === 'rankup'));
  assert.ok(s.boss.defeated, 'boss defeated by big xp');
  assert.equal(s.counters.bossesDefeated, 1);
  console.log('✓ level', s.player.level, 'rank', E.rankForLevel(s.player.level).rank, 'boss defeated');
}

// 7. dungeon timing + strict mode
{
  const s = fresh(); ev = [];
  E.startDungeon(s, 'E', 'Test');
  s.dungeon!.endsAt = Date.now() - 1;
  E.rollover(s, ev);
  assert.equal(s.dungeon, null);
  assert.equal(s.counters.dungeonsCleared, 1);
  E.startDungeon(s, 'D', 'Strict');
  E.dungeonAppState(s, ev, 'background');
  s.dungeon!.backgroundedAt = Date.now() - 60000;
  E.dungeonAppState(s, ev, 'active');
  assert.equal(s.dungeon, null, 'strict dungeon collapsed');
  assert.equal(s.counters.dungeonsFailed, 1);
  console.log('✓ dungeon clear + strict fail');
}

// 8. shop + custom quests + undo
{
  const s = fresh(); ev = [];
  s.player.gold = 1000;
  assert.ok(E.buyItem(s, ev, 'xp_elixir'));
  assert.ok(E.consumeItem(s, ev, 'xp_elixir'));
  assert.ok(s.xpBoostUntil > Date.now());
  E.addQuest(s, { title: 'Study', difficulty: 'B', stat: 'INT', repeat: 'daily' });
  const q = s.customQuests[0];
  const x0 = s.player.totalXp;
  E.completeQuest(s, ev, q.id);
  const gained = s.player.totalXp - x0;
  assert.ok(gained >= 110, 'boosted xp ' + gained);
  E.undoQuest(s, q.id);
  assert.equal(q.doneDate, undefined);
  console.log('✓ shop/elixir/quests ok (gained', gained, ')');
}

// 9. bots deterministic
{
  const c = generateCandidates(42, 4, 5);
  assert.equal(c.length, 4);
  const a = botSnapshot(c[0]); const b = botSnapshot(c[0]);
  assert.deepEqual(a, b);
  const later = botSnapshot({ ...c[0], joinedAt: addDays(t, -30) });
  assert.ok(later.level > a.level, 'bots grow over time');
  assert.ok(botFeed(c, 3).length > 0);
  console.log('✓ bots', c.map(x => `${x.name}(${x.archetype})`).join(', '), '→ after 30d lv', later.level);
}

// 10. migrate fills missing fields
{
  const m = E.migrate({ player: { name: 'Old' } as never });
  assert.equal(m.player.name, 'Old');
  assert.ok(m.settings.dailyExercises.length);
  console.log('✓ migrate');
}
console.log('\nALL ENGINE TESTS PASSED');

// ================= v2 =================

{
  console.log(`\nQuest library: ${QUEST_LIBRARY.length} quests`);
  const ids = new Set(QUEST_LIBRARY.map((q) => q.id));
  assert.equal(ids.size, QUEST_LIBRARY.length, 'unique quest ids');
  for (const a of AREA_IDS) assert.ok(QUEST_LIBRARY.filter((q) => q.area === a).length >= 15, `area ${a} has 15+ quests`);
  for (const q of QUEST_LIBRARY) {
    assert.ok(q.tier >= 1 && q.tier <= 5, 'tier range ' + q.id);
    assert.ok(!q.title.includes('{n}') && !q.criteria.includes('{n}'), 'placeholder replaced ' + q.id);
  }
  console.log('✓ library valid; per area:', AREA_IDS.map((a) => `${a} ${QUEST_LIBRARY.filter((q) => q.area === a).length}`).join(', '));
}

{
  const s = fresh(); ev = [];
  s.profile.focusAreas = ['fitness', 'money', 'relationships'];
  const board = generateBoard(s, t);
  assert.equal(board.length, s.profile.questLoad);
  assert.ok(new Set(board.map((q) => q.area)).size >= 2, 'board spans 2+ areas');
  s.board = { date: t, quests: board, rerolls: 3 };
  const q = s.board.quests[0];
  const tier0 = s.areas[q.area].tier;
  E.completeSide(s, ev, q.id, 'did it');
  assert.equal(q.status, 'done');
  assert.ok(s.areas[q.area].tier > tier0, 'tier rises after completion');
  assert.equal(s.counters.sideQuests, 1);
  const q2 = s.board.quests[1];
  const t2 = s.areas[q2.area].tier;
  E.skipSide(s, q2.id);
  assert.ok(s.areas[q2.area].tier < t2 || q2.area === q.area, 'tier drops after skip');
  assert.ok(E.rerollSide(s, s.board.quests[2].id), 'reroll works');
  assert.equal(s.board.rerolls, 2);
  console.log('✓ board:', board.map((b) => `[${b.area}/T${b.tier}] ${b.title}`).join(' | '));
}

{
  // rollover expires open quests and builds a new board
  const s = fresh(); ev = [];
  const y = addDays(t, -1);
  s.lastDate = y; s.daily.date = y; s.daily.completed = true;
  s.board = { date: y, quests: generateBoard(s, y), rerolls: 3 };
  const before = s.board.quests.length;
  E.rollover(s, ev);
  assert.equal(s.board.date, t);
  assert.ok(s.board.quests.length > 0, 'new board');
  assert.equal(s.questHistory.filter((h) => h.status === 'expired').length, before, 'old quests expired');
  console.log('✓ rollover rebuilds side-quest board');
}

{
  // metric auto-verification (steps)
  const s = fresh(); ev = [];
  s.board = { date: t, quests: [], rerolls: 3 };
  assert.ok(E.addToBoard(s, 'fitness.walk-n-steps.0'));
  E.saveCheckin(s, ev, { steps: 6000 }, false);
  assert.equal(s.board.quests[0].status, 'done', 'auto-completed from steps');
  assert.ok(metricMet(s, { key: 'steps', op: 'gte', value: 5000 }, t));
  // workout metric
  assert.ok(E.addToBoard(s, 'fitness.push-up-session.0'));
  E.logWorkout(s, ev, 'pushups', 25);
  assert.equal(s.board.quests[1].status, 'done', 'auto-completed from push-ups');
  console.log('✓ metric quests auto-verify (steps, workouts)');
}

{
  // recovery
  const s = fresh(); ev = [];
  E.addRecovery(s, { category: 'social', name: 'Doom-scrolling', why: 'time', plan: 'p', replacements: [], daysClean: 8 });
  const tr = s.recovery[0];
  assert.deepEqual(tr.milestonesHit, [1, 3, 7], 'pre-existing milestones not re-rewarded');
  E.resistUrge(s, ev, tr.id, 'Bored');
  assert.equal(s.counters.urgesResisted, 1);
  E.relapse(s, ev, tr.id, 'Late night', 'note', 'new plan');
  assert.ok(tr.bankedMs >= 8 * 86400000 - 1000, 'clean time banked');
  assert.equal(tr.milestonesHit.length, 0);
  assert.equal(tr.plan, 'new plan');
  const hpBefore = s.player.hp;
  tr.startedAt = Date.now() - 3.2 * 86400000;
  E.rollover(s, ev);
  assert.deepEqual(tr.milestonesHit.sort((a, b) => a - b), [1, 3], 'new milestones rewarded');
  assert.equal(s.player.hp, hpBefore, 'no HP penalty in recovery mode');
  console.log('✓ recovery: urges, relapse banking, milestones');
}

{
  // campaigns / main quests
  const s = fresh(); ev = [];
  assert.ok(E.startCampaign(s, 'sleep'));
  const mq = s.mainQuests[0];
  for (const m of mq.milestones) E.toggleMilestone(s, ev, mq.id, m.id);
  assert.equal(mq.status, 'done');
  assert.equal(s.counters.mainQuestsDone, 1);
  assert.equal(CAMPAIGNS.length >= 10, true);
  console.log('✓ campaign completes; level', s.player.level);
}

{
  // wellbeing + wheel + life score
  const s = fresh(); ev = [];
  E.saveWellbeing(s, ev, [1, 2, 1, 2, 2]);
  assert.equal(s.wellbeing[0].score, 32);
  assert.ok(ev.some((e) => e.tone === 'warning' && e.lines.some((l) => l.includes('1323'))), 'low score support message');
  E.saveWheel(s, ev, { fitness: 4, health: 6, mind: 5, learning: 7, career: 6, money: 3, relationships: 8, purpose: 5, home: 6, digital: 2 });
  const ls = lifeScore(s, t);
  assert.ok(ls.score !== null && ls.score > 0 && ls.score < 100);
  console.log('✓ life score', ls.score, ls.parts.map((p) => `${p.label}=${p.value}`).join(', '));
}

{
  // AI quest sanitising
  const s = fresh(); ev = [];
  s.board = { date: t, quests: generateBoard(s, t), rerolls: 3 };
  const n = E.addAIQuests(s, [
    { title: 'Call grandma', criteria: 'Talk for 10+ minutes', area: 'relationships', tier: 2, minutes: 15 },
    { title: 'bad', criteria: 'x', area: 'nope', tier: 9 },
  ]);
  assert.equal(n, 1);
  assert.ok(s.board.quests.some((q) => q.source === 'ai' && q.stat === 'CHA'));
  console.log('✓ AI quests sanitised');
}
console.log('\nALL v2 TESTS PASSED');

// ================= gimmicks =================
{
  const s = fresh(); ev = [];
  assert.ok(E.claimCrate(s, ev), 'crate claim');
  assert.equal(E.claimCrate(s, ev), false, 'only once per day');
  s.fun.crate.lastClaim = addDays(t, -1);
  s.fun.crate.streak = 6;
  assert.equal(crateDay(s, t).day, 7, 'day 7 rare crate');
  ev = [];
  E.claimCrate(s, ev);
  assert.ok(ev.some((e) => e.title === 'RARE SUPPLY CRATE'));
  // combos grow across completions
  s.board = { date: t, quests: generateBoard(s, t), rerolls: 3 };
  for (const q of s.board.quests) E.completeSide(s, ev, q.id);
  assert.equal(s.fun.combo.count, s.board.quests.length);
  assert.ok(s.counters.bestCombo >= 3);
  // buff is deterministic per day
  assert.deepEqual(dailyBuff(t, 'x'), dailyBuff(t, 'x'));
  // weekly challenge claim
  const wk = weekId(t);
  const chs = weeklyChallenges(wk, s.player.createdAt);
  assert.equal(chs.length, 3);
  // companion
  E.hatchCompanion(s, ev, 'owl', 'Hoot');
  assert.equal(s.fun.companion.species, 'owl');
  assert.equal(companionStage(1).name, 'Egg');
  assert.equal(companionStage(12).name, 'Adept');
  // items
  s.inventory.reroll_token = 1;
  const r0 = s.board.rerolls;
  assert.ok(E.consumeItem(s, ev, 'reroll_token'));
  assert.equal(s.board.rerolls, r0 + 1);
  console.log('✓ gimmicks: crate, combo, buff, weekly, companion, items · crits so far', s.counters.crits, 'drops', s.counters.drops);
}
console.log('\nALL GIMMICK TESTS PASSED');


// ================= plan builder =================
{
  const light = buildPlan({ ...defaultAnswers(), goals: ['sleep', 'screen'], minutes: 10, fitness: 'sitting', style: 'gentle', program: true });
  assert.equal(light.difficulty, 'starter');
  assert.deepEqual(light.dailyExercises, ['squats', 'walk']);
  assert.equal(light.questLoad, 1);
  assert.equal(light.penalties, false);
  assert.equal(light.campaign, 'sleep');
  assert.deepEqual(light.focusAreas, ['health', 'digital']);
  const heavy = buildPlan({ ...defaultAnswers(), goals: ['fit'], minutes: 60, fitness: 'regular', style: 'hardcore' });
  assert.equal(heavy.difficulty, 'hard');
  assert.equal(heavy.questLoad, 5);
  assert.equal(heavy.campaign, undefined);

  const s = fresh(); ev = [];
  s.board = { date: t, quests: generateBoard(s, t, 4), rerolls: 3 };
  E.applyPlan(s, ev, light, { habit: true, campaign: true, recovery: true });
  assert.equal(s.settings.penalties, false);
  assert.equal(s.daily.tasks.length, 2);
  assert.equal(s.board.quests.filter((q) => q.status === 'open').length, 1, 'board right-sized to 1');
  assert.equal(s.habits.length, 1);
  assert.equal(s.mainQuests.length, 1);
  assert.ok(s.profile.planned);
  // gentle mode: missing a day costs no HP and creates no penalty quest
  const hp = s.player.hp;
  s.lastDate = addDays(t, -1); s.daily.date = s.lastDate; s.daily.completed = false;
  E.rollover(s, ev);
  assert.equal(s.player.hp, hp, 'no HP loss in gentle mode');
  assert.equal(s.penalty, null, 'no penalty quest in gentle mode');
  console.log('✓ plan builder: light plan', light.dailyExercises.join('+'), '| heavy load', heavy.questLoad, '| gentle mode safe');
}
console.log('\nALL PLAN TESTS PASSED');


// ================= v3 life trackers =================
import * as L from '../src/game/life3';
import { foodCounts, insightDataDays, insights, moneyScore, noSpendStreak, nutritionScore, peopleDue, seasonInfo, SEASON_DAYS, skillTier } from '../src/game/tracking';
import { metricValue } from '../src/game/director';
{
  // Fuel: meals, synergies, water, metrics
  const s = fresh(); ev = [];
  const bossHp = s.boss.hp;
  E.logWorkout(s, ev, 'pushups', 10);
  const strXp = s.player.statXp.STR + s.player.stats.STR * 1000;
  L.logMeal(s, ev, { tags: ['protein', 'veg'], slot: 'lunch' });
  assert.ok(s.boss.hp < bossHp - 15, 'veggies damage the boss');
  assert.ok(s.player.statXp.STR + s.player.stats.STR * 1000 > strXp, 'protein on training day feeds STR');
  L.logMeal(s, ev, { tags: ['veg', 'fruit'], slot: 'dinner' });
  L.logMeal(s, ev, { tags: ['junk'], slot: 'snack' });
  const f = foodCounts(s, t);
  assert.deepEqual([f.meals, f.plants, f.protein, f.junk], [3, 3, 1, 1]);
  assert.equal(metricValue(s, 'plants', t), 3);
  assert.equal(metricValue(s, 'junk', t), 1);
  s.player.hp = 50;
  L.addWater(s, ev, 8);
  assert.equal(s.player.hp, 66, 'water regenerates HP');
  assert.ok(ev.some((e) => e.title === 'HYDRATED'));
  const ns = nutritionScore(s, t)!;
  assert.ok(ns > 50 && ns <= 100, 'nutrition score ' + ns);
  // reward cap: 5th+ meal gives no XP
  for (let i = 0; i < 3; i++) L.logMeal(s, ev, { tags: ['grain'] });
  const xp0 = s.player.totalXp; L.logMeal(s, ev, { tags: ['grain'] });
  assert.equal(s.player.totalXp, xp0, 'meal rewards are capped per day');
  console.log('✓ fuel: synergies, water HP, caps · score', ns);
}
{
  // Treasury: expenses, budgets, no-spend, impulse shield, savings goals
  const s = fresh(); ev = [];
  assert.equal(metricValue(s, 'wants', t), undefined, 'no data → wants metric unknown');
  assert.ok(L.declareNoSpend(s, ev));
  assert.equal(noSpendStreak(s, t), 1);
  L.setBudget(s, 'fun', 500);
  L.logExpense(s, ev, { amount: 120, cat: 'food' });
  assert.equal(s.track.noSpend[t], true, 'essential spending keeps a no-spend day');
  L.logExpense(s, ev, { amount: 600, cat: 'fun' });
  assert.equal(s.track.noSpend[t], undefined, 'a want breaks the no-spend day');
  assert.ok(ev.some((e) => e.title === 'BUDGET EXCEEDED'));
  assert.equal(metricValue(s, 'wants', t), 600);
  ev = [];
  L.addWish(s, ev, 'Headphones', 2500);
  const w = s.track.wishlist[0];
  const resisted = s.counters.urgesResisted;
  L.decideWish(s, ev, w.id, false);
  assert.equal(s.track.savedByWaiting, 2500);
  assert.equal(s.counters.urgesResisted, resisted + 1);
  L.addGoal(s, 'Emergency fund', 1000);
  const g = s.track.goals[0];
  const gold0 = s.player.gold;
  L.depositGoal(s, ev, g.id, 600);
  assert.equal(g.marks, 2);
  assert.ok(s.player.gold > gold0);
  L.depositGoal(s, ev, g.id, 400);
  assert.ok(g.doneAt, 'goal complete');
  assert.ok(ev.some((e) => e.title === 'SAVINGS GOAL COMPLETE'));
  const ms = moneyScore(s, t)!;
  assert.ok(ms >= 0 && ms <= 100);
  console.log('✓ treasury: budgets, no-spend, impulse shield, goals · score', ms);
}
{
  // Skills, people, Top 3, seasons
  const s = fresh(); ev = [];
  L.addSkill(s, 'Guitar', 'guitar-acoustic', 'SEN');
  const sk = s.track.skills[0];
  L.logSkill(s, ev, sk.id, 300);
  assert.equal(skillTier(sk.minutes).name, 'Apprentice');
  assert.ok(ev.some((e) => e.title === 'SKILL TIER UP'));
  assert.equal(metricValue(s, 'skill', t), 300);

  L.addPerson(s, { name: 'Mom', relation: 'family', everyDays: 7 });
  assert.equal(peopleDue(s, t).length, 1, 'new person is due right away');
  L.contactPerson(s, ev, s.track.people[0].id);
  assert.equal(peopleDue(s, t).length, 0);
  assert.equal(metricValue(s, 'contact', t), 1);
  assert.equal(L.contactPerson(s, ev, s.track.people[0].id), false, 'once per day');

  L.setPlan(s, ['Finish lab report', 'Gym', 'Call bank', 'extra ignored']);
  assert.equal(s.track.plans[t].items.length, 3);
  [0, 1, 2].forEach((i) => L.togglePlanItem(s, ev, i));
  assert.ok(s.track.plans[t].bonus);
  assert.equal(metricValue(s, 'plan', t), 3);

  s.player.totalXp += 800;
  const si = seasonInfo(s, t);
  assert.equal(si.reached >= 2, true);
  assert.ok(L.claimSeasonTier(s, ev, 1));
  assert.equal(s.inventory.hp_potion >= 1, true);
  assert.equal(L.claimSeasonTier(s, ev, 1), false, 'no double claim');
  // season rolls after 66 days and auto-claims tier 0
  s.track.season.startDate = addDays(t, -SEASON_DAYS);
  ev = [];
  assert.ok(L.trackTick(s, ev));
  assert.equal(s.track.season.n, 2);
  assert.ok(ev.some((e) => e.title === 'SEASON 1 COMPLETE'));
  console.log('✓ skills, people, top-3, seasons');
}
{
  // Insights from 3 weeks of synthetic data
  const s = fresh();
  for (let i = 1; i <= 21; i++) {
    const d = addDays(t, -i);
    const trained = i % 2 === 0;
    if (trained) s.workouts.push({ id: 'w' + i, ts: 0, date: d, exerciseId: 'pushups', amount: 10, xp: 5 });
    s.checkins[d] = { date: d, mood: trained ? 4 : 3, energy: 3, sleepHours: trained ? 7.5 : 6.5, steps: trained ? 8000 : 3000, savedAt: 1 };
  }
  assert.ok(insightDataDays(s, t) >= 7);
  const cards = insights(s, t);
  assert.ok(cards.some((c) => c.id === 'train-mood' && c.title.includes('↑')), 'training lifts mood');
  assert.ok(cards.some((c) => c.id === 'sleep-mood'));
  // migration of a v2 save adds track state
  const old = JSON.parse(JSON.stringify(s)); delete old.track; old.version = 2;
  const m = E.migrate(old);
  assert.equal(m.version, 3);
  assert.equal(m.track.season.xpStart, s.player.totalXp, 'season starts fresh for existing players');
  console.log('✓ insights:', cards.map((c) => c.id).join(', '), '| v2 → v3 migration');
}
console.log('\nALL V3 TESTS PASSED');
