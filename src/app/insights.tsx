import { router } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { lifeScore } from '@/game/director';
import { today } from '@/game/date';
import { insightDataDays, insights, moneyScore, nutritionScore } from '@/game/tracking';
import { useGame } from '@/store/game';
import { openQuickLog } from '@/store/ui';
import { Bar, Btn, Icon, Panel, Row, Txt } from '@/ui/kit';
import { Columns, Screen } from '@/ui/Screen';
import { Hint, ScoreBadge } from '@/ui/Trackers';
import { C, withAlpha } from '@/ui/theme';

const NEED = 7;

export default function InsightsScreen() {
  const g = useGame((s) => s.game);
  const t = today();
  const cards = insights(g, t);
  const days = insightDataDays(g, t);
  const ls = lifeScore(g, t);
  return (
    <Screen title="INSIGHTS" subtitle="Patterns in your own data" back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            <Panel title="Scores" icon="star-four-points">
              <Row style={{ justifyContent: 'space-around' }}>
                <ScoreBadge value={ls.score} label="Life" color={C.cyan} />
                <ScoreBadge value={nutritionScore(g, t)} label="Fuel" color={C.green} />
                <ScoreBadge value={moneyScore(g, t)} label="Money" color={C.gold} />
              </Row>
            </Panel>
            {days < NEED || !cards.length ? (
              <Panel title="Collecting data" icon="database-clock" color={C.purple}>
                <Txt v="small" style={{ marginBottom: 8 }}>
                  Insights compare your good and bad days — they need about a week of check-ins and logs to say anything honest.
                </Txt>
                <Bar label="Days with data (last 14)" right={`${Math.min(days, NEED)}/${NEED}`} value={Math.min(days, NEED)} max={NEED} color={C.purple} />
                <Row gap={8} style={{ marginTop: 12 }}>
                  <Btn flex size="sm" icon="clipboard-pulse" label="Check-in" onPress={() => router.push('/life')} />
                  <Btn flex size="sm" icon="silverware-fork-knife" label="Log meal" onPress={() => openQuickLog('meal')} />
                </Row>
              </Panel>
            ) : null}
          </View>,
          <View key="r">
            {cards.map((c) => (
              <Panel key={c.id} color={c.color}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(c.color, 0.15) }}>
                    <Icon name={c.icon} size={22} color={c.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt v="h3" style={{ fontSize: 14 }}>
                      {c.title}
                    </Txt>
                    <Txt v="body" style={{ marginTop: 4 }}>
                      {c.text}
                    </Txt>
                    <Txt v="tiny" style={{ marginTop: 4 }}>
                      Based on {c.n} days
                    </Txt>
                  </View>
                </Row>
              </Panel>
            ))}
            <Panel title="Read these wisely" icon="information-outline">
              <Hint icon="scale-balance" text="These are patterns, not proof — other things may explain them. Use them as experiments: try the good-day habit for a week and watch the card." />
            </Panel>
          </View>,
        ]}
      </Columns>
    </Screen>
  );
}
