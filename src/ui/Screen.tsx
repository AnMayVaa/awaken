import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tap } from '@/lib/haptics';

import { Background } from './Background';
import { Icon, Txt } from './kit';
import { C, MAX_W } from './theme';

export function useLayout() {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isWide: width >= 1000,
    isTablet: width >= 700,
    isSmall: width < 360,
    pad: width < 360 ? 12 : width < 700 ? 16 : 24,
  };
}

export function Header({
  title,
  subtitle,
  back,
  right,
  color = C.cyan,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  color?: string;
}) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            tap();
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
          style={styles.back}
          hitSlop={10}>
          <Icon name="chevron-left" size={26} color={color} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {subtitle ? <Txt v="label" color={color} style={{ marginBottom: 2, opacity: 0.85 }}>{subtitle}</Txt> : null}
        <Txt v="h2" glowColor={color} style={{ fontSize: 21 }} numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {right}
    </View>
  );
}

export function Screen({
  children,
  title,
  subtitle,
  back,
  right,
  tint,
  scroll = true,
  contentStyle,
  inTabs = true,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  tint?: string;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  inTabs?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { pad, isWide } = useLayout();
  const maxW = isWide ? MAX_W + 220 : MAX_W;
  const inner = (
    <View style={[{ width: '100%', maxWidth: maxW, paddingHorizontal: pad, alignSelf: 'center' }, contentStyle]}>
      {title ? <Header title={title} subtitle={subtitle} back={back} right={right} color={tint ?? C.cyan} /> : null}
      {children}
    </View>
  );
  return (
    <View style={styles.root}>
      <Background tint={tint} />
      {scroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: (inTabs ? 24 : insets.bottom + 32) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: inTabs ? 12 : insets.bottom + 12 }}>{inner}</View>
      )}
    </View>
  );
}

/** Responsive two-column helper */
export function Columns({ children, min = 760, gap = 14 }: { children: React.ReactNode[]; min?: number; gap?: number }) {
  const { width } = useWindowDimensions();
  if (width < min) return <>{children}</>;
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'flex-start' }}>
      {children.map((c, i) => (
        <View key={i} style={{ flex: 1, minWidth: 0 }}>
          {c}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg0 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 4, gap: 8, minHeight: 44 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
});
