import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AREAS, type AreaId } from '@/game/areas';
import { DAILY_ELIGIBLE, DEFAULT_DAILY, DIFFICULTY_META, EXERCISE_MAP } from '@/game/constants';
import { RECOVERY_CATEGORIES } from '@/game/recovery';
import { dailyTarget } from '@/game/engine';
import type { Difficulty, RecoveryCategory } from '@/game/types';
import { notificationsSupported, requestNotificationPermission } from '@/lib/notifications';
import { cloudEnabled } from '@/lib/supabase';
import { useAuth } from '@/lib/sync';
import { actions } from '@/store/game';

import { AuthForm } from './AuthForm';
import { Background } from './Background';
import { Btn, Chip, Icon, Input, Panel, Row, Txt } from './kit';
import { C, F, textGlow, withAlpha, NATIVE_DRIVER } from './theme';

function Typewriter({ text, delay = 0, speed = 28, onDone, style }: { text: string; delay?: number; speed?: number; onDone?: () => void; style?: object }) {
  const [n, setN] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined;
    const to = setTimeout(() => {
      iv = setInterval(() => setN((x) => (x >= text.length ? x : x + 1)), speed);
    }, delay);
    return () => {
      clearTimeout(to);
      if (iv) clearInterval(iv);
    };
  }, [text, delay, speed]);
  const finished = n >= text.length;
  // notify the parent after render — never inside a state updater
  useEffect(() => {
    if (finished && !done.current) {
      done.current = true;
      onDone?.();
    }
  }, [finished, onDone]);
  return (
    <Txt v="body" style={[{ fontSize: 18, lineHeight: 26 }, style]} center>
      {text.slice(0, n)}
      {!finished ? <Txt color={C.cyan}>▍</Txt> : null}
    </Txt>
  );
}

const BOOT = ['[SYSTEM] Scanning host…', 'A dormant potential has been detected.', 'You have been selected as a Player.', 'Do you wish to AWAKEN?'];

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [bootLine, setBootLine] = useState(0);
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [daily, setDaily] = useState<string[]>([...DEFAULT_DAILY]);
  const [showAuth, setShowAuth] = useState(false);
  const [focus, setFocus] = useState<AreaId[]>(['fitness', 'mind', 'learning']);
  const [quit, setQuit] = useState<RecoveryCategory[]>([]);
  const session = useAuth((s) => s.session);
  const fade = useState(() => new Animated.Value(0))[0];
  const pulse = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: NATIVE_DRIVER }).start();
  }, [step, fade]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const toggleDaily = (id: string) => {
    setDaily((d) => (d.includes(id) ? (d.length > 1 ? d.filter((x) => x !== id) : d) : d.length >= 5 ? d : [...d, id]));
  };

  const finish = async () => {
    if (notificationsSupported) {
      try {
        await requestNotificationPermission();
      } catch {}
    }
    actions.onboard(name || 'Player', { difficulty, dailyExercises: daily }, { focusAreas: focus, recovery: quit });
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 500, backgroundColor: C.bg0 }]}>
      <Background />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 18 }}
        keyboardShouldPersistTaps="handled">
        <Animated.View style={{ width: '100%', maxWidth: 480, opacity: fade }}>
          {step === 0 ? (
            <View style={{ alignItems: 'center' }}>
              <Animated.View style={{ opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), marginBottom: 26 }}>
                <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={styles.sigil} />
                  <View style={[styles.sigil, { width: 70, height: 70, opacity: 0.6 }]} />
                  <Icon name="chevron-triple-up" size={46} color={C.cyanHi} style={textGlow(C.cyan, 14)} />
                </View>
              </Animated.View>
              <Txt style={{ fontFamily: F.displayBlack, fontSize: 40, letterSpacing: 10, color: C.white, ...textGlow(C.cyan, 22), marginBottom: 6 }}>AWAKEN</Txt>
              <Txt v="label" color={C.cyan} style={{ marginBottom: 34, marginTop: 6 }}>
                Level up your real life
              </Txt>
              <Panel color={C.cyan} intensity={1.6} style={{ width: '100%' }}>
                <View style={{ gap: 10, minHeight: 150, justifyContent: 'center' }}>
                  {BOOT.slice(0, bootLine + 1).map((l, i) => (
                    <Typewriter
                      key={i}
                      text={l}
                      delay={i === 0 ? 400 : 250}
                      onDone={i === bootLine ? () => setBootLine((b) => Math.min(BOOT.length - 1, b + 1)) : undefined}
                      style={i === BOOT.length - 1 ? { fontFamily: F.display, fontSize: 16, color: C.cyanHi, ...textGlow(C.cyan, 10) } : i === 0 ? { color: C.textDim } : undefined}
                    />
                  ))}
                </View>
              </Panel>
              {bootLine >= BOOT.length - 1 ? (
                <View style={{ width: '100%', gap: 10 }}>
                  <Btn kind="solid" size="lg" label="Awaken" icon="lightning-bolt" onPress={() => setStep(1)} testID="awaken" />
                  {cloudEnabled ? (
                    <Btn kind="ghost" label="I already have an account" onPress={() => setShowAuth((v) => !v)} />
                  ) : null}
                </View>
              ) : (
                <Pressable onPress={() => setBootLine(BOOT.length - 1)} style={{ alignSelf: 'center', padding: 10 }}>
                  <Txt v="tiny">tap to skip</Txt>
                </Pressable>
              )}
              {showAuth && !session ? (
                <Panel title="Restore progress" icon="cloud-sync" style={{ width: '100%', marginTop: 14 }}>
                  <AuthForm />
                </Panel>
              ) : null}
              {session ? (
                <Txt v="small" color={C.green} center style={{ marginTop: 12 }}>
                  Signed in as {session.user.email}. No cloud save found yet — set up your Player.
                </Txt>
              ) : null}
            </View>
          ) : null}

          {step === 1 ? (
            <Panel title="Player registration" icon="account-badge">
              <Txt v="body" style={{ marginBottom: 14 }}>
                The System requires a name for your Player profile.
              </Txt>
              <Input label="Player name" value={name} onChangeText={setName} placeholder="e.g. Ohm" maxLength={18} autoFocus={Platform.OS === 'web'} onSubmitEditing={() => name.trim() && setStep(2)} />
              <Btn kind="solid" label="Confirm" onPress={() => setStep(2)} disabled={!name.trim()} />
            </Panel>
          ) : null}

          {step === 2 ? (
            <Panel title="Select difficulty" icon="sword-cross">
              <Txt v="small" style={{ marginBottom: 12 }}>
                Decides Daily Quest targets and how hard penalties hit. You can change it later.
              </Txt>
              {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => {
                const m = DIFFICULTY_META[d];
                const active = d === difficulty;
                const col = d === 'hard' ? C.red : d === 'easy' ? C.green : C.cyan;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setDifficulty(d)}
                    style={[styles.card, { borderColor: withAlpha(col, active ? 0.9 : 0.25), backgroundColor: withAlpha(col, active ? 0.14 : 0.03) }]}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt v="h3" color={active ? col : C.text}>
                        {m.label.toUpperCase()}
                      </Txt>
                      {active ? <Icon name="check-decagram" color={col} /> : null}
                    </Row>
                    <Txt v="small" style={{ marginTop: 4 }}>
                      {m.desc}
                    </Txt>
                    <Txt v="tiny" style={{ marginTop: 4 }}>
                      {DEFAULT_DAILY.map((id) => `${EXERCISE_MAP[id].name} ${dailyTarget(id, d, 1)}${EXERCISE_MAP[id].unit === 'km' ? ' km' : ''}`).join(' · ')}
                    </Txt>
                  </Pressable>
                );
              })}
              <Row style={{ marginTop: 6 }}>
                <Btn label="Back" kind="ghost" onPress={() => setStep(1)} />
                <Btn kind="solid" label="Next" flex onPress={() => setStep(3)} />
              </Row>
            </Panel>
          ) : null}

          {step === 3 ? (
            <Panel title="Daily Quest setup" icon="clipboard-list">
              <Txt v="small" style={{ marginBottom: 12 }}>
                Pick 1–5 tasks for your Daily Quest. Targets grow as you level up.
              </Txt>
              <Row wrap gap={8} style={{ marginBottom: 16 }}>
                {DAILY_ELIGIBLE.map((e) => (
                  <Chip key={e.id} label={e.name} icon={e.icon} active={daily.includes(e.id)} onPress={() => toggleDaily(e.id)} />
                ))}
              </Row>
              <View style={styles.preview}>
                <Txt v="label" color={C.cyan} style={{ marginBottom: 8 }}>
                  [Daily Quest] Body Forging
                </Txt>
                {daily.map((id) => (
                  <Row key={id} style={{ justifyContent: 'space-between', paddingVertical: 3 }}>
                    <Txt v="bodyB">{EXERCISE_MAP[id].name}</Txt>
                    <Txt v="num" color={C.cyanHi} style={{ fontSize: 14 }}>
                      {dailyTarget(id, difficulty, 1)} {EXERCISE_MAP[id].unit}
                    </Txt>
                  </Row>
                ))}
              </View>
              <Row style={{ marginTop: 14 }}>
                <Btn label="Back" kind="ghost" onPress={() => setStep(2)} />
                <Btn kind="solid" label="Accept" flex icon="check" onPress={() => setStep(4)} />
              </Row>
            </Panel>
          ) : null}

          {step === 4 ? (
            <Panel title="Choose your focus" icon="target">
              <Txt v="small" style={{ marginBottom: 12 }}>
                Pick up to 3 life areas to grow first. Side Quests will lean toward them — you can change this any time in the Life tab.
              </Txt>
              {AREAS.map((a) => {
                const on = focus.includes(a.id);
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => setFocus((f) => (on ? f.filter((x) => x !== a.id) : f.length >= 3 ? f : [...f, a.id]))}
                    style={[styles.areaRow, { borderColor: withAlpha(a.color, on ? 0.9 : 0.2), backgroundColor: withAlpha(a.color, on ? 0.14 : 0.02) }]}>
                    <Icon name={a.icon} size={20} color={a.color} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Txt v="bodyB" color={on ? C.white : C.text}>
                        {a.name}
                      </Txt>
                      <Txt v="tiny">{a.rate}</Txt>
                    </View>
                    {on ? <Icon name="check-decagram" color={a.color} /> : null}
                  </Pressable>
                );
              })}
              <Row style={{ marginTop: 6 }}>
                <Btn label="Back" kind="ghost" onPress={() => setStep(3)} />
                <Btn kind="solid" label="Next" flex onPress={() => setStep(5)} disabled={!focus.length} />
              </Row>
            </Panel>
          ) : null}

          {step === 5 ? (
            <Panel title="Break free (optional)" icon="link-variant-off" color={C.green}>
              <Txt v="small" style={{ marginBottom: 12 }}>
                Anything you want to cut down or quit? You’ll get a streak counter, an Urge SOS button and a plan. Recovery mode: a slip never costs HP. This stays private.
              </Txt>
              <Row wrap gap={6} style={{ marginBottom: 14 }}>
                {RECOVERY_CATEGORIES.filter((c) => c.id !== 'custom').map((c) => (
                  <Chip key={c.id} label={c.name} icon={c.icon} color={c.color} active={quit.includes(c.id)} onPress={() => setQuit((q) => (q.includes(c.id) ? q.filter((x) => x !== c.id) : [...q, c.id]))} />
                ))}
              </Row>
              <Row>
                <Btn label="Back" kind="ghost" onPress={() => setStep(4)} />
                <Btn kind="solid" label={quit.length ? 'Next' : 'Skip'} flex onPress={() => setStep(6)} />
              </Row>
            </Panel>
          ) : null}

          {step === 6 ? (
            <Panel title="Contract" icon="file-sign" color={C.gold}>
              <View style={{ gap: 8, marginBottom: 16 }}>
                <Txt v="body">· Clear the Daily Quest every day to grow.</Txt>
                <Txt v="body">· Missing it costs HP and issues a Penalty Quest.</Txt>
                <Txt v="body">· Side Quests across your life adapt to you every day.</Txt>
                <Txt v="body">· Build habits for 66 days to forge them for life.</Txt>
                <Txt v="body">· Every XP you earn damages the weekly boss.</Txt>
                {notificationsSupported ? <Txt v="body">· The System will send you reminders.</Txt> : null}
              </View>
              <Row>
                <Btn label="Back" kind="ghost" onPress={() => setStep(5)} />
                <Btn kind="solid" label="I accept" color={C.gold} flex icon="lightning-bolt" onPress={finish} testID="accept" />
              </Row>
            </Panel>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sigil: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderWidth: 1.5,
    borderColor: withAlpha(C.cyan, 0.5),
    transform: [{ rotate: '45deg' }],
    boxShadow: `0 0 30px ${withAlpha(C.cyan, 0.45)}`,
  },
  card: { borderWidth: 1, borderRadius: 3, padding: 12, marginBottom: 10 },
  areaRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 3, padding: 10, marginBottom: 6 },
  preview: { borderWidth: 1, borderColor: C.lineDim, borderRadius: 3, padding: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
});
