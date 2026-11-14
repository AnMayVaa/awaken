import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AREAS, type AreaId } from '@/game/areas';
import { addDays, weekId } from '@/game/date';
import { areaActivity, latestWheel, lifeScore, successRate, weekAverages, wellbeingDue, wheelDue } from '@/game/director';
import { WHO5_ITEMS } from '@/game/engine';
import { tierRank } from '@/game/questLibrary';
import { readTodaySteps, stepsSupport } from '@/lib/steps';
import { actions, useGame } from '@/store/game';
import { Heatmap, Radar, Sparkline } from '@/ui/charts';
import { Bar, Btn, Chip, Icon, Input, Panel, Pill, Row, Segment, Txt } from '@/ui/kit';
import { Columns, Screen, useLayout } from '@/ui/Screen';
import { SystemModal } from '@/ui/SystemModal';
import { C, F, textGlow, withAlpha } from '@/ui/theme';

const MOODS = ['emoticon-cry-outline', 'emoticon-sad-outline', 'emoticon-neutral-outline', 'emoticon-happy-outline', 'emoticon-excited-outline'];
const ENERGY = ['battery-10', 'battery-30', 'battery-50', 'battery-80', 'battery-charging-high'];
const WHO5_SCALE = ['At no time', 'Some of the time', 'Less than half the time', 'More than half the time', 'Most of the time', 'All of the time'];

function scoreLabel(v: number) {
  if (v >= 80) return { label: 'Flourishing', color: C.green };
  if (v >= 60) return { label: 'Thriving', color: C.cyan };
  if (v >= 40) return { label: 'Building', color: C.gold };
  return { label: 'Low — be kind to yourself', color: C.orange };
}

function Picker({ icons, value, onChange, color }: { icons: string[]; value?: number; onChange: (v: number) => void; color: string }) {
  return (
    <Row gap={6}>
      {icons.map((ic, i) => {
        const v = i + 1;
        const on = value === v;
        return (
          <Pressable key={ic} onPress={() => onChange(v)} style={[styles.pick, { borderColor: on ? color : C.lineDim, backgroundColor: on ? withAlpha(color, 0.2) : 'transparent' }]}>
            <Icon name={ic} size={22} color={on ? color : C.muted} />
          </Pressable>
        );
      })}
    </Row>
  );
}

function NumberRow({ value, onChange, max = 10, color = C.cyan }: { value?: number; onChange: (v: number) => void; max?: number; color?: string }) {
  return (
    <Row gap={4} wrap>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
        const on = value === n;
        return (
          <Pressable key={n} testID={`num-${n}`} onPress={() => onChange(n)} style={[styles.num, { borderColor: on ? color : C.lineDim, backgroundColor: on ? withAlpha(color, 0.25) : 'transparent' }]}>
            <Txt style={{ fontFamily: F.displayMed, fontSize: 11, color: on ? C.white : C.textDim }}>{n}</Txt>
          </Pressable>
        );
      })}
    </Row>
  );
}

function CheckinPanel() {
  const today = useGame((s) => s.game.board.date);
  const c = useGame((s) => s.game.checkins[s.game.board.date]);
  const [mood, setMood] = useState<number | undefined>(c?.mood);
  const [energy, setEnergy] = useState<number | undefined>(c?.energy);
  const [sleep, setSleep] = useState<number>(c?.sleepHours ?? 7);
  const [sh, setSh] = useState(c?.screenMinutes !== undefined ? String(Math.floor(c.screenMinutes / 60)) : '');
  const [sm, setSm] = useState(c?.screenMinutes !== undefined ? String(c.screenMinutes % 60) : '');
  const [steps, setSteps] = useState(c?.steps !== undefined ? String(c.steps) : '');
  const [grat, setGrat] = useState(c?.gratitude ?? '');
  const auto = stepsSupport() === 'auto';
  const [reading, setReading] = useState(false);

  const refreshSteps = async () => {
    setReading(true);
    const n = await readTodaySteps();
    setReading(false);
    if (n !== null) actions.setSteps(n);
  };

  const save = () => {
    const screen = sh || sm ? (parseInt(sh || '0', 10) || 0) * 60 + (parseInt(sm || '0', 10) || 0) : undefined;
    const st = auto ? c?.steps : steps ? parseInt(steps, 10) : undefined;
    actions.saveCheckin({ mood, energy, sleepHours: sleep, screenMinutes: screen, steps: Number.isFinite(st) ? st : undefined, gratitude: grat.trim() || undefined });
  };

  return (
    <Panel title="Daily check-in" icon="clipboard-pulse" right={c?.savedAt ? <Pill text="SAVED" color={C.green} icon="check" /> : <Pill text="+15 XP" color={C.gold} />}>
      <Txt v="small" style={{ marginBottom: 10 }}>
        30 seconds. Your data verifies quests automatically and steers tomorrow’s Side Quests. ({today})
      </Txt>
      <Txt v="label" style={{ marginBottom: 6 }}>
        Mood
      </Txt>
      <Picker icons={MOODS} value={mood} onChange={setMood} color={C.gold} />
      <Txt v="label" style={{ marginTop: 12, marginBottom: 6 }}>
        Energy
      </Txt>
      <Picker icons={ENERGY} value={energy} onChange={setEnergy} color={C.green} />
      <Row style={{ marginTop: 14, justifyContent: 'space-between' }}>
        <View>
          <Txt v="label">Sleep last night</Txt>
          <Txt v="tiny">Adults need 7+ h</Txt>
        </View>
        <Row gap={8}>
          <Btn size="sm" icon="minus" onPress={() => setSleep((v) => Math.max(0, v - 0.5))} />
          <Txt v="num" color={sleep >= 7 ? C.green : C.orange} style={{ width: 56, textAlign: 'center' }}>
            {sleep}h
          </Txt>
          <Btn size="sm" icon="plus" onPress={() => setSleep((v) => Math.min(14, v + 0.5))} />
        </Row>
      </Row>
      <Txt v="label" style={{ marginTop: 14, marginBottom: 6 }}>
        Phone screen time today
      </Txt>
      <Row gap={8}>
        <View style={{ flex: 1 }}>
          <Input value={sh} onChangeText={(v) => setSh(v.replace(/[^0-9]/g, ''))} placeholder="h" keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Input value={sm} onChangeText={(v) => setSm(v.replace(/[^0-9]/g, ''))} placeholder="min" keyboardType="number-pad" />
        </View>
      </Row>
      <Txt v="tiny" style={{ marginTop: -6, marginBottom: 10 }}>
        iPhone: Settings → Screen Time · Android: Settings → Digital Wellbeing
      </Txt>
      <Txt v="label" style={{ marginBottom: 6 }}>
        Steps {auto ? '(from your iPhone)' : ''}
      </Txt>
      {auto ? (
        <Row gap={8} style={{ marginBottom: 12, justifyContent: 'space-between' }}>
          <Txt v="num" color={C.cyanHi}>
            {c?.steps !== undefined ? c.steps.toLocaleString() : '—'} <Txt v="tiny">steps today</Txt>
          </Txt>
          <Btn size="sm" icon={reading ? 'loading' : 'refresh'} label="Sync" onPress={refreshSteps} />
        </Row>
      ) : (
        <Input value={steps} onChangeText={(v) => setSteps(v.replace(/[^0-9]/g, ''))} placeholder="e.g. 6500" keyboardType="number-pad" />
      )}
      <Input label="One good thing today (optional)" value={grat} onChangeText={setGrat} maxLength={160} />
      <Btn kind="solid" label={c?.savedAt ? 'Update check-in' : 'Save check-in'} icon="content-save" onPress={save} testID="save-checkin" />
    </Panel>
  );
}

function WheelModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const last = useGame((s) => latestWheel(s.game));
  const [r, setR] = useState<Partial<Record<AreaId, number>>>(() => ({ ...(last?.ratings ?? {}) }));
  const complete = AREAS.every((a) => r[a.id]);
  return (
    <SystemModal visible={visible} onClose={onClose} title="Rate your life" icon="chart-donut" width={560}>
      <Txt v="small" style={{ marginBottom: 12 }}>
        1 = very dissatisfied · 10 = completely satisfied. Be honest — low areas get more quests.
      </Txt>
      {AREAS.map((a) => (
        <View key={a.id} style={{ marginBottom: 12 }}>
          <Row gap={6} style={{ marginBottom: 5 }}>
            <Icon name={a.icon} size={14} color={a.color} />
            <Txt v="bodyB" color={a.color}>
              {a.name}
            </Txt>
          </Row>
          <Txt v="tiny" style={{ marginBottom: 5 }}>
            {a.rate}
          </Txt>
          <NumberRow value={r[a.id]} onChange={(v) => setR({ ...r, [a.id]: v })} color={a.color} />
        </View>
      ))}
      <Btn
        kind="solid"
        label={complete ? 'Save Life Wheel' : 'Rate all 10 areas'}
        disabled={!complete}
        icon="check"
        testID="save-wheel"
        onPress={() => {
          onClose();
          setTimeout(() => actions.saveWheel(r), 200);
        }}
      />
    </SystemModal>
  );
}

function WHO5Modal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [a, setA] = useState<(number | undefined)[]>([undefined, undefined, undefined, undefined, undefined]);
  const complete = a.every((x) => x !== undefined);
  return (
    <SystemModal visible={visible} onClose={onClose} title="Wellbeing check" icon="heart-flash" color={C.gold} width={560}>
      <Txt v="small" style={{ marginBottom: 12 }}>
        Over the last two weeks… (WHO-5 Well-Being Index)
      </Txt>
      {WHO5_ITEMS.map((item, i) => (
        <View key={item} style={{ marginBottom: 14 }}>
          <Txt v="bodyB" style={{ marginBottom: 6 }}>
            {i + 1}. {item}
          </Txt>
          <Row wrap gap={5}>
            {WHO5_SCALE.map((lab, v) => (
              <Chip key={lab} testID={`who-${v}`} label={lab} color={C.gold} active={a[i] === v} onPress={() => setA(a.map((x, j) => (j === i ? v : x)))} style={{ paddingHorizontal: 8, paddingVertical: 5 }} />
            ))}
          </Row>
        </View>
      ))}
      <Btn
        kind="solid"
        color={C.gold}
        label="See my score"
        icon="check"
        disabled={!complete}
        testID="save-who5"
        onPress={() => {
          const ans = a.map((x) => x ?? 0);
          onClose();
          setA([undefined, undefined, undefined, undefined, undefined]);
          setTimeout(() => actions.saveWellbeing(ans), 200);
        }}
      />
      <Txt v="tiny" center style={{ marginTop: 8 }}>
        WHO-5 © Psychiatric Research Unit, Mental Health Centre North Zealand (Topp et al., 2015). A screening aid, not a diagnosis.
      </Txt>
    </SystemModal>
  );
}

function ReviewModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const focusDefault = useGame((s) => s.game.profile.focusAreas);
  const [wins, setWins] = useState('');
  const [lessons, setLessons] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const [focus, setFocus] = useState<AreaId[]>(focusDefault);
  return (
    <SystemModal visible={visible} onClose={onClose} title="Weekly review" icon="calendar-week" color={C.purple} width={560}>
      <Input label="3 wins this week" value={wins} onChangeText={setWins} multiline maxLength={400} placeholder="Big or small" />
      <Input label="What did you learn? What will you change?" value={lessons} onChangeText={setLessons} multiline maxLength={400} />
      <Txt v="label" style={{ marginBottom: 6 }}>
        How was this week? (1–10)
      </Txt>
      <NumberRow value={rating} onChange={setRating} color={C.purple} />
      <Txt v="label" style={{ marginTop: 14, marginBottom: 6 }}>
        Focus next week (up to 3)
      </Txt>
      <Row wrap gap={6} style={{ marginBottom: 14 }}>
        {AREAS.map((a) => (
          <Chip
            key={a.id}
            label={a.short}
            icon={a.icon}
            color={a.color}
            active={focus.includes(a.id)}
            onPress={() => setFocus((f) => (f.includes(a.id) ? f.filter((x) => x !== a.id) : f.length >= 3 ? f : [...f, a.id]))}
          />
        ))}
      </Row>
      <Btn
        kind="solid"
        color={C.purple}
        label="Save review"
        icon="check"
        disabled={!rating}
        onPress={() => {
          onClose();
          setTimeout(() => {
            actions.saveReview({ wins, lessons, rating: rating ?? 5, focus });
            actions.setProfile({ focusAreas: focus });
          }, 200);
        }}
      />
    </SystemModal>
  );
}

export default function LifeScreen() {
  const g = useGame((s) => s.game);
  const { width, isWide } = useLayout();
  const [wheelOpen, setWheelOpen] = useState(false);
  const [whoOpen, setWhoOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const today = g.board.date;
  const ls = lifeScore(g, today);
  const wheel = latestWheel(g);
  const prevWheel = g.wheel.length > 1 ? g.wheel[g.wheel.length - 2] : null;
  const act = areaActivity(g, today);
  const avgs = weekAverages(g, today);
  const reviewedThisWeek = g.reviews.some((r) => r.week === weekId(today));
  const colW = isWide ? Math.min(460, (width - 260) / 2) : Math.min(width - 40, 720);
  const radarSize = Math.max(240, Math.min(340, colW - 40));

  const heat = useMemo(() => {
    const levels: number[] = [];
    for (let i = 83; i >= 0; i--) {
      const a = g.activity[addDays(today, -i)];
      const n = a ? (a.daily ? 1 : 0) + (a.side ?? 0) + (a.habits ?? 0) + (a.checkin ? 1 : 0) : 0;
      levels.push(n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
    }
    return levels;
  }, [g.activity, today]);

  const scorePanel = (
    <Panel key="score" title="Life Score" icon="star-four-points" color={ls.score === null ? C.cyan : scoreLabel(ls.score).color} intensity={1.3}>
      {ls.score === null ? (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          <Txt v="body" center>
            Measure your life to unlock your Life Score.
          </Txt>
          <Row gap={8}>
            <Btn size="sm" label="Life Wheel" icon="chart-donut" onPress={() => setWheelOpen(true)} />
            <Btn size="sm" label="Wellbeing" icon="heart-flash" color={C.gold} onPress={() => setWhoOpen(true)} />
          </Row>
        </View>
      ) : (
        <>
          <Row style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Txt style={{ fontFamily: F.displayBlack, fontSize: 52, color: C.white, lineHeight: 58, ...textGlow(scoreLabel(ls.score).color, 18) }}>{ls.score}</Txt>
            <Txt v="bodyB" color={scoreLabel(ls.score).color} style={{ marginBottom: 10 }}>
              {scoreLabel(ls.score).label}
            </Txt>
          </Row>
          {ls.parts.map((p) => (
            <Bar key={p.label} style={{ marginTop: 8 }} label={p.label} right={p.value === null ? 'not measured' : `${p.value}`} value={p.value ?? 0} max={100} color={p.value === null ? C.muted : C.cyan} height={6} />
          ))}
          <Txt v="tiny" style={{ marginTop: 10 }}>
            35% wellbeing (WHO-5, a validated questionnaire) + 35% Life Wheel satisfaction + 30% consistency over 14 days. It measures how your life feels and what you
            actually do — not just XP.
          </Txt>
        </>
      )}
    </Panel>
  );

  const wheelPanel = (
    <Panel key="wheel" title="Life Wheel" icon="chart-donut" right={wheelDue(g, today) ? <Pill text="DUE" color={C.gold} /> : undefined}>
      <View style={{ alignItems: 'center' }}>
        <Radar
          size={radarSize}
          axes={AREAS.map((a) => ({ label: a.short, color: a.color }))}
          layers={[
            ...(prevWheel ? [{ values: AREAS.map((a) => prevWheel.ratings[a.id]), color: C.muted, fill: 0.05 }] : []),
            { values: AREAS.map((a) => wheel?.ratings[a.id]), color: C.cyan, fill: 0.2 },
          ]}
        />
      </View>
      <Txt v="tiny" center style={{ marginBottom: 10 }}>
        {wheel ? `Last rated ${wheel.date}${prevWheel ? ' · grey = previous' : ''}. Re-rate every 2 weeks.` : 'Rate each area 1–10 to see your wheel.'}
      </Txt>
      <Btn label={wheel ? 'Re-rate my life' : 'Rate my life'} icon="pencil" onPress={() => setWheelOpen(true)} testID="open-wheel" />
    </Panel>
  );

  const who = g.wellbeing;
  const wellPanel = (
    <Panel key="who" title="Wellbeing (WHO-5)" icon="heart-flash" color={C.gold} right={wellbeingDue(g, today) ? <Pill text="DUE" color={C.gold} /> : undefined}>
      {who.length ? (
        <>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Txt style={{ fontFamily: F.displayBlack, fontSize: 34, color: C.white, ...textGlow(C.gold, 10) }}>{who[who.length - 1].score}</Txt>
            <Txt v="tiny">/ 100 · {who[who.length - 1].date}</Txt>
          </Row>
          <View style={{ alignItems: 'center', marginVertical: 6 }}>
            <Sparkline points={who.slice(-12).map((w) => w.score)} width={Math.min(colW - 40, 420)} color={C.gold} dashedAt={50} />
          </View>
          <Txt v="tiny">Red line = 50. Scores at or below 50 suggest low wellbeing — worth talking to someone you trust or a professional.</Txt>
        </>
      ) : (
        <Txt v="small">Five quick questions about the last two weeks. A validated measure of wellbeing used worldwide.</Txt>
      )}
      <Btn style={{ marginTop: 10 }} color={C.gold} label={who.length ? 'Retake (every 2 weeks)' : 'Take the check'} icon="clipboard-text" onPress={() => setWhoOpen(true)} testID="open-who5" />
    </Panel>
  );

  const trendsPanel = (
    <Panel key="trends" title="This week" icon="chart-line">
      <Row wrap style={{ rowGap: 12 }}>
        {[
          { label: 'Avg sleep', v: avgs.sleep === null ? '—' : `${avgs.sleep.toFixed(1)}h`, color: avgs.sleep !== null && avgs.sleep < 7 ? C.orange : C.green, icon: 'sleep' },
          { label: 'Avg screen', v: avgs.screen === null ? '—' : `${Math.floor(avgs.screen / 60)}h${String(Math.round(avgs.screen % 60)).padStart(2, '0')}`, color: C.purple, icon: 'cellphone' },
          { label: 'Avg steps', v: avgs.steps === null ? '—' : Math.round(avgs.steps).toLocaleString(), color: C.cyan, icon: 'walk' },
          { label: 'Avg mood', v: avgs.mood === null ? '—' : `${avgs.mood.toFixed(1)}/5`, color: C.gold, icon: 'emoticon-outline' },
        ].map((x) => (
          <View key={x.label} style={{ width: '50%', alignItems: 'center' }}>
            <Row gap={4}>
              <Icon name={x.icon} size={14} color={x.color} />
              <Txt v="num" color={x.color}>
                {x.v}
              </Txt>
            </Row>
            <Txt v="label" style={{ fontSize: 8.5, marginTop: 2 }}>
              {x.label}
            </Txt>
          </View>
        ))}
      </Row>
      <Txt v="label" style={{ marginTop: 16, marginBottom: 8 }}>
        Activity · last 12 weeks
      </Txt>
      <Heatmap levels={heat} width={Math.min(colW - 40, 520)} />
    </Panel>
  );

  const areasPanel = (
    <Panel key="areas" title="Life areas" icon="view-dashboard-variant">
      <Txt v="tiny" style={{ marginBottom: 6 }}>
        Rank = current adaptive quest difficulty · success = last 20 quests (target ~80%) · done = last 14 days
      </Txt>
      {AREAS.map((a) => {
        const p = g.areas[a.id];
        const sr = successRate(p);
        return (
          <Row key={a.id} gap={10} style={styles.areaRow}>
            <Icon name={a.icon} size={18} color={a.color} />
            <Txt v="bodyB" style={{ flex: 1 }} numberOfLines={1}>
              {a.name}
            </Txt>
            {g.profile.focusAreas.includes(a.id) ? <Icon name="target" size={14} color={C.gold} /> : null}
            <Pill text={tierRank(p.tier)} color={a.color} />
            <Txt v="tiny" style={{ width: 54, textAlign: 'right' }}>
              {sr === null ? '—' : `${Math.round(sr * 100)}%`}
            </Txt>
            <Txt v="tiny" style={{ width: 40, textAlign: 'right' }}>
              {act[a.id]} done
            </Txt>
          </Row>
        );
      })}
    </Panel>
  );

  const directorPanel = (
    <Panel key="dir" title="Quest Director" icon="tune-variant" color={C.purple}>
      <Txt v="label" style={{ marginBottom: 6 }}>
        Focus areas (up to 3)
      </Txt>
      <Row wrap gap={6} style={{ marginBottom: 12 }}>
        {AREAS.map((a) => {
          const on = g.profile.focusAreas.includes(a.id);
          return (
            <Chip
              key={a.id}
              label={a.short}
              icon={a.icon}
              color={a.color}
              active={on}
              onPress={() => actions.setProfile({ focusAreas: on ? g.profile.focusAreas.filter((x) => x !== a.id) : g.profile.focusAreas.length >= 3 ? g.profile.focusAreas : [...g.profile.focusAreas, a.id] })}
            />
          );
        })}
      </Row>
      <Txt v="label" style={{ marginBottom: 6 }}>
        Side quests per day
      </Txt>
      <Segment
        color={C.purple}
        value={String(g.profile.questLoad)}
        onChange={(v) => actions.setProfile({ questLoad: Number(v) })}
        options={['1', '2', '3', '4', '5', '6'].map((x) => ({ value: x, label: x }))}
      />
      <Txt v="label" style={{ marginTop: 12, marginBottom: 6 }}>
        Time per day for side quests
      </Txt>
      <Segment
        color={C.purple}
        value={String(g.profile.dailyMinutes)}
        onChange={(v) => actions.setProfile({ dailyMinutes: Number(v) })}
        options={['20', '40', '60', '90', '120'].map((x) => ({ value: x, label: `${x}m` }))}
      />
      <Txt v="tiny" style={{ marginTop: 8 }}>
        Changes apply from tomorrow’s board (adding quests applies now).
      </Txt>
      <Btn style={{ marginTop: 12 }} color={C.green} icon="auto-fix" label="Re-plan with the System" onPress={() => router.push('/plan')} />
    </Panel>
  );

  const reviewPanel = (
    <Panel key="review" title="Weekly review" icon="calendar-week" color={C.purple} right={reviewedThisWeek ? <Pill text="DONE" color={C.green} /> : <Pill text="+60 XP" color={C.gold} />}>
      {g.reviews.length ? (
        <View style={{ marginBottom: 10 }}>
          <Txt v="tiny">Last review {g.reviews[g.reviews.length - 1].date} · rated {g.reviews[g.reviews.length - 1].rating}/10</Txt>
          {g.reviews[g.reviews.length - 1].wins ? (
            <Txt v="small" color={C.text} style={{ marginTop: 4 }} numberOfLines={3}>
              Wins: {g.reviews[g.reviews.length - 1].wins}
            </Txt>
          ) : null}
        </View>
      ) : (
        <Txt v="small" style={{ marginBottom: 10 }}>
          Reflect on wins and lessons, then choose next week’s focus. Reflection is how experience becomes growth.
        </Txt>
      )}
      <Btn color={C.purple} label={reviewedThisWeek ? 'Edit this week’s review' : 'Start weekly review'} icon="notebook-edit" onPress={() => setReviewOpen(true)} />
    </Panel>
  );

  return (
    <Screen title="LIFE" subtitle="Fulfilment & data">
      <Columns>
        {[
          <View key="l">
            {scorePanel}
            <CheckinPanel key={today} />
            {trendsPanel}
            {reviewPanel}
          </View>,
          <View key="r">
            {wheelPanel}
            {wellPanel}
            {areasPanel}
            {directorPanel}
          </View>,
        ]}
      </Columns>
      {wheelOpen ? <WheelModal visible onClose={() => setWheelOpen(false)} /> : null}
      {whoOpen ? <WHO5Modal visible onClose={() => setWhoOpen(false)} /> : null}
      {reviewOpen ? <ReviewModal visible onClose={() => setReviewOpen(false)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pick: { flex: 1, height: 44, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  num: { width: 30, height: 30, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  areaRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim },
});
