import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ACHIEVEMENTS } from '@/game/achievements';
import { useGame } from '@/store/game';
import { Bar, Icon, Panel, Pill, Row, Txt } from '@/ui/kit';
import { Screen, useLayout } from '@/ui/Screen';
import { C, withAlpha } from '@/ui/theme';

export default function AchievementsScreen() {
  const g = useGame((s) => s.game);
  const { width } = useLayout();
  const two = width >= 760;
  const unlocked = ACHIEVEMENTS.filter((a) => g.achievements[a.id]).length;
  const sorted = [...ACHIEVEMENTS].sort((a, b) => Number(!!g.achievements[b.id]) - Number(!!g.achievements[a.id]));

  return (
    <Screen title="TROPHIES" subtitle="Achievements & titles" back inTabs={false} tint={C.gold}>
      <Panel color={C.gold}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <Txt v="h3">Unlocked</Txt>
          <Txt v="num" color={C.gold}>
            {unlocked} / {ACHIEVEMENTS.length}
          </Txt>
        </Row>
        <Bar value={unlocked} max={ACHIEVEMENTS.length} color={C.gold} />
      </Panel>
      <View style={two ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } : { gap: 10 }}>
        {sorted.map((a) => {
          const done = !!g.achievements[a.id];
          const prog = a.progress ? a.progress(g) : done ? 1 : 0;
          const color = done ? C.gold : C.muted;
          return (
            <View key={a.id} style={[styles.card, two ? { width: '48.9%' } : null, { borderColor: withAlpha(color, done ? 0.6 : 0.25), backgroundColor: done ? withAlpha(C.gold, 0.06) : 'rgba(5,16,34,0.7)' }]}>
              <Row gap={12}>
                <View style={[styles.icon, { borderColor: withAlpha(color, 0.6) }]}>
                  <Icon name={done ? a.icon : 'lock-outline'} size={22} color={done ? C.gold : C.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="bodyB" color={done ? C.text : C.textDim}>
                    {a.name}
                  </Txt>
                  <Txt v="tiny">{a.desc}</Txt>
                  <Row gap={6} wrap style={{ marginTop: 4 }}>
                    {a.title ? <Pill text={`TITLE: ${a.title}`} color={done ? C.gold : C.muted} /> : null}
                    {a.xp || a.gold ? (
                      <Txt v="tiny" color={C.textDim}>
                        {a.xp ? `+${a.xp} XP ` : ''}
                        {a.gold ? `+${a.gold} G` : ''}
                      </Txt>
                    ) : null}
                  </Row>
                </View>
              </Row>
              {!done && a.progress ? <Bar value={prog} max={1} color={C.cyan} height={5} style={{ marginTop: 10 }} /> : null}
              {done ? (
                <Txt v="tiny" color={C.gold} style={{ marginTop: 6 }}>
                  Unlocked {new Date(g.achievements[a.id]).toLocaleDateString()}
                </Txt>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 3, padding: 12 },
  icon: { width: 44, height: 44, borderWidth: 1, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
