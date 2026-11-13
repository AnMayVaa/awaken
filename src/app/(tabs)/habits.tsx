import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';

import { HABIT_DAYS, HABIT_ICONS, HABIT_PRESETS, STAT_KEYS, STAT_META } from '@/game/constants';
import { addDays } from '@/game/date';
import { habitDay, habitReward } from '@/game/engine';
import type { Habit, StatKey } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';
import { Btn, Chip, Empty, Icon, Input, Panel, Pill, Row, Segment, Txt } from '@/ui/kit';
import { Screen, useLayout } from '@/ui/Screen';
import { SystemModal } from '@/ui/SystemModal';
import { C, F, glow, textGlow, withAlpha } from '@/ui/theme';

function DayGrid({ h, today }: { h: Habit; today: string }) {
  const [w, setW] = useState(0);
  const cols = 11;
  const gap = 4;
  const size = w ? Math.min(42, Math.floor((w - gap * (cols - 1)) / cols)) : 0;
  const gridW = size * cols + gap * (cols - 1);
  const forged = h.status === 'forged';
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, width: gridW || '100%', alignSelf: 'center' }}>
      {size > 0 &&
        Array.from({ length: HABIT_DAYS }).map((_, i) => {
          const d = addDays(h.startDate, i);
          const checked = h.checks.includes(d);
          const shielded = h.shielded.includes(d);
          const isToday = d === today;
          const future = d > today;
          const color = forged ? C.gold : shielded ? C.blue : C.cyan;
          return (
            <View
              key={i}
              style={[
                {
                  width: size,
                  height: size,
                  borderRadius: 2,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: checked ? color : isToday ? C.gold : withAlpha(C.cyan, future ? 0.12 : 0.3),
                  backgroundColor: checked ? withAlpha(color, 0.55) : isToday ? withAlpha(C.gold, 0.1) : 'transparent',
                },
                checked && size > 14 ? glow(color, 5, 0.6) : null,
              ]}>
              {shielded ? (
                <Icon name="shield" size={size * 0.55} color={C.white} />
              ) : size >= 22 ? (
                <Txt style={{ fontFamily: F.displayMed, fontSize: Math.min(10, size * 0.36), color: checked ? C.white : future ? C.muted : C.textDim }}>{i + 1}</Txt>
              ) : null}
            </View>
          );
        })}
    </View>
    </View>
  );
}

function HabitCard({ h, today }: { h: Habit; today: string }) {
  const checked = h.checks.includes(today);
  const streak = h.checks.length;
  const day = habitDay(h, today);
  const forged = h.status === 'forged';
  const color = forged ? C.gold : STAT_META[h.stat].color;
  const r = habitReward(streak + 1);
  return (
    <Panel color={forged ? C.gold : C.cyan} title={forged ? 'Forged' : h.kind === 'quit' ? 'Quit challenge' : 'Build challenge'} icon={forged ? 'anvil' : h.kind === 'quit' ? 'cancel' : 'hammer'}>
      <Row gap={12} style={{ marginBottom: 12 }}>
        <View style={[styles.hIcon, { borderColor: withAlpha(color, 0.6), backgroundColor: withAlpha(color, 0.1) }]}>
          <Icon name={h.icon} size={26} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="bodyB" style={{ fontSize: 18 }} numberOfLines={2}>
            {h.name}
          </Txt>
          <Row gap={6} style={{ marginTop: 3 }}>
            <Pill text={h.stat} color={STAT_META[h.stat].color} icon={STAT_META[h.stat].icon} />
            <Txt v="tiny">
              Best {h.bestStreak} · Attempt #{h.attempts}
              {h.forgedCount ? ` · Forged ×${h.forgedCount}` : ''}
            </Txt>
          </Row>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="label" style={{ fontSize: 9 }}>
            {forged ? 'Complete' : 'Streak'}
          </Txt>
          <Txt style={{ fontFamily: F.displayBlack, fontSize: 28, color: C.white, ...textGlow(color, 12) }}>
            {streak}
            <Txt v="small">/{HABIT_DAYS}</Txt>
          </Txt>
        </View>
      </Row>
      <DayGrid h={h} today={today} />
      <Row style={{ marginTop: 14 }} gap={8}>
        {forged ? (
          <Btn flex kind="solid" color={C.gold} label="Start a new 66 days" icon="restart" onPress={() => actions.restartHabit(h.id)} />
        ) : checked ? (
          <Btn flex label={`Day ${day} complete`} icon="check-decagram" color={C.green} onPress={() => systemConfirm('UNDO CHECK-IN?', [h.name, 'The XP from today’s check-in will be removed.'], () => actions.uncheckHabit(h.id), { confirmLabel: 'Undo' })} />
        ) : (
          <Btn
            flex
            kind="solid"
            label={h.kind === 'quit' ? `I stayed clean · Day ${day}` : `Complete Day ${day}`}
            icon="check-bold"
            onPress={() => actions.checkHabit(h.id)}
            testID={`check-${h.id}`}
          />
        )}
        <Btn
          icon="delete-outline"
          color={C.muted}
          onPress={() => systemConfirm('DELETE HABIT?', [h.name, 'All progress for this habit will be lost.'], () => actions.deleteHabit(h.id), { confirmLabel: 'Delete', tone: 'penalty' })}
        />
      </Row>
      {!forged && !checked ? (
        <Txt v="tiny" center style={{ marginTop: 8 }}>
          +{r.xp} XP · +{r.gold} G · missing a day resets the streak to Day 1
        </Txt>
      ) : null}
    </Panel>
  );
}

const emptyForm = { name: '', icon: 'water', stat: 'VIT' as StatKey, kind: 'build' as 'build' | 'quit' };

export default function HabitsScreen() {
  const g = useGame((s) => s.game);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const { width } = useLayout();
  const today = g.daily.date;
  const twoCol = width >= 1100;

  const save = () => {
    if (!form || !form.name.trim()) return;
    actions.addHabit({ ...form, name: form.name.trim() });
    setForm(null);
  };

  const active = g.habits.filter((h) => h.status === 'active');
  const forged = g.habits.filter((h) => h.status === 'forged');
  const list = [...active, ...forged];

  return (
    <Screen title="66-DAY CHALLENGE" subtitle="Habit forging" right={<Btn size="sm" icon="plus" label="Habit" onPress={() => setForm({ ...emptyForm })} testID="new-habit" />}>
      <Panel title="How it works" icon="information-outline" color={C.blue}>
        <Txt v="small">
          Research on habit formation found it takes about 66 days on average for a new behaviour to feel automatic. Check in every day. Miss one and
          the run resets to Day 1 — unless a Streak Shield (shop) saves you. Shields left:{' '}
          <Txt v="bodyB" color={C.blue}>
            {g.inventory.streak_shield}
          </Txt>
        </Txt>
      </Panel>
      {!list.length ? (
        <Panel>
          <Empty icon="calendar-plus" title="No challenge yet" text="Pick one habit to build or one to quit. Start small.">
            <Btn kind="solid" label="Start a challenge" icon="plus" onPress={() => setForm({ ...emptyForm })} style={{ marginTop: 10 }} />
          </Empty>
        </Panel>
      ) : (
        <View style={twoCol ? { flexDirection: 'row', flexWrap: 'wrap', gap: 14 } : null}>
          {list.map((h) => (
            <View key={h.id} style={twoCol ? { width: '48.8%' } : null}>
              <HabitCard h={h} today={today} />
            </View>
          ))}
        </View>
      )}

      <SystemModal visible={!!form} onClose={() => setForm(null)} title="New habit" icon="calendar-plus">
        {form ? (
          <>
            <Txt v="label" style={{ marginBottom: 6 }}>
              Presets
            </Txt>
            <Row wrap gap={6} style={{ marginBottom: 14 }}>
              {HABIT_PRESETS.map((p) => (
                <Chip key={p.name} label={p.name} icon={p.icon} active={form.name === p.name} onPress={() => setForm({ ...p })} />
              ))}
            </Row>
            <Input label="Habit" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. Wake up at 6:00" maxLength={50} />
            <Segment
              value={form.kind}
              onChange={(v) => setForm({ ...form, kind: v })}
              options={[
                { value: 'build', label: 'Build a habit' },
                { value: 'quit', label: 'Quit a habit' },
              ]}
            />
            <Txt v="label" style={{ marginTop: 14, marginBottom: 6 }}>
              Icon
            </Txt>
            <Row wrap gap={6} style={{ marginBottom: 12 }}>
              {HABIT_ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => setForm({ ...form, icon: ic })}
                  style={[styles.iconPick, { borderColor: form.icon === ic ? C.cyan : C.lineDim, backgroundColor: form.icon === ic ? withAlpha(C.cyan, 0.18) : 'transparent' }]}>
                  <Icon name={ic} size={20} color={form.icon === ic ? C.cyanHi : C.textDim} />
                </Pressable>
              ))}
            </Row>
            <Txt v="label" style={{ marginBottom: 6 }}>
              Trains
            </Txt>
            <Row wrap gap={6} style={{ marginBottom: 16 }}>
              {STAT_KEYS.map((k) => (
                <Chip key={k} label={k} icon={STAT_META[k].icon} color={STAT_META[k].color} active={form.stat === k} onPress={() => setForm({ ...form, stat: k })} />
              ))}
            </Row>
            <Btn kind="solid" label="Begin 66 days" icon="lightning-bolt" onPress={save} disabled={!form.name.trim()} testID="save-habit" />
          </>
        ) : null}
      </SystemModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hIcon: { width: 50, height: 50, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  iconPick: { width: 40, height: 40, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
});
