import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EXERCISE_MAP, ITEM_MAP, QUEST_REWARDS, RANK_COLORS, RANKS, STAT_KEYS, STAT_META } from '@/game/constants';
import { formatDuration, msUntilMidnight } from '@/game/date';
import { dailyRewards, isPenaltyActive, questReward } from '@/game/engine';
import type { CustomQuest, QuestTask, Rank, StatKey } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';
import { Btn, Chip, Empty, Icon, Input, Panel, Pill, Row, Segment, Txt } from '@/ui/kit';
import { UrgentBanner } from '@/ui/Fun';
import { LogModal } from '@/ui/LogModal';
import { MainQuestsView } from '@/ui/MainQuests';
import { LibraryView, SideQuestsPanel } from '@/ui/SideQuests';
import { Columns, Screen } from '@/ui/Screen';
import { SystemModal } from '@/ui/SystemModal';
import { C, F, glow, withAlpha } from '@/ui/theme';

function Countdown({ color }: { color: string }) {
  const [ms, setMs] = useState(msUntilMidnight());
  useEffect(() => {
    const iv = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <Row gap={6}>
      <Icon name="timer-sand" size={14} color={color} />
      <Txt v="num" color={color} style={{ fontSize: 13 }}>
        {formatDuration(ms)}
      </Txt>
    </Row>
  );
}

function TaskRow({ t, color, onCustom, disabled }: { t: QuestTask; color: string; onCustom: () => void; disabled?: boolean }) {
  const ex = EXERCISE_MAP[t.exerciseId];
  const done = t.progress >= t.target;
  const pct = Math.min(1, t.progress / t.target);
  const steps = ex?.steps ?? [1, 5, 10];
  return (
    <View style={styles.task}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={8} style={{ flex: 1 }}>
          <Icon name={done ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={done ? C.green : color} />
          <Txt v="bodyB" style={{ fontSize: 17 }} color={done ? C.textDim : C.text}>
            {t.label}
          </Txt>
        </Row>
        <Txt v="num" color={done ? C.green : C.text} style={{ fontSize: 15 }}>
          [{t.progress}/{t.target}]{t.unit !== 'reps' ? ` ${t.unit}` : ''}
        </Txt>
      </Row>
      <View style={styles.track}>
        <View style={[{ width: `${pct * 100}%`, height: '100%', backgroundColor: done ? C.green : color }, glow(done ? C.green : color, 6, 0.7)]} />
      </View>
      {!done && !disabled ? (
        <Row gap={6} style={{ marginTop: 8 }}>
          {steps.map((s) => (
            <Btn key={s} size="sm" label={`+${s}`} color={color} onPress={() => actions.logWorkout(t.exerciseId, s)} flex />
          ))}
          <Btn size="sm" icon="pencil-plus" color={color} onPress={onCustom} />
        </Row>
      ) : null}
    </View>
  );
}

const emptyForm = { title: '', note: '', difficulty: 'C' as Rank, stat: 'INT' as StatKey, repeat: 'daily' as 'daily' | 'once' };

export default function QuestsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'today' | 'main' | 'library'>(params.tab === 'main' || params.tab === 'library' ? params.tab : 'today');
  const [seen, setSeen] = useState(params.tab);
  if (params.tab !== seen) {
    setSeen(params.tab);
    if (params.tab === 'main' || params.tab === 'library' || params.tab === 'today') setTab(params.tab);
  }
  const g = useGame((s) => s.game);
  const [logEx, setLogEx] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const penalty = isPenaltyActive(g) ? g.penalty : null;
  const today = g.daily.date;
  const reward = dailyRewards(g.player.level);
  const dailyQuests = g.customQuests.filter((q) => q.repeat === 'daily');
  const onceQuests = g.customQuests.filter((q) => q.repeat === 'once');

  const openNew = () => {
    setEditId(null);
    setForm({ ...emptyForm });
  };
  const openEdit = (q: CustomQuest) => {
    setEditId(q.id);
    setForm({ title: q.title, note: q.note ?? '', difficulty: q.difficulty, stat: q.stat, repeat: q.repeat });
  };
  const save = () => {
    if (!form || !form.title.trim()) return;
    const data = { ...form, title: form.title.trim(), note: form.note.trim() || undefined };
    if (editId) actions.updateQuest(editId, data);
    else actions.addQuest(data);
    setForm(null);
  };

  const questRow = (q: CustomQuest) => {
    const done = q.doneDate === today;
    const r = questReward(q, g.player.level);
    const col = RANK_COLORS[q.difficulty];
    return (
      <View key={q.id} style={[styles.quest, done ? { opacity: 0.55 } : null]}>
        <Pressable
          onPress={() => (done ? actions.undoQuest(q.id) : actions.completeQuest(q.id))}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          style={[styles.check, { borderColor: done ? C.green : withAlpha(col, 0.8), backgroundColor: done ? withAlpha(C.green, 0.2) : 'transparent' }]}>
          {done ? <Icon name="check-bold" size={16} color={C.green} /> : null}
        </Pressable>
        <Pressable style={{ flex: 1, marginLeft: 12 }} onPress={() => openEdit(q)}>
          <Txt v="bodyB" style={[{ fontSize: 16.5 }, done ? { textDecorationLine: 'line-through' } : null]} numberOfLines={2}>
            {q.title}
          </Txt>
          <Row gap={8} style={{ marginTop: 3 }}>
            <Pill text={`${q.difficulty}-RANK`} color={col} />
            <Icon name={STAT_META[q.stat].icon} size={13} color={STAT_META[q.stat].color} />
            <Txt v="tiny">
              +{r.xp} XP · +{r.gold} G{q.completedCount ? ` · ×${q.completedCount}` : ''}
            </Txt>
          </Row>
          {q.note ? (
            <Txt v="tiny" numberOfLines={1} style={{ marginTop: 2 }}>
              {q.note}
            </Txt>
          ) : null}
        </Pressable>
      </View>
    );
  };

  const penaltyPanel = penalty ? (
    <Panel key="pen" title="Penalty Quest" icon="skull" color={C.red} intensity={1.8} right={<Countdown color={C.red} />}>
      <Txt v="body" style={{ marginBottom: 4 }}>
        {penalty.reason}. Survive the Penalty Zone.
      </Txt>
      <Txt v="small" color={C.red} style={{ marginBottom: 6 }}>
        XP gain is halved until this is cleared.
      </Txt>
      {penalty.tasks.map((t) => (
        <TaskRow key={t.id} t={t} color={C.red} onCustom={() => setLogEx(t.exerciseId)} />
      ))}
      {g.inventory.penalty_pass > 0 ? (
        <Btn
          style={{ marginTop: 10 }}
          label={`Use Penalty Pass (${g.inventory.penalty_pass})`}
          icon={ITEM_MAP.penalty_pass.icon}
          color={C.gold}
          onPress={() => systemConfirm('USE PENALTY PASS?', ['The penalty quest will be cleared instantly.'], () => actions.useItem('penalty_pass'), { confirmLabel: 'Use', tone: 'warning' })}
        />
      ) : null}
    </Panel>
  ) : null;

  const dailyPanel = (
    <Panel key="daily" title="Daily Quest" icon="sword" color={g.daily.completed ? C.green : C.cyan} right={!g.daily.completed ? <Countdown color={C.gold} /> : <Pill text="CLEARED" color={C.green} icon="check" />}>
      <Txt style={{ fontFamily: F.display, color: C.cyanHi, fontSize: 13, letterSpacing: 1.5, marginBottom: 2 }}>[Body Forging]</Txt>
      <Txt v="small" style={{ marginBottom: 6 }}>
        Training to become stronger. Logs from the Train tab count here too.
      </Txt>
      {g.daily.tasks.map((t) => (
        <TaskRow key={t.id} t={t} color={C.cyan} disabled={g.daily.completed} onCustom={() => setLogEx(t.exerciseId)} />
      ))}
      <View style={styles.rewardBox}>
        <Txt v="label" color={C.gold}>
          Rewards
        </Txt>
        <Txt v="small" color={C.text}>
          +{reward.xp} XP · +{reward.gold} Gold · +1 ability point · full HP recovery
        </Txt>
        {!g.daily.completed ? (
          <Txt v="tiny" color={C.red} style={{ marginTop: 4 }}>
            WARNING: failing to complete the Daily Quest will result in a penalty.
          </Txt>
        ) : null}
      </View>
    </Panel>
  );

  const customPanel = (
    <Panel key="custom" title="Your Own Quests" icon="clipboard-text" right={<Btn size="sm" icon="plus" label="New" onPress={openNew} testID="new-quest" />}>
      {!g.customQuests.length ? (
        <Empty icon="clipboard-plus-outline" title="No quests yet" text="Add your own tasks — study, chores, side projects. Harder ranks give more XP.">
          <Btn size="sm" kind="solid" label="Create quest" icon="plus" onPress={openNew} style={{ marginTop: 8 }} />
        </Empty>
      ) : null}
      {dailyQuests.length ? (
        <Txt v="label" style={{ marginBottom: 4 }}>
          Daily · repeats every day
        </Txt>
      ) : null}
      {dailyQuests.map(questRow)}
      {onceQuests.length ? (
        <Txt v="label" style={{ marginTop: dailyQuests.length ? 14 : 0, marginBottom: 4 }}>
          One-time
        </Txt>
      ) : null}
      {onceQuests.map(questRow)}
    </Panel>
  );

  return (
    <Screen title="QUESTS" subtitle="Quest log">
      <View style={{ marginBottom: 14 }}>
        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { value: 'today', label: 'Today' },
            { value: 'main', label: 'Main' },
            { value: 'library', label: 'Library' },
          ]}
        />
      </View>
      {tab === 'today' ? <UrgentBanner /> : null}
      {tab === 'today' ? (
        <Columns>
          {[
            <View key="l">
              {penaltyPanel}
              {dailyPanel}
            </View>,
            <View key="r">
              <SideQuestsPanel onBrowse={() => setTab('library')} />
              {customPanel}
            </View>,
          ]}
        </Columns>
      ) : tab === 'main' ? (
        <MainQuestsView />
      ) : (
        <LibraryView />
      )}

      <LogModal exerciseId={logEx} onClose={() => setLogEx(null)} />

      <SystemModal visible={!!form} onClose={() => setForm(null)} title={editId ? 'Edit quest' : 'New quest'} icon="clipboard-edit">
        {form ? (
          <>
            <Input label="Quest" value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} placeholder="e.g. Study algorithms 1 hour" maxLength={60} />
            <Input label="Note (optional)" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} placeholder="Details" maxLength={80} />
            <Txt v="label" style={{ marginBottom: 6 }}>
              Difficulty
            </Txt>
            <Row wrap gap={6} style={{ marginBottom: 6 }}>
              {RANKS.map((r) => (
                <Chip key={r} label={r} color={RANK_COLORS[r]} active={form.difficulty === r} onPress={() => setForm({ ...form, difficulty: r })} style={{ minWidth: 42, justifyContent: 'center' }} />
              ))}
            </Row>
            <Txt v="tiny" style={{ marginBottom: 12 }}>
              {QUEST_REWARDS[form.difficulty].label} · base +{QUEST_REWARDS[form.difficulty].xp} XP, +{QUEST_REWARDS[form.difficulty].gold} G
            </Txt>
            <Txt v="label" style={{ marginBottom: 6 }}>
              Trains
            </Txt>
            <Row wrap gap={6} style={{ marginBottom: 12 }}>
              {STAT_KEYS.map((k) => (
                <Chip key={k} label={k} icon={STAT_META[k].icon} color={STAT_META[k].color} active={form.stat === k} onPress={() => setForm({ ...form, stat: k })} />
              ))}
            </Row>
            <Txt v="label" style={{ marginBottom: 6 }}>
              Repeat
            </Txt>
            <Segment
              value={form.repeat}
              onChange={(v) => setForm({ ...form, repeat: v })}
              options={[
                { value: 'daily', label: 'Every day' },
                { value: 'once', label: 'One time' },
              ]}
            />
            <Row style={{ marginTop: 16 }}>
              {editId ? (
                <Btn
                  icon="delete"
                  color={C.red}
                  onPress={() => {
                    const id = editId;
                    setForm(null);
                    setTimeout(() => systemConfirm('DELETE QUEST?', [form.title], () => actions.deleteQuest(id), { confirmLabel: 'Delete', tone: 'penalty' }), 250);
                  }}
                />
              ) : null}
              <Btn kind="solid" flex label={editId ? 'Save' : 'Add quest'} icon="check" onPress={save} disabled={!form.title.trim()} testID="save-quest" />
            </Row>
          </>
        ) : null}
      </SystemModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  task: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 8, borderRadius: 2, overflow: 'hidden' },
  rewardBox: { marginTop: 12, padding: 10, borderWidth: 1, borderColor: withAlpha(C.gold, 0.3), borderRadius: 3, backgroundColor: withAlpha(C.gold, 0.05), gap: 3 },
  quest: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim },
  check: { width: 28, height: 28, borderWidth: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
});
