import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { RANK_COLORS } from '@/game/constants';
import type { Rank } from '@/game/types';
import { tap } from '@/lib/haptics';

import { C, F, glow, textGlow, withAlpha } from './theme';

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

type Variant = 'h1' | 'h2' | 'h3' | 'label' | 'body' | 'bodyB' | 'small' | 'num' | 'tiny';

const variantStyle: Record<Variant, TextStyle> = {
  h1: { fontFamily: F.displayBlack, fontSize: 28, letterSpacing: 2, color: C.text },
  h2: { fontFamily: F.display, fontSize: 18, letterSpacing: 1.5, color: C.text },
  h3: { fontFamily: F.display, fontSize: 13, letterSpacing: 1.5, color: C.text },
  label: { fontFamily: F.displayMed, fontSize: 10, letterSpacing: 2, color: C.textDim, textTransform: 'uppercase' },
  body: { fontFamily: F.body, fontSize: 16, color: C.text, lineHeight: 21 },
  bodyB: { fontFamily: F.bodyBold, fontSize: 16, color: C.text, lineHeight: 21 },
  small: { fontFamily: F.body, fontSize: 13.5, color: C.textDim, lineHeight: 18 },
  num: { fontFamily: F.display, fontSize: 16, color: C.text, letterSpacing: 0.5 },
  tiny: { fontFamily: F.bodySemi, fontSize: 12, color: C.muted, letterSpacing: 0.3, lineHeight: 16 },
};

export function Txt({
  v = 'body',
  color,
  glowColor,
  center,
  style,
  ...rest
}: TextProps & { v?: Variant; color?: string; glowColor?: string | boolean; center?: boolean }) {
  const g = glowColor === true ? color ?? C.cyan : glowColor || undefined;
  return (
    <Text
      {...rest}
      style={[variantStyle[v], color ? { color } : null, g ? textGlow(g, 10) : null, center ? { textAlign: 'center' } : null, style]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Icon                                                                */
/* ------------------------------------------------------------------ */

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 20, color = C.cyan, style }: { name: string; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color} style={style} />;
}

/* ------------------------------------------------------------------ */
/* Panel (System window)                                               */
/* ------------------------------------------------------------------ */

function Corners({ color, size = 12 }: { color: string; size?: number }) {
  const b = 2;
  const base: ViewStyle = { position: 'absolute', width: size, height: size, borderColor: color };
  return (
    <>
      <View pointerEvents="none" style={[base, { top: -1, left: -1, borderTopWidth: b, borderLeftWidth: b }]} />
      <View pointerEvents="none" style={[base, { top: -1, right: -1, borderTopWidth: b, borderRightWidth: b }]} />
      <View pointerEvents="none" style={[base, { bottom: -1, left: -1, borderBottomWidth: b, borderLeftWidth: b }]} />
      <View pointerEvents="none" style={[base, { bottom: -1, right: -1, borderBottomWidth: b, borderRightWidth: b }]} />
    </>
  );
}

export function Panel({
  title,
  icon,
  color = C.cyan,
  right,
  children,
  style,
  padded = true,
  intensity = 1,
}: {
  title?: string;
  icon?: string;
  color?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  intensity?: number;
}) {
  return (
    <View
      style={[
        styles.panel,
        { borderColor: withAlpha(color, 0.45) },
        glow(color, 16 * intensity, 0.28 * intensity),
        style,
      ]}>
      <LinearGradient
        pointerEvents="none"
        colors={[withAlpha(color, 0.1), 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      <Corners color={color} />
      {title ? (
        <View style={styles.panelHead}>
          <View style={styles.row}>
            {icon ? <Icon name={icon} size={15} color={color} style={{ marginRight: 8 }} /> : <View style={[styles.diamond, { borderColor: color }]} />}
            <Txt v="h3" color={color} glowColor={color} style={{ fontSize: 12, letterSpacing: 2.5 }}>
              {title.toUpperCase()}
            </Txt>
          </View>
          {right}
        </View>
      ) : null}
      {title ? (
        <LinearGradient
          colors={[withAlpha(color, 0.7), withAlpha(color, 0.0)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 1, marginHorizontal: 14, marginBottom: 2 }}
        />
      ) : null}
      <View style={padded ? styles.panelBody : null}>{children}</View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

export function Btn({
  label,
  onPress,
  icon,
  color = C.cyan,
  kind = 'outline',
  size = 'md',
  disabled,
  style,
  flex,
  testID,
}: {
  label?: string;
  onPress?: () => void;
  icon?: string;
  color?: string;
  kind?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  flex?: boolean;
  testID?: string;
}) {
  const h = size === 'sm' ? 34 : size === 'lg' ? 54 : 44;
  const fs = size === 'sm' ? 10.5 : size === 'lg' ? 14 : 12;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.btn,
        {
          height: h,
          paddingHorizontal: label ? (size === 'sm' ? 12 : 18) : 0,
          width: label ? undefined : h,
          borderColor: kind === 'ghost' ? 'transparent' : withAlpha(color, disabled ? 0.25 : 0.8),
          backgroundColor:
            kind === 'solid'
              ? withAlpha(color, pressed ? 0.45 : hovered ? 0.36 : 0.28)
              : withAlpha(color, pressed ? 0.25 : hovered ? 0.14 : kind === 'ghost' ? 0 : 0.07),
          opacity: disabled ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        kind === 'solid' && !disabled ? glow(color, 14, 0.45) : null,
        flex ? { flex: 1 } : null,
        style,
      ]}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 15 : 18} color={disabled ? C.muted : color} style={label ? { marginRight: 8 } : null} /> : null}
      {label ? (
        <Txt v="h3" color={disabled ? C.muted : kind === 'solid' ? C.white : color} style={{ fontSize: fs, letterSpacing: 1.8 }} numberOfLines={1}>
          {label.toUpperCase()}
        </Txt>
      ) : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Progress bar                                                        */
/* ------------------------------------------------------------------ */

export function Bar({
  value,
  max,
  color = C.xp,
  height = 10,
  label,
  right,
  style,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  label?: string;
  right?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const anim = useState(() => new Animated.Value(pct))[0];
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct, anim]);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={style}>
      {label || right ? (
        <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 4 }]}>
          {label ? <Txt v="label">{label}</Txt> : <View />}
          {right ? <Txt v="tiny" color={C.textDim}>{right}</Txt> : null}
        </View>
      ) : null}
      <View style={[styles.track, { height, borderColor: withAlpha(color, 0.35) }]}>
        <Animated.View style={{ width, height: '100%' }}>
          <LinearGradient colors={[withAlpha(color, 0.55), color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[StyleSheet.absoluteFill, glow(color, 8, 0.6)]} />
        </Animated.View>
        {/* segment ticks */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.row]}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={{ flex: 1, borderRightWidth: 1, borderRightColor: 'rgba(2,4,10,0.55)' }} />
          ))}
          <View style={{ flex: 1 }} />
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Small bits                                                          */
/* ------------------------------------------------------------------ */

export function Chip({
  label,
  active,
  onPress,
  color = C.cyan,
  icon,
  style,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: withAlpha(color, active ? 0.9 : 0.3),
          backgroundColor: withAlpha(color, active ? 0.22 : pressed ? 0.12 : 0.04),
        },
        active ? glow(color, 10, 0.4) : null,
        style,
      ]}>
      {icon ? <Icon name={icon} size={14} color={active ? color : C.textDim} style={{ marginRight: 6 }} /> : null}
      <Txt v="bodyB" color={active ? C.white : C.textDim} style={{ fontSize: 14 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Txt v="label" style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={C.muted}
        selectionColor={C.cyan}
        {...rest}
        style={[styles.input, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null, style]}
      />
    </View>
  );
}

export function Row({ children, gap = 8, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[styles.row, { gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Divider({ color = C.lineDim, style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: color, marginVertical: 12 }, style]} />;
}

export function Empty({ icon, title, text, children }: { icon: string; title: string; text?: string; children?: React.ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 22, paddingHorizontal: 12, gap: 8 }}>
      <Icon name={icon} size={34} color={C.muted} />
      <Txt v="h3" color={C.textDim} center>
        {title}
      </Txt>
      {text ? (
        <Txt v="small" center>
          {text}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

export function RankBadge({ rank, size = 44 }: { rank: Rank; size?: number }) {
  const color = RANK_COLORS[rank];
  const s = size;
  const pts = `${s / 2},1 ${s - 3},${s * 0.26} ${s - 3},${s * 0.74} ${s / 2},${s - 1} 3,${s * 0.74} 3,${s * 0.26}`;
  return (
    <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }]}>
      <Svg width={s} height={s} style={StyleSheet.absoluteFill}>
        <Polygon points={pts} fill={withAlpha(color, 0.16)} stroke={color} strokeWidth={2} />
      </Svg>
      <Txt v="h2" color={color} glowColor={color} style={{ fontSize: s * 0.42, lineHeight: s * 0.52, fontFamily: F.displayBlack }}>
        {rank}
      </Txt>
    </View>
  );
}

export function Pill({ text, color = C.cyan, icon }: { text: string; color?: string; icon?: string }) {
  return (
    <View style={[styles.pill, { borderColor: withAlpha(color, 0.55), backgroundColor: withAlpha(color, 0.12) }]}>
      {icon ? <Icon name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <Txt v="tiny" color={color} style={{ fontFamily: F.bodyBold, fontSize: 12 }}>
        {text}
      </Txt>
    </View>
  );
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
  color = C.cyan,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  color?: string;
}) {
  return (
    <View style={[styles.segment, { borderColor: withAlpha(color, 0.35) }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segItem, active ? { backgroundColor: withAlpha(color, 0.22) } : null]}>
            <Txt v="h3" color={active ? C.white : C.textDim} style={{ fontSize: 11 }}>
              {o.label.toUpperCase()}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stat({ label, value, color = C.text, icon }: { label: string; value: string | number; color?: string; icon?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1, minWidth: 70 }}>
      <Row gap={4}>
        {icon ? <Icon name={icon} size={14} color={color} /> : null}
        <Txt v="num" color={color} glowColor={color} style={{ fontSize: 17 }}>
          {value}
        </Txt>
      </Row>
      <Txt v="label" style={{ marginTop: 3, fontSize: 9 }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  panel: {
    borderWidth: 1,
    borderRadius: 3,
    backgroundColor: C.panel,
    marginBottom: 14,
    overflow: 'visible',
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  panelBody: { padding: 14, paddingTop: 10 },
  diamond: { width: 8, height: 8, borderWidth: 1.5, transform: [{ rotate: '45deg' }], marginRight: 10 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 3,
  },
  track: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: 'rgba(2, 8, 20, 0.8)',
    color: C.text,
    fontFamily: F.bodySemi,
    fontSize: 17,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 3,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  segment: { flexDirection: 'row', borderWidth: 1, borderRadius: 3, overflow: 'hidden' },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6 },
});
