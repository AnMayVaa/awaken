import React from 'react';
import { Pressable, View } from 'react-native';

import { today } from '@/game/date';
import { daysSinceContact, RELATIONS } from '@/game/tracking';
import { systemConfirm } from '@/store/alerts';
import { life, useGame } from '@/store/game';
import { Chip, Icon, Panel, Row, Txt } from '@/ui/kit';
import { PeopleForm } from '@/ui/LogForms';
import { Columns, Screen } from '@/ui/Screen';
import { Hint } from '@/ui/Trackers';
import { C } from '@/ui/theme';

const EVERY = [1, 3, 7, 14, 30];

export default function PeopleScreen() {
  const people = useGame((s) => s.game.track.people);
  const t = today();
  return (
    <Screen title="PEOPLE" subtitle="Keep your bonds strong" back inTabs={false}>
      <Columns>
        {[
          <View key="l">
            <Panel title="Reach out" icon="account-heart" color={C.pink}>
              <PeopleForm />
            </Panel>
          </View>,
          <View key="r">
            {people.length ? (
              <Panel title="Reminder rhythm" icon="calendar-sync">
                {people.map((p) => (
                  <View key={p.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.lineDim }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Txt v="bodyB">
                        {p.name} <Txt v="tiny">{RELATIONS.find((r) => r.id === p.relation)?.label}</Txt>
                      </Txt>
                      <Row gap={10}>
                        <Txt v="tiny">{p.lastContact ? `${daysSinceContact(p, t)} d ago` : 'never'}</Txt>
                        <Pressable onPress={() => systemConfirm('REMOVE', [`Remove ${p.name} from your list?`], () => life.deletePerson(p.id))} hitSlop={8}>
                          <Icon name="trash-can-outline" size={16} color={C.muted} />
                        </Pressable>
                      </Row>
                    </Row>
                    <Row gap={6} wrap style={{ marginTop: 6 }}>
                      {EVERY.map((d) => (
                        <Chip key={d} label={d === 1 ? 'daily' : `${d} d`} active={p.everyDays === d} color={C.pink} onPress={() => life.updatePerson(p.id, { everyDays: d })} />
                      ))}
                    </Row>
                  </View>
                ))}
              </Panel>
            ) : null}
            <Panel title="Why it matters" icon="heart-pulse">
              <Hint icon="account-group" text="Strong relationships are one of the most consistent predictors of long-term happiness and health (Harvard Study of Adult Development)." color={C.pink} />
              <Hint icon="message-text" text="A two-line message counts. Small and regular beats rare and big." color={C.cyan} />
              <Hint icon="star-four-points" text="Each contact trains Charisma; reconnecting after the reminder gives double XP." color={C.gold} />
            </Panel>
          </View>,
        ]}
      </Columns>
    </Screen>
  );
}
