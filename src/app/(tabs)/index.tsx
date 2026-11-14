import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ACHIEVEMENT_MAP, ACHIEVEMENTS, TITLES } from '@/game/achievements';
import { BOSS_MAP, STAT_KEYS, STAT_META } from '@/game/constants';
import { formatHM, weekEnd } from '@/game/date';
import { lifeScore } from '@/game/director';
import { cleanDays } from '@/game/recovery';
import { foodCounts, seasonInfo } from '@/game/tracking';
import { streakFlame } from '@/game/fun';
import { combatPower, isPenaltyActive, maxHp, nextRank, playerClass, rankForLevel, statThreshold, xpToNext } from '@/game/engine';
import { cloudEnabled } from '@/lib/supabase';
import { useAuth } from '@/lib/sync';
import { actions, useGame } from '@/store/game';
import { Btn, Bar, Icon, Panel, Pill, RankBadge, Row, Stat, Txt } from '@/ui/kit';
import { CompanionCard, DailyStrip, NextActionCard, shareLicense, UrgentBanner, WeeklyPanel } from '@/ui/Fun';
import { InstallHint } from '@/ui/InstallHint';
import { Top3Panel, TrackerHub } from '@/ui/Trackers';
import { Columns, Screen, useLayout } from '@/ui/Screen';
import { SystemModal } from '@/ui/SystemModal';
import { C, F, textGlow, withAlpha } from '@/ui/theme';

function SyncDot() {
  const status = useAuth((s) => s.status);
  const session = useAuth((s) => s.session);
  if (!cloudEnabled) return null;
  const color = !session ? C.muted : status === 'error' ? C.red : status === 'syncing' ? C.gold : C.green;
  return <Icon name={session ? 'cloud-check-outline' : 'cloud-off-outline'} size={20} color={color} />;
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [ms]);
  return now;
}

export default function StatusScreen() {
  const g = useGame((s) => s.game);
  const p = g.player;
  const { width } = useLayout();
  const now = useNow();
  const [titleOpen, setTitleOpen] = useState(false);
  const [abilityOpen, setAbilityOpen] = useState(false);
  const [logAll, setLogAll] = useState(false);
  const rank = rankForLevel(p.level);
  const nr = nextRank(p.level);
  const penalty = isPenaltyActive(g);
  const boss = BOSS_MAP[g.boss.bossId];
  const title = p.titleId ? ACHIEVEMENT_MAP[p.titleId]?.title : rank.title;
  const habitsDone = g.habits.filter((h) => h.status === 'active' && h.checks.includes(g.daily.date)).length;
  const sideDone = g.board.quests.filter((q) => q.status === 'done').length;
  const ls = lifeScore(g, g.board.date);
  const bestFree = g.recovery.length ? Math.max(...g.recovery.map((r) => cleanDays(r, now))) : null;
  const checkedIn = !!g.checkins[g.board.date]?.savedAt;
  const habitsActive = g.habits.filter((h) => h.status === 'active').length;
  const dailyDone = g.daily.tasks.filter((t) => t.progress >= t.target).length;
  const boost = g.xpBoostUntil > now;
  const tileW = width < 380 ? '47%' : '31%';
  const season = seasonInfo(g, g.board.date);
  const food = foodCounts(g, g.board.date);
  const water = g.track.water[g.board.date] ?? 0;

  const player = (
    <Panel
      title="Player"
      icon="account-box"
      key="player"
      right={
        <Pressable onPress={() => shareLicense(g)} hitSlop={10} accessibilityLabel="Share hunter license">
          <Icon name="share-variant" size={18} color={C.textDim} />
        </Pressable>
      }>
      <Row gap={14} style={{ alignItems: 'flex-start' }}>
        <RankBadge rank={rank.rank} size={68} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt v="h2" numberOfLines={1} style={{ fontSize: 22 }}>
            {p.name}
          </Txt>
          <Pressable onPress={() => setTitleOpen(true)} hitSlop={6}>
            <Row gap={6} style={{ marginTop: 2 }}>
              <Txt v="bodyB" color={C.gold} numberOfLines={1} style={{ flexShrink: 1 }}>
                “{title}”
              </Txt>
              <Icon name="pencil" size={13} color={C.muted} />
            </Row>
          </Pressable>
          <Txt v="small">
            Class: {playerClass(p)} · {rank.rank}-Rank
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="label" style={{ fontSize: 9 }}>
            Level
          </Txt>
          <Txt style={{ fontFamily: F.displayBlack, fontSize: 38, color: C.white, lineHeight: 44, ...textGlow(C.cyan, 16) }}>{p.level}</Txt>
        </View>
      </Row>
      <View style={{ height: 14 }} />
      <Bar label="XP" right={`${p.xp} / ${xpToNext(p.level)}`} value={p.xp} max={xpToNext(p.level)} color={C.xp} />
      <View style={{ height: 10 }} />
      <Bar label="HP" right={`${p.hp} / ${maxHp(p)}`} value={p.hp} max={maxHp(p)} color={C.hp} />
      <View style={styles.statRow}>
        <Stat label="Gold" value={p.gold.toLocaleString()} color={C.gold} icon="hexagon-multiple" />
        <Stat label="Power" value={combatPower(p).toLocaleString()} color={C.cyanHi} icon="flash" />
        <Stat label="Streak" value={g.counters.dailyStreak} color={streakFlame(g.counters.dailyStreak).color} icon="fire" />
        <Stat label="Life" value={ls.score ?? '—'} color={C.green} icon="star-four-points" />
      </View>
      <Pressable onPress={() => router.push('/season')} style={styles.seasonRow} testID="season-row">
        <Icon name="flag-checkered" size={14} color={C.orange} />
        <Txt v="tiny" style={{ flex: 1 }}>
          Season {season.n} · day {season.day}/66 · tier {season.reached}/10{nr ? ` · ${nr.rank}-Rank at Lv ${nr.min}` : ''}
        </Txt>
        {season.unclaimed.length ? <Pill text="CLAIM" color={C.orange} /> : <Icon name="chevron-right" size={16} color={C.muted} />}
      </Pressable>
      {boost ? (
        <View style={[styles.boost]}>
          <Icon name="flask" size={16} color={C.purple} />
          <Txt v="bodyB" color={C.purple}>
            XP ×2 — {formatHM(g.xpBoostUntil - now)} left
          </Txt>
        </View>
      ) : null}
    </Panel>
  );

  const stats = (
    <Panel
      key="stats"
      title="Abilities"
      icon="chart-bubble"
      right={
        <Pressable onPress={() => setAbilityOpen(true)} hitSlop={10} accessibilityLabel="Ability details" testID="abilities-open">
          {p.freePoints > 0 ? <Pill text={`${p.freePoints} TO ASSIGN`} color={C.gold} icon="plus-circle" /> : <Icon name="information-outline" size={18} color={C.textDim} />}
        </Pressable>
      }>
      <View style={styles.abilityGrid}>
        {STAT_KEYS.map((k) => {
          const m = STAT_META[k];
          return (
            <Pressable key={k} onPress={() => setAbilityOpen(true)} style={[styles.abilityCell, { borderColor: withAlpha(m.color, 0.22) }]}>
              <Row gap={6}>
                <Icon name={m.icon} size={16} color={m.color} />
                <Txt v="h3" style={{ fontSize: 11, flex: 1 }}>
                  {k}
                </Txt>
                <Txt v="num" color={m.color} style={{ fontSize: 15 }}>
                  {p.stats[k]}
                </Txt>
              </Row>
              <View style={styles.miniTrack}>
                <View style={{ width: `${Math.min(100, (p.statXp[k] / statThreshold(p.stats[k])) * 100)}%`, height: '100%', backgroundColor: m.color, opacity: 0.8 }} />
              </View>
            </Pressable>
          );
        })}
      </View>
      {p.freePoints > 0 ? (
        <Btn kind="solid" color={C.gold} icon="plus-circle" label={`Assign ${p.freePoints} point${p.freePoints === 1 ? '' : 's'}`} onPress={() => setAbilityOpen(true)} style={{ marginTop: 10 }} testID="assign-points" />
      ) : null}
    </Panel>
  );

  const todayItems = [
    { key: 'daily', icon: 'sword', color: C.gold, label: 'Daily Quest', done: g.daily.completed, sub: g.daily.completed ? 'Cleared — rewards claimed' : `${dailyDone}/${g.daily.tasks.length} tasks · resets at midnight`, href: '/quests' },
    { key: 'side', icon: 'map-marker-star', color: C.cyan, label: 'Side Quests', done: g.board.quests.length > 0 && sideDone >= g.board.quests.length, sub: `${sideDone}/${g.board.quests.length} cleared`, href: '/quests' },
    { key: 'habits', icon: 'calendar-check', color: C.cyan, label: 'Habits', done: habitsActive > 0 && habitsDone === habitsActive, sub: habitsActive ? `${habitsDone}/${habitsActive} checked in` : 'Start a 66-day challenge', href: '/habits' },
    ...(bestFree !== null
      ? [{ key: 'free', icon: 'link-variant-off', color: C.green, label: 'Break Free', optional: true, done: false, sub: `Best streak ${bestFree} day${bestFree === 1 ? '' : 's'} · Urge SOS ready`, href: '/habits?view=free' }]
      : []),
    { key: 'fuel', icon: 'food-apple', color: C.green, label: 'Fuel', done: food.meals >= 2 && water >= g.track.waterGoal, sub: `${food.meals} meals · ${water}/${g.track.waterGoal} water`, href: '/fuel' },
    { key: 'checkin', icon: 'clipboard-pulse', color: C.gold, label: 'Life check-in', done: checkedIn, sub: checkedIn ? 'Done — steering tomorrow’s quests' : 'Mood, sleep, screen time · 30 s', href: '/life' },
    { key: 'dungeon', icon: 'gate', color: C.purple, label: 'Focus Dungeon', optional: true, done: !!g.activity[g.board.date]?.focusMin, sub: g.dungeon ? `In progress · ${formatHM(g.dungeon.endsAt - now)} left` : `${g.counters.dungeonsCleared} cleared · optional`, href: '/train?view=dungeon' },
  ];
  const core = todayItems.filter((t) => !('optional' in t && t.optional));
  const todayDone = core.filter((t) => t.done).length;
  const todayPanel = (
    <Panel
      key="today"
      title="Today"
      icon="calendar-today"
      color={penalty ? C.red : C.cyan}
      right={<Txt v="num" color={todayDone === core.length ? C.green : C.textDim} style={{ fontSize: 13 }}>{`${todayDone}/${core.length}`}</Txt>}>
      {todayItems.map((t, i) => (
        <Pressable
          key={t.key}
          onPress={() => router.navigate(t.href as never)}
          style={({ pressed }) => [styles.todayRow, i === todayItems.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: withAlpha(C.cyan, 0.06) }]}
          accessibilityRole="button"
          accessibilityLabel={`${t.label}: ${t.sub}`}>
          <View style={[styles.todayIcon, { borderColor: withAlpha(t.done ? C.green : t.color, 0.45), backgroundColor: withAlpha(t.done ? C.green : t.color, 0.1) }]}>
            <Icon name={t.done ? 'check-bold' : t.icon} size={18} color={t.done ? C.green : t.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Txt v="bodyB" color={t.done ? C.textDim : C.text} style={t.done ? { textDecorationLine: 'line-through' } : undefined}>
              {t.label}
            </Txt>
            <Txt v="small" numberOfLines={1}>
              {t.sub}
            </Txt>
          </View>
          <Icon name="chevron-right" color={C.muted} />
        </Pressable>
      ))}
    </Panel>
  );

  const bossPanel = (
    <Panel key="boss" title="Weekly Boss" icon="sword-cross" color={boss?.color ?? C.purple}>
      <Row gap={14}>
        <View style={[styles.bossIcon, { borderColor: withAlpha(boss?.color ?? C.purple, 0.6), backgroundColor: withAlpha(boss?.color ?? C.purple, 0.12) }]}>
          <Icon name={g.boss.defeated ? 'skull-crossbones' : boss?.icon ?? 'skull'} size={34} color={g.boss.defeated ? C.muted : boss?.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="h2" style={{ fontSize: 17 }} color={g.boss.defeated ? C.muted : C.text}>
            {boss?.name}
          </Txt>
          <Txt v="small">{boss?.epithet}</Txt>
          <Txt v="tiny" style={{ marginTop: 2 }}>
            {g.boss.defeated ? 'Defeated. A new boss appears on Monday.' : `Escapes in ${formatHM(weekEnd(g.boss.weekId).getTime() - now)}`}
          </Txt>
        </View>
      </Row>
      <Bar style={{ marginTop: 12 }} label="Boss HP" right={`${g.boss.hp.toLocaleString()} / ${g.boss.maxHp.toLocaleString()}`} value={g.boss.hp} max={g.boss.maxHp} color={boss?.color ?? C.purple} height={12} />
      <Txt v="tiny" style={{ marginTop: 8 }}>
        Every XP you earn deals 1 damage. Defeat it before Sunday midnight for bonus XP, gold and loot.
      </Txt>
    </Panel>
  );

  const unlocked = Object.keys(g.achievements).length;
  const menu = (
    <Panel key="menu" title="System" icon="view-grid">
      <View style={styles.grid}>
        {[
          { label: 'Shop', icon: 'storefront', href: '/shop', color: C.gold, sub: `${p.gold} G` },
          { label: 'Guild', icon: 'account-group', href: '/guild', color: C.green, sub: `${g.bots.length} hunters` },
          { label: 'Trophies', icon: 'trophy', href: '/achievements', color: C.orange, sub: `${unlocked}/${ACHIEVEMENTS.length}` },
          { label: 'Inventory', icon: 'bag-personal', href: '/shop?tab=inventory', color: C.purple, sub: `${Object.values(g.inventory).reduce((a, b) => a + b, 0)} items` },
          { label: 'Records', icon: 'chart-line', href: '/records', color: C.cyan, sub: `${p.totalXp.toLocaleString()} XP` },
          { label: 'Settings', icon: 'cog', href: '/settings', color: C.textDim, sub: cloudEnabled ? 'Account & sync' : 'Preferences' },
        ].map((t) => (
          <Pressable
            key={t.label}
            onPress={() => router.push(t.href as never)}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.tile,
              { width: tileW as `${number}%`, borderColor: withAlpha(t.color, pressed || hovered ? 0.7 : 0.25), backgroundColor: withAlpha(t.color, pressed ? 0.16 : 0.05) },
            ]}>
            <Icon name={t.icon} size={24} color={t.color} />
            <Txt v="h3" style={{ fontSize: 11, marginTop: 6 }}>
              {t.label.toUpperCase()}
            </Txt>
            <Txt v="tiny" numberOfLines={1}>
              {t.sub}
            </Txt>
          </Pressable>
        ))}
      </View>
    </Panel>
  );

  const logPanel = (
    <Panel
      key="log"
      title="System Log"
      icon="console-line"
      right={
        g.logs.length > 3 ? (
          <Pressable onPress={() => setLogAll((v) => !v)} hitSlop={10} testID="log-toggle">
            <Txt v="label" color={C.cyan}>
              {logAll ? 'Less' : 'More'}
            </Txt>
          </Pressable>
        ) : undefined
      }>
      {g.logs.slice(0, logAll ? 12 : 3).map((l) => (
        <Row key={l.id} gap={8} style={{ paddingVertical: 4, alignItems: 'flex-start' }}>
          <Txt v="tiny" style={{ width: 44 }}>
            {new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Txt>
          <Txt v="small" color={l.tone === 'penalty' ? C.red : l.tone === 'levelup' || l.tone === 'achievement' ? C.gold : C.text} style={{ flex: 1 }}>
            {l.text}
          </Txt>
        </Row>
      ))}
      {!g.logs.length ? <Txt v="small">No entries yet.</Txt> : null}
    </Panel>
  );

  return (
    <Screen
      title="STATUS"
      subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
      right={
        <Row gap={14}>
          <SyncDot />
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityLabel="Settings">
            <Icon name="cog-outline" size={22} color={C.textDim} />
          </Pressable>
        </Row>
      }>
      <InstallHint />
      <NextActionCard />
      <DailyStrip />
      <UrgentBanner />
      {penalty ? (
        <Pressable onPress={() => router.navigate('/quests')}>
          <Panel color={C.red} intensity={1.6} title="Penalty Zone" icon="skull">
            <Txt v="body">A Penalty Quest is active. XP gain is halved until you clear it.</Txt>
            <Txt v="bodyB" color={C.red} style={{ marginTop: 6 }}>
              Tap to view the Penalty Quest →
            </Txt>
          </Panel>
        </Pressable>
      ) : null}
      <Columns>
        {[
          <View key="l">
            {player}
            <Top3Panel />
            {todayPanel}
          </View>,
          <View key="r">
            {stats}
            <TrackerHub />
            <CompanionCard />
            <WeeklyPanel />
            {bossPanel}
            {menu}
            {logPanel}
          </View>,
        ]}
      </Columns>

      <SystemModal visible={titleOpen} onClose={() => setTitleOpen(false)} title="Equip title" icon="tag">
        <Pressable onPress={() => (actions.setTitle(null), setTitleOpen(false))} style={styles.titleRow}>
          <Txt v="bodyB" color={!p.titleId ? C.gold : C.text}>
            {rank.title} <Txt v="tiny">(rank title)</Txt>
          </Txt>
        </Pressable>
        {TITLES.map((t) => {
          const owned = !!g.achievements[t.id];
          return (
            <Pressable key={t.id} disabled={!owned} onPress={() => (actions.setTitle(t.id), setTitleOpen(false))} style={[styles.titleRow, { opacity: owned ? 1 : 0.4 }]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="bodyB" color={p.titleId === t.id ? C.gold : C.text}>
                  {t.title}
                </Txt>
                {!owned ? <Icon name="lock" size={16} color={C.muted} /> : null}
              </Row>
              <Txt v="tiny">{ACHIEVEMENT_MAP[t.id].desc}</Txt>
            </Pressable>
          );
        })}
      </SystemModal>
      <SystemModal visible={abilityOpen} onClose={() => setAbilityOpen(false)} title="Abilities" icon="chart-bubble">
        <Txt v="small" style={{ marginBottom: 6 }}>
          {p.freePoints > 0 ? `You have ${p.freePoints} point${p.freePoints === 1 ? '' : 's'} to assign. Tap + to raise an ability.` : 'Stats grow on their own as you complete quests. Level-ups and Daily Quests also grant points to assign.'}
        </Txt>
        {STAT_KEYS.map((k) => {
          const m = STAT_META[k];
          return (
            <View key={k} style={styles.statLine}>
              <Icon name={m.icon} size={22} color={m.color} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt v="h3" style={{ fontSize: 12 }}>
                    {k} <Txt v="small"> {m.name}</Txt>
                  </Txt>
                  <Txt v="num" color={m.color} glowColor={m.color}>
                    {p.stats[k]}
                  </Txt>
                </Row>
                <Txt v="tiny" numberOfLines={2}>
                  {m.desc}
                </Txt>
                <View style={styles.miniTrack}>
                  <View style={{ width: `${Math.min(100, (p.statXp[k] / statThreshold(p.stats[k])) * 100)}%`, height: '100%', backgroundColor: m.color, opacity: 0.8 }} />
                </View>
              </View>
              {p.freePoints > 0 ? <Btn icon="plus" size="sm" color={C.gold} onPress={() => actions.allocate(k)} style={{ marginLeft: 10, minWidth: 44, minHeight: 40 }} testID={`alloc-${k}`} /> : null}
            </View>
          );
        })}
      </SystemModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.lineDim },
  statLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(60,200,255,0.06)' },
  seasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.lineDim },
  abilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  abilityCell: { flexGrow: 1, flexBasis: '45%', borderWidth: 1, borderRadius: 3, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: 'rgba(255,255,255,0.015)' },
  miniTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 5, borderRadius: 2, overflow: 'hidden' },
  todayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, minHeight: 56, borderBottomWidth: 1, borderBottomColor: C.lineDim },
  todayIcon: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  bossIcon: { width: 62, height: 62, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  tile: { borderWidth: 1, borderRadius: 3, paddingVertical: 14, alignItems: 'center', gap: 1 },
  boost: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 8, borderWidth: 1, borderColor: withAlpha(C.purple, 0.5), borderRadius: 3, justifyContent: 'center' },
  titleRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim },
});
