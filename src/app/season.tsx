import React from 'react';
import { View } from 'react-native';

import { ITEM_MAP } from '@/game/constants';
import { today } from '@/game/date';
import { seasonInfo, SEASON_DAYS, SEASON_TIERS } from '@/game/tracking';
import { life, useGame } from '@/store/game';
import { Bar, Btn, Icon, Panel, Row, Txt } from '@/ui/kit';
import { Columns, Screen } from '@/ui/Screen';
import { Hint } from '@/ui/Trackers';
import { C, withAlpha } from '@/ui/theme';

export default function SeasonScreen() {
  const g = useGame((s) => s.game);
  const si = seasonInfo(g, today());
  return (
    <Screen title={`SEASON ${si.n}`} subtitle={`Day ${si.day} of ${SEASON_DAYS}`} back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            <Panel title="Season progress" icon="flag-checkered" color={C.orange}>
              <Bar label="Days" right={`${si.daysLeft} days left`} value={si.day} max={SEASON_DAYS} color={C.orange} />
              <View style={{ height: 10 }} />
              <Bar label={`Season XP · tier ${si.reached}/${SEASON_TIERS.length}`} right={si.next ? `${si.xp} / ${si.next.xp}` : `${si.xp} XP`} value={si.next ? si.pct * 100 : 100} max={100} color={C.gold} />
              <Hint icon="information-outline" text="Every XP you earn anywhere counts. Seasons last 66 days — the time research suggests a habit needs to become automatic. Unclaimed rewards are auto-claimed when a season ends." />
            </Panel>
          </View>,
          <View key="r">
            <Panel title="Reward track" icon="gift">
              {SEASON_TIERS.map((tier, i) => {
                const reached = i < si.reached;
                const claimed = g.track.season.claimed.includes(i);
                return (
                  <Row key={i} gap={10} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim, opacity: reached ? 1 : 0.55 }}>
                    <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(reached ? C.gold : C.muted, 0.15) }}>
                      <Txt v="num" color={reached ? C.gold : C.muted} style={{ fontSize: 13 }}>
                        {i + 1}
                      </Txt>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Txt v="bodyB">
                        {tier.gold} Gold{tier.item ? ` + ${ITEM_MAP[tier.item].name}` : ''}
                      </Txt>
                      <Txt v="tiny">{tier.xp.toLocaleString()} season XP</Txt>
                    </View>
                    {claimed ? (
                      <Icon name="check-decagram" size={22} color={C.green} />
                    ) : reached ? (
                      <Btn size="sm" kind="solid" color={C.gold} label="Claim" onPress={() => life.claimSeason(i)} testID={`season-claim-${i}`} />
                    ) : (
                      <Icon name="lock" size={18} color={C.muted} />
                    )}
                  </Row>
                );
              })}
            </Panel>
          </View>,
        ]}
      </Columns>
    </Screen>
  );
}
