/// <reference types="node" />
import assert from 'node:assert/strict';
import * as E from '../src/game/engine';
import { addDays, today } from '../src/game/date';
import { botSnapshot, generateCandidates, botFeed } from '../src/game/bots';
import type { GameEvent } from '../src/game/types';

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
