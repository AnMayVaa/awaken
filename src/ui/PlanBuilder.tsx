import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { CAMPAIGN_MAP } from '@/game/campaigns';
import {
  buildPlan,
  defaultAnswers,
  describeDaily,
  FITNESS_OPTIONS,
  GOAL_MAP,
  GOALS,
  MINUTE_OPTIONS,
  planLabels,
  STYLE_OPTIONS,
  TIME_OPTIONS,
  type PlanAnswers,
  type PlanProposal,
} from '@/game/plan';
import { RECOVERY_CATEGORIES } from '@/game/recovery';
import { useGame } from '@/store/game';

import { Btn, Chip, Icon, Panel, Row, Txt } from './kit';
import { C, withAlpha } from './theme';

export interface PlanChoice {
  plan: PlanProposal;
  opts: { habit: boolean; campaign: boolean; recovery: boolean };
}

function Option({ active, onPress, icon, color = C.cyan, label, sub, testID }: { active: boolean; onPress: () => void; icon?: string; color?: string; label: string; sub?: string; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.option,
        { borderColor: withAlpha(color, active ? 0.95 : 0.22), backgroundColor: withAlpha(color, active ? 0.16 : pressed ? 0.08 : 0.03) },
      ]}>
      {icon ? (
        <View style={[styles.optIcon, { borderColor: withAlpha(color, 0.6) }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt v="bodyB" style={{ fontSize: 17 }} color={active ? C.white : C.text}>
          {label}
        </Txt>
        {sub ? <Txt v="small">{sub}</Txt> : null}
      </View>
      <Icon name={active ? 'check-circle' : 'circle-outline'} size={22} color={active ? color : C.muted} />
    </Pressable>
  );
}

function Toggle({ label, sub, value, onChange, icon, color = C.cyan }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; icon: string; color?: string }) {
  return (
    <View style={styles.toggle}>
      <Icon name={icon} size={20} color={color} />
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Txt v="bodyB">{label}</Txt>
        {sub ? <Txt v="tiny">{sub}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#1A2A3D', true: withAlpha(color, 0.6) }} thumbColor={value ? C.white : '#7A8A9C'} />
    </View>
  );
}

const STEPS = ['Goals', 'Time', 'Body', 'Rhythm', 'Style', 'Program', 'Break free', 'Plan'];

export function PlanBuilder({ onDone, onCancel, intro }: { onDone: (c: PlanChoice) => void; onCancel?: () => void; intro?: string }) {
  const level = useGame((s) => s.game.player.level);
  const recoveryTracks = useGame((s) => s.game.recovery);
  const existingRecovery = recoveryTracks.map((r) => r.category);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<PlanAnswers>(defaultAnswers);
  const [habitOn, setHabitOn] = useState(true);
  const [campOn, setCampOn] = useState(true);
  const [recOn, setRecOn] = useState(true);
  const plan = buildPlan(a);
  const labels = planLabels(plan);
  const set = (patch: Partial<PlanAnswers>) => setA((x) => ({ ...x, ...patch }));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  // single-choice questions advance on their own after a short beat, so the tap is the answer
  const pick = (patch: Partial<PlanAnswers>) => {
    set(patch);
    const target = step + 1;
    setTimeout(() => setStep((s) => (s < target ? target : s)), 240);
  };
  const back = () => (step === 0 ? onCancel?.() : setStep((s) => s - 1));

  const header = (title: string, sub: string) => (
    <View style={{ marginBottom: 14 }}>
      <Txt v="label" color={C.cyan}>
        Question {step + 1} of {STEPS.length - 1}
      </Txt>
      <Txt v="h2" style={{ fontSize: 20, marginTop: 4 }}>
        {title}
      </Txt>
      <Txt v="small" style={{ marginTop: 4 }}>
        {sub}
      </Txt>
    </View>
  );

  return (
    <View>
      {/* progress */}
      <View style={styles.dots}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.dot, { backgroundColor: i <= step ? C.cyan : withAlpha(C.cyan, 0.18), flex: i === step ? 2 : 1 }]} />
        ))}
      </View>
      {step === 0 && intro ? (
        <Txt v="body" style={{ marginBottom: 12 }} color={C.cyanHi}>
          {intro}
        </Txt>
      ) : null}

      {step === 0 ? (
        <>
          {header('What do you want to change?', 'Pick up to 3. Your quests will focus here first.')}
          <View style={styles.goalGrid}>
            {GOALS.map((g) => {
              const on = a.goals.includes(g.id);
              return (
                <Pressable
                  key={g.id}
                  testID={`goal-${g.id}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => set({ goals: on ? a.goals.filter((x) => x !== g.id) : a.goals.length >= 3 ? a.goals : [...a.goals, g.id] })}
                  style={[styles.goalTile, { borderColor: withAlpha(g.color, on ? 0.9 : 0.25), backgroundColor: withAlpha(g.color, on ? 0.16 : 0.04) }]}>
                  <Row gap={8}>
                    <Icon name={on ? 'check-circle' : g.icon} size={20} color={g.color} />
                    <Txt v="bodyB" numberOfLines={2} style={{ flex: 1, fontSize: 15, lineHeight: 18 }}>
                      {g.label}
                    </Txt>
                  </Row>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          {header('How much time per day?', 'Be honest — a plan you can keep beats a plan that looks impressive.')}
          {MINUTE_OPTIONS.map((m) => (
            <Option key={m.value} testID={`min-${m.value}`} active={a.minutes === m.value} icon="clock-outline" label={m.label} sub={m.sub} onPress={() => pick({ minutes: m.value })} />
          ))}
        </>
      ) : null}

      {step === 2 ? (
        <>
          {header('How active are you right now?', 'Sets your Daily Quest. It grows with your level.')}
          {FITNESS_OPTIONS.map((f) => (
            <Option key={f.value} testID={`fit-${f.value}`} active={a.fitness === f.value} icon="run" color={C.red} label={f.label} sub={f.sub} onPress={() => pick({ fitness: f.value })} />
          ))}
        </>
      ) : null}

      {step === 3 ? (
        <>
          {header('When do you have the most energy?', 'The System reminds you then.')}
          {TIME_OPTIONS.map((t) => (
            <Option key={t.value} testID={`time-${t.value}`} active={a.bestTime === t.value} icon={t.icon} color={C.gold} label={t.label} sub={t.sub} onPress={() => pick({ bestTime: t.value })} />
          ))}
        </>
      ) : null}

      {step === 4 ? (
        <>
          {header('How should the System push you?', 'You can change this any time in Settings.')}
          {STYLE_OPTIONS.map((s) => (
            <Option
              key={s.value}
              testID={`style-${s.value}`}
              active={a.style === s.value}
              icon={s.icon}
              color={s.value === 'hardcore' ? C.red : s.value === 'gentle' ? C.green : C.cyan}
              label={s.label}
              sub={s.sub}
              onPress={() => pick({ style: s.value })}
            />
          ))}
        </>
      ) : null}

      {step === 5 ? (
        <>
          {header('Want a step-by-step program?', a.goals[0] ? `A multi-week campaign for “${GOAL_MAP[a.goals[0]].label}” with clear milestones.` : 'A multi-week campaign with clear milestones.')}
          <Option testID="program-yes" active={a.program} icon="map-check" color={C.gold} label="Yes, guide me step by step" sub="One program, 2–12 weeks, with milestones" onPress={() => pick({ program: true })} />
          <Option testID="program-no" active={!a.program} icon="lightning-bolt" label="Not now — daily quests are enough" sub="You can start one later in Quests → Main" onPress={() => pick({ program: false })} />
        </>
      ) : null}

      {step === 6 ? (
        <>
          {header('Anything you want to cut down?', 'Optional and private. Recovery mode never costs HP.')}
          <Row wrap gap={6} style={{ marginBottom: 6 }}>
            {RECOVERY_CATEGORIES.filter((c) => c.id !== 'custom').map((c) => {
              const tracked = existingRecovery.includes(c.id);
              return (
                <Chip
                  key={c.id}
                  label={tracked ? `${c.name} ✓` : c.name}
                  icon={c.icon}
                  color={c.color}
                  active={tracked || a.quit.includes(c.id)}
                  onPress={() => !tracked && set({ quit: a.quit.includes(c.id) ? a.quit.filter((x) => x !== c.id) : [...a.quit, c.id] })}
                />
              );
            })}
          </Row>
          <Txt v="tiny">Skip if nothing applies.</Txt>
        </>
      ) : null}

      {step === 7 ? (
        <>
          <View style={{ marginBottom: 12 }}>
            <Txt v="label" color={C.green}>
              Your plan
            </Txt>
            <Txt v="h2" style={{ fontSize: 20, marginTop: 4 }}>
              Small enough to start today
            </Txt>
            <Txt v="small" style={{ marginTop: 4 }}>
              The System raises difficulty only when you’re winning ~80% of the time.
            </Txt>
          </View>
          <Panel color={C.cyan} title="Every day" icon="calendar-today" style={{ marginBottom: 10 }}>
            <Row gap={10} style={styles.sumRow}>
              <Icon name="sword" size={18} color={C.cyan} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyB">Daily Quest · {labels.difficulty}</Txt>
                <Txt v="small">{describeDaily(plan, level)}</Txt>
              </View>
            </Row>
            <Row gap={10} style={styles.sumRow}>
              <Icon name="map-marker-star" size={18} color={C.cyan} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyB">
                  {plan.questLoad} side quest{plan.questLoad === 1 ? '' : 's'} · about {plan.dailyMinutes} min
                </Txt>
                <Txt v="small">Focus: {plan.focusAreas.map((x) => GOALS.find((g) => g.area === x)?.label ?? x).join(', ')}</Txt>
              </View>
            </Row>
            <Row gap={10} style={[styles.sumRow, { borderBottomWidth: 0 }]}>
              <Icon name={plan.penalties ? 'shield-alert' : 'feather'} size={18} color={plan.penalties ? C.orange : C.green} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyB">{plan.penalties ? 'Penalties on' : 'Gentle mode'}</Txt>
                <Txt v="small">
                  Reminder at {String(plan.reminderHour).padStart(2, '0')}:00{plan.penalties ? ' · missing the Daily Quest costs HP' : ' · misses never cost HP'}
                </Txt>
              </View>
            </Row>
          </Panel>
          {plan.habit || labels.campaign || plan.recovery.length ? (
            <Panel color={C.gold} title="Optional extras" icon="plus-circle-outline" style={{ marginBottom: 10 }}>
              {plan.habit ? <Toggle icon="calendar-check" color={C.cyan} label={`66-day habit: ${plan.habit.name}`} sub="One small habit, checked in once a day" value={habitOn} onChange={setHabitOn} /> : null}
              {labels.campaign ? (
                <Toggle icon="map-check" color={C.gold} label={`Program: ${labels.campaign.title}`} sub={`${labels.campaign.weeks} weeks · ${labels.campaign.milestones.length} milestones`} value={campOn} onChange={setCampOn} />
              ) : null}
              {plan.recovery.length ? <Toggle icon="link-variant-off" color={C.green} label={`Break Free: ${labels.recovery.join(', ')}`} sub="Streak counter + Urge SOS" value={recOn} onChange={setRecOn} /> : null}
            </Panel>
          ) : null}
          {!a.program && a.goals[0] ? (
            <Txt v="tiny" style={{ marginBottom: 10 }}>
              Tip: when you’re ready, try the “{CAMPAIGN_MAP[buildPlan({ ...a, program: true }).campaign ?? 'c25k']?.title}” program in Quests → Main.
            </Txt>
          ) : null}
        </>
      ) : null}

      <Row gap={8} style={{ marginTop: 12 }}>
        {step > 0 || onCancel ? <Btn label={step === 0 ? 'Cancel' : 'Back'} kind="ghost" onPress={back} /> : null}
        {step < 7 ? (
          <Btn
            flex
            kind="solid"
            label={step === 6 && !a.quit.length ? 'Skip' : 'Next'}
            onPress={next}
            disabled={step === 0 && !a.goals.length}
            testID="plan-next"
          />
        ) : (
          <Btn flex kind="solid" color={C.green} label="Accept plan" icon="check-decagram" testID="plan-accept" onPress={() => onDone({ plan, opts: { habit: habitOn, campaign: campOn, recovery: recOn } })} />
        )}
      </Row>
      {step === 0 && !a.goals.length ? (
        <Txt v="tiny" center style={{ marginTop: 8 }}>
          Choose at least one goal to continue
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalTile: { flexBasis: '47%', flexGrow: 1, minHeight: 56, borderWidth: 1, borderRadius: 4, paddingHorizontal: 10, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  dot: { height: 4, borderRadius: 2 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, padding: 12, marginBottom: 8, gap: 12 },
  optIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim },
  sumRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.lineDim, alignItems: 'flex-start' },
});

