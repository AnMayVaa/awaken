import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { tap } from '@/lib/haptics';
import { useGame } from '@/store/game';

import { Icon, Txt } from './kit';
import { useLayout } from './Screen';
import { C, F, glow, withAlpha } from './theme';

export const TAB_META: Record<string, { label: string; icon: string }> = {
  index: { label: 'Status', icon: 'shield-account' },
  quests: { label: 'Quests', icon: 'sword' },
  habits: { label: 'Habits', icon: 'calendar-check' },
  train: { label: 'Train', icon: 'dumbbell' },
  life: { label: 'Life', icon: 'chart-donut' },
};

export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { isWide } = useLayout();
  const penalty = useGame((s) => !!s.game.penalty);
  const dailyDone = useGame((s) => s.game.daily.completed);
  const dungeon = useGame((s) => !!s.game.dungeon);
  const checkedIn = useGame((s) => !!s.game.checkins[s.game.board.date]?.savedAt);

  const items = state.routes.map((route, index) => {
    const meta = TAB_META[route.name] ?? { label: descriptors[route.key]?.options.title ?? route.name, icon: 'circle' };
    const focused = index === state.index;
    const badge = route.name === 'quests' ? (penalty ? C.red : !dailyDone ? C.gold : null) : route.name === 'train' && dungeon ? C.green : route.name === 'life' && !checkedIn ? C.gold : null;
    const onPress = () => {
      tap();
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        testID={`tab-${route.name}`}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          isWide ? styles.sideItem : styles.item,
          focused ? { backgroundColor: withAlpha(C.cyan, 0.12) } : hovered ? { backgroundColor: withAlpha(C.cyan, 0.06) } : null,
        ]}>
        {focused && !isWide ? <View style={[styles.activeLine, glow(C.cyan, 10, 0.9)]} /> : null}
        {focused && isWide ? <View style={[styles.activeSide, glow(C.cyan, 10, 0.9)]} /> : null}
        <View>
          <Icon name={meta.icon} size={isWide ? 22 : 23} color={focused ? C.cyanHi : C.muted} />
          {badge ? <View style={[styles.badge, { backgroundColor: badge }, glow(badge, 6, 0.9)]} /> : null}
        </View>
        <Txt
          numberOfLines={1}
          style={{
            fontFamily: F.displayMed,
            fontSize: isWide ? 12 : 9,
            letterSpacing: 1.2,
            marginTop: isWide ? 0 : 3,
            marginLeft: isWide ? 14 : 0,
            color: focused ? C.text : C.muted,
          }}>
          {meta.label.toUpperCase()}
        </Txt>
      </Pressable>
    );
  });

  if (isWide) {
    return (
      <View style={[styles.side, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient colors={['#071631', C.bg0]} style={StyleSheet.absoluteFill} />
        <View style={{ paddingHorizontal: 22, marginBottom: 28 }}>
          <Txt style={{ fontFamily: F.displayBlack, fontSize: 22, letterSpacing: 6, color: C.white, textShadowColor: C.cyan, textShadowRadius: 14 }}>AWAKEN</Txt>
          <Txt v="label" color={C.cyan} style={{ marginTop: 4, fontSize: 9 }}>The System</Txt>
        </View>
        {items}
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <LinearGradient colors={['rgba(6,18,40,0.98)', 'rgba(2,5,12,0.99)']} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['transparent', withAlpha(C.cyan, 0.7), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topLine} />
      <View style={styles.row}>{items}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 0, paddingTop: 6 },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  row: { flexDirection: 'row', maxWidth: 640, width: '100%', alignSelf: 'center' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 3, marginHorizontal: 2 },
  activeLine: { position: 'absolute', top: -6, height: 2, width: '60%', backgroundColor: C.cyan },
  side: { width: 220, borderRightWidth: 1, borderRightColor: C.line },
  sideItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 22, marginHorizontal: 10, borderRadius: 3, marginBottom: 4 },
  activeSide: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 2, backgroundColor: C.cyan },
  badge: { position: 'absolute', top: -2, right: -5, width: 8, height: 8, borderRadius: 4 },
});
