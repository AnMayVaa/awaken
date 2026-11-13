import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AREA_MAP, type AreaId } from '@/game/areas';
import { EXERCISE_MAP, RANK_COLORS } from '@/game/constants';
import { metricProgress, metricValue, METRIC_LABEL, sideReward } from '@/game/director';
import { dailyBuff } from '@/game/fun';
import { tierRank, type QuestTemplate } from '@/game/questLibrary';
import type { BoardQuest } from '@/game/types';
import { actions, useGame } from '@/store/game';

import { Btn, Icon, Input, Pill, Row, Txt } from './kit';
import { SystemModal } from './SystemModal';
import { C, F, withAlpha } from './theme';

export function AreaTag({ area, small }: { area: AreaId; small?: boolean }) {
  const a = AREA_MAP[area];
  return (
    <View style={[styles.areaTag, { borderColor: withAlpha(a.color, 0.5), backgroundColor: withAlpha(a.color, 0.1) }]}>
      <Icon name={a.icon} size={small ? 11 : 12} color={a.color} />
      <Txt style={{ fontFamily: F.bodyBold, fontSize: small ? 11 : 12, color: a.color, marginLeft: 4 }}>{small ? a.short : a.name}</Txt>
    </View>
  );
}

export function TierBadge({ tier }: { tier: number }) {
  const r = tierRank(tier);
  return <Pill text={`${r}-RANK`} color={RANK_COLORS[r]} />;
}

function fmtMetric(v: number | undefined, key: string) {
  if (v === undefined) return '—';
  if (key === 'screen') return `${Math.floor(v / 60)}h ${String(Math.round(v % 60)).padStart(2, '0')}m`;
  return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(1);
}

export function QuestCard({ q }: { q: BoardQuest }) {
  const g = useGame((s) => s.game);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState('');
  const [showWhy, setShowWhy] = useState(false);
  const a = AREA_MAP[q.area];
  const done = q.status === 'done';
  const skipped = q.status === 'skipped';
  const r = sideReward(q.tier, g.player.level);
  const mp = q.metric ? metricProgress(g, q.metric, g.board.date) : null;
  const exId = q.metric?.key.startsWith('w:') ? q.metric.key.slice(2) : null;
  const ex = exId ? EXERCISE_MAP[exId] : null;
  const remaining = q.metric && ex ? Math.max(0, Math.round((q.metric.value - (metricValue(g, q.metric.key, g.board.date) ?? 0)) * 100) / 100) : 0;

  return (
    <View style={[styles.card, { borderLeftColor: a.color, opacity: skipped ? 0.45 : 1 }, done ? { backgroundColor: withAlpha(C.green, 0.06) } : null]}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }} gap={6}>
        <Row gap={6} style={{ flexShrink: 1 }} wrap>
          <AreaTag area={q.area} small />
          <TierBadge tier={q.tier} />
          {q.source === 'ai' ? <Pill text="AI" color={C.purple} icon="robot-happy-outline" /> : null}
          {dailyBuff(g.board.date, g.player.createdAt).area === q.area && q.status === 'open' ? <Pill text="BUFF +25%" color={C.gold} icon="arrow-up-bold" /> : null}
          {q.metric ? <Pill text="AUTO" color={C.green} icon="check-network-outline" /> : null}
        </Row>
        {q.why ? (
          <Pressable onPress={() => setShowWhy((v) => !v)} hitSlop={8} accessibilityLabel="Why this quest">
            <Icon name="flask-outline" size={17} color={showWhy ? C.cyan : C.muted} />
          </Pressable>
        ) : null}
      </Row>
      <Txt v="bodyB" style={[{ fontSize: 17 }, done ? { textDecorationLine: 'line-through', color: C.textDim } : null]}>
        {q.title}
      </Txt>
      <Row gap={6} style={{ marginTop: 3, alignItems: 'flex-start' }}>
        <Icon name="check-circle-outline" size={14} color={C.textDim} style={{ marginTop: 2 }} />
        <Txt v="small" style={{ flex: 1 }}>
          Done when: {q.criteria}
        </Txt>
      </Row>
      {showWhy && q.why ? (
        <Txt v="tiny" color={C.cyanHi} style={{ marginTop: 6 }}>
          {q.why}
        </Txt>
      ) : null}
      {mp && q.metric && !done ? (
        <View style={{ marginTop: 8 }}>
          <View style={styles.track}>
            <View style={{ width: `${mp.pct * 100}%`, height: '100%', backgroundColor: a.color }} />
          </View>
          <Txt v="tiny" style={{ marginTop: 3 }}>
            {fmtMetric(mp.value, q.metric.key)} / {q.metric.op === 'lte' ? '≤ ' : ''}
            {fmtMetric(q.metric.value, q.metric.key)} {q.metric.key.startsWith('w:') ? '' : q.metric.key === 'screen' ? '' : METRIC_LABEL[q.metric.key] ?? ''}
            {q.metric.op === 'lte' ? ' · verified after 8 pm' : ''}
          </Txt>
        </View>
      ) : null}
      {q.note ? (
        <Txt v="tiny" color={C.text} style={{ marginTop: 6, fontStyle: 'italic' }}>
          “{q.note}”
        </Txt>
      ) : null}
      <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
        <Txt v="tiny">
          {q.minutes ? `~${q.minutes} min · ` : ''}+{r.xp} XP · +{r.gold} G · {q.stat}
        </Txt>
        {q.status === 'open' ? (
          <Row gap={6}>
            <Btn size="sm" icon="close" kind="ghost" color={C.muted} onPress={() => actions.skipSide(q.id)} />
            {g.board.rerolls > 0 && q.source !== 'ai' ? <Btn size="sm" icon="dice-5-outline" kind="ghost" color={C.textDim} onPress={() => actions.rerollSide(q.id)} /> : null}
            <Btn size="sm" label="Done" icon="check" kind="solid" color={a.color} onPress={() => setConfirm(true)} testID={`done-${q.id}`} />
          </Row>
        ) : (
          <Pill text={done ? (q.auto ? 'AUTO-VERIFIED' : 'CLEARED') : 'SKIPPED'} color={done ? C.green : C.muted} />
        )}
      </Row>

      <SystemModal visible={confirm} onClose={() => setConfirm(false)} title="Quest check" icon="clipboard-check" color={a.color}>
        <Txt v="bodyB" style={{ fontSize: 17, marginBottom: 6 }}>
          {q.title}
        </Txt>
        <View style={[styles.criteria, { borderColor: withAlpha(a.color, 0.5) }]}>
          <Txt v="label" color={a.color} style={{ marginBottom: 4 }}>
            Criteria
          </Txt>
          <Txt v="body">{q.criteria}</Txt>
        </View>
        <Input label="Reflection (optional · +10% XP)" value={note} onChangeText={setNote} placeholder="What did you do? How did it feel?" maxLength={280} multiline />
        {ex && remaining > 0 ? (
          <Btn
            kind="solid"
            color={C.green}
            style={{ marginBottom: 8 }}
            label={`Log ${remaining} ${ex.unit === 'reps' ? '' : ex.unit + ' '}${ex.name.toLowerCase()} & complete`}
            icon="dumbbell"
            onPress={() => {
              setConfirm(false);
              setTimeout(() => actions.logWorkout(ex.id, remaining), 200);
            }}
          />
        ) : null}
        <Btn
          kind={ex && remaining > 0 ? 'outline' : 'solid'}
          color={a.color}
          label="I met the criteria"
          icon="check-decagram"
          testID="confirm-side"
          onPress={() => {
            setConfirm(false);
            setTimeout(() => actions.completeSide(q.id, note), 200);
          }}
        />
        <Txt v="tiny" center style={{ marginTop: 8 }}>
          Honesty keeps the System meaningful — only you know if it’s done.
        </Txt>
      </SystemModal>
    </View>
  );
}

export function TemplateRow({ t, onAdd, added }: { t: QuestTemplate; onAdd: () => void; added?: boolean }) {
  const a = AREA_MAP[t.area];
  return (
    <View style={[styles.tpl, { borderLeftColor: a.color }]}>
      <View style={{ flex: 1 }}>
        <Row gap={6} wrap style={{ marginBottom: 3 }}>
          <AreaTag area={t.area} small />
          <TierBadge tier={t.tier} />
          {t.metric ? <Pill text="AUTO" color={C.green} /> : null}
        </Row>
        <Txt v="bodyB">{t.title}</Txt>
        <Txt v="tiny">
          {t.criteria}
          {t.minutes ? ` · ~${t.minutes} min` : ''}
        </Txt>
      </View>
      <Btn size="sm" icon={added ? 'check' : 'plus'} color={added ? C.green : a.color} disabled={added} onPress={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: C.lineDim, borderLeftWidth: 3, borderRadius: 3, padding: 12, marginBottom: 10, backgroundColor: 'rgba(2,8,20,0.5)' },
  areaTag: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 1 },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  criteria: { borderWidth: 1, borderRadius: 3, padding: 10, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingLeft: 10, borderLeftWidth: 2, borderBottomWidth: 1, borderBottomColor: C.lineDim, marginBottom: 2 },
});
