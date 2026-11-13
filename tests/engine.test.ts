/// <reference types="node" />
import assert from 'node:assert/strict';
import * as E from '../src/game/engine';
import { botSnapshot, generateCandidates, botFeed } from '../src/game/bots';
import type { GameEvent } from '../src/game/types';
import { QUEST_LIBRARY } from '../src/game/questLibrary';
import { generateBoard, lifeScore, metricMet } from '../src/game/director';
import { AREA_IDS } from '../src/game/areas';
import { CAMPAIGNS } from '../src/game/campaigns';
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
