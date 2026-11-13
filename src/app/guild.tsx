import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { botFeed, botSnapshot, generateCandidates } from '@/game/bots';
import { BOT_ARCHETYPES } from '@/game/constants';
import { shortDate } from '@/game/date';
import { combatPower, rankForLevel } from '@/game/engine';
import type { Bot } from '@/game/types';
import { systemConfirm } from '@/store/alerts';
import { actions, useGame } from '@/store/game';
import { Btn, Empty, Icon, Panel, Pill, RankBadge, Row, Txt } from '@/ui/kit';
import { Columns, Screen } from '@/ui/Screen';
import { SystemModal } from '@/ui/SystemModal';
import { C, withAlpha } from '@/ui/theme';

export default function GuildScreen() {
  const g = useGame((s) => s.game);
  const [recruit, setRecruit] = useState<Bot[] | null>(null);
  const today = g.daily.date;

  const board = useMemo(() => {
    const rows = g.bots.map((b) => {
      const s = botSnapshot(b, today);
      return { id: b.id, name: b.name, avatar: b.avatar, level: s.level, rank: s.rank, streak: s.streak, power: s.power, you: false, arch: b.archetype as string, bot: b };
    });
    rows.push({
      id: 'you',
      name: g.player.name,
      avatar: 'account-star',
      level: g.player.level,
      rank: rankForLevel(g.player.level).rank,
      streak: g.counters.dailyStreak,
      power: combatPower(g.player),
      you: true,
      arch: 'you',
      bot: null as unknown as Bot,
    });
    return rows.sort((a, b) => b.level - a.level || b.power - a.power);
  }, [g.bots, g.player, g.counters.dailyStreak, today]);

  const feed = useMemo(() => botFeed(g.bots, 3).slice(0, 14), [g.bots]);
  const myPos = board.findIndex((r) => r.you) + 1;

  const openRecruit = () => setRecruit(generateCandidates(Math.floor(Math.random() * 1e9), 4, g.player.level, g.bots.map((b) => b.name)));

  const leaderboard = (
    <Panel key="lb" title="Leaderboard" icon="podium" color={C.green} right={<Btn size="sm" icon="account-plus" label="Recruit" color={C.green} onPress={openRecruit} testID="recruit" />}>
      {g.bots.length === 0 ? (
        <Empty icon="account-group-outline" title="Your guild is empty" text="Recruit AI hunters to compete with. They train every day — keep up.">
          <Btn kind="solid" color={C.green} label="Recruit hunters" icon="account-plus" onPress={openRecruit} style={{ marginTop: 8 }} />
        </Empty>
      ) : null}
      {board.map((r, i) => (
        <Row key={r.id} gap={10} style={[styles.row, r.you ? { backgroundColor: withAlpha(C.cyan, 0.1), borderColor: withAlpha(C.cyan, 0.5) } : null]}>
          <Txt v="num" style={{ width: 26, fontSize: 15 }} color={i === 0 ? C.gold : i === 1 ? '#C9D6E3' : i === 2 ? C.orange : C.textDim}>
            #{i + 1}
          </Txt>
          <RankBadge rank={r.rank} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Row gap={6}>
              <Icon name={r.avatar} size={14} color={r.you ? C.cyan : C.textDim} />
              <Txt v="bodyB" numberOfLines={1} style={{ flexShrink: 1 }} color={r.you ? C.cyanHi : C.text}>
                {r.name}
                {r.you ? ' (you)' : ''}
              </Txt>
            </Row>
            <Txt v="tiny">
              Lv. {r.level} · {r.power.toLocaleString()} power · <Icon name="fire" size={11} color={C.orange} /> {r.streak}
              {!r.you ? ` · ${BOT_ARCHETYPES[r.arch as keyof typeof BOT_ARCHETYPES].label}` : ''}
            </Txt>
          </View>
          {!r.you ? (
            <Btn
              size="sm"
              icon="account-remove"
              kind="ghost"
              color={C.muted}
              onPress={() => systemConfirm('REMOVE HUNTER?', [`${r.name} will leave your guild.`], () => actions.removeBot(r.id), { confirmLabel: 'Remove' })}
            />
          ) : null}
        </Row>
      ))}
      {g.bots.length ? (
        <Txt v="tiny" center style={{ marginTop: 10 }}>
          You are #{myPos} of {board.length}. Hunters are AI rivals that progress daily.
        </Txt>
      ) : null}
    </Panel>
  );

  const feedPanel = (
    <Panel key="feed" title="Guild activity" icon="message-flash" color={C.green}>
      {!feed.length ? <Txt v="small">No activity yet.</Txt> : null}
      {feed.map((f) => (
        <Row key={f.id} gap={10} style={{ paddingVertical: 6, alignItems: 'flex-start' }}>
          <Icon name={f.avatar} size={16} color={C.green} />
          <Txt v="small" style={{ flex: 1 }} color={C.text}>
            <Txt v="bodyB" style={{ fontSize: 14 }}>
              {f.name}
            </Txt>{' '}
            {f.text}
          </Txt>
          <Txt v="tiny">{f.date === today ? 'today' : shortDate(f.date)}</Txt>
        </Row>
      ))}
    </Panel>
  );

  return (
    <Screen title="GUILD" subtitle="Hunters association" back inTabs={false} tint={C.green}>
      <Columns>{[leaderboard, feedPanel]}</Columns>
      <SystemModal visible={!!recruit} onClose={() => setRecruit(null)} title="Recruit a hunter" icon="account-plus" color={C.green}>
        {recruit?.map((b) => {
          const s = botSnapshot(b, today);
          const a = BOT_ARCHETYPES[b.archetype];
          return (
            <Row key={b.id} gap={10} style={styles.cand}>
              <RankBadge rank={s.rank} size={38} />
              <View style={{ flex: 1 }}>
                <Row gap={6}>
                  <Icon name={b.avatar} size={14} color={C.green} />
                  <Txt v="bodyB">{b.name}</Txt>
                </Row>
                <Row gap={6} style={{ marginTop: 2 }}>
                  <Pill text={a.label.toUpperCase()} color={b.archetype === 'elite' ? C.red : b.archetype === 'grinder' ? C.orange : C.green} />
                  <Txt v="tiny">Lv. {s.level} · {a.desc}</Txt>
                </Row>
              </View>
              <Btn
                size="sm"
                label="Invite"
                color={C.green}
                onPress={() => {
                  actions.addBot(b);
                  setRecruit((r) => (r ? r.filter((x) => x.id !== b.id) : r));
                }}
              />
            </Row>
          );
        })}
        <Btn label="Find others" icon="refresh" kind="ghost" color={C.green} onPress={openRecruit} style={{ marginTop: 6 }} />
      </SystemModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 8, paddingHorizontal: 6, borderWidth: 1, borderColor: 'transparent', borderBottomColor: C.lineDim, borderRadius: 3 },
  cand: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.lineDim },
});
