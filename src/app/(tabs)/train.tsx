import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EXERCISE_MAP, EXERCISES, RANK_COLORS, STAT_META, type ExerciseCategory } from '@/game/constants';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';
import { DungeonView } from '@/ui/DungeonView';
import { Empty, Icon, Panel, Row, Segment, Txt } from '@/ui/kit';
import { LogModal } from '@/ui/LogModal';
import { Screen } from '@/ui/Screen';
import { C, withAlpha } from '@/ui/theme';

type Cat = 'all' | ExerciseCategory;

const fmt = (v: number) => (Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1));

export default function TrainScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<'workout' | 'dungeon'>(params.view === 'dungeon' ? 'dungeon' : 'workout');
  const [seenParam, setSeenParam] = useState(params.view);
  if (params.view !== seenParam) {
    setSeenParam(params.view);
    if (params.view === 'dungeon' || params.view === 'workout') setView(params.view);
  }
  const g = useGame((s) => s.game);
  const dungeonTint = g.dungeon ? RANK_COLORS[g.dungeon.rank] : undefined;
  const switcher = (
    <View style={{ marginBottom: 14 }}>
      <Segment
        value={view}
        onChange={setView}
        options={[
          { value: 'workout', label: 'Workout' },
          { value: 'dungeon', label: g.dungeon ? 'Dungeon •' : 'Dungeon' },
        ]}
      />
    </View>
  );
  if (view === 'dungeon') {
    return (
      <Screen title="DUNGEON" subtitle="Focus gates" tint={dungeonTint}>
        {switcher}
        <DungeonView />
      </Screen>
    );
  }
  return <WorkoutView switcher={switcher} />;
}

function WorkoutView({ switcher }: { switcher: React.ReactNode }) {
  const g = useGame((s) => s.game);
  const [cat, setCat] = useState<Cat>('all');
  const [logEx, setLogEx] = useState<string | null>(null);
  const [gw, setGw] = useState(0);
  const today = g.daily.date;
  const cols = gw >= 760 ? 4 : gw >= 520 ? 3 : 2;
  const GAP = 10;
  const tileW = gw ? Math.floor((gw - GAP * (cols - 1)) / cols) : 0;
  const list = EXERCISES.filter((e) => cat === 'all' || e.category === cat);
  const todayLogs = g.workouts.filter((w) => w.date === today);
  const todayXp = todayLogs.reduce((a, w) => a + w.xp, 0);
  const todayBy: Record<string, number> = {};
  for (const w of todayLogs) todayBy[w.exerciseId] = (todayBy[w.exerciseId] ?? 0) + w.amount;
  const dailyIds = new Set(g.daily.tasks.map((t) => t.exerciseId));

  return (
    <Screen title="TRAINING" subtitle="Workout log">
      {switcher}
      <Panel title="Today" icon="lightning-bolt" right={<Txt v="num" color={C.cyanHi}>+{todayXp} XP</Txt>}>
        <Txt v="small">Every rep trains a stat and counts toward your Daily Quest and the weekly boss.</Txt>
      </Panel>
      <Segment
        value={cat}
        onChange={setCat}
        options={[
          { value: 'all', label: 'All' },
          { value: 'strength', label: 'Str' },
          { value: 'cardio', label: 'Cardio' },
          { value: 'core', label: 'Core' },
          { value: 'mind', label: 'Mind' },
        ]}
      />
      <View style={[styles.grid, { marginTop: 14, gap: GAP }]} onLayout={(e) => setGw(e.nativeEvent.layout.width)}>
        {tileW > 0 && list.map((e) => {
          const m = STAT_META[e.stat];
          const t = todayBy[e.id] ?? 0;
          return (
            <Pressable
              key={e.id}
              onPress={() => setLogEx(e.id)}
              testID={`ex-${e.id}`}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.tile,
                {
                  width: tileW,
                  borderColor: withAlpha(m.color, pressed || hovered ? 0.75 : 0.28),
                  backgroundColor: withAlpha(m.color, pressed ? 0.16 : 0.05),
                },
              ]}>
              <Row style={{ justifyContent: 'space-between', alignSelf: 'stretch' }}>
                <Icon name={e.icon} size={26} color={m.color} />
                <Row gap={4}>
                  {dailyIds.has(e.id) ? <Icon name="sword" size={13} color={C.gold} /> : null}
                  <Txt v="tiny" color={m.color}>
                    {e.stat}
                  </Txt>
                </Row>
              </Row>
              <Txt v="bodyB" style={{ marginTop: 8, fontSize: 16.5 }} numberOfLines={1}>
                {e.name}
              </Txt>
              <Txt v="tiny">
                Today {fmt(t)} {e.unit} · Total {fmt(g.counters.totals[e.id] ?? 0)}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <Panel title="Activity log" icon="history" style={{ marginTop: 6 }}>
        {!g.workouts.length ? <Empty icon="dumbbell" title="Nothing logged yet" text="Tap an exercise above to log your first set." /> : null}
        {g.workouts.slice(0, 25).map((w) => {
          const ex = EXERCISE_MAP[w.exerciseId];
          if (!ex) return null;
          return (
            <Row key={w.id} style={styles.logRow} gap={10}>
              <Icon name={ex.icon} size={18} color={STAT_META[ex.stat].color} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyB">
                  {ex.name} <Txt v="body" color={C.cyanHi}>{fmt(w.amount)} {ex.unit}</Txt>
                </Txt>
                <Txt v="tiny">
                  {w.date === today ? 'Today' : w.date} · {new Date(w.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · +{w.xp} XP
                </Txt>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => systemConfirm('REMOVE ENTRY?', [`${ex.name} ${fmt(w.amount)} ${ex.unit}`, `−${w.xp} XP`], () => actions.deleteWorkout(w.id), { confirmLabel: 'Remove' })}>
                <Icon name="close" size={18} color={C.muted} />
              </Pressable>
            </Row>
          );
        })}
      </Panel>

      <LogModal exerciseId={logEx} onClose={() => setLogEx(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14, minHeight: 80 },
  tile: { borderWidth: 1, borderRadius: 3, padding: 12, alignItems: 'flex-start' },
  logRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.lineDim },
});
