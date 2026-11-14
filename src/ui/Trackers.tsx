import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { today } from '@/game/date';
import { fmtMoney, insights, nutritionScore, peopleDue, seasonInfo, SEASON_TIERS, skillMinutesOn, spentOn, WISH_WAIT_MS } from '@/game/tracking';
import { tap } from '@/lib/haptics';
import { life, useGame } from '@/store/game';
import { openQuickLog } from '@/store/ui';

import { Bar, Btn, Icon, Panel, Pill, Row, Txt } from './kit';
import { C, withAlpha } from './theme';

/** 3×2 grid linking every life tracker with a live mini-number. */
export function TrackerHub() {
  const g = useGame((s) => s.game);
  const t = today();
  const ns = nutritionScore(g, t);
  const water = g.track.water[t] ?? 0;
  const due = peopleDue(g, t).length;
  const si = seasonInfo(g, t);
  const cards = insights(g, t).length;
  const [now] = useState(() => Date.now());
  const tiles = [
    { label: 'Fuel', icon: 'food-apple', color: C.green, href: '/fuel', sub: ns !== null ? `Score ${ns}` : `${water}/${g.track.waterGoal} water`, dot: false },
    { label: 'Treasury', icon: 'treasure-chest', color: C.gold, href: '/money', sub: `${fmtMoney(spentOn(g, t))} today`, dot: g.track.wishlist.some((w) => w.status === 'waiting' && now - w.addedAt >= WISH_WAIT_MS) },
    { label: 'Skills', icon: 'star-circle', color: C.purple, href: '/skills', sub: g.track.skills.length ? `${skillMinutesOn(g, t)} min today` : 'Start one', dot: false },
    { label: 'People', icon: 'account-heart', color: C.pink, href: '/people', sub: due ? `${due} to contact` : g.track.people.length ? 'All good' : 'Add people', dot: due > 0 },
    { label: 'Insights', icon: 'lightbulb-on', color: C.cyan, href: '/insights', sub: cards ? `${cards} found` : 'Collecting', dot: false },
    { label: `Season ${si.n}`, icon: 'flag-checkered', color: C.orange, href: '/season', sub: `Tier ${si.reached}/${SEASON_TIERS.length}`, dot: si.unclaimed.length > 0 },
  ];
  return (
    <Panel title="Life trackers" icon="view-dashboard" right={<Pill text="NEW" color={C.green} />}>
      <View style={styles.grid}>
        {tiles.map((x) => (
          <Pressable
            key={x.label}
            testID={`hub-${x.href.slice(1)}`}
            onPress={() => {
              tap();
              router.push(x.href as never);
            }}
            style={({ pressed }) => [styles.tile, { borderColor: withAlpha(x.color, pressed ? 0.8 : 0.25), backgroundColor: withAlpha(x.color, pressed ? 0.15 : 0.05) }]}>
            <View>
              <Icon name={x.icon} size={22} color={x.color} />
              {x.dot ? <View style={[styles.dot, { backgroundColor: x.color }]} /> : null}
            </View>
            <Txt v="h3" style={{ fontSize: 10.5, marginTop: 5 }} numberOfLines={1}>
              {x.label.toUpperCase()}
            </Txt>
            <Txt v="tiny" numberOfLines={1}>
              {x.sub}
            </Txt>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}

/** Morning plan: three priorities, checked off through the day. */
export function Top3Panel() {
  const plan = useGame((s) => s.game.track.plans[today()]);
  if (!plan) {
    return (
      <Panel title="Top 3 today" icon="format-list-checks" color={C.gold}>
        <Txt v="small" style={{ marginBottom: 10 }}>
          What are the three things that would make today a win?
        </Txt>
        <Btn kind="solid" color={C.gold} icon="pencil" label="Plan my day" onPress={() => openQuickLog('plan')} testID="plan-day" />
      </Panel>
    );
  }
  const done = plan.items.filter((i) => i.done).length;
  return (
    <Panel
      title="Top 3 today"
      icon="format-list-checks"
      color={done === plan.items.length ? C.green : C.gold}
      right={
        <Pressable onPress={() => openQuickLog('plan')} hitSlop={10} accessibilityLabel="Edit Top 3">
          <Icon name="pencil" size={16} color={C.textDim} />
        </Pressable>
      }>
      {plan.items.map((it, i) => (
        <Pressable key={i} onPress={() => life.togglePlan(i)} style={styles.planRow} testID={`top3-${i}`} accessibilityRole="checkbox" accessibilityState={{ checked: it.done }}>
          <Icon name={it.done ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={it.done ? C.green : C.gold} />
          <Txt v="bodyB" color={it.done ? C.textDim : C.text} style={[{ flex: 1, marginLeft: 10 }, it.done ? { textDecorationLine: 'line-through' } : null]}>
            {it.text}
          </Txt>
        </Pressable>
      ))}
      <Bar value={done} max={plan.items.length} color={done === plan.items.length ? C.green : C.gold} height={6} style={{ marginTop: 8 }} />
    </Panel>
  );
}

export function ScoreBadge({ value, label, color }: { value: number | null; label: string; color: string }) {
  return (
    <View style={[styles.score, { borderColor: withAlpha(color, 0.5) }]}>
      <Txt v="num" color={color} style={{ fontSize: 26 }}>
        {value ?? '—'}
      </Txt>
      <Txt v="tiny">{label}</Txt>
    </View>
  );
}

export function Hint({ icon, text, color = C.cyan }: { icon: string; text: string; color?: string }) {
  return (
    <Row gap={8} style={{ alignItems: 'flex-start', marginTop: 6 }}>
      <Icon name={icon} size={15} color={color} style={{ marginTop: 1 }} />
      <Txt v="small" style={{ flex: 1 }}>
        {text}
      </Txt>
    </Row>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexBasis: '30%', flexGrow: 1, borderWidth: 1, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' },
  dot: { position: 'absolute', top: -2, right: -6, width: 8, height: 8, borderRadius: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, minHeight: 44, borderBottomWidth: 1, borderBottomColor: C.lineDim },
  strip: { borderWidth: 1, borderColor: C.lineDim, borderRadius: 4, padding: 10, marginBottom: 12 },
  stripCell: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.03)' },
  score: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 40, width: 80, height: 80 },
});

/** Evening check-in add-on: today's food, water and money at a glance, each one tap away. */
export function DayLogsStrip() {
  const g = useGame((s) => s.game);
  const t = today();
  const meals = g.track.meals.filter((m) => m.date === t).length;
  const water = g.track.water[t] ?? 0;
  const spent = spentOn(g, t);
  const wants = spentOn(g, t, true);
  const noSpend = !!g.track.noSpend[t];
  return (
    <View style={styles.strip}>
      <Txt v="label" style={{ marginBottom: 8 }}>
        Today’s logs
      </Txt>
      <Row gap={8}>
        <Pressable style={styles.stripCell} onPress={() => openQuickLog('meal')}>
          <Icon name="silverware-fork-knife" size={18} color={C.green} />
          <Txt v="bodyB">{meals}</Txt>
          <Txt v="tiny">meals</Txt>
        </Pressable>
        <Pressable style={styles.stripCell} onPress={() => life.water(1)} testID="strip-water">
          <Icon name="cup-water" size={18} color={C.cyan} />
          <Txt v="bodyB">
            {water}/{g.track.waterGoal}
          </Txt>
          <Txt v="tiny">tap +1</Txt>
        </Pressable>
        <Pressable style={styles.stripCell} onPress={() => openQuickLog('spend')}>
          <Icon name="cash" size={18} color={C.gold} />
          <Txt v="bodyB">{fmtMoney(spent)}</Txt>
          <Txt v="tiny">spent</Txt>
        </Pressable>
      </Row>
      {!noSpend && wants === 0 ? (
        <Btn size="sm" kind="ghost" color={C.cyan} icon="wallet" label="Mark no-spend day" onPress={() => life.noSpend()} style={{ marginTop: 6 }} />
      ) : noSpend ? (
        <Txt v="tiny" color={C.green} center style={{ marginTop: 6 }}>
          No-spend day ✓
        </Txt>
      ) : null}
    </View>
  );
}
