import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAlerts, type QueuedAlert } from '@/store/alerts';

import { Btn, Icon, Panel, Txt } from './kit';
import { C, F, textGlow, toneColor, withAlpha } from './theme';

const toneIcon: Record<string, string> = {
  info: 'information-variant',
  reward: 'star-four-points',
  levelup: 'chevron-double-up',
  rankup: 'crown',
  warning: 'alert',
  penalty: 'skull',
  boss: 'sword-cross',
  achievement: 'trophy',
};

function AlertCard({ alert }: { alert: QueuedAlert }) {
  const dismiss = useAlerts((s) => s.dismiss);
  const color = toneColor[alert.tone] ?? C.cyan;
  const appear = useState(() => new Animated.Value(0))[0];
  const pulse = useState(() => new Animated.Value(0))[0];
  const [lines] = useState(() => alert.lines.map(() => new Animated.Value(0)));

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 260, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    Animated.stagger(
      140,
      lines.map((l) => Animated.timing(l, { toValue: 1, duration: 260, delay: 180, useNativeDriver: true })),
    ).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [appear, pulse, lines]);

  const big = alert.tone === 'levelup' || alert.tone === 'rankup' || alert.tone === 'boss';
  const actions = alert.actions ?? [{ label: 'Confirm', kind: 'solid' as const }];

  return (
    <View style={styles.backdrop}>
      <Animated.View
        style={{
          width: '100%',
          maxWidth: 440,
          opacity: appear,
          transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
        }}>
        <Animated.View pointerEvents="none" style={[styles.halo, { borderColor: withAlpha(color, 0.5), opacity: pulse }]} />
        <Panel color={color} intensity={2} style={{ marginBottom: 0, backgroundColor: 'rgba(3, 10, 24, 0.96)' }}>
          <View style={styles.topRow}>
            <View style={[styles.iconBox, { borderColor: withAlpha(color, 0.8) }]}>
              <Icon name={toneIcon[alert.tone] ?? 'information-variant'} size={16} color={color} />
            </View>
            <Txt v="label" color={color} style={{ letterSpacing: 3 }}>
              {alert.tone === 'penalty' ? 'WARNING' : 'NOTIFICATION'}
            </Txt>
          </View>
          <Txt
            center
            style={{
              fontFamily: F.displayBlack,
              fontSize: big ? 30 : 21,
              letterSpacing: big ? 4 : 2.5,
              color: C.white,
              marginVertical: big ? 14 : 10,
              ...textGlow(color, 16),
            }}>
            {alert.title}
          </Txt>
          <View style={{ gap: 6, marginBottom: 16 }}>
            {alert.lines.map((l, i) => (
              <Animated.View
                key={i}
                style={{ opacity: lines[i], transform: [{ translateY: lines[i].interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }}>
                <Txt
                  center
                  v={big && i === 1 ? 'h2' : 'body'}
                  color={big && i === 1 ? color : C.text}
                  glowColor={big && i === 1 ? color : undefined}
                  style={big && i === 1 ? { fontSize: 24, marginVertical: 4 } : { fontSize: 16.5 }}>
                  {l}
                </Txt>
              </Animated.View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {actions.map((a, i) => (
              <Btn
                key={i}
                flex
                label={a.label}
                kind={a.kind ?? 'solid'}
                color={a.color ?? color}
                onPress={() => {
                  dismiss();
                  a.onPress?.();
                }}
              />
            ))}
          </View>
        </Panel>
      </Animated.View>
    </View>
  );
}

function Toast({ t, index }: { t: QueuedAlert; index: number }) {
  const drop = useAlerts((s) => s.dropToast);
  const a = useState(() => new Animated.Value(0))[0];
  const color = toneColor[t.tone] ?? C.cyan;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2100),
      Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => drop(t.id));
  }, [a, drop, t.id]);
  return (
    <Animated.View
      style={{
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
        marginTop: index ? 6 : 0,
      }}>
      <Pressable onPress={() => drop(t.id)}>
        <View style={[styles.toast, { borderColor: withAlpha(color, 0.6), boxShadow: `0 0 14px ${withAlpha(color, 0.35)}` } as never]}>
          <Icon name={toneIcon[t.tone] ?? 'information-variant'} size={16} color={color} />
          <View style={{ flexShrink: 1 }}>
            <Txt v="h3" color={color} style={{ fontSize: 11.5 }} numberOfLines={1}>
              {t.title}
            </Txt>
            {t.lines[0] ? (
              <Txt v="small" color={C.text} numberOfLines={1}>
                {t.lines.join('  ·  ')}
              </Txt>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function AlertHost() {
  const current = useAlerts((s) => s.queue[0]);
  const toasts = useAlerts((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <>
      {toasts.length ? (
        <View pointerEvents="box-none" style={[styles.toastWrap, { top: insets.top + 8 }]}>
          {toasts.map((t, i) => (
            <Toast key={t.id} t={t} index={i} />
          ))}
        </View>
      ) : null}
      {current ? <AlertCard key={current.id} alert={current} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 2, 8, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 1000,
  },
  halo: { position: 'absolute', top: -7, left: -7, right: -7, bottom: -7, borderWidth: 1, borderRadius: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2 },
  iconBox: { width: 26, height: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 900, paddingHorizontal: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 3,
    backgroundColor: 'rgba(3, 12, 28, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: 420,
    minWidth: 220,
  },
});
