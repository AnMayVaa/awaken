import { useKeepAwake } from 'expo-keep-awake';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { DUNGEON_GRACE_SEC, DUNGEON_MAP, DUNGEONS, RANK_COLORS } from '@/game/constants';
import { formatDuration, formatHM } from '@/game/date';
import type { Rank } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';
import { Btn, Icon, Input, Panel, Pill, RankBadge, Row, Txt } from './kit';
import { Ring } from './Ring';
import { Columns, useLayout } from './Screen';
import { C, F, textGlow, withAlpha } from './theme';

function ActiveDungeon() {
  useKeepAwake();
  const d = useGame((s) => s.game.dungeon)!;
  const strict = useGame((s) => s.game.settings.strictDungeon);
  const [now, setNow] = useState(() => Date.now());
  const { width } = useLayout();
  useEffect(() => {
    const iv = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= d.endsAt) actions.tick();
    }, 1000);
    return () => clearInterval(iv);
  }, [d.endsAt]);
  const tier = DUNGEON_MAP[d.rank];
  const total = d.endsAt - d.startedAt;
  const left = d.endsAt - now;
  const color = RANK_COLORS[d.rank];
  const size = Math.min(300, width - 60);
  return (
    <Panel title={`${d.rank}-Rank Gate · In progress`} icon="gate" color={color} intensity={1.6}>
      <View style={{ alignItems: 'center', paddingVertical: 10 }}>
        <Ring size={size} progress={1 - left / total} color={color}>
          <Txt v="label" color={color}>
            Time remaining
          </Txt>
          <Txt style={{ fontFamily: F.displayBlack, fontSize: size * 0.17, lineHeight: size * 0.22, color: C.white, ...textGlow(color, 16), marginVertical: 6 }}>{formatDuration(left)}</Txt>
          <Txt v="bodyB" numberOfLines={1} style={{ maxWidth: size * 0.6 }} center>
            {d.label}
          </Txt>
          {d.label !== tier.name ? <Txt v="tiny">{tier.name}</Txt> : null}
        </Ring>
      </View>
      <View style={styles.rules}>
        <Row gap={8}>
          <Icon name={strict ? 'alert-octagon' : 'information-outline'} size={16} color={strict ? C.orange : C.textDim} />
          <Txt v="small" style={{ flex: 1 }} color={strict ? C.text : C.textDim}>
            {strict
              ? `Strict mode: leaving AWAKEN for more than ${DUNGEON_GRACE_SEC}s collapses the dungeon. The screen stays awake.`
              : 'Relaxed mode: you can leave the app. Stay focused.'}
          </Txt>
        </Row>
        <Txt v="tiny" style={{ marginTop: 6 }}>
          Reward on clear: +{tier.xp}+ XP · +{tier.gold} Gold · INT growth
        </Txt>
      </View>
      <Btn
        style={{ marginTop: 12 }}
        label="Abandon dungeon"
        icon="exit-run"
        color={C.red}
        onPress={() => systemConfirm('ABANDON DUNGEON?', ['The gate will collapse.', 'You will lose 10% HP and get no reward.'], () => actions.abandonDungeon(), { confirmLabel: 'Abandon', tone: 'penalty' })}
      />
    </Panel>
  );
}

export function DungeonView() {
  const g = useGame((s) => s.game);
  const [sel, setSel] = useState<Rank>('D');
  const [label, setLabel] = useState('');
  const tier = DUNGEON_MAP[sel];

  const enter = () => {
    actions.startDungeon(sel, label.trim());
    setLabel('');
  };

  const gates = (
    <Panel key="gates" title="Gates" icon="gate">
      <Txt v="small" style={{ marginBottom: 10 }}>
        A dungeon is a deep-focus session. Pick a gate, name what you’ll work on, and stay until it’s cleared.
      </Txt>
      {DUNGEONS.map((d) => {
        const color = RANK_COLORS[d.rank];
        const active = sel === d.rank;
        return (
          <Pressable
            key={d.rank}
            onPress={() => setSel(d.rank)}
            testID={`gate-${d.rank}`}
            style={[styles.gate, { borderColor: withAlpha(color, active ? 0.9 : 0.22), backgroundColor: withAlpha(color, active ? 0.14 : 0.03) }]}>
            <RankBadge rank={d.rank} size={40} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Txt v="bodyB" style={{ fontSize: 16.5 }}>
                {d.name}
              </Txt>
              <Txt v="tiny">
                {d.minutes} min · +{d.xp} XP · +{d.gold} G
              </Txt>
            </View>
            {active ? <Icon name="chevron-right-circle" color={color} /> : <Txt v="num" style={{ fontSize: 13 }} color={C.textDim}>{d.minutes}′</Txt>}
          </Pressable>
        );
      })}
    </Panel>
  );

  const entry = (
    <Panel key="entry" title={`Enter ${sel}-Rank gate`} icon="door-open" color={RANK_COLORS[sel]}>
      <Txt v="h2" style={{ fontSize: 17, marginBottom: 2 }}>
        {tier.name}
      </Txt>
      <Txt v="small" style={{ marginBottom: 12 }}>
        {tier.minutes} minutes of uninterrupted focus.
      </Txt>
      <Input label="Objective" value={label} onChangeText={setLabel} placeholder="e.g. Algorithms — chapter 9" maxLength={40} />
      <Btn kind="solid" size="lg" color={RANK_COLORS[sel]} label="Enter the gate" icon="sword" onPress={enter} testID="enter-gate" />
      <Txt v="tiny" center style={{ marginTop: 8 }}>
        Strict mode {g.settings.strictDungeon ? 'ON' : 'OFF'} · change in Settings
      </Txt>
    </Panel>
  );

  const history = (
    <Panel key="hist" title="Records" icon="history">
      <Row style={{ marginBottom: 10 }}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="num" color={C.green}>
            {g.counters.dungeonsCleared}
          </Txt>
          <Txt v="label" style={{ fontSize: 9 }}>
            Cleared
          </Txt>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="num" color={C.red}>
            {g.counters.dungeonsFailed}
          </Txt>
          <Txt v="label" style={{ fontSize: 9 }}>
            Failed
          </Txt>
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="num" color={C.purple}>
            {formatHM(g.counters.focusMinutes * 60000)}
          </Txt>
          <Txt v="label" style={{ fontSize: 9 }}>
            Focus
          </Txt>
        </View>
      </Row>
      {g.dungeonHistory.slice(0, 8).map((h) => (
        <Row key={h.ts} gap={10} style={styles.hRow}>
          <Pill text={h.rank} color={RANK_COLORS[h.rank]} />
          <Txt v="body" style={{ flex: 1 }} numberOfLines={1}>
            {h.label}
          </Txt>
          <Txt v="tiny" color={h.result === 'clear' ? C.green : C.red}>
            {h.result === 'clear' ? 'CLEAR' : 'FAIL'} · {h.minutes}m
          </Txt>
        </Row>
      ))}
    </Panel>
  );

  return (
    <>
      {g.dungeon ? (
        <Columns>{[<ActiveDungeon key="a" />, history]}</Columns>
      ) : (
        <Columns>
          {[
            <View key="l">{gates}</View>,
            <View key="r">
              {entry}
              {history}
            </View>,
          ]}
        </Columns>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gate: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 3, padding: 10, marginBottom: 8 },
  rules: { padding: 10, borderWidth: 1, borderColor: C.lineDim, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.25)' },
  hRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.lineDim },
});
