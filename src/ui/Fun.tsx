import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, Share, StyleSheet, View } from 'react-native';

import { AREA_MAP } from '@/game/areas';
import { formatDuration } from '@/game/date';
import { wellbeingDue, wheelDue } from '@/game/director';
import { combatPower, isPenaltyActive, rankForLevel } from '@/game/engine';
import {
  companionMood,
  companionStage,
  CRATE_DAYS,
  crateDay,
  dailyBuff,
  SPECIES,
  tipOfDay,
  weekRange,
  weeklyChallenges,
  weeklyReward,
} from '@/game/fun';
import type { GameState } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';

import { Bar, Btn, Icon, Input, Panel, Pill, Row, Txt } from './kit';
import { SystemModal } from './SystemModal';
import { C, glow, NATIVE_DRIVER, textGlow, withAlpha } from './theme';

function useTicker(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return now;
}

/* ---------------- Next best action ---------------- */

type NextAct = { icon: string; color: string; title: string; sub: string; cta: string; run: () => void };

function nextAction(g: GameState, now: number, openHatch: () => void, openCrate: () => void): NextAct {
  const t = g.board.date;
  const u = g.fun.urgent.quest;
  if (!g.fun.companion.species && g.player.level >= 2)
    return { icon: 'egg-easter', color: C.gold, title: 'Your egg is hatching!', sub: 'Choose your companion', cta: 'Hatch', run: openHatch };
  if (u && u.status === 'open' && u.expiresAt > now)
    return { icon: 'alarm-light', color: C.orange, title: `Urgent: ${u.title}`, sub: `${u.criteria} · ${formatDuration(u.expiresAt - now)} left`, cta: 'Done', run: () => confirmUrgent(g) };
  if (!crateDay(g, t).claimed) return { icon: 'treasure-chest', color: C.gold, title: 'Supply crate ready', sub: `Day ${crateDay(g, t).day} of 7 — free loot`, cta: 'Open', run: openCrate };
  if (isPenaltyActive(g)) return { icon: 'skull', color: C.red, title: 'Clear the Penalty Quest', sub: 'XP is halved until you do', cta: 'Go', run: () => router.navigate('/quests') };
  if (!g.daily.completed) {
    const d = g.daily.tasks.filter((x) => x.progress >= x.target).length;
    return { icon: 'sword', color: C.cyan, title: 'Finish the Daily Quest', sub: `${d}/${g.daily.tasks.length} tasks done · resets at midnight`, cta: 'Go', run: () => router.navigate('/quests') };
  }
  const open = g.board.quests.find((q) => q.status === 'open');
  if (open) return { icon: 'map-marker-star', color: AREA_MAP[open.area].color, title: open.title, sub: `Side Quest · ${open.criteria}`, cta: 'Go', run: () => router.navigate('/quests') };
  if (!g.checkins[t]?.savedAt) return { icon: 'clipboard-pulse', color: C.gold, title: 'Daily check-in', sub: '30 seconds · steers tomorrow’s quests', cta: 'Go', run: () => router.navigate('/life') };
  if (wheelDue(g, t) || wellbeingDue(g, t)) return { icon: 'chart-donut', color: C.purple, title: 'Measure your life', sub: 'Life Wheel / wellbeing check is due', cta: 'Go', run: () => router.navigate('/life') };
  return { icon: 'check-decagram', color: C.green, title: 'All clear for today', sub: 'Rest, or enter a Dungeon for bonus XP', cta: 'Dungeon', run: () => router.navigate('/train?view=dungeon') };
}

function confirmUrgent(g: GameState) {
  const u = g.fun.urgent.quest;
  if (!u) return;
  systemConfirm('URGENT QUEST', [u.title, `Done when: ${u.criteria}`], () => actions.completeUrgent(), { confirmLabel: 'I did it', tone: 'reward' });
}

export function NextActionCard() {
  const g = useGame((s) => s.game);
  const now = useTicker(1000);
  const [hatch, setHatch] = useState(false);
  const [crate, setCrate] = useState(false);
  const a = nextAction(g, now, () => setHatch(true), () => setCrate(true));
  return (
    <>
      <Pressable onPress={a.run} style={({ pressed }) => [styles.next, { borderColor: withAlpha(a.color, 0.7), backgroundColor: withAlpha(a.color, pressed ? 0.18 : 0.1) }, glow(a.color, 14, 0.35)]}>
        <View style={[styles.nextIcon, { borderColor: a.color }]}>
          <Icon name={a.icon} size={24} color={a.color} />
        </View>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Txt v="label" color={a.color} style={{ fontSize: 9 }}>
            Next action
          </Txt>
          <Txt v="bodyB" style={{ fontSize: 17 }} numberOfLines={1}>
            {a.title}
          </Txt>
          <Txt v="tiny" numberOfLines={2}>
            {a.sub}
          </Txt>
        </View>
        <Btn size="sm" kind="solid" label={a.cta} color={a.color} onPress={a.run} testID="next-action" />
      </Pressable>
      <HatchModal visible={hatch} onClose={() => setHatch(false)} />
      <CrateModal visible={crate} onClose={() => setCrate(false)} />
    </>
  );
}

/* ---------------- Daily strip: crate · buff · combo ---------------- */

export function DailyStrip() {
  const g = useGame((s) => s.game);
  const [crate, setCrate] = useState(false);
  const t = g.board.date;
  const buff = dailyBuff(t, g.player.createdAt);
  const c = crateDay(g, t);
  const combo = g.fun.combo.date === t ? g.fun.combo.count : 0;
  const now = useTicker(30000);
  const lucky = g.fun.luckyUntil > now;
  return (
    <View style={styles.strip}>
      <Pressable onPress={() => setCrate(true)} style={[styles.chip, { borderColor: withAlpha(C.gold, c.claimed ? 0.25 : 0.8) }, !c.claimed ? glow(C.gold, 10, 0.5) : null]} testID="crate-chip">
        <Icon name={c.claimed ? 'package-variant' : 'treasure-chest'} size={18} color={c.claimed ? C.muted : C.gold} />
        <View style={{ marginLeft: 6 }}>
          <Txt v="label" style={{ fontSize: 8 }}>
            Crate
          </Txt>
          <Txt v="bodyB" style={{ fontSize: 13 }} color={c.claimed ? C.textDim : C.gold}>
            {c.claimed ? `Day ${c.day} ✓` : 'Open!'}
          </Txt>
        </View>
      </Pressable>
      <View style={[styles.chip, { flex: 2, borderColor: withAlpha(buff.color, 0.6) }]}>
        <Icon name={buff.icon} size={18} color={buff.color} />
        <View style={{ marginLeft: 6, flexShrink: 1 }}>
          <Txt v="label" style={{ fontSize: 8 }}>
            Today’s buff
          </Txt>
          <Txt v="bodyB" style={{ fontSize: 13 }} color={buff.color} numberOfLines={1}>
            +25% {AREA_MAP[buff.area].name}
          </Txt>
        </View>
      </View>
      <View style={[styles.chip, { borderColor: withAlpha(combo > 1 ? C.orange : C.cyan, 0.4) }]}>
        <Icon name={lucky ? 'clover' : 'lightning-bolt'} size={18} color={lucky ? C.green : combo > 1 ? C.orange : C.muted} />
        <View style={{ marginLeft: 6 }}>
          <Txt v="label" style={{ fontSize: 8 }}>
            {lucky ? 'Lucky' : 'Combo'}
          </Txt>
          <Txt v="bodyB" style={{ fontSize: 13 }} color={combo > 1 ? C.orange : C.textDim}>
            ×{Math.max(1, combo)}
          </Txt>
        </View>
      </View>
      <CrateModal visible={crate} onClose={() => setCrate(false)} />
    </View>
  );
}

export function CrateModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const g = useGame((s) => s.game);
  const c = crateDay(g, g.board.date);
  const [shake] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!visible || c.claimed) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(shake, { toValue: -1, duration: 120, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(shake, { toValue: 0, duration: 120, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }),
        Animated.delay(900),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, c.claimed, shake]);
  const rotate = shake.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });
  return (
    <SystemModal visible={visible} onClose={onClose} title="Daily supply crate" icon="treasure-chest" color={C.gold}>
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Icon name={c.claimed ? 'package-variant' : 'treasure-chest'} size={64} color={C.gold} style={textGlow(C.gold, 16)} />
        </Animated.View>
        <Txt v="small" style={{ marginTop: 6 }}>
          Login streak: {c.streak} day{c.streak === 1 ? '' : 's'} · come back daily for better loot
        </Txt>
      </View>
      <View style={styles.week}>
        {CRATE_DAYS.map((d, i) => {
          const dayN = i + 1;
          const past = dayN < c.day || (dayN === c.day && c.claimed);
          const cur = dayN === c.day;
          return (
            <View key={i} style={[styles.dayCell, { borderColor: cur ? C.gold : C.lineDim, backgroundColor: past ? withAlpha(C.gold, 0.15) : 'transparent' }]}>
              <Txt v="label" style={{ fontSize: 8 }} color={cur ? C.gold : C.textDim}>
                Day {dayN}
              </Txt>
              <Icon name={past ? 'check' : d.rare ? 'star-four-points' : 'gift-outline'} size={16} color={past ? C.green : d.rare ? C.purple : C.textDim} />
              <Txt v="tiny" center style={{ fontSize: 9.5 }} numberOfLines={2}>
                {d.label}
              </Txt>
            </View>
          );
        })}
      </View>
      <Btn
        kind="solid"
        color={C.gold}
        label={c.claimed ? 'Come back tomorrow' : 'Open crate'}
        icon="treasure-chest"
        disabled={c.claimed}
        testID="open-crate"
        onPress={() => {
          onClose();
          setTimeout(() => actions.claimCrate(), 200);
        }}
      />
    </SystemModal>
  );
}

/* ---------------- Urgent quest banner ---------------- */

export function UrgentBanner() {
  const g = useGame((s) => s.game);
  const now = useTicker(1000);
  const u = g.fun.urgent.quest;
  if (!u || u.status !== 'open' || u.expiresAt <= now) return null;
  const a = AREA_MAP[u.area];
  return (
    <Panel title="Urgent Quest" icon="alarm-light" color={C.orange} intensity={1.5} right={<Txt v="num" color={C.orange} style={{ fontSize: 14 }}>{formatDuration(u.expiresAt - now)}</Txt>}>
      <Row gap={10}>
        <Icon name={a.icon} size={26} color={a.color} />
        <View style={{ flex: 1 }}>
          <Txt v="bodyB" style={{ fontSize: 17 }}>
            {u.title}
          </Txt>
          <Txt v="small">Done when: {u.criteria}</Txt>
        </View>
        <Btn size="sm" kind="solid" color={C.orange} label="Done" onPress={() => confirmUrgent(g)} testID="urgent-done" />
      </Row>
      <Txt v="tiny" style={{ marginTop: 8 }}>
        Bonus XP + gold if you finish in time. No penalty if you don’t.
      </Txt>
    </Panel>
  );
}

/* ---------------- Companion ---------------- */

function HatchModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [sp, setSp] = useState(SPECIES[0].id);
  const [name, setName] = useState('');
  return (
    <SystemModal visible={visible} onClose={onClose} title="Choose your companion" icon="egg-easter" color={C.gold}>
      <Txt v="small" style={{ marginBottom: 12 }}>
        It grows as you level up and cheers you on. It never punishes you — it just likes it when you show up.
      </Txt>
      <View style={styles.speciesGrid}>
        {SPECIES.map((s) => {
          const on = sp === s.id;
          return (
            <Pressable key={s.id} onPress={() => setSp(s.id)} style={[styles.species, { borderColor: on ? s.color : C.lineDim, backgroundColor: on ? withAlpha(s.color, 0.15) : 'transparent' }]}>
              <Icon name={s.icon} size={32} color={s.color} />
              <Txt v="bodyB" color={on ? C.white : C.text}>
                {s.name}
              </Txt>
              <Txt v="tiny" center numberOfLines={2}>
                {s.trait}
              </Txt>
            </Pressable>
          );
        })}
      </View>
      <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Hoot" maxLength={16} />
      <Btn
        kind="solid"
        color={C.gold}
        label="Hatch!"
        icon="egg-easter"
        testID="hatch"
        onPress={() => {
          onClose();
          setTimeout(() => actions.hatchCompanion(sp, name || SPECIES.find((x) => x.id === sp)!.name), 200);
        }}
      />
    </SystemModal>
  );
}

export function CompanionCard() {
  const g = useGame((s) => s.game);
  const [hatch, setHatch] = useState(false);
  const [bob] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  const comp = g.fun.companion;
  const sp = SPECIES.find((x) => x.id === comp.species);
  const st = companionStage(g.player.level);
  const mood = companionMood(g, g.board.date);
  const color = sp?.color ?? C.gold;
  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const moodIcon = mood.mood === 'proud' ? 'star-face' : mood.mood === 'happy' ? 'emoticon-happy-outline' : mood.mood === 'sleepy' ? 'sleep' : 'emoticon-sad-outline';
  return (
    <Panel title="Companion" icon="paw" color={color}>
      <Row gap={14}>
        <View style={[styles.petWrap, { borderColor: withAlpha(color, 0.6) }, glow(color, 8 + st.index * 3, 0.25 + st.index * 0.07)]}>
          <Animated.View style={{ transform: [{ translateY }] }}>
            <Icon name={sp ? sp.icon : 'egg-easter'} size={sp ? st.size : 36} color={color} style={textGlow(color, 6 + st.index * 2)} />
          </Animated.View>
        </View>
        <View style={{ flex: 1 }}>
          <Row gap={6} wrap>
            <Txt v="h3" style={{ fontSize: 15 }}>
              {sp ? comp.name : 'Mysterious egg'}
            </Txt>
            {sp ? <Pill text={st.name.toUpperCase()} color={color} /> : null}
            {sp ? <Icon name={moodIcon} size={16} color={color} /> : null}
          </Row>
          <Txt v="small" style={{ marginTop: 2 }}>
            {sp ? mood.line : g.player.level >= 2 ? 'Something is moving inside…' : 'It will hatch when you reach level 2.'}
          </Txt>
          {sp && st.next ? (
            <Bar style={{ marginTop: 8 }} label={`Evolves at Lv. ${st.next.min}`} right={`Lv. ${g.player.level}`} value={g.player.level - st.min} max={st.next.min - st.min} color={color} height={6} />
          ) : null}
          {!sp && g.player.level >= 2 ? <Btn size="sm" kind="solid" color={C.gold} label="Hatch" icon="egg-easter" style={{ marginTop: 8, alignSelf: 'flex-start' }} onPress={() => setHatch(true)} /> : null}
        </View>
      </Row>
      <View style={[styles.bubble, { borderColor: withAlpha(color, 0.35) }]}>
        <Icon name="lightbulb-on-outline" size={14} color={C.gold} style={{ marginTop: 2 }} />
        <Txt v="tiny" color={C.text} style={{ flex: 1 }}>
          {tipOfDay(g.board.date)}
        </Txt>
      </View>
      <HatchModal visible={hatch} onClose={() => setHatch(false)} />
    </Panel>
  );
}

/* ---------------- Weekly challenges ---------------- */

export function WeeklyPanel() {
  const g = useGame((s) => s.game);
  const { from, to } = weekRange(g.board.date);
  const defs = weeklyChallenges(from, g.player.createdAt);
  const claimed = g.fun.weeklyClaims.week === from ? g.fun.weeklyClaims.claimed : [];
  const r = weeklyReward(g.player.level);
  return (
    <Panel title="Weekly challenges" icon="calendar-star" color={C.purple} right={<Txt v="tiny">resets Monday</Txt>}>
      {defs.map((d) => {
        const p = Math.min(d.target, Math.round(d.progress(g, from, to)));
        const done = p >= d.target;
        const got = claimed.includes(d.id);
        return (
          <View key={d.id} style={styles.weeklyRow}>
            <Icon name={d.icon} size={20} color={got ? C.muted : C.purple} />
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Txt v="bodyB" color={got ? C.textDim : C.text}>
                {d.title}
              </Txt>
              <Bar style={{ marginTop: 5 }} value={p} max={d.target} color={done ? C.green : C.purple} height={5} />
              <Txt v="tiny" style={{ marginTop: 3 }}>
                {p.toLocaleString()} / {d.target.toLocaleString()} {d.unit}
              </Txt>
            </View>
            {got ? (
              <Pill text="CLAIMED" color={C.muted} />
            ) : (
              <Btn size="sm" kind={done ? 'solid' : 'outline'} color={done ? C.green : C.purple} label={done ? 'Claim' : `${r.gold}G`} disabled={!done} onPress={() => actions.claimWeekly(d.id)} />
            )}
          </View>
        );
      })}
      <Txt v="tiny" style={{ marginTop: 6 }}>
        Each challenge: +{r.xp} XP, +{r.gold} Gold and a bonus item roll.
      </Txt>
    </Panel>
  );
}

/* ---------------- Share ---------------- */

export async function shareLicense(g: GameState) {
  const rank = rankForLevel(g.player.level);
  const msg = [
    '⟨ AWAKEN · HUNTER LICENSE ⟩',
    `${g.player.name} — ${rank.rank}-Rank · Lv. ${g.player.level}`,
    `Power ${combatPower(g.player).toLocaleString()} · Daily streak ${g.counters.dailyStreak} · Side quests ${g.counters.sideQuests}`,
    `Habits forged ${g.counters.habitsForged} · Bosses slain ${g.counters.bossesDefeated}`,
    'Level up your real life.',
  ].join('\n');
  try {
    await Share.share({ message: msg });
  } catch {}
}

const styles = StyleSheet.create({
  next: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 3, padding: 12, marginBottom: 12 },
  nextIcon: { width: 46, height: 46, borderWidth: 1, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  strip: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: 'rgba(5,16,34,0.8)' },
  week: { flexDirection: 'row', gap: 4, marginVertical: 12 },
  dayCell: { flex: 1, borderWidth: 1, borderRadius: 3, alignItems: 'center', paddingVertical: 6, gap: 3, minHeight: 74 },
  petWrap: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  bubble: { flexDirection: 'row', gap: 6, marginTop: 12, padding: 8, borderWidth: 1, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)' },
  speciesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  species: { width: '31%', borderWidth: 1, borderRadius: 3, alignItems: 'center', padding: 8, gap: 2 },
  weeklyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.lineDim },
});

