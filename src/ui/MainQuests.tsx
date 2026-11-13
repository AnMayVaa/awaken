import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AREA_MAP, AREAS, type AreaId } from '@/game/areas';
import { CAMPAIGNS } from '@/game/campaigns';
import { addDays, diffDays } from '@/game/date';
import type { MainQuest } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';

import { Bar, Btn, Chip, Empty, Icon, Input, Panel, Pill, Row, Txt } from './kit';
import { AreaTag } from './QuestCard';
import { SystemModal } from './SystemModal';
import { C, withAlpha } from './theme';

function MainQuestCard({ mq, today }: { mq: MainQuest; today: string }) {
  const [open, setOpen] = useState(false);
  const a = AREA_MAP[mq.area];
  const done = mq.milestones.filter((m) => m.done).length;
  const daysLeft = mq.deadline ? diffDays(today, mq.deadline) : null;
  const step = mq.metric ? (mq.metric.target - mq.metric.start > 20 ? Math.round((mq.metric.target - mq.metric.start) / 20) : mq.metric.target <= 5 ? 0.5 : 1) : 1;
  return (
    <Panel color={a.color} title={mq.status === 'done' ? 'Main Quest · complete' : 'Main Quest'} icon={mq.status === 'done' ? 'flag-checkered' : 'flag-variant'}>
      <Row gap={6} style={{ marginBottom: 6 }} wrap>
        <AreaTag area={mq.area} small />
        {daysLeft !== null && mq.status === 'active' ? <Pill text={daysLeft >= 0 ? `${daysLeft} DAYS LEFT` : 'OVERDUE'} color={daysLeft >= 0 ? C.textDim : C.orange} /> : null}
      </Row>
      <Txt v="h2" style={{ fontSize: 18 }}>
        {mq.title}
      </Txt>
      {mq.why ? (
        <Txt v="small" style={{ marginTop: 2 }}>
          {mq.why}
        </Txt>
      ) : null}
      <Bar style={{ marginTop: 12 }} label="Milestones" right={`${done} / ${mq.milestones.length}`} value={done} max={Math.max(1, mq.milestones.length)} color={a.color} />
      {mq.metric ? (
        <View style={{ marginTop: 10 }}>
          <Bar
            label={mq.metric.unit}
            right={`${mq.metric.current} / ${mq.metric.target}`}
            value={mq.metric.current - mq.metric.start}
            max={Math.max(0.0001, mq.metric.target - mq.metric.start)}
            color={C.gold}
          />
          {mq.status === 'active' ? (
            <Row gap={8} style={{ marginTop: 6, justifyContent: 'flex-end' }}>
              <Btn size="sm" icon="minus" color={C.gold} onPress={() => actions.updateMainQuest(mq.id, { metric: { ...mq.metric!, current: Math.round((mq.metric!.current - step) * 100) / 100 } })} />
              <Btn size="sm" icon="plus" color={C.gold} onPress={() => actions.updateMainQuest(mq.id, { metric: { ...mq.metric!, current: Math.round((mq.metric!.current + step) * 100) / 100 } })} />
            </Row>
          ) : null}
        </View>
      ) : null}
      <View style={{ marginTop: 10 }}>
        {mq.milestones.map((m) => (
          <Pressable
            key={m.id}
            disabled={mq.status !== 'active'}
            onPress={() =>
              m.done
                ? actions.toggleMilestone(mq.id, m.id)
                : systemConfirm('MILESTONE CHECK', [m.title, `Done when: ${m.criteria}`], () => actions.toggleMilestone(mq.id, m.id), { confirmLabel: 'It’s done', tone: 'reward' })
            }
            style={styles.ms}>
            <Icon name={m.done ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={m.done ? C.green : a.color} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Txt v="bodyB" color={m.done ? C.textDim : C.text} style={m.done ? { textDecorationLine: 'line-through' } : null}>
                {m.title}
              </Txt>
              <Txt v="tiny">{m.criteria}</Txt>
            </View>
          </Pressable>
        ))}
      </View>
      {mq.woop ? (
        <Pressable onPress={() => setOpen((v) => !v)} style={{ marginTop: 8 }}>
          <Txt v="label" color={C.cyan}>
            {open ? '▾' : '▸'} WOOP plan
          </Txt>
          {open ? (
            <View style={{ gap: 4, marginTop: 6 }}>
              <Txt v="small">Wish: {mq.woop.wish}</Txt>
              <Txt v="small">Outcome: {mq.woop.outcome}</Txt>
              <Txt v="small">Obstacle: {mq.woop.obstacle}</Txt>
              <Txt v="small" color={C.cyanHi}>
                Plan: {mq.woop.plan}
              </Txt>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      {mq.status === 'active' ? (
        <Row style={{ marginTop: 12, justifyContent: 'flex-end' }} gap={8}>
          <Btn
            size="sm"
            icon="delete-outline"
            kind="ghost"
            color={C.muted}
            onPress={() => systemConfirm('DELETE MAIN QUEST?', [mq.title], () => actions.deleteMainQuest(mq.id), { confirmLabel: 'Delete', tone: 'penalty' })}
          />
        </Row>
      ) : null}
    </Panel>
  );
}

const empty = () => ({
  area: 'fitness' as AreaId,
  title: '',
  why: '',
  wish: '',
  outcome: '',
  obstacle: '',
  plan: '',
  unit: '',
  target: '',
  weeks: '4',
  milestones: ['', '', ''],
});

export function MainQuestsView() {
  const g = useGame((s) => s.game);
  const [form, setForm] = useState<ReturnType<typeof empty> | null>(null);
  const today = g.board.date;
  const active = g.mainQuests.filter((m) => m.status === 'active');
  const finished = g.mainQuests.filter((m) => m.status === 'done');

  const save = () => {
    if (!form || !form.title.trim()) return;
    const ms = form.milestones.map((m) => m.trim()).filter(Boolean);
    const target = parseFloat(form.target);
    const hasWoop = form.wish.trim() || form.obstacle.trim() || form.plan.trim();
    actions.addMainQuest({
      area: form.area,
      title: form.title.trim(),
      why: form.why.trim(),
      woop: hasWoop ? { wish: form.wish.trim() || form.title.trim(), outcome: form.outcome.trim(), obstacle: form.obstacle.trim(), plan: form.plan.trim() } : undefined,
      metric: form.unit.trim() && target > 0 ? { unit: form.unit.trim(), start: 0, current: 0, target } : undefined,
      deadline: parseInt(form.weeks, 10) > 0 ? addDays(today, parseInt(form.weeks, 10) * 7) : undefined,
      milestones: (ms.length ? ms : ['Finish it']).map((t, i) => ({ id: `ms${Date.now()}${i}`, title: t, criteria: t, done: false })),
    });
    setForm(null);
  };

  return (
    <View>
      <Panel title="Main Quests" icon="flag-variant" right={<Btn size="sm" icon="plus" label="New" onPress={() => setForm(empty())} testID="new-main" />}>
        <Txt v="small">
          Long-term goals broken into milestones with clear finish lines. Add a WOOP plan — Wish, Outcome, Obstacle, Plan: a meta-analysis of 21 studies found
          this kind of planning improves goal attainment.
        </Txt>
      </Panel>
      {active.length === 0 ? (
        <Panel>
          <Empty icon="flag-outline" title="No active Main Quest" text="Start a campaign below or create your own." />
        </Panel>
      ) : (
        active.map((m) => <MainQuestCard key={m.id} mq={m} today={today} />)
      )}

      <Panel title="Campaigns" icon="map-legend" color={C.gold}>
        {CAMPAIGNS.map((c) => {
          const a = AREA_MAP[c.area];
          const running = g.mainQuests.some((m) => m.campaignId === c.id && m.status === 'active');
          return (
            <View key={c.id} style={[styles.camp, { borderLeftColor: a.color }]}>
              <View style={{ flex: 1 }}>
                <Row gap={6} style={{ marginBottom: 3 }}>
                  <AreaTag area={c.area} small />
                  <Txt v="tiny">
                    {c.weeks} weeks · {c.milestones.length} milestones
                  </Txt>
                </Row>
                <Txt v="bodyB">{c.title}</Txt>
                <Txt v="tiny">{c.why}</Txt>
              </View>
              <Btn size="sm" label={running ? 'Active' : 'Start'} color={a.color} disabled={running} onPress={() => actions.startCampaign(c.id)} testID={`camp-${c.id}`} />
            </View>
          );
        })}
      </Panel>

      {finished.length ? finished.map((m) => <MainQuestCard key={m.id} mq={m} today={today} />) : null}

      <SystemModal visible={!!form} onClose={() => setForm(null)} title="New Main Quest" icon="flag-plus">
        {form ? (
          <>
            <Txt v="label" style={{ marginBottom: 6 }}>
              Life area
            </Txt>
            <Row wrap gap={6} style={{ marginBottom: 12 }}>
              {AREAS.map((a) => (
                <Chip key={a.id} label={a.short} icon={a.icon} color={a.color} active={form.area === a.id} onPress={() => setForm({ ...form, area: a.id })} />
              ))}
            </Row>
            <Input label="Goal" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g. Get an internship offer" maxLength={60} />
            <Input label="Why it matters to you" value={form.why} onChangeText={(v) => setForm({ ...form, why: v })} placeholder="Connect it to your values" maxLength={140} />
            <Txt v="label" color={C.cyan} style={{ marginBottom: 6 }}>
              WOOP (recommended)
            </Txt>
            <Input label="Best outcome — how will it feel?" value={form.outcome} onChangeText={(v) => setForm({ ...form, outcome: v })} maxLength={140} />
            <Input label="Main inner obstacle" value={form.obstacle} onChangeText={(v) => setForm({ ...form, obstacle: v })} placeholder="e.g. I scroll instead of starting" maxLength={140} />
            <Input label="If-then plan" value={form.plan} onChangeText={(v) => setForm({ ...form, plan: v })} placeholder="If [obstacle], then I will [action]" maxLength={160} />
            <Txt v="label" style={{ marginBottom: 6 }}>
              Milestones (each with a clear finish line)
            </Txt>
            {form.milestones.map((m, i) => (
              <Input
                key={i}
                value={m}
                onChangeText={(v) => setForm({ ...form, milestones: form.milestones.map((x, j) => (j === i ? v : x)) })}
                placeholder={`Milestone ${i + 1}`}
                maxLength={80}
              />
            ))}
            {form.milestones.length < 8 ? <Btn size="sm" kind="ghost" icon="plus" label="Add milestone" onPress={() => setForm({ ...form, milestones: [...form.milestones, ''] })} /> : null}
            <Row gap={8} style={{ marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Input label="Number to track (optional)" value={form.unit} onChangeText={(v) => setForm({ ...form, unit: v })} placeholder="e.g. km, THB saved" maxLength={20} />
              </View>
              <View style={{ width: 90 }}>
                <Input label="Target" value={form.target} onChangeText={(v) => setForm({ ...form, target: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
              </View>
              <View style={{ width: 80 }}>
                <Input label="Weeks" value={form.weeks} onChangeText={(v) => setForm({ ...form, weeks: v.replace(/[^0-9]/g, '') })} keyboardType="number-pad" />
              </View>
            </Row>
            <Btn kind="solid" label="Accept Main Quest" icon="check" onPress={save} disabled={!form.title.trim()} testID="save-main" />
          </>
        ) : null}
      </SystemModal>
    </View>
  );
}

const styles = StyleSheet.create({
  ms: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim },
  camp: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 10, borderLeftWidth: 2, borderBottomWidth: 1, borderBottomColor: withAlpha(C.cyan, 0.08) },
});
