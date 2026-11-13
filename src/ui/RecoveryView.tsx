import React, { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import {
  bestDays,
  cleanMs,
  DAY_MS,
  insights,
  nextMilestone,
  RECOVERY_CATEGORIES,
  RECOVERY_MAP,
  totalCleanDays,
  TRIGGERS,
} from '@/game/recovery';
import type { RecoveryCategory, RecoveryTrack } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';

import { Bar, Btn, Chip, Empty, Icon, Input, Panel, Row, Txt } from './kit';
import { SystemModal } from './SystemModal';
import { C, F, NATIVE_DRIVER, textGlow, withAlpha } from './theme';

function useMinuteNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

function Breather({ color }: { color: string }) {
  const [v] = useState(() => new Animated.Value(0));
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  useEffect(() => {
    let alive = true;
    const run = () => {
      if (!alive) return;
      setPhase('in');
      Animated.timing(v, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }).start(() => {
        if (!alive) return;
        setPhase('out');
        Animated.timing(v, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER }).start(run);
      });
    };
    run();
    return () => {
      alive = false;
      v.stopAnimation();
    };
  }, [v]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 210 }}>
      <Animated.View style={[styles.breath, { borderColor: color, backgroundColor: withAlpha(color, 0.12), transform: [{ scale }] }]} />
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Txt style={{ fontFamily: F.display, fontSize: 20, color: C.white, ...textGlow(color, 12) }}>{phase === 'in' ? 'Breathe in' : 'Breathe out'}</Txt>
        <Txt v="tiny">{phase === 'in' ? '4 seconds' : '6 seconds'}</Txt>
      </View>
    </View>
  );
}

function SOSModal({ track, onClose, onSlip }: { track: RecoveryTrack | null; onClose: () => void; onSlip: () => void }) {
  const [step, setStep] = useState(0);
  const [secs, setSecs] = useState(0);
  const [trig, setTrig] = useState<string[]>([]);
  const [action, setAction] = useState<string | null>(null);
  useEffect(() => {
    if (!track) return;
    const iv = setInterval(() => setSecs((x) => x + 1), 1000);
    return () => clearInterval(iv);
  }, [track]);
  if (!track) return null;
  const meta = RECOVERY_MAP[track.category];
  const close = () => {
    setStep(0);
    setSecs(0);
    setTrig([]);
    setAction(null);
    onClose();
  };
  return (
    <SystemModal visible={!!track} onClose={close} title="Urge SOS" icon="lifebuoy" color={meta.color}>
      {step === 0 ? (
        <>
          <Txt v="body" center>
            Pause. An urge is a wave — it rises, peaks and passes. You don’t have to act on this one.
          </Txt>
          <Breather color={meta.color} />
          <Txt v="tiny" center style={{ marginBottom: 12 }}>
            Riding the wave · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
          </Txt>
          <Btn kind="solid" color={meta.color} label={secs < 20 ? `Keep breathing… ${20 - secs}s` : 'Next'} disabled={secs < 20} onPress={() => setStep(1)} />
        </>
      ) : step === 1 ? (
        <>
          {track.why ? (
            <View style={[styles.box, { borderColor: withAlpha(C.gold, 0.5) }]}>
              <Txt v="label" color={C.gold}>
                Your why
              </Txt>
              <Txt v="body">{track.why}</Txt>
            </View>
          ) : null}
          <View style={[styles.box, { borderColor: withAlpha(meta.color, 0.5) }]}>
            <Txt v="label" color={meta.color}>
              Your plan
            </Txt>
            <Txt v="body">{track.plan || meta.plan}</Txt>
          </View>
          <Txt v="label" style={{ marginBottom: 6 }}>
            Do one of these right now
          </Txt>
          <Row wrap gap={6} style={{ marginBottom: 12 }}>
            {(track.replacements.length ? track.replacements : meta.replacements).map((r) => (
              <Chip key={r} label={r} color={meta.color} active={action === r} onPress={() => setAction(r)} />
            ))}
          </Row>
          <Txt v="label" style={{ marginBottom: 6 }}>
            What triggered it? (optional)
          </Txt>
          <Row wrap gap={6} style={{ marginBottom: 14 }}>
            {TRIGGERS.map((t) => (
              <Chip key={t} label={t} active={trig.includes(t)} onPress={() => setTrig((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />
            ))}
          </Row>
          <Btn kind="solid" color={C.green} label="I rode the wave" icon="waves" onPress={() => {
            const tr = trig.join(', ') || undefined;
            close();
            setTimeout(() => actions.resistUrge(track.id, tr), 200);
          }} testID="urge-resisted" />
          <Row gap={8} style={{ marginTop: 8 }}>
            <Btn flex kind="ghost" label="Breathe again" onPress={() => { setSecs(0); setStep(0); }} />
            <Btn flex kind="ghost" color={C.textDim} label="I slipped" onPress={() => { close(); setTimeout(onSlip, 250); }} />
          </Row>
        </>
      ) : null}
    </SystemModal>
  );
}

function SlipModal({ track, onClose }: { track: RecoveryTrack | null; onClose: () => void }) {
  const [trig, setTrig] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [plan, setPlan] = useState<string | null>(null);
  if (!track) return null;
  const meta = RECOVERY_MAP[track.category];
  const close = () => {
    setTrig([]);
    setNote('');
    setPlan(null);
    onClose();
  };
  return (
    <SystemModal visible={!!track} onClose={close} title="A slip, not a fall" icon="heart-half-full" color={C.gold}>
      <Txt v="body" style={{ marginBottom: 10 }}>
        Lapses are part of most recoveries. What matters is what you do next. Shame makes the next slip more likely — curiosity makes it less likely.
      </Txt>
      <Txt v="label" style={{ marginBottom: 6 }}>
        What led to it?
      </Txt>
      <Row wrap gap={6} style={{ marginBottom: 12 }}>
        {TRIGGERS.map((t) => (
          <Chip key={t} label={t} active={trig.includes(t)} onPress={() => setTrig((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))} />
        ))}
      </Row>
      <Input label="What happened? (private)" value={note} onChangeText={setNote} maxLength={200} multiline />
      <Input label="Update your if-then plan" value={plan ?? track.plan ?? meta.plan} onChangeText={setPlan} maxLength={200} multiline />
      <Txt v="tiny" style={{ marginBottom: 12 }}>
        Your total clean days and best streak are kept. No HP penalty — honesty earns XP.
      </Txt>
      <Btn kind="solid" color={C.gold} label="Start a new run" icon="restart" onPress={() => {
        const tr = trig.join(', ') || undefined;
        const p = plan ?? undefined;
        close();
        setTimeout(() => actions.relapse(track.id, tr, note, p), 200);
      }} testID="slip-confirm" />
    </SystemModal>
  );
}

function TrackCard({ t, now, onSOS, onSlip }: { t: RecoveryTrack; now: number; onSOS: () => void; onSlip: () => void }) {
  const [open, setOpen] = useState(false);
  const meta = RECOVERY_MAP[t.category];
  const ms = cleanMs(t, now);
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / 3600000);
  const next = nextMilestone(t, now);
  const ins = insights(t);
  return (
    <Panel color={meta.color} title={meta.name} icon={meta.icon}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Txt v="bodyB" style={{ fontSize: 17 }}>
            {t.name}
          </Txt>
          <Txt v="tiny">Free for</Txt>
        </View>
        <Txt style={{ fontFamily: F.displayBlack, fontSize: 34, color: C.white, ...textGlow(meta.color, 14) }}>
          {days}
          <Txt v="small"> d </Txt>
          {hours}
          <Txt v="small"> h</Txt>
        </Txt>
      </Row>
      {next ? <Bar style={{ marginTop: 10 }} label={`Next: ${next} day${next === 1 ? '' : 's'}`} right={`${days}/${next}`} value={ms} max={next * DAY_MS} color={meta.color} /> : null}
      <Row style={{ marginTop: 12 }}>
        <View style={styles.stat}>
          <Txt v="num" color={C.green}>
            {totalCleanDays(t, now)}
          </Txt>
          <Txt v="label" style={{ fontSize: 8.5 }}>
            Total clean
          </Txt>
        </View>
        <View style={styles.stat}>
          <Txt v="num" color={C.gold}>
            {bestDays(t, now)}
          </Txt>
          <Txt v="label" style={{ fontSize: 8.5 }}>
            Best streak
          </Txt>
        </View>
        <View style={styles.stat}>
          <Txt v="num" color={C.cyanHi}>
            {ins.resisted}
          </Txt>
          <Txt v="label" style={{ fontSize: 8.5 }}>
            Urges beaten
          </Txt>
        </View>
      </Row>
      <Row gap={8} style={{ marginTop: 14 }}>
        <Btn flex kind="solid" color={meta.color} label="Urge SOS" icon="lifebuoy" onPress={onSOS} testID={`sos-${t.id}`} />
        <Btn label="I slipped" kind="ghost" color={C.textDim} onPress={onSlip} />
      </Row>
      <Pressable onPress={() => setOpen((v) => !v)} style={{ marginTop: 10 }}>
        <Txt v="label" color={C.cyan}>
          {open ? '▾' : '▸'} Plan, insights & tips
        </Txt>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 8, gap: 8 }}>
          <Txt v="small" color={C.text}>
            Plan: {t.plan || meta.plan}
          </Txt>
          {t.why ? <Txt v="small">Why: {t.why}</Txt> : null}
          <Txt v="small">
            Top triggers: {ins.topTriggers.length ? ins.topTriggers.map(([k, n]) => `${k} (${n})`).join(', ') : 'log a few urges to see patterns'}
          </Txt>
          {ins.riskyWindow ? <Txt v="small">Riskiest time: {ins.riskyWindow}</Txt> : null}
          {ins.winRate !== null ? <Txt v="small">Urge win rate: {ins.winRate}%</Txt> : null}
          <Txt v="small">Relapses logged: {t.relapses.length}</Txt>
          {meta.tips.map((tip) => (
            <Row key={tip} gap={6} style={{ alignItems: 'flex-start' }}>
              <Icon name="flask-outline" size={13} color={C.cyan} style={{ marginTop: 2 }} />
              <Txt v="tiny" style={{ flex: 1 }} color={C.textDim}>
                {tip}
              </Txt>
            </Row>
          ))}
          <Btn
            size="sm"
            kind="ghost"
            icon="delete-outline"
            color={C.muted}
            label="Remove"
            onPress={() => systemConfirm('REMOVE TRACKER?', [t.name, 'Its history will be deleted.'], () => actions.deleteRecovery(t.id), { confirmLabel: 'Remove', tone: 'penalty' })}
          />
        </View>
      ) : null}
    </Panel>
  );
}

function AddModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [cat, setCat] = useState<RecoveryCategory | null>(null);
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [plan, setPlan] = useState('');
  const [days, setDays] = useState('0');
  const [reps, setReps] = useState<string[]>([]);
  const meta = cat ? RECOVERY_MAP[cat] : null;
  const pick = (c: RecoveryCategory) => {
    const m = RECOVERY_MAP[c];
    setCat(c);
    setName(m.name);
    setPlan(m.plan);
    setReps(m.replacements.slice(0, 4));
  };
  const close = () => {
    setCat(null);
    setWhy('');
    setDays('0');
    onClose();
  };
  return (
    <SystemModal visible={visible} onClose={close} title="Break free from…" icon="link-variant-off" color={C.green}>
      <Row wrap gap={6} style={{ marginBottom: 12 }}>
        {RECOVERY_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.name} icon={c.icon} color={c.color} active={cat === c.id} onPress={() => pick(c.id)} />
        ))}
      </Row>
      {meta ? (
        <>
          <Input label="Name (shown in the app — keep it discreet if you like)" value={name} onChangeText={setName} maxLength={30} />
          <Input label="Why do you want to stop?" value={why} onChangeText={setWhy} placeholder="This shows up when urges hit" maxLength={160} multiline />
          <Input label="If-then plan" value={plan} onChangeText={setPlan} maxLength={200} multiline />
          <Txt v="label" style={{ marginBottom: 6 }}>
            Replacement actions
          </Txt>
          <Row wrap gap={6} style={{ marginBottom: 12 }}>
            {meta.replacements.map((r) => (
              <Chip key={r} label={r} color={meta.color} active={reps.includes(r)} onPress={() => setReps((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]))} />
            ))}
          </Row>
          <Input label="Days already clean" value={days} onChangeText={(v) => setDays(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
          <Btn
            kind="solid"
            color={C.green}
            label="Start"
            icon="lightning-bolt"
            testID="start-recovery"
            onPress={() => {
              actions.addRecovery({ category: cat!, name, why, plan, replacements: reps, daysClean: parseInt(days || '0', 10) });
              close();
            }}
          />
        </>
      ) : (
        <Txt v="small">Pick what you want to break free from. Everything stays on your device (and your private cloud save if you sign in).</Txt>
      )}
    </SystemModal>
  );
}

export function RecoveryView() {
  const tracks = useGame((s) => s.game.recovery);
  const now = useMinuteNow();
  const [add, setAdd] = useState(false);
  const [sos, setSos] = useState<RecoveryTrack | null>(null);
  const [slip, setSlip] = useState<RecoveryTrack | null>(null);
  return (
    <View>
      <Panel title="Break Free" icon="link-variant-off" color={C.green} right={<Btn size="sm" icon="plus" label="Add" color={C.green} onPress={() => setAdd(true)} testID="add-recovery" />}>
        <Txt v="small">
          Recovery mode: hit <Txt v="bodyB" color={C.green}>Urge SOS</Txt> when a craving comes — breathe through the wave, remember your why, do a replacement
          action. A slip resets the streak but never your total clean days. Based on relapse-prevention and urge-surfing research.
        </Txt>
      </Panel>
      {!tracks.length ? (
        <Panel>
          <Empty icon="link-variant-off" title="Nothing tracked yet" text="Porn, doom-scrolling, gaming, sugar, smoking… pick one thing to start.">
            <Btn kind="solid" color={C.green} label="Start breaking free" icon="plus" onPress={() => setAdd(true)} style={{ marginTop: 8 }} />
          </Empty>
        </Panel>
      ) : (
        tracks.map((t) => <TrackCard key={t.id} t={t} now={now} onSOS={() => setSos(t)} onSlip={() => setSlip(t)} />)
      )}
      <AddModal visible={add} onClose={() => setAdd(false)} />
      <SOSModal track={sos} onClose={() => setSos(null)} onSlip={() => setSlip(sos)} />
      <SlipModal track={slip} onClose={() => setSlip(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  breath: { width: 180, height: 180, borderRadius: 90, borderWidth: 2 },
  box: { borderWidth: 1, borderRadius: 3, padding: 10, marginBottom: 10, backgroundColor: 'rgba(0,0,0,0.25)', gap: 3 },
  stat: { flex: 1, alignItems: 'center' },
});
