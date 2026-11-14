import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { today } from '@/game/date';
import { foodCounts, peopleDue, spentOn, fmtMoney } from '@/game/tracking';
import { tap } from '@/lib/haptics';
import { useGame } from '@/store/game';
import { type QuickView, useQuickLog } from '@/store/ui';

import { Icon, Txt } from './kit';
import { MealForm, PeopleForm, PlanEditor, SkillForm, SpendForm, WaterControl } from './LogForms';
import { SystemModal } from './SystemModal';
import { C, glow, withAlpha } from './theme';

const TITLES: Record<QuickView, { title: string; icon: string; color: string }> = {
  menu: { title: 'Quick log', icon: 'plus-circle', color: C.cyan },
  meal: { title: 'Log a meal', icon: 'silverware-fork-knife', color: C.green },
  spend: { title: 'Log spending', icon: 'cash-minus', color: C.gold },
  skill: { title: 'Skill practice', icon: 'star-circle', color: C.purple },
  people: { title: 'Reach out', icon: 'account-heart', color: C.pink },
  plan: { title: 'Today’s Top 3', icon: 'format-list-checks', color: C.gold },
};

function Tile({ icon, label, sub, color, onPress, testID }: { icon: string; label: string; sub?: string; color: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.tile, { borderColor: withAlpha(color, pressed ? 0.8 : 0.3), backgroundColor: withAlpha(color, pressed ? 0.18 : 0.06) }]}>
      <Icon name={icon} size={26} color={color} />
      <Txt v="bodyB" style={{ marginTop: 6, fontSize: 15 }}>
        {label}
      </Txt>
      {sub ? (
        <Txt v="tiny" numberOfLines={1}>
          {sub}
        </Txt>
      ) : null}
    </Pressable>
  );
}

export function QuickLogSheet() {
  const { open, view, setView, close } = useQuickLog();
  const g = useGame((s) => s.game);
  const t = today();
  const meta = TITLES[view];
  const go = (href: string) => {
    close();
    router.push(href as never);
  };
  const back = () => setView('menu');
  const food = foodCounts(g, t);
  const due = peopleDue(g, t).length;
  const plan = g.track.plans[t];

  return (
    <SystemModal visible={open} onClose={close} title={meta.title} icon={meta.icon} color={meta.color}>
      {view !== 'menu' ? (
        <Pressable onPress={back} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Icon name="chevron-left" size={18} color={C.cyan} />
          <Txt v="label" color={C.cyan}>
            All logs
          </Txt>
        </Pressable>
      ) : null}

      {view === 'menu' ? (
        <View>
          <View style={styles.waterBox}>
            <Txt v="label" color={C.cyan} style={{ marginBottom: 6 }}>
              Water
            </Txt>
            <WaterControl compact />
          </View>
          <View style={styles.grid}>
            <Tile icon="silverware-fork-knife" label="Meal" sub={`${food.meals} today`} color={C.green} onPress={() => setView('meal')} testID="ql-meal" />
            <Tile icon="cash-minus" label="Spending" sub={`${fmtMoney(spentOn(g, t))} today`} color={C.gold} onPress={() => setView('spend')} testID="ql-spend" />
            <Tile icon="format-list-checks" label="Top 3" sub={plan ? `${plan.items.filter((i) => i.done).length}/${plan.items.length} done` : 'Plan your day'} color={C.orange} onPress={() => setView('plan')} testID="ql-plan" />
            <Tile icon="star-circle" label="Skill time" sub={g.track.skills.length ? `${g.track.skills.length} skills` : 'Start one'} color={C.purple} onPress={() => setView('skill')} testID="ql-skill" />
            <Tile icon="account-heart" label="Reach out" sub={due ? `${due} due` : 'People'} color={C.pink} onPress={() => setView('people')} testID="ql-people" />
            <Tile icon="dumbbell" label="Workout" sub="Train tab" color={C.red} onPress={() => go('/train')} />
            <Tile icon="lifebuoy" label="Urge SOS" sub="Ride the wave" color={C.cyan} onPress={() => go('/habits?view=free')} />
            <Tile icon="clipboard-pulse" label="Check-in" sub="Mood, sleep" color={C.textDim} onPress={() => go('/life')} />
          </View>
        </View>
      ) : null}
      {view === 'meal' ? <MealForm onDone={close} /> : null}
      {view === 'spend' ? <SpendForm onDone={close} /> : null}
      {view === 'skill' ? <SkillForm onDone={close} /> : null}
      {view === 'people' ? <PeopleForm onDone={close} /> : null}
      {view === 'plan' ? <PlanEditor onDone={close} /> : null}
    </SystemModal>
  );
}

/** The round “+” in the middle of the tab bar. */
export function QuickLogButton({ wide }: { wide?: boolean }) {
  const show = useQuickLog((s) => s.show);
  if (wide) {
    return (
      <Pressable
        onPress={() => {
          tap();
          show();
        }}
        testID="quick-log"
        accessibilityRole="button"
        accessibilityLabel="Quick log"
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [styles.wideBtn, hovered ? { backgroundColor: withAlpha(C.cyan, 0.2) } : null]}>
        <Icon name="plus" size={20} color={C.white} />
        <Txt v="h3" style={{ fontSize: 12, marginLeft: 10 }}>
          QUICK LOG
        </Txt>
      </Pressable>
    );
  }
  return (
    <View style={styles.fabSlot}>
      <Pressable onPress={() => {
          tap();
          show();
        }} testID="quick-log" accessibilityRole="button" accessibilityLabel="Quick log" style={({ pressed }) => [styles.fab, glow(C.cyan, 16, 0.7), pressed ? { transform: [{ scale: 0.94 }] } : null]}>
        <Icon name="plus" size={30} color={C.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: 4, paddingVertical: 12, alignItems: 'center', minHeight: 92 },
  waterBox: { borderWidth: 1, borderColor: withAlpha(C.cyan, 0.25), borderRadius: 4, padding: 10, marginBottom: 10 },
  fabSlot: { width: 64, alignItems: 'center', justifyContent: 'flex-start' },
  fab: { width: 54, height: 54, borderRadius: 27, marginTop: -18, backgroundColor: withAlpha(C.cyan, 0.85), alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.cyanHi },
  wideBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 18, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4, borderWidth: 1, borderColor: C.cyan, backgroundColor: withAlpha(C.cyan, 0.12) },
});
