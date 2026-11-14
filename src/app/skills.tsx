import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { STAT_KEYS, STAT_META } from '@/game/constants';
import { today } from '@/game/date';
import { SKILL_PRESETS, SKILL_TIERS, skillMinutesOn, skillTier } from '@/game/tracking';
import type { StatKey } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { life, useGame } from '@/store/game';
import { Bar, Btn, Chip, Empty, Icon, Input, Panel, Row, Txt } from '@/ui/kit';
import { Columns, Screen } from '@/ui/Screen';
import { Hint } from '@/ui/Trackers';
import { C } from '@/ui/theme';

const QUICK = [15, 30, 60];

export default function SkillsScreen() {
  const skills = useGame((s) => s.game.track.skills);
  const g = useGame((s) => s.game);
  const t = today();
  const [name, setName] = useState('');
  const [stat, setStat] = useState<StatKey>('INT');

  return (
    <Screen title="SKILLS" subtitle="Practice hours → tiers" back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            {!skills.length ? (
              <Panel title="Your skills" icon="star-circle" color={C.purple}>
                <Empty icon="star-circle-outline" title="No skills yet" text="Pick something you want to get better at. Log minutes after each session." />
              </Panel>
            ) : null}
            {skills.map((k) => {
              const tier = skillTier(k.minutes);
              return (
                <Panel
                  key={k.id}
                  title={k.name}
                  icon={k.icon}
                  color={C.purple}
                  right={
                    <Pressable onPress={() => systemConfirm('DELETE SKILL', [`Remove ${k.name} and its ${Math.round(tier.hours)} h?`], () => life.deleteSkill(k.id))} hitSlop={10}>
                      <Icon name="trash-can-outline" size={18} color={C.muted} />
                    </Pressable>
                  }>
                  <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                    <Txt v="h3" color={C.gold} style={{ fontSize: 14 }}>
                      {tier.name.toUpperCase()}
                    </Txt>
                    <Txt v="small">
                      {tier.hours.toFixed(1)} h total · {skillMinutesOn(g, t, k)} min today · {STAT_META[k.stat].name}
                    </Txt>
                  </Row>
                  <Bar value={tier.pct * 100} max={100} color={C.purple} height={8} right={tier.next ? `${(tier.nextHours! - tier.hours).toFixed(1)} h to ${tier.next}` : 'Max tier'} />
                  <Row gap={6} style={{ marginTop: 10 }}>
                    {QUICK.map((m) => (
                      <Btn key={m} flex size="sm" color={C.purple} label={`+${m} min`} onPress={() => life.logSkill(k.id, m)} testID={`skill-${k.id}-${m}`} />
                    ))}
                  </Row>
                </Panel>
              );
            })}
          </View>,
          <View key="r">
            <Panel title="Add a skill" icon="plus-circle" color={C.purple}>
              <Row gap={6} wrap style={{ marginBottom: 10 }}>
                {SKILL_PRESETS.filter((p) => !skills.some((k) => k.name === p.name)).map((p) => (
                  <Chip key={p.name} label={p.name} icon={p.icon} onPress={() => life.addSkill(p.name, p.icon, p.stat)} />
                ))}
              </Row>
              <Input label="Or your own" placeholder="e.g. Thai boxing" value={name} onChangeText={setName} maxLength={30} />
              <Txt v="label" style={{ marginBottom: 6 }}>
                Trains
              </Txt>
              <Row gap={6} wrap style={{ marginBottom: 12 }}>
                {STAT_KEYS.map((s) => (
                  <Chip key={s} label={s} icon={STAT_META[s].icon} color={STAT_META[s].color} active={stat === s} onPress={() => setStat(s)} />
                ))}
              </Row>
              <Btn
                kind="solid"
                color={C.purple}
                label="Add skill"
                icon="plus"
                disabled={!name.trim()}
                onPress={() => {
                  life.addSkill(name, 'star-circle', stat);
                  setName('');
                }}
              />
            </Panel>
            <Panel title="Tiers" icon="stairs-up">
              {SKILL_TIERS.map((x) => (
                <Row key={x.name} style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Txt v="bodyB">{x.name}</Txt>
                  <Txt v="small">{x.hours} h</Txt>
                </Row>
              ))}
              <Hint icon="information-outline" text="1 XP per 2 minutes of practice, plus gold at every new tier. Focus Dungeons pair well with skill time." />
            </Panel>
          </View>,
        ]}
      </Columns>
    </Screen>
  );
}
