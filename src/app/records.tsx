import React, { useMemo } from 'react';
import { View } from 'react-native';

import { EXERCISES, STAT_META } from '@/game/constants';
import { addDays } from '@/game/date';
import { useGame } from '@/store/game';
import { Icon, Panel, Row, Txt } from '@/ui/kit';
import { Columns, Screen } from '@/ui/Screen';
import { C, glow, withAlpha } from '@/ui/theme';

export default function RecordsScreen() {
  const g = useGame((s) => s.game);
  const c = g.counters;
  const today = g.daily.date;

  const week = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => addDays(today, i - 6));
    return days.map((d) => ({ d, xp: g.workouts.filter((w) => w.date === d).reduce((a, w) => a + w.xp, 0) }));
  }, [g.workouts, today]);
  const maxXp = Math.max(1, ...week.map((w) => w.xp));

  const rows: [string, string | number, string][] = [
    ['Total XP', g.player.totalXp.toLocaleString(), 'star-four-points'],
    ['Daily Quests cleared', c.dailyCompleted, 'sword'],
    ['Best daily streak', c.bestDailyStreak, 'fire'],
    ['Quests completed', c.questsCompleted, 'clipboard-check'],
    ['Penalties taken / cleared', `${c.penaltiesTaken} / ${c.penaltiesCleared}`, 'skull'],
    ['Bosses defeated', c.bossesDefeated, 'sword-cross'],
    ['Dungeons cleared', c.dungeonsCleared, 'gate'],
    ['Focus minutes', c.focusMinutes.toLocaleString(), 'brain'],
    ['Habits forged', c.habitsForged, 'anvil'],
    ['Best habit streak', c.bestHabitStreak, 'calendar-check'],
    ['Gold earned / spent', `${c.goldEarned.toLocaleString()} / ${c.goldSpent.toLocaleString()}`, 'hexagon-multiple'],
  ];

  return (
    <Screen title="RECORDS" subtitle="Player history" back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            <Panel title="Workout XP · last 7 days" icon="chart-bar">
              <Row style={{ alignItems: 'flex-end', height: 130, gap: 8 }}>
                {week.map((w) => (
                  <View key={w.d} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <Txt v="tiny" style={{ marginBottom: 4 }}>
                      {w.xp || ''}
                    </Txt>
                    <View style={[{ width: '70%', height: `${Math.max(3, (w.xp / maxXp) * 80)}%`, backgroundColor: w.d === today ? C.cyan : withAlpha(C.cyan, 0.45), borderRadius: 2 }, w.d === today ? glow(C.cyan, 8, 0.7) : null]} />
                  </View>
                ))}
              </Row>
              <Row style={{ gap: 8, marginTop: 6 }}>
                {week.map((w) => (
                  <Txt key={w.d} v="tiny" center style={{ flex: 1 }}>
                    {new Date(w.d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </Txt>
                ))}
              </Row>
            </Panel>
            <Panel title="Lifetime" icon="chart-timeline-variant">
              {rows.map(([label, v, ic]) => (
                <Row key={label} gap={10} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.lineDim }}>
                  <Icon name={ic} size={16} color={C.textDim} />
                  <Txt v="body" style={{ flex: 1 }}>
                    {label}
                  </Txt>
                  <Txt v="num" style={{ fontSize: 14 }} color={C.cyanHi}>
                    {v}
                  </Txt>
                </Row>
              ))}
            </Panel>
          </View>,
          <Panel key="r" title="Exercise totals" icon="dumbbell">
            {EXERCISES.map((e) => (
              <Row key={e.id} gap={10} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.lineDim }}>
                <Icon name={e.icon} size={16} color={STAT_META[e.stat].color} />
                <Txt v="body" style={{ flex: 1 }}>
                  {e.name}
                </Txt>
                <Txt v="num" style={{ fontSize: 14 }}>
                  {(c.totals[e.id] ?? 0).toLocaleString()} <Txt v="tiny">{e.unit}</Txt>
                </Txt>
              </Row>
            ))}
          </Panel>,
        ]}
      </Columns>
    </Screen>
  );
}
