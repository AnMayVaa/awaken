import React from 'react';
import { Pressable, View } from 'react-native';

import { addDays, fromDateKey, today } from '@/game/date';
import { FOOD_TAG_MAP, foodCounts, MEAL_SLOTS, nutritionDayScore, nutritionScore } from '@/game/tracking';
import { life, useGame } from '@/store/game';
import { Chip, Icon, Panel, Row, Stat, Txt } from '@/ui/kit';
import { MealForm, WaterControl } from '@/ui/LogForms';
import { Columns, Screen } from '@/ui/Screen';
import { Hint, ScoreBadge } from '@/ui/Trackers';
import { C, withAlpha } from '@/ui/theme';

export default function FuelScreen() {
  const g = useGame((s) => s.game);
  const t = today();
  const f = foodCounts(g, t);
  const score = nutritionScore(g, t);
  const meals = g.track.meals.filter((m) => m.date === t).slice().reverse();
  const week = Array.from({ length: 7 }, (_, i) => addDays(t, i - 6)).map((d) => ({ d, v: nutritionDayScore(g, d) }));
  const water = g.track.water[t] ?? 0;
  const tip =
    f.meals === 0
      ? 'Log your next meal — awareness alone improves choices.'
      : f.plants < 3
        ? 'Add veggies or fruit to your next meal. Each one also hits the weekly boss.'
        : water < g.track.waterGoal / 2
          ? 'Drink a glass of water now — every glass restores 2 HP.'
          : f.protein < 2
            ? 'Add a protein source to your next meal — it helps recovery after training.'
            : 'Great balance today. Keep it simple and consistent.';

  return (
    <Screen title="FUEL" subtitle="Nutrition — no calorie counting" back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            <Panel title="Today" icon="food-apple" color={C.green}>
              <Row gap={14}>
                <ScoreBadge value={score} label="7-day score" color={C.green} />
                <View style={{ flex: 1 }}>
                  <Row>
                    <Stat label="Meals" value={f.meals} color={C.text} />
                    <Stat label="Veg/fruit" value={f.plants} color={C.green} />
                    <Stat label="Protein" value={f.protein} color={C.orange} />
                  </Row>
                </View>
              </Row>
              <Hint icon="lightbulb-on-outline" text={tip} color={C.gold} />
            </Panel>
            <Panel title="Water" icon="cup-water">
              <WaterControl />
              <Row gap={6} style={{ marginTop: 10, alignItems: 'center' }}>
                <Txt v="tiny">Daily goal:</Txt>
                {[6, 8, 10, 12].map((n) => (
                  <Chip key={n} label={`${n}`} active={g.track.waterGoal === n} onPress={() => life.waterGoal(n)} />
                ))}
              </Row>
            </Panel>
            <Panel title="Log a meal" icon="silverware-fork-knife" color={C.green}>
              <MealForm />
            </Panel>
          </View>,
          <View key="r">
            <Panel title="Today’s meals" icon="format-list-bulleted">
              {!meals.length ? <Txt v="small">Nothing yet. Tap “Log meal” after you eat.</Txt> : null}
              {meals.map((m) => (
                <Row key={m.id} gap={10} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim, alignItems: 'center' }}>
                  <Icon name={MEAL_SLOTS.find((x) => x.id === m.slot)?.icon ?? 'food'} size={20} color={C.textDim} />
                  <View style={{ flex: 1 }}>
                    <Txt v="bodyB">{MEAL_SLOTS.find((x) => x.id === m.slot)?.label}</Txt>
                    <Row gap={4} wrap>
                      {m.tags.map((tg) => (
                        <Txt key={tg} v="tiny" color={FOOD_TAG_MAP[tg].color}>
                          {FOOD_TAG_MAP[tg].label}
                        </Txt>
                      ))}
                      {m.note ? <Txt v="tiny">· {m.note}</Txt> : null}
                    </Row>
                  </View>
                  <Pressable onPress={() => life.deleteMeal(m.id)} hitSlop={10} accessibilityLabel="Delete meal">
                    <Icon name="close" size={16} color={C.muted} />
                  </Pressable>
                </Row>
              ))}
            </Panel>
            <Panel title="Last 7 days" icon="chart-bar">
              <Row style={{ alignItems: 'flex-end', height: 110, gap: 6 }}>
                {week.map((w) => (
                  <View key={w.d} style={{ flex: 1, alignItems: 'center' }}>
                    <Txt v="tiny">{w.v ?? ''}</Txt>
                    <View style={{ width: '70%', height: Math.max(3, (w.v ?? 0) * 0.8), backgroundColor: withAlpha(C.green, w.v === null ? 0.15 : 0.75), borderRadius: 2 }} />
                    <Txt v="tiny" style={{ marginTop: 4, fontSize: 10 }}>
                      {fromDateKey(w.d).toLocaleDateString(undefined, { weekday: 'narrow' })}
                    </Txt>
                  </View>
                ))}
              </Row>
            </Panel>
            <Panel title="How Fuel feeds the game" icon="link-variant">
              <Hint icon="sword-cross" text="Every veggie or fruit meal deals 15 bonus damage to the weekly boss." color={C.purple} />
              <Hint icon="arm-flex" text="Protein on a day you trained gives extra Strength progress." color={C.red} />
              <Hint icon="heart-plus" text="Each glass of water restores 2 HP. Reaching your goal gives +15 XP." color={C.cyan} />
              <Hint icon="map-marker-star" text="Side quests like “Eat the rainbow” and “Hydration” complete themselves from these logs." color={C.green} />
              <Txt v="tiny" style={{ marginTop: 10 }}>
                Fuel is about balance, not restriction. If food or eating feels stressful, talk to a doctor or someone you trust.
              </Txt>
            </Panel>
          </View>,
        ]}
      </Columns>
    </Screen>
  );
}
